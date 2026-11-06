import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { beltRegistrations, competitionPlayers, competitions, matches, players } from "@/db/schema";
import { CINTURON_BYE, CINTURON_COMPETITION_ID, CINTURON_EVENT_ID, CINTURON_FECHA, iniciarCinturonPermitido } from "@/lib/cinturon";
import { newId } from "@/lib/format";
import { loadSnapshot } from "@/lib/data";
import { pairRound } from "@/lib/stats";
import { suggestedRounds } from "@/lib/sugerencias";

export type InicioCinturonResultado = "before" | "missing" | "few" | "already" | "started";

export async function iniciarSuizoCinturon(ahora = new Date()): Promise<InicioCinturonResultado> {
  if (!iniciarCinturonPermitido(ahora)) return "before";
  const [existing] = await db.select({ status: competitions.status }).from(competitions)
    .where(eq(competitions.id, CINTURON_COMPETITION_ID));
  if (!existing) return "missing";
  if (existing.status !== "draft") return "already";

  const snap = await loadSnapshot();
  return db.transaction(async (tx) => {
    const [competition] = await tx.select().from(competitions)
      .where(eq(competitions.id, CINTURON_COMPETITION_ID))
      .for("update");
    if (!competition || competition.status !== "draft") return "already";

    const registrations = await tx.select({ playerId: beltRegistrations.playerId })
      .from(beltRegistrations)
      .innerJoin(players, and(
        eq(players.id, beltRegistrations.playerId),
        eq(players.active, true),
      ))
      .where(eq(beltRegistrations.eventId, CINTURON_EVENT_ID))
      .orderBy(asc(beltRegistrations.registeredAt));
    if (registrations.length < 2) return "few";

    const ids = registrations.map((registration) => registration.playerId);
    const rounds = suggestedRounds(ids.length);
    const pairing = pairRound("swiss", ids, [], snap.elo.rating, snap.config);
    if (!pairing.pairs.length && !pairing.bye) return "few";

    await tx.insert(competitionPlayers).values(ids.map((playerId, index) => ({
      competitionId: CINTURON_COMPETITION_ID,
      playerId,
      seed: index + 1,
      dropped: false,
    })));
    await tx.insert(matches).values([
      ...pairing.pairs.map(([playerAId, playerBId]) => ({
        id: newId("m"),
        competitionId: CINTURON_COMPETITION_ID,
        round: 1,
        date: CINTURON_FECHA,
        playerAId,
        playerBId,
        bestOf: 3,
        status: "scheduled" as const,
      })),
      ...(pairing.bye ? [{
        id: newId("m"),
        competitionId: CINTURON_COMPETITION_ID,
        round: 1,
        date: CINTURON_FECHA,
        playerAId: pairing.bye,
        playerBId: null,
        opponentName: CINTURON_BYE,
        bestOf: 3,
        status: "done" as const,
        seriesResult: "a",
      }] : []),
    ]);
    await tx.update(competitions).set({ status: "live", rounds })
      .where(eq(competitions.id, CINTURON_COMPETITION_ID));
    return "started";
  });
}
