import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { competitionPlayers, ligaDivisiones, ligaInscripciones, ligaTemporadas } from "@/db/schema";

/* =========================================================================
   v0.116 — Lecturas de la liga por divisiones.

   Todo con try/catch: si la migración 0033 aún no está aplicada, la app no
   se cae; la pantalla dice que falta la migración y el aviso no sale.
   ========================================================================= */

export type TemporadaLiga = typeof ligaTemporadas.$inferSelect;
export type InscripcionLiga = typeof ligaInscripciones.$inferSelect;
export type DivisionLiga = typeof ligaDivisiones.$inferSelect;

export type EstadoLiga = {
  temporada: TemporadaLiga | null;
  inscripciones: InscripcionLiga[];
  divisiones: DivisionLiga[];
  /** competitionId → jugadores de esa división. */
  miembros: Record<string, string[]>;
  /** La última temporada cerrada, para enseñar al campeón. */
  anterior: TemporadaLiga | null;
} | { error: "sinMigrar" };

/** La temporada abierta (inscripción o en curso), con sus inscripciones y divisiones. */
export const cargarLiga = cache(async (): Promise<EstadoLiga> => {
  try {
    const [abierta] = await db.select().from(ligaTemporadas)
      .where(inArray(ligaTemporadas.estado, ["inscripcion", "en_curso"]))
      .orderBy(desc(ligaTemporadas.numero)).limit(1);
    const [anterior] = await db.select().from(ligaTemporadas)
      .where(eq(ligaTemporadas.estado, "cerrada"))
      .orderBy(desc(ligaTemporadas.numero)).limit(1);
    if (!abierta) return { temporada: null, inscripciones: [], divisiones: [], miembros: {}, anterior: anterior ?? null };
    const [inscripciones, divisiones] = await Promise.all([
      db.select().from(ligaInscripciones).where(eq(ligaInscripciones.temporadaId, abierta.id))
        .orderBy(asc(ligaInscripciones.inscritaAt)),
      db.select().from(ligaDivisiones).where(eq(ligaDivisiones.temporadaId, abierta.id))
        .orderBy(asc(ligaDivisiones.nivel)),
    ]);
    const miembros: Record<string, string[]> = {};
    if (divisiones.length) {
      const filas = await db.select({ c: competitionPlayers.competitionId, p: competitionPlayers.playerId })
        .from(competitionPlayers).where(inArray(competitionPlayers.competitionId, divisiones.map((d) => d.competitionId)));
      for (const f of filas) (miembros[f.c] ??= []).push(f.p);
    }
    return { temporada: abierta, inscripciones, divisiones, miembros, anterior: anterior ?? null };
  } catch {
    return { error: "sinMigrar" };
  }
});

/**
 * v0.116 — Las clasificaciones finales de la última temporada cerrada (una
 * lista por división, de la 1.ª a la última), o null si no hay ninguna: en
 * ese caso la temporada nueva se reparte por sorteo.
 */
export async function ordenesAnteriores(): Promise<string[][] | null> {
  try {
    const [anterior] = await db.select({ id: ligaTemporadas.id }).from(ligaTemporadas)
      .where(eq(ligaTemporadas.estado, "cerrada")).orderBy(desc(ligaTemporadas.numero)).limit(1);
    if (!anterior) return null;
    const divs = await db.select().from(ligaDivisiones)
      .where(eq(ligaDivisiones.temporadaId, anterior.id)).orderBy(asc(ligaDivisiones.nivel));
    const ordenes = divs.map((d) => (Array.isArray(d.ordenFinal) ? d.ordenFinal : []));
    return ordenes.some((o) => o.length) ? ordenes : null;
  } catch {
    return null;
  }
}

/** v0.116 — Las temporadas que ha ganado alguien (Cinturón de Liga). */
export async function campeonatosDe(playerId: string): Promise<string[]> {
  try {
    const filas = await db.select({ nombre: ligaTemporadas.nombre }).from(ligaTemporadas)
      .where(and(eq(ligaTemporadas.estado, "cerrada"), eq(ligaTemporadas.campeonId, playerId)))
      .orderBy(asc(ligaTemporadas.numero));
    return filas.map((f) => f.nombre);
  } catch {
    return [];
  }
}

/** Para el aviso de arriba: la temporada en inscripción a la que `playerId` aún no se ha apuntado. */
export async function avisoLigaPara(playerId: string): Promise<{ id: string; nombre: string } | null> {
  try {
    const [t] = await db.select({ id: ligaTemporadas.id, nombre: ligaTemporadas.nombre }).from(ligaTemporadas)
      .where(eq(ligaTemporadas.estado, "inscripcion")).limit(1);
    if (!t) return null;
    const [ya] = await db.select({ p: ligaInscripciones.playerId }).from(ligaInscripciones)
      .where(and(eq(ligaInscripciones.temporadaId, t.id), eq(ligaInscripciones.playerId, playerId))).limit(1);
    return ya ? null : t;
  } catch {
    return null;
  }
}
