import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  beltChallenges, beltRegistrations, beltState, competitionPlayers, competitions, matches, players,
} from "@/db/schema";
import {
  CINTURON_BYE, CINTURON_COMPETITION_ID, CINTURON_ESTADO_ID, CINTURON_FECHA,
  CINTURON_INACTIVIDAD_DIAS, CINTURON_RETO_DIAS, esCompeticionCinturon, iniciarCinturonPermitido, plazoVencido,
} from "@/lib/cinturon";
import { newId, todayISO } from "@/lib/format";
import { loadSnapshot } from "@/lib/data";
import { incluirDescansosEnClasificacion } from "@/lib/cinturon";
import { pairRound, standings } from "@/lib/stats";
import { suggestedRounds } from "@/lib/sugerencias";

export type InicioCinturonResultado = "before" | "missing" | "few" | "already" | "started";

export async function leerEstadoCinturon() {
  const [state] = await db.select().from(beltState).where(eq(beltState.id, CINTURON_ESTADO_ID));
  const [holder] = await db.select({ id: players.id }).from(players).where(eq(players.beltHolder, true));
  const challenges = await db.select().from(beltChallenges)
    .orderBy(desc(beltChallenges.requestedAt)).limit(20);
  return { state: state ?? null, holderId: holder?.id ?? null, challenges };
}

export async function abrirSuizoCinturon(): Promise<string | null> {
  return db.transaction(async (tx) => {
    const [state] = await tx.select().from(beltState)
      .where(eq(beltState.id, CINTURON_ESTADO_ID)).for("update");
    const [holder] = await tx.select({ id: players.id }).from(players).where(eq(players.beltHolder, true));
    if (!state || holder || !state.vacantSince) return null;

    const id = `cinturon-${newId("evento")}`;
    await tx.insert(competitions).values({
      id,
      name: "Torneo por el Cinturón",
      kind: "swiss",
      bestOf: 3,
      status: "draft",
      start: todayISO(),
      rounds: 0,
      topCut: 0,
      modality: "mazo_fijo",
    });
    await tx.update(beltState).set({
      currentEventId: id,
      updatedAt: new Date(),
    }).where(eq(beltState.id, CINTURON_ESTADO_ID));
    return id;
  });
}

export async function iniciarSuizoCinturon(ahora = new Date()): Promise<InicioCinturonResultado> {
  const [state] = await db.select().from(beltState).where(eq(beltState.id, CINTURON_ESTADO_ID));
  const eventId = state?.currentEventId;
  if (!eventId) return "missing";
  if (eventId === CINTURON_COMPETITION_ID && !iniciarCinturonPermitido(ahora)) return "before";
  const [existing] = await db.select({ status: competitions.status }).from(competitions)
    .where(eq(competitions.id, eventId));
  if (!existing) return "missing";
  if (existing.status !== "draft") return "already";

  const snap = await loadSnapshot();
  return db.transaction(async (tx) => {
    const [lockedState] = await tx.select().from(beltState)
      .where(eq(beltState.id, CINTURON_ESTADO_ID)).for("update");
    const [competition] = await tx.select().from(competitions)
      .where(eq(competitions.id, eventId)).for("update");
    const [holder] = await tx.select({ id: players.id }).from(players).where(eq(players.beltHolder, true));
    if (!lockedState || lockedState.currentEventId !== eventId || holder
        || !competition || competition.status !== "draft") return "already";

    const registrations = await tx.select({ playerId: beltRegistrations.playerId })
      .from(beltRegistrations)
      .innerJoin(players, and(
        eq(players.id, beltRegistrations.playerId),
        eq(players.active, true),
      ))
      .where(eq(beltRegistrations.eventId, eventId))
      .orderBy(asc(beltRegistrations.registeredAt));
    if (registrations.length < 2) return "few";

    const ids = registrations.map((registration) => registration.playerId);
    const rounds = suggestedRounds(ids.length);
    const pairing = pairRound("swiss", ids, [], snap.elo.rating, snap.config);
    if (!pairing.pairs.length && !pairing.bye) return "few";

    await tx.insert(competitionPlayers).values(ids.map((playerId, index) => ({
      competitionId: eventId,
      playerId,
      seed: index + 1,
      dropped: false,
    })));
    await tx.insert(matches).values([
      ...pairing.pairs.map(([playerAId, playerBId]) => ({
        id: newId("m"),
        competitionId: eventId,
        round: 1,
        date: eventId === CINTURON_COMPETITION_ID ? CINTURON_FECHA : todayISO(),
        playerAId,
        playerBId,
        bestOf: 3,
        status: "scheduled" as const,
      })),
      ...(pairing.bye ? [{
        id: newId("m"),
        competitionId: eventId,
        round: 1,
        date: eventId === CINTURON_COMPETITION_ID ? CINTURON_FECHA : todayISO(),
        playerAId: pairing.bye,
        playerBId: null,
        opponentName: CINTURON_BYE,
        bestOf: 3,
        status: "done" as const,
        seriesResult: "a",
      }] : []),
    ]);
    await tx.update(competitions).set({ status: "live", rounds })
      .where(eq(competitions.id, eventId));
    return "started";
  });
}

export async function finalizarSuizoCinturon(eventId: string): Promise<string | null> {
  const snap = await loadSnapshot();
  const now = new Date();
  return db.transaction(async (tx) => {
    const [state] = await tx.select().from(beltState)
      .where(eq(beltState.id, CINTURON_ESTADO_ID)).for("update");
    const [competition] = await tx.select().from(competitions)
      .where(eq(competitions.id, eventId)).for("update");
    const [holder] = await tx.select({ id: players.id }).from(players).where(eq(players.beltHolder, true));
    if (!state || state.currentEventId !== eventId || !esCompeticionCinturon(eventId)
        || !competition || competition.status !== "live" || holder) return null;

    const matchRows = await tx.select({ round: matches.round, status: matches.status })
      .from(matches).where(eq(matches.competitionId, eventId));
    const roundsPlayed = Math.max(0, ...matchRows.map((match) => match.round));
    if (roundsPlayed < competition.rounds || matchRows.some((match) => match.status !== "done")) return null;

    const playersInCompetition = await tx.select({ playerId: competitionPlayers.playerId })
      .from(competitionPlayers).where(eq(competitionPlayers.competitionId, eventId));
    const playerIds = playersInCompetition.map((row) => row.playerId);
    const eventMatches = incluirDescansosEnClasificacion(
      snap.matches.filter((match) => match.competitionId === eventId),
    );
    const winner = standings(eventMatches, playerIds, snap.elo.rating, snap.config)[0];
    if (!winner) return null;

    await tx.update(competitions).set({ status: "done" }).where(eq(competitions.id, eventId));
    await tx.update(players).set({ beltHolder: false }).where(eq(players.beltHolder, true));
    await tx.update(players).set({ beltHolder: true }).where(eq(players.id, winner.playerId));
    await tx.update(beltState).set({
      lastDefendedAt: now,
      vacantSince: null,
      updatedAt: now,
    }).where(eq(beltState.id, CINTURON_ESTADO_ID));
    return winner.playerId;
  });
}

export async function procesarPlazosCinturon(ahora = new Date()) {
  return db.transaction(async (tx) => {
    const [state] = await tx.select().from(beltState)
      .where(eq(beltState.id, CINTURON_ESTADO_ID)).for("update");
    const [holder] = await tx.select({ id: players.id }).from(players).where(eq(players.beltHolder, true));
    if (!state || !holder) return null;

    const [pending] = await tx.select().from(beltChallenges)
      .where(and(
        eq(beltChallenges.championId, holder.id),
        eq(beltChallenges.status, "pending"),
      )).orderBy(asc(beltChallenges.requestedAt)).limit(1);
    if (pending && plazoVencido(pending.requestedAt, CINTURON_RETO_DIAS, ahora)) {
      await tx.update(players).set({ beltHolder: false }).where(eq(players.id, holder.id));
      await tx.update(players).set({ beltHolder: true }).where(eq(players.id, pending.challengerId));
      await tx.update(beltState).set({
        lastDefendedAt: ahora,
        vacantSince: null,
        updatedAt: ahora,
      }).where(eq(beltState.id, CINTURON_ESTADO_ID));
      await tx.update(beltChallenges).set({
        status: "expired",
        respondedAt: ahora,
      }).where(eq(beltChallenges.id, pending.id));
      return { kind: "forfeit" as const, oldHolderId: holder.id, newHolderId: pending.challengerId };
    }

    if (state.lastDefendedAt && plazoVencido(state.lastDefendedAt, CINTURON_INACTIVIDAD_DIAS, ahora)) {
      await tx.update(players).set({ beltHolder: false }).where(eq(players.id, holder.id));
      await tx.update(beltState).set({
        vacantSince: ahora,
        updatedAt: ahora,
      }).where(eq(beltState.id, CINTURON_ESTADO_ID));
      await tx.update(beltChallenges).set({ status: "cancelled" })
        .where(inArray(beltChallenges.status, ["pending", "accepted", "result_pending"]));
      return { kind: "vacant" as const, oldHolderId: holder.id, newHolderId: null };
    }
    return null;
  });
}
