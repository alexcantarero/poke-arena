"use server";

/* =========================================================================
   v0.116 — Liga por divisiones: crear la temporada, apuntarse, sortear y
   empezar. Cada acción comprueba sesión y papel por dentro.

   Ciclo de una temporada:
     inscripcion → (sorteo, se puede repetir) → en_curso → cerrada (v0.117)
   Quien se apunta con la temporada ya en curso queda EN ESPERA para la
   siguiente.
   ========================================================================= */

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  competitionPlayers, competitions, ligaDivisiones, ligaInscripciones, ligaTemporadas, matches, players,
} from "@/db/schema";
import { newId, todayISO } from "@/lib/format";
import { withFlash } from "@/lib/flash";
import { clasificarDivision, fechaJornada, movimientos, siguienteReparto, sortearDivisiones, todosContraTodos, type PartidaDivision } from "@/lib/ligaDivisiones";
import { ordenesAnteriores } from "@/lib/ligaTemporadaDb";
import { loadSnapshot } from "@/lib/data";
import { isPlayed, outcome } from "@/lib/stats";
import { notificarLiga } from "@/lib/discord";
import { bool, int, isoDate, msj, refresh, requireActor, requireManager, str } from "./_comun";

const RUTA = "/divisiones";

async function temporadaAbierta() {
  const [t] = await db.select().from(ligaTemporadas)
    .where(inArray(ligaTemporadas.estado, ["inscripcion", "en_curso"]))
    .orderBy(desc(ligaTemporadas.numero)).limit(1);
  return t;
}

export async function crearTemporadaLiga(fd: FormData) {
  await requireManager();
  if (await temporadaAbierta()) redirect(withFlash(RUTA, "error", await msj("v116.yaAbierta")));
  const [ultima] = await db.select({ numero: ligaTemporadas.numero }).from(ligaTemporadas)
    .orderBy(desc(ligaTemporadas.numero)).limit(1);
  const numero = (ultima?.numero ?? 0) + 1;
  const bestOf = [1, 3, 5].includes(int(fd, "bestOf", 3, 1, 5)) ? int(fd, "bestOf", 3, 1, 5) : 3;
  const valores = {
    id: newId("lt"),
    numero,
    nombre: (str(fd, "nombre") || `Season ${numero}`).slice(0, 60),
    estado: "inscripcion",
    maxPorDivision: int(fd, "maxPorDivision", 6, 2, 16),
    bestOf,
    inicio: isoDate(fd, "inicio") ?? todayISO(),
  };
  await db.insert(ligaTemporadas).values(valores);
  /* Quien jugó la temporada anterior y quien quedó en espera entra apuntado
     solo (se puede borrar). Así nadie tiene que acordarse de volver a apuntarse. */
  const [anterior] = await db.select({ id: ligaTemporadas.id }).from(ligaTemporadas)
    .where(eq(ligaTemporadas.estado, "cerrada")).orderBy(desc(ligaTemporadas.numero)).limit(1);
  if (anterior) {
    const divs = await db.select({ c: ligaDivisiones.competitionId }).from(ligaDivisiones).where(eq(ligaDivisiones.temporadaId, anterior.id));
    const jugaron = divs.length
      ? (await db.select({ p: competitionPlayers.playerId }).from(competitionPlayers)
        .where(inArray(competitionPlayers.competitionId, divs.map((d) => d.c)))).map((r) => r.p)
      : [];
    const esperaban = (await db.select({ p: ligaInscripciones.playerId }).from(ligaInscripciones)
      .where(and(eq(ligaInscripciones.temporadaId, anterior.id), eq(ligaInscripciones.estado, "espera")))).map((r) => r.p);
    const ids = [...new Set([...jugaron, ...esperaban])];
    if (ids.length) {
      await db.insert(ligaInscripciones).values(ids.map((playerId) => ({ temporadaId: valores.id, playerId, estado: "inscrito" })))
        .onConflictDoNothing();
    }
  }
  // El aviso a Discord nunca rompe la acción (ver `lib/discord.ts`).
  await notificarLiga({ tipo: "inscripcion", nombre: valores.nombre, inicio: valores.inicio, maxPorDivision: valores.maxPorDivision });
  refresh();
  redirect(withFlash(RUTA, "ok", await msj("v116.creada", { n: valores.nombre })));
}

export async function apuntarmeLiga() {
  const actor = await requireActor();
  const t = await temporadaAbierta();
  if (!t) redirect(withFlash(RUTA, "error", await msj("v116.noHay")));
  const estado = t.estado === "en_curso" ? "espera" : "inscrito";
  await db.insert(ligaInscripciones).values({ temporadaId: t.id, playerId: actor.id, estado })
    .onConflictDoNothing();
  refresh();
  redirect(withFlash(RUTA, "ok", await msj(estado === "espera" ? "v116.enEspera" : "v116.apuntado")));
}

export async function borrarmeLiga() {
  const actor = await requireActor();
  const t = await temporadaAbierta();
  if (!t) redirect(RUTA);
  // Con la temporada en curso solo se puede salir de la lista de espera:
  // quien ya está en una división sigue en ella hasta el final.
  await db.delete(ligaInscripciones).where(and(
    eq(ligaInscripciones.temporadaId, t.id),
    eq(ligaInscripciones.playerId, actor.id),
    ...(t.estado === "en_curso" ? [eq(ligaInscripciones.estado, "espera")] : []),
  ));
  refresh();
  redirect(withFlash(RUTA, "ok", await msj("v116.borrado")));
}

/** Sortea (o vuelve a sortear) las divisiones. Solo guarda la semilla: el reparto se ve antes de empezar. */
export async function sortearLiga() {
  await requireManager();
  const t = await temporadaAbierta();
  if (!t || t.estado !== "inscripcion") redirect(RUTA);
  const inscritos = await db.select({ p: ligaInscripciones.playerId }).from(ligaInscripciones)
    .where(and(eq(ligaInscripciones.temporadaId, t.id), eq(ligaInscripciones.estado, "inscrito")));
  if (inscritos.length < 2) redirect(withFlash(RUTA, "error", await msj("v116.pocos")));
  await db.update(ligaTemporadas).set({ semilla: randomUUID() }).where(eq(ligaTemporadas.id, t.id));
  refresh();
  redirect(withFlash(RUTA, "ok", await msj("v116.sorteado")));
}

/**
 * Empieza la temporada con el sorteo que se ve en pantalla: una competición
 * por división, sus jugadores y TODAS sus jornadas (una por semana desde el
 * inicio), en una sola transacción.
 */
export async function empezarLiga() {
  await requireManager();
  const t = await temporadaAbierta();
  if (!t || t.estado !== "inscripcion") redirect(RUTA);
  // Desde la segunda temporada el reparto sale de la anterior (suben 2, bajan 2);
  // en la primera, del sorteo.
  const previas = await ordenesAnteriores();
  if (!previas && !t.semilla) redirect(withFlash(RUTA, "error", await msj("v116.sinSorteo")));
  const inscritos = (await db.select({ p: ligaInscripciones.playerId }).from(ligaInscripciones)
    .where(and(eq(ligaInscripciones.temporadaId, t.id), eq(ligaInscripciones.estado, "inscrito"))))
    .map((r) => r.p);
  if (inscritos.length < 2) redirect(withFlash(RUTA, "error", await msj("v116.pocos")));

  const reparto = previas
    ? siguienteReparto(previas, inscritos, t.maxPorDivision)
    : sortearDivisiones(inscritos, t.maxPorDivision, t.semilla!);
  await db.transaction(async (tx) => {
    for (const [i, ids] of reparto.entries()) {
      const nivel = i + 1;
      const competitionId = `liga-${t.id}-d${nivel}`;
      const jornadas = todosContraTodos(ids);
      await tx.insert(competitions).values({
        id: competitionId,
        name: `${t.nombre} · División ${nivel}`,
        kind: "league",
        bestOf: t.bestOf,
        status: "live",
        start: t.inicio,
        end: jornadas.length ? fechaJornada(t.inicio, jornadas.length) : t.inicio,
        rounds: jornadas.length,
        topCut: 0,
        modality: "mazo_fijo",
      }).onConflictDoNothing();
      await tx.insert(competitionPlayers).values(ids.map((playerId, k) => ({ competitionId, playerId, seed: k + 1, dropped: false })));
      const filas = jornadas.flatMap((j, k) => j.cruces.map(([a, b]) => ({
        id: newId("m"),
        competitionId,
        round: k + 1,
        date: fechaJornada(t.inicio, k + 1),
        playerAId: a,
        playerBId: b,
        bestOf: t.bestOf,
        status: "scheduled" as const,
      })));
      if (filas.length) await tx.insert(matches).values(filas);
      await tx.insert(ligaDivisiones).values({ temporadaId: t.id, nivel, competitionId }).onConflictDoNothing();
    }
    await tx.update(ligaTemporadas).set({ estado: "en_curso", empezadaAt: new Date() }).where(eq(ligaTemporadas.id, t.id));
  });

  const nombres = new Map<string, string>((await db.select({ id: players.id, name: players.name }).from(players)).map((p) => [p.id, p.name]));
  await notificarLiga({
    tipo: "empieza", nombre: t.nombre,
    divisiones: reparto.map((ids, i) => ({ nivel: i + 1, jugadores: ids.map((id) => nombres.get(id) ?? "?") })),
  });
  refresh();
  redirect(withFlash(RUTA, "ok", await msj("v116.empezada", { n: t.nombre })));
}

/**
 * Cierra la temporada: guarda la clasificación final de cada división (con los
 * desempates Bo3 de `clasificarDivision`), da por terminadas sus
 * competiciones y corona al 1.º de la División 1 con el Cinturón de Liga. Con
 * esas clasificaciones se reparte la temporada siguiente.
 */
export async function cerrarLiga(fd: FormData) {
  await requireManager();
  const t = await temporadaAbierta();
  if (!t || t.estado !== "en_curso") redirect(RUTA);
  const divs = await db.select().from(ligaDivisiones).where(eq(ligaDivisiones.temporadaId, t.id));
  divs.sort((a, b) => a.nivel - b.nivel);
  const snap = await loadSnapshot();
  const pendientes = snap.matches.filter((m) => divs.some((d) => d.competitionId === m.competitionId) && !isPlayed(m)).length;
  if (pendientes && !bool(fd, "aunAsi")) redirect(withFlash(RUTA, "error", await msj("v116.quedanPartidas", { n: pendientes })));

  const ordenes: string[][] = [];
  for (const d of divs) {
    const ids = snap.playersOfComp.get(d.competitionId) ?? [];
    const partidas: PartidaDivision[] = snap.matches
      .filter((m) => m.competitionId === d.competitionId && m.playerBId && isPlayed(m))
      .map((m) => {
        const o = outcome(m);
        return { a: m.playerAId, b: m.playerBId!, ga: o.ga, gb: o.gb, ganador: o.winner };
      });
    ordenes.push(clasificarDivision(ids, partidas).map((f) => f.id));
  }
  const campeonId = ordenes[0]?.[0] ?? null;
  await db.transaction(async (tx) => {
    for (const [i, d] of divs.entries()) {
      await tx.update(ligaDivisiones).set({ ordenFinal: ordenes[i] })
        .where(and(eq(ligaDivisiones.temporadaId, t.id), eq(ligaDivisiones.nivel, d.nivel)));
      await tx.update(competitions).set({ status: "done" }).where(eq(competitions.id, d.competitionId));
    }
    await tx.update(ligaTemporadas).set({ estado: "cerrada", cerradaAt: new Date(), campeonId })
      .where(eq(ligaTemporadas.id, t.id));
  });

  const nombre = (id: string) => snap.playersById.get(id)?.name ?? "?";
  const mov = movimientos(ordenes);
  await notificarLiga({
    tipo: "cierre", nombre: t.nombre, campeon: campeonId ? nombre(campeonId) : null,
    divisiones: mov.map((m, i) => ({ nivel: i + 1, suben: m.sube.map(nombre), bajan: m.baja.map(nombre) })),
  });
  refresh();
  redirect(withFlash(RUTA, "ok", await msj("v116.cerrada", { n: t.nombre })));
}
