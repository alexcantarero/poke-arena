import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { predicciones } from "@/db/schema";
import type { Snapshot } from "@/lib/data";
import { archetypesOfMatch, outcome } from "@/lib/stats";
import { estimarCruce, metricas, PARAMETROS_POR_DEFECTO, type PartidaModelo } from "./modelo";

/* =========================================================================
   v0.138 — Del historial del grupo a partidas del modelo, y el registro de
   predicciones (tabla `predicciones`, migración 0039; con try/catch).
   ========================================================================= */

/** Las partidas del grupo con los dos mazos conocidos y resultado, en orden de fecha. */
export function partidasDelGrupo(snap: Snapshot): Array<PartidaModelo & { id: string }> {
  const out: Array<PartidaModelo & { id: string }> = [];
  for (const m of snap.matches) {
    const g = outcome(m).winner;
    if (!g) continue;
    const { a, b } = archetypesOfMatch(m, snap.archIndex, snap.archById);
    if (!a?.main || !b?.main) continue;
    const t = m.tournamentId ? snap.toursById.get(m.tournamentId) : undefined;
    const tipo = t ? (t.scope === "online" ? "online" : t.kind) : m.competitionId ? "liga" : "amistoso";
    out.push({ id: m.id, fecha: m.date, a: a.main, b: b.main, r: g === "tie" ? 0.5 : g === "a" ? 1 : 0, tipo });
  }
  return out.sort((x, y) => x.fecha.localeCompare(y.fecha));
}

/**
 * Registra la predicción de las rondas de los últimos `dias` días que aún no
 * la tengan, calculada SOLO con lo anterior a su fecha. Devuelve cuántas.
 */
export async function registrarPredicciones(snap: Snapshot, dias = 3): Promise<number> {
  try {
    const desde = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
    const todas = partidasDelGrupo(snap);
    const nuevas = todas.filter((m) => m.fecha >= desde && m.a !== m.b);
    if (!nuevas.length) return 0;
    const ya = new Set((await db.select({ id: predicciones.matchId }).from(predicciones)
      .where(sql`${predicciones.fecha} >= ${desde}`)).map((x) => x.id));
    const par = PARAMETROS_POR_DEFECTO;
    const filas = nuevas.filter((m) => !ya.has(m.id)).map((m) => {
      const e = estimarCruce(todas, m.a, m.b, m.fecha, par);
      return { matchId: m.id, fecha: m.fecha, mazoA: m.a, mazoB: m.b, p: e.p, nEf: e.nEf, resultado: m.r, parametros: `tau=${par.tau};prior=${par.prior}` };
    });
    if (!filas.length) return 0;
    await db.insert(predicciones).values(filas).onConflictDoNothing();
    return filas.length;
  } catch (e) {
    console.warn("[predicciones]", e instanceof Error ? e.message : e);
    return 0;
  }
}

/** El acierto de lo registrado (solo las que tienen datos detrás). */
export async function aciertoRegistrado() {
  try {
    const filas = await db.select({ p: predicciones.p, r: predicciones.resultado, n: predicciones.nEf }).from(predicciones);
    return metricas(filas.filter((f) => f.r != null && f.n > 0).map((f) => ({ p: f.p, r: f.r! })));
  } catch {
    return null;
  }
}
