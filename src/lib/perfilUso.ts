import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { games, matches, tournamentResults } from "@/db/schema";
import { leerLogros } from "@/lib/logros";

/** Recuento ligero para la tarjeta fija de la barra; no carga el snapshot completo. */
export async function usoLigeroDeJugador(playerId: string, logrosGuardados: string | null | undefined) {
  const [partidas, torneos] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(matches).where(sql`
      ${matches.status} = 'done'
      AND (${matches.seriesResult} IS NOT NULL
        OR EXISTS (SELECT 1 FROM ${games} g WHERE g.match_id = ${matches.id}))
      AND (${matches.playerAId} = ${playerId} OR ${matches.playerBId} = ${playerId})
    `),
    db.select({ n: sql<number>`count(*)::int` }).from(tournamentResults)
      .where(sql`${tournamentResults.playerId} = ${playerId}`),
  ]);
  return {
    partidas: partidas[0]?.n ?? 0,
    torneos: torneos[0]?.n ?? 0,
    logros: leerLogros(logrosGuardados).length,
  };
}
