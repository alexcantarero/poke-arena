"use server";

import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { beltChallenges, beltRegistrations, beltState, competitions, players } from "@/db/schema";
import {
  CINTURON_COMPETITION_ID, CINTURON_ESTADO_ID, CINTURON_FECHA, cumpleRequisitoReto, posicionEnForma,
  esCompeticionCinturon, inscripcionCinturonAbierta, plazoVencido,
  CINTURON_ENFRIAMIENTO_DIAS, CINTURON_RETO_DIAS,
} from "@/lib/cinturon";
import { loadSnapshot } from "@/lib/data";
import { notificarCambioCinturon } from "@/lib/discord";
import { withFlash } from "@/lib/flash";
import { newId, todayISO } from "@/lib/format";
import { getLang } from "@/lib/lang";
import {
  msj, refresh, requireActor, requireManager, str,
} from "./_comun";
import {
  abrirSuizoCinturon, finalizarSuizoCinturon, iniciarSuizoCinturon, leerEstadoCinturon,
  procesarPlazosCinturon,
} from "@/lib/cinturonDb";

const RUTA_CINTURON = "/cinturon";
const RETOS_ABIERTOS = ["pending", "accepted", "result_pending"];

export async function registerForBeltTournament() {
  const actor = await requireActor();
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const [state] = await tx.select().from(beltState)
      .where(eq(beltState.id, CINTURON_ESTADO_ID)).for("update");
    if (!state) return "missing" as const;
    const [holder] = await tx.select({ id: players.id }).from(players).where(eq(players.beltHolder, true));
    if (holder) return "holder" as const;
    const eventId = state.currentEventId ?? CINTURON_COMPETITION_ID;
    if (eventId === CINTURON_COMPETITION_ID && !inscripcionCinturonAbierta(now)) return "closed" as const;
    await tx.insert(competitions).values({
      id: eventId,
      name: eventId === CINTURON_COMPETITION_ID ? "Torneo por el primer Cinturón" : "Torneo por el Cinturón",
      kind: "swiss",
      bestOf: 3,
      status: "draft",
      start: eventId === CINTURON_COMPETITION_ID ? CINTURON_FECHA : todayISO(),
      rounds: 0,
      topCut: 0,
      modality: "mazo_fijo",
    }).onConflictDoNothing();
    const [competition] = await tx.select({ status: competitions.status }).from(competitions)
      .where(eq(competitions.id, eventId));
    if (!competition || competition.status !== "draft") return "closed" as const;
    if (!state.currentEventId) {
      await tx.update(beltState).set({ currentEventId: eventId, updatedAt: now })
        .where(eq(beltState.id, CINTURON_ESTADO_ID));
    }
    const inserted = await tx.insert(beltRegistrations).values({
      eventId,
      playerId: actor.id,
    }).onConflictDoNothing().returning({ playerId: beltRegistrations.playerId });
    return inserted.length ? "registered" as const : "already" as const;
  });

  if (result !== "registered" && result !== "already") {
    const key = result === "closed" ? "belt.registrationClosed" : "belt.hasHolder";
    redirect(withFlash(RUTA_CINTURON, "error", await msj(key)));
  }
  refresh();
  redirect(withFlash(
    RUTA_CINTURON,
    result === "registered" ? "ok" : "error",
    await msj(result === "registered" ? "belt.registeredFlash" : "belt.alreadyRegistered"),
  ));
}

export async function startBeltTournament() {
  await requireManager();
  const result = await iniciarSuizoCinturon();
  if (result === "before") redirect(withFlash(RUTA_CINTURON, "error", await msj("belt.tooEarly")));
  if (result === "few" || result === "missing") {
    redirect(withFlash(RUTA_CINTURON, "error", await msj("belt.needsTwo")));
  }
  const { state } = await leerEstadoCinturon();
  refresh();
  redirect(`/competiciones/${state?.currentEventId ?? CINTURON_COMPETITION_ID}`);
}

export async function finishBeltTournament(fd: FormData) {
  await requireManager();
  const eventId = str(fd, "eventId");
  if (!esCompeticionCinturon(eventId)) redirect(RUTA_CINTURON);
  const winnerId = await finalizarSuizoCinturon(eventId);
  if (!winnerId) redirect(withFlash(RUTA_CINTURON, "error", await msj("belt.incomplete")));
  refresh();
  const snap = await loadSnapshot();
  const name = snap.playersById.get(winnerId)?.name ?? "Campeón";
  await notificarCambioCinturon({
    tipo: eventId === CINTURON_COMPETITION_ID ? "coronacion" : "cambio",
    poseedor: name,
  });
  redirect(withFlash(RUTA_CINTURON, "ok", await msj("belt.finished")));
}

export async function openVacantBeltSwiss() {
  await requireManager();
  const eventId = await abrirSuizoCinturon();
  if (!eventId) redirect(withFlash(RUTA_CINTURON, "error", await msj("belt.cannotOpenSwiss")));
  refresh();
  redirect(withFlash(RUTA_CINTURON, "ok", await msj("belt.vacantSwissOpened")));
}

export async function requestBeltChallenge() {
  const actor = await requireActor();
  const snap = await loadSnapshot();
  // v0.115 — se reta por FORMA (Elo con la actividad dentro), no por la liga.
  const pos = posicionEnForma(snap.forma, snap.activePlayerIds, actor.id);
  const forma = snap.forma[actor.id]?.forma ?? null;
  if (!cumpleRequisitoReto(pos, forma)) {
    redirect(withFlash(RUTA_CINTURON, "error", await msj("belt.challengeIneligible")));
  }

  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const [state] = await tx.select().from(beltState)
      .where(eq(beltState.id, CINTURON_ESTADO_ID)).for("update");
    const [holder] = await tx.select({ id: players.id }).from(players).where(eq(players.beltHolder, true));
    if (!state || !holder) return "vacant" as const;
    if (holder.id === actor.id) return "self" as const;
    const open = await tx.select({ id: beltChallenges.id }).from(beltChallenges)
      .where(inArray(beltChallenges.status, RETOS_ABIERTOS));
    if (open.length) return "busy" as const;
    const since = new Date(now.getTime() - CINTURON_ENFRIAMIENTO_DIAS * 24 * 60 * 60 * 1000);
    const [cooldown] = await tx.select({ confirmedAt: beltChallenges.resultConfirmedAt }).from(beltChallenges)
      .where(and(
        eq(beltChallenges.challengerId, actor.id),
        eq(beltChallenges.championId, holder.id),
        eq(beltChallenges.status, "completed"),
        eq(beltChallenges.resultWinnerId, holder.id),
        gte(beltChallenges.resultConfirmedAt, since),
      )).orderBy(desc(beltChallenges.requestedAt)).limit(1);
    if (cooldown?.confirmedAt) {
      return { kind: "cooldown" as const, until: new Date(cooldown.confirmedAt.getTime() + CINTURON_ENFRIAMIENTO_DIAS * 86400000) };
    }
    await tx.insert(beltChallenges).values({
      id: newId("reto"),
      challengerId: actor.id,
      championId: holder.id,
      status: "pending",
      requestedAt: now,
    });
    return "requested" as const;
  });

  if (typeof result === "object" && result.kind === "cooldown") {
    const lang = await getLang();
    const date = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "es-ES", {
      dateStyle: "long",
      timeZone: "Europe/Madrid",
    }).format(result.until);
    redirect(withFlash(RUTA_CINTURON, "error", await msj("belt.cooldown", { date })));
  }
  if (result !== "requested") {
    const key = result === "busy" ? "belt.challengeBusy"
      : result === "self" ? "belt.cannotChallengeSelf" : "belt.noHolder";
    redirect(withFlash(RUTA_CINTURON, "error", await msj(key)));
  }
  refresh();
  redirect(withFlash(RUTA_CINTURON, "ok", await msj("belt.requestFlash")));
}

export async function answerBeltChallenge(fd: FormData) {
  const actor = await requireActor();
  const challengeId = str(fd, "challengeId");
  const decision = str(fd, "decision");
  if (decision !== "accept" && decision !== "decline") redirect(RUTA_CINTURON);
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    await tx.select({ id: beltState.id }).from(beltState)
      .where(eq(beltState.id, CINTURON_ESTADO_ID)).for("update");
    const [challenge] = await tx.select().from(beltChallenges)
      .where(eq(beltChallenges.id, challengeId)).for("update");
    const [holder] = await tx.select({ id: players.id }).from(players).where(eq(players.beltHolder, true));
    if (!challenge || challenge.status !== "pending" || challenge.championId !== actor.id
        || holder?.id !== actor.id) return "missing" as const;
    if (plazoVencido(challenge.requestedAt, CINTURON_RETO_DIAS, now)) return "expired" as const;
    await tx.update(beltChallenges).set({
      status: decision === "accept" ? "accepted" : "declined",
      respondedAt: now,
      acceptedAt: decision === "accept" ? now : null,
    }).where(eq(beltChallenges.id, challengeId));
    return decision;
  });
  if (result === "expired") {
    const expired = await procesarPlazosCinturon(now);
    refresh();
    if (expired?.kind === "forfeit") {
      const rows = await db.select({ id: players.id, name: players.name }).from(players)
        .where(inArray(players.id, [expired.oldHolderId, expired.newHolderId]));
      const names = new Map(rows.map((row) => [row.id, row.name]));
      await notificarCambioCinturon({
        tipo: "forfeit",
        poseedor: names.get(expired.newHolderId) ?? null,
        anterior: names.get(expired.oldHolderId) ?? null,
      });
    }
    redirect(withFlash(RUTA_CINTURON, "error", await msj("belt.challengeExpired")));
  }
  if (result === "missing") redirect(withFlash(RUTA_CINTURON, "error", await msj("belt.challengeNotFound")));
  refresh();
  redirect(withFlash(
    RUTA_CINTURON,
    "ok",
    await msj(result === "accept" ? "belt.acceptedFlash" : "belt.declinedFlash"),
  ));
}

export async function reportBeltResult(fd: FormData) {
  const actor = await requireActor();
  const challengeId = str(fd, "challengeId");
  const winnerId = str(fd, "winnerId");
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    await tx.select({ id: beltState.id }).from(beltState)
      .where(eq(beltState.id, CINTURON_ESTADO_ID)).for("update");
    const [challenge] = await tx.select().from(beltChallenges)
      .where(eq(beltChallenges.id, challengeId)).for("update");
    if (!challenge || challenge.status !== "accepted"
        || ![challenge.challengerId, challenge.championId].includes(actor.id)) return "missing" as const;
    if (winnerId !== challenge.challengerId && winnerId !== challenge.championId) return "invalid" as const;
    await tx.update(beltChallenges).set({
      status: "result_pending",
      resultWinnerId: winnerId,
      resultReportedBy: actor.id,
      resultReportedAt: now,
      resultConfirmedBy: null,
      resultConfirmedAt: null,
    }).where(eq(beltChallenges.id, challengeId));
    return "reported" as const;
  });
  if (result === "invalid") redirect(withFlash(RUTA_CINTURON, "error", await msj("belt.invalidResult")));
  if (result === "missing") redirect(withFlash(RUTA_CINTURON, "error", await msj("belt.challengeNotFound")));
  refresh();
  redirect(withFlash(RUTA_CINTURON, "ok", await msj("belt.challengeNeedsOpponentOk")));
}

export async function confirmBeltResult(fd: FormData) {
  const actor = await requireActor();
  const challengeId = str(fd, "challengeId");
  const decision = str(fd, "decision");
  if (decision !== "confirm" && decision !== "dispute") redirect(RUTA_CINTURON);
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const [state] = await tx.select().from(beltState)
      .where(eq(beltState.id, CINTURON_ESTADO_ID)).for("update");
    const [challenge] = await tx.select().from(beltChallenges)
      .where(eq(beltChallenges.id, challengeId)).for("update");
    if (!state || !challenge || challenge.status !== "result_pending"
        || !challenge.resultWinnerId || challenge.resultReportedBy === actor.id
        || ![challenge.challengerId, challenge.championId].includes(actor.id)) return null;

    if (decision === "dispute") {
      await tx.update(beltChallenges).set({
        status: "accepted",
        resultWinnerId: null,
        resultReportedBy: null,
        resultReportedAt: null,
        resultConfirmedBy: null,
        resultConfirmedAt: null,
        resultDisputedBy: actor.id,
        resultDisputedAt: now,
      }).where(eq(beltChallenges.id, challengeId));
      return { kind: "disputed" as const, winnerId: null };
    }

    const newHolderId = challenge.resultWinnerId;
    await tx.update(players).set({ beltHolder: false }).where(eq(players.beltHolder, true));
    await tx.update(players).set({ beltHolder: true }).where(eq(players.id, newHolderId));
    await tx.update(beltState).set({
      lastDefendedAt: now,
      vacantSince: null,
      updatedAt: now,
    }).where(eq(beltState.id, CINTURON_ESTADO_ID));
    await tx.update(beltChallenges).set({
      status: "completed",
      resultConfirmedBy: actor.id,
      resultConfirmedAt: now,
    }).where(eq(beltChallenges.id, challengeId));
    return {
      kind: "confirmed" as const,
      winnerId: newHolderId,
      type: newHolderId === challenge.challengerId ? "cambio" as const : "defensa" as const,
    };
  });
  if (!result) redirect(withFlash(RUTA_CINTURON, "error", await msj("belt.challengeNotFound")));
  refresh();
  if (result.kind === "disputed") {
    redirect(withFlash(RUTA_CINTURON, "error", await msj("belt.resultDisputedFlash")));
  }
  const snap = await loadSnapshot();
  const winnerName = snap.playersById.get(result.winnerId)?.name ?? "Campeón";
  await notificarCambioCinturon({ tipo: result.type, poseedor: winnerName });
  redirect(withFlash(RUTA_CINTURON, "ok", await msj("belt.resultConfirmedFlash")));
}
