import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { deckDificultad, liveSesiones } from "@/db/schema";
import { resumenDificultad, type ResumenDificultad } from "@/lib/dificultad";
import type { SesionLive } from "@/lib/ladderPeso";

/* =========================================================================
   v0.137 — Dificultad votada y sesiones del Live (migración 0038). Todo con
   try/catch: sin la migración, no hay dificultad ni ponderación y lo demás
   sigue igual.
   ========================================================================= */

/** La dificultad de cada mazo con votos, y el voto de `playerId` en cada uno. */
export async function dificultades(playerId: string | null): Promise<{ porMazo: Map<string, ResumenDificultad>; mios: Map<string, number> }> {
  const porMazo = new Map<string, ResumenDificultad>(), mios = new Map<string, number>();
  try {
    const filas = await db.select().from(deckDificultad);
    const votos = new Map<string, number[]>();
    for (const f of filas) {
      votos.set(f.deckId, [...(votos.get(f.deckId) ?? []), f.nivel]);
      if (playerId && f.playerId === playerId) mios.set(f.deckId, f.nivel);
    }
    for (const [id, vs] of votos) { const r = resumenDificultad(vs); if (r) porMazo.set(id, r); }
  } catch { /* sin la migración 0038 */ }
  return { porMazo, mios };
}

export async function votar(deckId: string, playerId: string, nivel: number | null): Promise<boolean> {
  try {
    if (nivel == null) {
      await db.delete(deckDificultad).where(sql`${deckDificultad.deckId} = ${deckId} AND ${deckDificultad.playerId} = ${playerId}`);
    } else {
      await db.insert(deckDificultad).values({ deckId, playerId, nivel })
        .onConflictDoUpdate({ target: [deckDificultad.deckId, deckDificultad.playerId], set: { nivel } });
    }
    return true;
  } catch (e) {
    console.warn("[dificultad] no se ha podido guardar (¿falta la migración 0038?)", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Las sesiones del Live agrupadas por mazo. */
export async function sesionesLivePorMazo(): Promise<Map<string, SesionLive[]>> {
  const out = new Map<string, SesionLive[]>();
  try {
    const filas = await db.select({ deckId: liveSesiones.deckId, wins: liveSesiones.wins, losses: liveSesiones.losses, rango: liveSesiones.rango }).from(liveSesiones);
    for (const f of filas) out.set(f.deckId, [...(out.get(f.deckId) ?? []), { wins: f.wins, losses: f.losses, rango: f.rango }]);
  } catch { /* sin la migración 0038 */ }
  return out;
}

export async function sesionesDeMazo(deckId: string) {
  try {
    return await db.select().from(liveSesiones).where(eq(liveSesiones.deckId, deckId)).orderBy(sql`${liveSesiones.hasta} desc`);
  } catch {
    return [];
  }
}
