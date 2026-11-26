import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { asistencias, confirmacionesLiga, matches, players, tournaments } from "@/db/schema";
import type { Snapshot } from "@/lib/data";
import { newId, todayISO } from "@/lib/format";
import { pairRound } from "@/lib/stats";
import { asModalidad } from "@/lib/modalidades";
import { esCompeticionCinturon } from "@/lib/cinturon";
import { leerAjuste, guardarAjuste } from "@/lib/ajustesExtraDb";
import { enviarA } from "@/lib/pushDb";

/* =========================================================================
   v0.140 — LA LIGA QUE FUNCIONA SOLA, y los avisos push que la empujan.

   · JORNADAS AUTOMÁTICAS (por competición, lo activa un organizador): cuando
     todas las partidas de la jornada tienen resultado, el cron empareja la
     siguiente (el mismo `pairRound` del botón) y avisa a cada uno de su rival.
   · RECORDATORIOS: una partida de liga sin jugar, a los dos rivales, cada 3 días.
   · CONFIRMAR RESULTADOS: cuando uno apunta el resultado, el rival lo confirma
     o lo discute. Cuenta desde el primer momento (no se bloquea la liga);
     discutido, avisa a los organizadores; sin respuesta en 3 días, se da por
     bueno.
   · «MAÑANA ES LA CUP» a quien dijo «iré», y «RONDA N: apunta tu resultado» a
     los del grupo en un torneo de hoy cuando otro ya apuntó esa ronda.
   Las jornadas de equipos y el cinturón siguen con su botón.
   ========================================================================= */

const clave = (compId: string) => `liga_auto:${compId}`;
export async function ligaAutomatica(compId: string): Promise<boolean> { return (await leerAjuste(clave(compId))) === "1"; }
export async function ponerLigaAutomatica(compId: string, si: boolean): Promise<boolean> { return guardarAjuste(clave(compId), si ? "1" : "0"); }

/** Empareja la jornada siguiente de las competiciones automáticas que la tengan terminada. */
export async function jornadasAutomaticas(snap: Snapshot): Promise<number> {
  let creadas = 0;
  for (const comp of snap.competitions) {
    if (comp.status === "done" || esCompeticionCinturon(comp.id) || asModalidad(comp.modality) === "equipos") continue;
    if (!(await ligaAutomatica(comp.id).catch(() => false))) continue;
    const inComp = snap.matches.filter((m) => m.competitionId === comp.id);
    if (inComp.some((m) => m.status === "scheduled")) continue; // la jornada aún no ha acabado
    const nextRound = Math.max(0, ...inComp.map((m) => m.round)) + 1;
    if (comp.rounds > 0 && nextRound > comp.rounds) continue;
    const ids = snap.playersOfComp.get(comp.id) ?? snap.activePlayerIds;
    const { pairs } = pairRound(comp.kind, ids, inComp, snap.elo.rating, snap.config);
    if (!pairs.length) continue;
    await db.insert(matches).values(pairs.map(([a, b]) => ({
      id: newId("m"), competitionId: comp.id, round: nextRound, date: todayISO(),
      playerAId: a, playerBId: b, bestOf: comp.bestOf, status: "scheduled" as const,
    })));
    creadas++;
    const nombre = (id: string) => snap.playersById.get(id)?.name ?? "tu rival";
    for (const [a, b] of pairs) {
      await enviarA([a], { titulo: `${comp.name} · jornada ${nextRound}`, cuerpo: `Te toca contra ${nombre(b)}.`, url: `/competiciones/${comp.id}`, etiqueta: `j${nextRound}` }, `jornada:${comp.id}:${nextRound}`);
      await enviarA([b], { titulo: `${comp.name} · jornada ${nextRound}`, cuerpo: `Te toca contra ${nombre(a)}.`, url: `/competiciones/${comp.id}`, etiqueta: `j${nextRound}` }, `jornada:${comp.id}:${nextRound}`);
    }
  }
  return creadas;
}

/** Partidas de liga sin jugar: recordatorio a los dos rivales cada 3 días. */
export async function recordatoriosLiga(snap: Snapshot, hoy = todayISO()): Promise<number> {
  let n = 0;
  const dias = (f: string) => Math.floor((Date.parse(`${hoy}T12:00:00Z`) - Date.parse(`${f}T12:00:00Z`)) / 86_400_000);
  for (const m of snap.matches) {
    if (m.status !== "scheduled" || !m.competitionId || !m.playerBId) continue;
    const d = dias(m.date);
    if (d < 3) continue;
    const comp = snap.compsById.get(m.competitionId);
    const nombre = (id: string) => snap.playersById.get(id)?.name ?? "tu rival";
    const tramo = Math.floor(d / 3);
    n += await enviarA([m.playerAId], { titulo: comp?.name ?? "Liga", cuerpo: `Tienes pendiente la partida contra ${nombre(m.playerBId)}.`, url: `/competiciones/${m.competitionId}` }, `recordatorio:${m.id}:${tramo}`);
    n += await enviarA([m.playerBId], { titulo: comp?.name ?? "Liga", cuerpo: `Tienes pendiente la partida contra ${nombre(m.playerAId)}.`, url: `/competiciones/${m.competitionId}` }, `recordatorio:${m.id}:${tramo}`);
  }
  return n;
}

/** «Mañana es la Cup»: a quien dijo «iré» a un torneo de mañana. */
export async function avisosTorneoManana(): Promise<number> {
  try {
    const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const filas = await db.select({ tid: tournaments.id, nombre: tournaments.name, pid: asistencias.playerId }).from(tournaments)
      .innerJoin(asistencias, sql`${asistencias.item} = 'torneo:' || ${tournaments.id}`)
      .where(and(eq(tournaments.date, manana), eq(asistencias.estado, "si")));
    let n = 0;
    for (const f of filas) {
      n += await enviarA([f.pid], { titulo: "Mañana tienes torneo", cuerpo: `${f.nombre}. Prepara el mazo y mira qué te vas a cruzar.`, url: `/torneos/${f.tid}/preparacion`, etiqueta: "manana" }, `manana:${f.tid}`);
    }
    return n;
  } catch { return 0; }
}

/** «Ronda N: apunta tu resultado» a los del grupo en un torneo de HOY que aún no la tienen. */
export async function avisoRondaApuntada(torneoId: string, round: number, quien: string): Promise<void> {
  try {
    const [t] = await db.select({ name: tournaments.name, date: tournaments.date }).from(tournaments).where(eq(tournaments.id, torneoId));
    if (!t || t.date !== todayISO()) return;
    const conRonda = new Set((await db.select({ p: matches.playerAId }).from(matches)
      .where(and(eq(matches.tournamentId, torneoId), eq(matches.round, round)))).map((x) => x.p));
    const van = (await db.select({ p: asistencias.playerId }).from(asistencias)
      .where(and(eq(asistencias.item, `torneo:${torneoId}`), eq(asistencias.estado, "si")))).map((x) => x.p);
    const deTorneo = (await db.select({ p: matches.playerAId }).from(matches).where(eq(matches.tournamentId, torneoId))).map((x) => x.p);
    const a = [...new Set([...van, ...deTorneo])].filter((p) => p !== quien && !conRonda.has(p));
    if (a.length) await enviarA(a, { titulo: `Ronda ${round}: apunta tu resultado`, cuerpo: t.name, url: `/torneos/${torneoId}/modo`, etiqueta: `r${round}` }, `ronda:${torneoId}:${round}`);
  } catch { /* sin push no pasa nada */ }
}

/* ------------------------------------------------------- confirmaciones -- */

/** Quien apunta un resultado de liga: el rival tiene que confirmarlo. */
export async function pedirConfirmacion(matchId: string, reportadoPor: string, rivalId: string, comp: string): Promise<void> {
  try {
    await db.insert(confirmacionesLiga).values({ matchId, reportadoPor, rivalId, estado: "pendiente" })
      .onConflictDoUpdate({ target: confirmacionesLiga.matchId, set: { reportadoPor, rivalId, estado: "pendiente", reportadoAt: new Date(), resueltoAt: null } });
    const [r] = await db.select({ n: players.name }).from(players).where(eq(players.id, reportadoPor));
    await enviarA([rivalId], { titulo: "Confirma el resultado", cuerpo: `${r?.n ?? "Tu rival"} ha apuntado vuestra partida de ${comp}.`, url: "/avisos", etiqueta: "confirmar" }, `confirmar:${matchId}:${Date.now()}`);
  } catch { /* sin la migración 0040 */ }
}

export async function confirmacionesPendientes(playerId: string): Promise<Array<{ matchId: string; reportadoPor: string; nombre: string; competitionId: string | null; round: number }>> {
  try {
    return await db.select({ matchId: confirmacionesLiga.matchId, reportadoPor: confirmacionesLiga.reportadoPor, nombre: players.name, competitionId: matches.competitionId, round: matches.round })
      .from(confirmacionesLiga)
      .innerJoin(players, eq(players.id, confirmacionesLiga.reportadoPor))
      .innerJoin(matches, eq(matches.id, confirmacionesLiga.matchId))
      .where(and(eq(confirmacionesLiga.rivalId, playerId), eq(confirmacionesLiga.estado, "pendiente")));
  } catch { return []; }
}

export async function resolverConfirmacion(matchId: string, playerId: string, estado: "confirmado" | "discutido"): Promise<boolean> {
  try {
    const r = await db.update(confirmacionesLiga).set({ estado, resueltoAt: new Date() })
      .where(and(eq(confirmacionesLiga.matchId, matchId), eq(confirmacionesLiga.rivalId, playerId), eq(confirmacionesLiga.estado, "pendiente")))
      .returning({ m: confirmacionesLiga.matchId });
    return r.length > 0;
  } catch { return false; }
}

/** Sin respuesta en 3 días, se da por confirmado. */
export async function autoConfirmar(): Promise<number> {
  try {
    const r = await db.update(confirmacionesLiga).set({ estado: "confirmado", resueltoAt: new Date() })
      .where(sql`${confirmacionesLiga.estado} = 'pendiente' AND ${confirmacionesLiga.reportadoAt} < now() - interval '3 days'`)
      .returning({ m: confirmacionesLiga.matchId });
    return r.length;
  } catch { return 0; }
}
