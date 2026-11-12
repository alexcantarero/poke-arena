import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { matchCausas } from "@/db/schema";
import type { CausaDerrota } from "@/lib/causasDerrota";

/* =========================================================================
   v0.123 — Lectura y escritura de las causas de derrota (tabla
   `match_causas`, migración 0035). Todo con try/catch: sin la migración, el
   resto de la app funciona y simplemente no se guardan ni se ven causas.
   ========================================================================= */

/** Guarda (o borra, si viene vacía) las causas de `playerId` en una partida. */
export async function guardarCausas(matchId: string, playerId: string, causas: CausaDerrota[]): Promise<void> {
  try {
    if (!causas.length) {
      await db.delete(matchCausas).where(and(eq(matchCausas.matchId, matchId), eq(matchCausas.playerId, playerId)));
      return;
    }
    await db.insert(matchCausas).values({ matchId, playerId, causas })
      .onConflictDoUpdate({ target: [matchCausas.matchId, matchCausas.playerId], set: { causas } });
  } catch (e) {
    console.warn("[causas] no se han podido guardar (¿falta la migración 0035?)", e);
  }
}

/** Las causas guardadas de una partida, por jugador. */
export async function causasDePartida(matchId: string): Promise<Record<string, string[]>> {
  try {
    const filas = await db.select().from(matchCausas).where(eq(matchCausas.matchId, matchId));
    return Object.fromEntries(filas.map((f) => [f.playerId, Array.isArray(f.causas) ? f.causas : []]));
  } catch {
    return {};
  }
}

/** Las causas de un conjunto de partidas (para el gráfico de Estadísticas). */
export async function causasDePartidas(matchIds: string[]): Promise<Array<{ matchId: string; playerId: string; causas: string[] }>> {
  if (!matchIds.length) return [];
  try {
    const out: Array<{ matchId: string; playerId: string; causas: string[] }> = [];
    // De 500 en 500, para no hacer una consulta con miles de parámetros.
    for (let i = 0; i < matchIds.length; i += 500) {
      const filas = await db.select().from(matchCausas).where(inArray(matchCausas.matchId, matchIds.slice(i, i + 500)));
      for (const f of filas) out.push({ matchId: f.matchId, playerId: f.playerId, causas: Array.isArray(f.causas) ? f.causas : [] });
    }
    return out;
  } catch {
    return [];
  }
}
