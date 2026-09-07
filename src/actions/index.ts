"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import {
  archetypes, competitionPlayers, competitions, decks, events, games, matches, players, settings,
} from "@/db/schema";
import { clearSession, codeMatches, effectiveInviteCode, writeSession } from "@/lib/auth";
import { parseDeckList, suggestArchetype } from "@/lib/decklist";
import { newId, todayISO } from "@/lib/format";
import { pokeSlug } from "@/lib/pokemon";
import { pairRound } from "@/lib/stats";
import { loadSnapshot } from "@/lib/data";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string, dflt = 0) => {
  const n = Number(fd.get(k));
  return Number.isFinite(n) ? n : dflt;
};
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

function refresh() {
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------------- acceso --- */

export async function enterLeague(
  _prev: { error?: string } | null,
  fd: FormData,
): Promise<{ error?: string } | null> {
  const rows = await db.select().from(settings).where(eq(settings.id, "default"));
  const expected = effectiveInviteCode(rows[0]?.inviteCode ?? "");
  if (expected && !codeMatches(str(fd, "code"), expected)) {
    return { error: "Ese código no es el de la liga." };
  }
  const playerId = str(fd, "playerId");
  if (!playerId) return { error: "Elige quién eres." };

  const player = (await db.select().from(players).where(eq(players.id, playerId)))[0];
  if (!player) return { error: "Ese jugador ya no existe." };
  if (player.pin && player.pin !== str(fd, "pin")) {
    return { error: `${player.name} tiene PIN y no coincide.` };
  }
  await writeSession(playerId);
  redirect("/");
}

export async function switchPlayer(fd: FormData) {
  const id = str(fd, "playerId");
  if (id) await writeSession(id);
  refresh();
}

export async function logout() {
  await clearSession();
  redirect("/entrar");
}

/* ------------------------------------------------------------ jugadores - */

export async function savePlayer(fd: FormData) {
  const id = str(fd, "id") || newId("p");
  const values = {
    name: str(fd, "name"),
    color: str(fd, "color") || "#f0b429",
    isAdmin: bool(fd, "isAdmin"),
    active: bool(fd, "active"),
    pin: str(fd, "pin") || null,
    joined: str(fd, "joined") || todayISO(),
  };
  if (!values.name) return;
  if (str(fd, "id")) {
    await db.update(players).set(values).where(eq(players.id, id));
  } else {
    await db.insert(players).values({ id, ...values });
  }
  refresh();
}

export async function deletePlayer(fd: FormData) {
  const id = str(fd, "id");
  if (!id) return;
  // Si el jugador tiene partidas no se borra: se desactiva. Borrarlo dejaría
  // huérfano el historial y el ranking dejaría de cuadrar.
  const used = await db
    .select({ id: matches.id })
    .from(matches)
    .where(or(eq(matches.playerAId, id), eq(matches.playerBId, id)))
    .limit(1);
  if (used.length) await db.update(players).set({ active: false }).where(eq(players.id, id));
  else await db.delete(players).where(eq(players.id, id));
  refresh();
}

/* ---------------------------------------------------------- arquetipos -- */

export async function saveArchetype(fd: FormData) {
  const id = str(fd, "id") || newId("a");
  const main = pokeSlug(str(fd, "main"));
  const secondary = pokeSlug(str(fd, "secondary"));
  const values = {
    name: str(fd, "name") || [main, secondary].filter(Boolean).join(" / "),
    main, secondary,
    type: str(fd, "type") || "colorless",
  };
  if (!values.name) return;
  if (str(fd, "id")) await db.update(archetypes).set(values).where(eq(archetypes.id, id));
  else await db.insert(archetypes).values({ id, ...values });
  refresh();
}

/** Devuelve el arquetipo que encaja con estos dos Pokémon, creándolo si hace falta. */
async function ensureArchetype(main: string, secondary: string, type: string, name: string) {
  const m = pokeSlug(main), s = pokeSlug(secondary);
  if (m) {
    const found = await db.select().from(archetypes)
      .where(and(eq(archetypes.main, m), eq(archetypes.secondary, s)));
    if (found[0]) return found[0].id;
  }
  const id = newId("a");
  await db.insert(archetypes).values({
    id,
    name: name || [m, s].filter(Boolean).join(" / ") || "Arquetipo sin nombre",
    main: m, secondary: s, type: type || "colorless",
  });
  return id;
}

/* --------------------------------------------------------------- mazos -- */

export async function saveDeck(fd: FormData) {
  const id = str(fd, "id") || newId("d");
  const list = String(fd.get("list") ?? "");
  const parsed = list.trim() ? parseDeckList(list) : null;

  let main = str(fd, "main");
  let secondary = str(fd, "secondary");
  if (!main && parsed) {
    const s = suggestArchetype(parsed);
    main = s.main;
    secondary = s.secondary;
  }

  const pickedArchetype = str(fd, "archetypeId");
  const archetypeId = pickedArchetype
    || (await ensureArchetype(main, secondary, str(fd, "type"), str(fd, "archetypeName")));

  const values = {
    playerId: str(fd, "playerId"),
    archetypeId,
    name: str(fd, "name") || [main, secondary].filter(Boolean).join(" / ") || "Mazo",
    list,
    listJson: parsed,
    format: str(fd, "format") || "standard",
    created: str(fd, "created") || todayISO(),
  };
  if (!values.playerId) return;

  if (str(fd, "id")) await db.update(decks).set(values).where(eq(decks.id, id));
  else await db.insert(decks).values({ id, ...values });
  refresh();
  redirect("/mazos");
}

export async function deleteDeck(fd: FormData) {
  await db.delete(decks).where(eq(decks.id, str(fd, "id")));
  refresh();
  redirect("/mazos");
}

/* ------------------------------------------------------------ partidas -- */

export async function saveMatch(fd: FormData) {
  const id = str(fd, "id") || newId("m");
  const bestOf = num(fd, "bestOf", 3);
  const values = {
    competitionId: str(fd, "competitionId") || null,
    round: num(fd, "round", 0),
    date: str(fd, "date") || todayISO(),
    playerAId: str(fd, "playerAId"),
    playerBId: str(fd, "playerBId"),
    deckAId: str(fd, "deckAId") || null,
    deckBId: str(fd, "deckBId") || null,
    bestOf,
    status: "done" as const,
    note: str(fd, "note"),
  };
  if (!values.playerAId || !values.playerBId || values.playerAId === values.playerBId) return;

  const rows: Array<{ number: number; winner: string; first: string; prizesLeft: number | null }> = [];
  for (let i = 0; i < bestOf; i++) {
    const winner = str(fd, `g${i}_winner`);
    if (!winner) continue;
    const prizes = str(fd, `g${i}_prizes`);
    rows.push({
      number: i + 1,
      winner,
      first: str(fd, `g${i}_first`),
      prizesLeft: prizes === "" ? null : Number(prizes),
    });
  }
  if (!rows.length) return;

  if (str(fd, "id")) {
    await db.update(matches).set(values).where(eq(matches.id, id));
    await db.delete(games).where(eq(games.matchId, id));
  } else {
    await db.insert(matches).values({ id, ...values });
  }
  await db.insert(games).values(rows.map((r) => ({ matchId: id, ...r, note: "" })));
  refresh();
  redirect("/resultados");
}

export async function deleteMatch(fd: FormData) {
  await db.delete(matches).where(eq(matches.id, str(fd, "id")));
  refresh();
  redirect("/resultados");
}

/* ------------------------------------------------------- competiciones -- */

export async function saveCompetition(fd: FormData) {
  const id = str(fd, "id") || newId("c");
  const values = {
    name: str(fd, "name"),
    kind: str(fd, "kind") || "league",
    bestOf: num(fd, "bestOf", 3),
    status: str(fd, "status") || "live",
    start: str(fd, "start") || todayISO(),
    end: str(fd, "end") || null,
    rounds: num(fd, "rounds", 0),
    topCut: num(fd, "topCut", 0),
  };
  if (!values.name) return;

  if (str(fd, "id")) await db.update(competitions).set(values).where(eq(competitions.id, id));
  else await db.insert(competitions).values({ id, ...values });

  const chosen = fd.getAll("playerIds").map(String);
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
  await db.delete(competitions).where(eq(competitions.id, str(fd, "id")));
  refresh();
  redirect("/competiciones");
}

/** Crea los enfrentamientos de la siguiente ronda, en estado "pendiente". */
export async function createPairings(fd: FormData) {
  const compId = str(fd, "competitionId");
  const snap = await loadSnapshot();
  const comp = snap.compsById.get(compId);
  if (!comp) return;

  const ids = snap.playersOfComp.get(compId) ?? snap.activePlayerIds;
  const inComp = snap.matches.filter((m) => m.competitionId === compId);
  const nextRound = Math.max(0, ...inComp.map((m) => m.round)) + 1;
  const { pairs } = pairRound(comp.kind, ids, inComp, snap.elo.rating, snap.config);
  if (!pairs.length) return;

  await db.insert(matches).values(
    pairs.map(([a, b]) => ({
      id: newId("m"),
      competitionId: compId,
      round: nextRound,
      date: todayISO(),
      playerAId: a,
      playerBId: b,
      deckAId: null,
      deckBId: null,
      bestOf: comp.bestOf,
      status: "scheduled" as const,
      note: "",
    })),
  );
  refresh();
  redirect(`/competiciones/${compId}`);
}

/* ------------------------------------------------------------- eventos -- */

export async function saveEvent(fd: FormData) {
  const id = str(fd, "id") || newId("e");
  const values = {
    title: str(fd, "title"),
    date: str(fd, "date") || todayISO(),
    kind: str(fd, "kind") || "round",
    competitionId: str(fd, "competitionId") || null,
    note: str(fd, "note"),
  };
  if (!values.title) return;
  if (str(fd, "id")) await db.update(events).set(values).where(eq(events.id, id));
  else await db.insert(events).values({ id, ...values });
  refresh();
}

export async function deleteEvent(fd: FormData) {
  await db.delete(events).where(eq(events.id, str(fd, "id")));
  refresh();
}

/* ------------------------------------------------------------- ajustes -- */

export async function saveSettings(fd: FormData) {
  const values = {
    name: str(fd, "name") || "Liga Arena",
    season: str(fd, "season") || "Temporada 1",
    ptsWin: num(fd, "ptsWin", 3),
    ptsTie: num(fd, "ptsTie", 1),
    ptsLoss: num(fd, "ptsLoss", 0),
    eloStart: num(fd, "eloStart", 1000),
    eloK: num(fd, "eloK", 24),
    inviteCode: str(fd, "inviteCode"),
    updatedAt: new Date(),
  };
  const existing = await db.select().from(settings).where(eq(settings.id, "default"));
  if (existing[0]) await db.update(settings).set(values).where(eq(settings.id, "default"));
  else await db.insert(settings).values({ id: "default", ...values });
  refresh();
}
