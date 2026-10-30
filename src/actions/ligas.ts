"use server";

/* Ligas: competiciones, jornadas, mazos de liga y equipos.
   v0.47 — partido de `src/actions/index.ts`. */

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { competitionPlayers, competitions, competitionTeams, leagueDecks, matches } from "@/db/schema";
import { MODALIDADES, TAM_EQUIPO, asModalidad, jornadaEquipos, partidasDeDuelo } from "@/lib/modalidades";
import { canManageLeague } from "@/lib/auth";
import { newId, todayISO } from "@/lib/format";
import { withFlash } from "@/lib/flash";
import { pairRound } from "@/lib/stats";
import { loadSnapshot } from "@/lib/data";
import {
  str, int, isoDate, deckOrArchetype, pick, refresh, requireActor, requireManager, owns,
  msj,
} from "./_comun";

/* ------------------------------------------------------- competiciones -- */

export async function saveCompetition(fd: FormData) {
  // Una competición es de la liga entera: la organiza quien la organiza.
  await requireManager();
  const editing = str(fd, "id");
  const id = editing || newId("c");
  const values = {
    name: str(fd, "name").slice(0, 120),
    // v0.19: sin «casual». Los amistosos son partidas sin competición.
    kind: pick(fd, "kind", ["league", "swiss", "bracket", "elo"] as const, "league"),
    bestOf: int(fd, "bestOf", 3, 1, 5),
    status: pick(fd, "status", ["draft", "live", "done"] as const, "live"),
    start: isoDate(fd, "start") ?? todayISO(),
    end: isoDate(fd, "end", null),
    rounds: int(fd, "rounds", 0, 0, 50),
    topCut: int(fd, "topCut", 0, 0, 64),
    // v0.23: modalidad. «Bo3 · hasta 3 mazos» fuerza series al mejor de tres.
    modality: asModalidad(str(fd, "modality")),
  };
  if (values.modality === "tres_mazos") values.bestOf = 3;
  if (!values.name) return;

  if (editing) await db.update(competitions).set(values).where(eq(competitions.id, id));
  else await db.insert(competitions).values({ id, ...values });

  const chosen = [...new Set(fd.getAll("playerIds").map(String).filter(Boolean))];
  await db.delete(competitionPlayers).where(eq(competitionPlayers.competitionId, id));
  if (chosen.length) {
    await db.insert(competitionPlayers).values(
      chosen.map((playerId, i) => ({ competitionId: id, playerId, seed: i + 1, dropped: false })),
    );
  }
  refresh();
  redirect(`/competiciones/${id}`);
}

export async function deleteCompetition(fd: FormData) {
  await requireManager();
  const id = str(fd, "id");
  const comp = (await db.select({ name: competitions.name }).from(competitions)
    .where(eq(competitions.id, id)))[0];
  await db.delete(competitions).where(eq(competitions.id, id));
  refresh();
  redirect(withFlash(
    "/competiciones", "ok",
    comp ? `Competición «${comp.name}» borrada.` : "Competición borrada.",
  ));
}

export async function createPairings(fd: FormData) {
  await requireManager();
  const compId = str(fd, "competitionId");
  const snap = await loadSnapshot();
  const comp = snap.compsById.get(compId);
  if (!comp || comp.status === "done") return;

  const ids = snap.playersOfComp.get(compId) ?? snap.activePlayerIds;
  const inComp = snap.matches.filter((m) => m.competitionId === compId);
  const nextRound = Math.max(0, ...inComp.map((m) => m.round)) + 1;
  if (comp.rounds > 0 && nextRound > comp.rounds) return;

  // v0.23 — duelo por equipos: la jornada cruza EQUIPOS (todos contra todos)
  // y cada cruce son tres partidas, puesto contra puesto.
  let pairs: Array<[string, string]>;
  if (asModalidad(comp.modality) === "equipos") {
    const equipos = (await db.select().from(competitionTeams)
      .where(eq(competitionTeams.competitionId, compId)))
      .filter((e) => e.members.length === TAM_EQUIPO)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (equipos.length < 2) {
      redirect(withFlash(`/competiciones/${compId}`, "error", await msj("x.891cafff")));
    }
    const byId = new Map(equipos.map((e) => [e.id, e]));
    pairs = jornadaEquipos(equipos.map((e) => e.id), nextRound).cruces
      .flatMap(([a, b]) => partidasDeDuelo(byId.get(a)!, byId.get(b)!));
  } else {
    pairs = pairRound(comp.kind, ids, inComp, snap.elo.rating, snap.config).pairs;
  }
  if (!pairs.length) return;

  await db.insert(matches).values(
    pairs.map(([a, b]) => ({
      id: newId("m"),
      competitionId: compId,
      round: nextRound,
      date: todayISO(),
      playerAId: a,
      playerBId: b,
      bestOf: comp.bestOf,
      status: "scheduled" as const,
    })),
  );
  refresh();
  redirect(`/competiciones/${compId}`);
}

/* ================================================================ v0.18 -- */

/**
 * Entregar el mazo de liga. Una vez guardado queda BLOQUEADO: su dueño ya no
 * puede cambiarlo; solo un organizador puede desbloquearlo (o ponerlo por
 * otra persona). La comprobación va aquí y no en la pantalla.
 */
export async function submitLeagueDeck(fd: FormData) {
  const actor = await requireActor();
  const competitionId = str(fd, "competitionId");
  const playerId = str(fd, "playerId") || actor.id;
  const manager = canManageLeague(actor.role);
  const back = `/competiciones/${competitionId}`;
  if (!competitionId || !owns(actor, playerId)) return;

  const comp = (await db.select({ id: competitions.id }).from(competitions)
    .where(eq(competitions.id, competitionId)))[0];
  if (!comp) return;

  // Solo participantes: los apuntados a la competición o, si no hay lista, cualquiera activo.
  const apuntados = await db.select({ playerId: competitionPlayers.playerId }).from(competitionPlayers)
    .where(eq(competitionPlayers.competitionId, competitionId));
  if (apuntados.length && !apuntados.some((r) => r.playerId === playerId)) {
    redirect(withFlash(back, "error", await msj("x.8b72236c")));
  }

  // v0.23: según la modalidad, uno (`deck`) o hasta tres (`deck1`…`deck3`).
  const compRow = (await db.select({ modality: competitions.modality }).from(competitions)
    .where(eq(competitions.id, competitionId)))[0];
  const max = MODALIDADES[asModalidad(compRow?.modality)].maxMazos;
  const campos = max > 1 ? Array.from({ length: max }, (_, i) => `deck${i + 1}`) : ["deck"];
  const elegidos = campos
    .map((k) => deckOrArchetype(fd, k))
    .filter((d) => d.deckId || d.archetypeId);
  // Sin repetir el mismo mazo en dos huecos.
  const vistos = new Set<string>();
  const unicos = elegidos.filter((d) => {
    const k = d.deckId ?? `a:${d.archetypeId}`;
    if (vistos.has(k)) return false;
    vistos.add(k); return true;
  });
  if (!unicos.length) redirect(withFlash(back, "error", await msj("x.393dac8d")));

  const where = and(eq(leagueDecks.competitionId, competitionId), eq(leagueDecks.playerId, playerId));
  const existing = (await db.select({ playerId: leagueDecks.playerId }).from(leagueDecks).where(where))[0];
  if (existing && !manager) {
    redirect(withFlash(back, "error", await msj("x.7fa3f97a")));
  }

  // Un organizador que rehace la entrega: se cambia entera.
  if (existing) await db.delete(leagueDecks).where(where);
  await db.insert(leagueDecks)
    .values(unicos.map((d, i) => ({
      competitionId, playerId, slot: i + 1, deckId: d.deckId, archetypeId: d.archetypeId, createdBy: actor.id,
    })))
    // Dos envíos seguidos no deben pisar el primero: el bloqueo es el bloqueo.
    .onConflictDoNothing();
  refresh();
  redirect(withFlash(back, "ok", unicos.length > 1
    ? `${unicos.length} mazos de liga entregados y bloqueados.` : "Mazo de liga entregado y bloqueado."));
}

/** Desbloquear el mazo de liga de alguien (borra la entrega). Solo organizadores. */
export async function unlockLeagueDeck(fd: FormData) {
  await requireManager();
  const competitionId = str(fd, "competitionId");
  const playerId = str(fd, "playerId");
  if (!competitionId || !playerId) return;
  await db.delete(leagueDecks)
    .where(and(eq(leagueDecks.competitionId, competitionId), eq(leagueDecks.playerId, playerId)));
  refresh();
  redirect(withFlash(`/competiciones/${competitionId}`, "ok", await msj("x.96a73186")));
}

/* ================================================================ v0.23 -- */

/**
 * Crear o editar un equipo de una liga «Duelo por equipos». Solo
 * organizadores. Tres miembros, distintos, que participen en la liga y que no
 * estén ya en otro equipo de la misma liga. El orden es el puesto.
 */
export async function saveTeam(fd: FormData) {
  await requireManager();
  const competitionId = str(fd, "competitionId");
  const back = `/competiciones/${competitionId}`;
  const editing = str(fd, "teamId");
  const name = str(fd, "name").slice(0, 40);
  const members = [1, 2, 3].map((i) => str(fd, `member${i}`)).filter(Boolean);
  if (!competitionId || !name) redirect(withFlash(back, "error", await msj("x.75619af7")));
  if (members.length !== TAM_EQUIPO || new Set(members).size !== TAM_EQUIPO) {
    redirect(withFlash(back, "error", await msj("x.fff38ea4")));
  }
  const apuntados = await db.select({ playerId: competitionPlayers.playerId }).from(competitionPlayers)
    .where(eq(competitionPlayers.competitionId, competitionId));
  if (apuntados.length && members.some((m) => !apuntados.some((a) => a.playerId === m))) {
    redirect(withFlash(back, "error", await msj("x.32f25ca4")));
  }
  const otros = (await db.select().from(competitionTeams)
    .where(eq(competitionTeams.competitionId, competitionId)))
    .filter((e) => e.id !== editing);
  const repetido = members.find((m) => otros.some((e) => e.members.includes(m)));
  if (repetido) redirect(withFlash(back, "error", await msj("x.d492178b")));

  if (editing) {
    await db.update(competitionTeams).set({ name, members })
      .where(and(eq(competitionTeams.id, editing), eq(competitionTeams.competitionId, competitionId)));
  } else {
    await db.insert(competitionTeams).values({ id: newId("tm"), competitionId, name, members });
  }
  refresh();
  redirect(withFlash(back, "ok", `Equipo «${name}» guardado.`));
}

export async function deleteTeam(fd: FormData) {
  await requireManager();
  const competitionId = str(fd, "competitionId");
  const teamId = str(fd, "teamId");
  if (!competitionId || !teamId) return;
  await db.delete(competitionTeams)
    .where(and(eq(competitionTeams.id, teamId), eq(competitionTeams.competitionId, competitionId)));
  refresh();
  redirect(withFlash(`/competiciones/${competitionId}`, "ok", await msj("x.b3a7a59e")));
}
