import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playerNombresOficiales } from "@/db/schema";

/* =========================================================================
   v0.124 — El nombre en Play! Pokémon de cada jugador (tabla
   `player_nombres_oficiales`, migración 0036). Con try/catch: sin la
   migración, todo sigue y se casa por el nombre de la app.

   Es un nombre real: NO va en `PublicPlayer`. Solo lo leen el perfil de su
   dueño (o un organizador) y el importador de la clasificación, que es de
   organizadores.
   ========================================================================= */

export const NOMBRE_OFICIAL_MAX = 80;

export async function guardarNombreOficial(playerId: string, nombre: string): Promise<void> {
  const limpio = nombre.trim().replace(/\s+/g, " ").slice(0, NOMBRE_OFICIAL_MAX);
  try {
    if (!limpio) {
      await db.delete(playerNombresOficiales).where(eq(playerNombresOficiales.playerId, playerId));
      return;
    }
    await db.insert(playerNombresOficiales).values({ playerId, nombre: limpio })
      .onConflictDoUpdate({ target: playerNombresOficiales.playerId, set: { nombre: limpio } });
  } catch (e) {
    console.warn("[nombre oficial] no se ha podido guardar (¿falta la migración 0036?)", e instanceof Error ? e.message : e);
  }
}

export async function nombreOficialDe(playerId: string): Promise<string> {
  try {
    const [f] = await db.select({ n: playerNombresOficiales.nombre }).from(playerNombresOficiales)
      .where(eq(playerNombresOficiales.playerId, playerId)).limit(1);
    return f?.n ?? "";
  } catch {
    return "";
  }
}

export async function nombresOficiales(): Promise<Map<string, string>> {
  try {
    const filas = await db.select().from(playerNombresOficiales);
    return new Map(filas.map((f) => [f.playerId, f.nombre]));
  } catch {
    return new Map();
  }
}
