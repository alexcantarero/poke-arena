import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tournamentDirecciones } from "@/db/schema";

/* =========================================================================
   v0.124 — La dirección postal de un torneo (tabla `tournament_direcciones`,
   migración 0036). Todo con try/catch, como las causas de derrota: sin la
   migración el resto de la app funciona y simplemente no hay dirección.
   ========================================================================= */

export const DIRECCION_MAX = 200;

/** Guarda la dirección de un torneo; vacía, la borra. */
export async function guardarDireccion(tournamentId: string, direccion: string): Promise<void> {
  const limpia = direccion.trim().replace(/\s+/g, " ").slice(0, DIRECCION_MAX);
  try {
    if (!limpia) {
      await db.delete(tournamentDirecciones).where(eq(tournamentDirecciones.tournamentId, tournamentId));
      return;
    }
    await db.insert(tournamentDirecciones).values({ tournamentId, direccion: limpia })
      .onConflictDoUpdate({ target: tournamentDirecciones.tournamentId, set: { direccion: limpia } });
  } catch (e) {
    console.warn("[direccion] no se ha podido guardar (¿falta la migración 0036?)", e instanceof Error ? e.message : e);
  }
}

/** La dirección de un torneo, o vacío. */
export async function direccionDe(tournamentId: string): Promise<string> {
  try {
    const [f] = await db.select({ d: tournamentDirecciones.direccion }).from(tournamentDirecciones)
      .where(eq(tournamentDirecciones.tournamentId, tournamentId)).limit(1);
    return f?.d ?? "";
  } catch {
    return "";
  }
}

/** Todas las direcciones, por torneo (para no duplicar al importar). */
export async function direccionesDeTorneos(): Promise<Map<string, string>> {
  try {
    const filas = await db.select().from(tournamentDirecciones);
    return new Map(filas.map((f) => [f.tournamentId, f.direccion]));
  } catch {
    return new Map();
  }
}
