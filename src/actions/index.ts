"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  archetypes, competitionPlayers, competitions, decks, events, games, invites, ladderEntries,
  matches, players, settings, tournamentResults, tournaments,
} from "@/db/schema";
import {
  canManageLeague, clearSession, DUMMY_HASH, emailProblem, hashPassword, INVITE_MESSAGES,
  isOwner, newInviteToken, normalizeEmail, passwordProblem, readSession, verifyPassword,
  writeSession,
} from "@/lib/auth";
import { parseDeckList, suggestArchetype } from "@/lib/decklist";
import { isIsoDate, newId, todayISO } from "@/lib/format";
import { pokeSlug } from "@/lib/pokemon";
import { cpForPlacement, seasonOfDate } from "@/lib/cp";
import { pairRound } from "@/lib/stats";
import { LADDER_MAX, LADDER_MIN, rankOf } from "@/lib/rank";
import { loadSnapshot } from "@/lib/data";
import type { FormState } from "@/lib/types";

/* =========================================================================
   Server Actions.

   Todo lo que escribe en la base de datos pasa por aquí. Dos reglas que no
   se saltan nunca:

   · Una Server Action es un endpoint público. Que la pantalla esconda un
     botón no protege nada: la comprobación de permisos va SIEMPRE dentro de
     la acción, comparando con quién está firmado en la cookie.
   · Lo que llega en el FormData es texto de fuera. Se valida antes de tocar
     una columna — fechas, números y enumerados incluidos.
   ========================================================================= */

/* ---------------------------------------------------------- utilidades -- */

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/**
 * Número de un campo, con valor por defecto de verdad.
 *
 * Ojo con la trampa: `fd.get(k)` es null cuando el campo no viene, y
 * `Number(null)` es 0, que es finito. Con la versión ingenua, un formulario
 * incompleto ponía maxUses a 0 (= invitación ilimitada) en vez de a 1.
 */
const num = (fd: FormData, k: string, dflt = 0) => {
  const raw = str(fd, k);
  if (raw === "") return dflt;
  const n = Number(raw);
  return Number.isFinite(n) ? n : dflt;
};

const maybeNum = (fd: FormData, k: string) => {
  const raw = str(fd, k);
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/** Entero acotado. Para todo lo que acaba en una columna `integer`. */
const int = (fd: FormData, k: string, dflt: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(num(fd, k, dflt))));

/** Entero acotado que puede faltar. */
const maybeInt = (fd: FormData, k: string, min: number, max: number) => {
  const n = maybeNum(fd, k);
  if (n == null) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
};

/** Fecha ISO validada. Una cadena rara reventaba la consulta con un 500. */
const isoDate = (fd: FormData, k: string, dflt: string | null = todayISO()) => {
  const raw = str(fd, k);
  return isIsoDate(raw) ? raw : dflt;
};

const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

/** Valor de una lista cerrada, o el primero de la lista. */
const pick = <T extends string>(fd: FormData, k: string, allowed: readonly T[], dflt: T): T => {
  const v = str(fd, k) as T;
  return allowed.includes(v) ? v : dflt;
};

function refresh() {
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------------ permisos -- */

/** Quién está actuando. Si no hay sesión válida, a la puerta. */
async function requireActor() {
  const session = await readSession();
  if (!session) redirect("/entrar");
  const rows = await db.select().from(players).where(eq(players.id, session.playerId));
  const actor = rows[0];
  if (!actor || !actor.active) {
    await clearSession();
    redirect("/entrar");
  }
  return actor;
}

/** Solo organizadores. Los demás se van a la portada en vez de ver un error feo. */
async function requireManager() {
  const actor = await requireActor();
  if (!canManageLeague(actor.role)) redirect("/");
  return actor;
}

type Actor = Awaited<ReturnType<typeof requireActor>>;

/** ¿Puede este actor tocar algo que pertenece a `ownerId`? */
const owns = (actor: Actor, ownerId: string | null | undefined) =>
  ownerId === actor.id || canManageLeague(actor.role);

/** Cuántos propietarios activos quedan. La liga nunca puede quedarse sin ninguno. */
async function ownerCount() {
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(players)
    .where(and(eq(players.role, "owner"), eq(players.active, true)));
  return rows[0]?.n ?? 0;
}

/* -------------------------------------------------------------- acceso -- */

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = normalizeEmail(str(fd, "email"));
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Faltan el correo o la contraseña." };

  const rows = await db.select().from(players).where(eq(players.email, email));
  const player = rows[0];
  // Mismo mensaje en los dos casos: no decimos si el correo existe.
  const bad = { error: "Correo o contraseña incorrectos." };
  if (!player) {
    // Y gastamos scrypt igualmente contra un hash señuelo, para que fallar no
    // sea perceptiblemente más rápido y el reloj no delate qué correos existen.
    await verifyPassword(password, DUMMY_HASH);
    return bad;
  }
  if (!(await verifyPassword(password, player.passwordHash))) return bad;
  if (!player.active) return { error: "Tu cuenta está desactivada. Habla con el organizador." };

  await db.update(players).set({ lastSeenAt: new Date() }).where(eq(players.id, player.id));
  await writeSession(player.id);
  redirect("/");
}

const PALETTE = ["#f0b429", "#4aa8e8", "#63bd5a", "#e987b8", "#b271c9", "#f0803c", "#9aa6b4", "#c8a94a", "#5c9ea8", "#d4675f"];

/**
 * Alta desde un enlace de invitación.
 *
 * El orden importa: primero se consume la invitación con un UPDATE
 * condicional —una sola sentencia, así que la base de datos serializa las
 * carreras— y solo si esa sentencia devuelve fila se crea el jugador. Al revés,
 * dos personas abriendo el mismo enlace de un uso entraban las dos.
 */
export async function register(_prev: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, "token");
  const name = str(fd, "name");
  const email = normalizeEmail(str(fd, "email"));
  const password = String(fd.get("password") ?? "");

  if (!token) return { error: INVITE_MESSAGES.missing };

  const cfg = await db.select().from(settings).where(eq(settings.id, "default"));
  if (cfg[0] && !cfg[0].registrationOpen) {
    return { error: "Las altas están cerradas ahora mismo." };
  }

  if (!name) return { error: "Falta tu nombre." };
  const emailBad = emailProblem(email);
  if (emailBad) return { error: emailBad };
  const passBad = passwordProblem(password);
  if (passBad) return { error: passBad };

  const existing = await db.select({ id: players.id }).from(players).where(eq(players.email, email));
  if (existing[0]) return { error: "Ya hay una cuenta con ese correo. Entra con ella." };

  // Consumir y comprobar en la misma sentencia.
  const [claimed] = await db.update(invites)
    .set({ uses: sql`${invites.uses} + 1` })
    .where(and(
      eq(invites.token, token),
      eq(invites.revoked, false),
      or(eq(invites.maxUses, 0), sql`${invites.uses} < ${invites.maxUses}`),
      or(isNull(invites.expiresAt), gt(invites.expiresAt, new Date())),
    ))
    .returning();

  if (!claimed) {
    // Puede ser que no exista, que esté anulada, caducada o agotada. Para quien
    // se registra da igual: en los cuatro casos necesita otra.
    return { error: "Esta invitación ya no vale. Pídele a quien te la mandó que genere otra." };
  }

  const id = newId("p");
  const total = await db.select({ n: sql<number>`count(*)::int` }).from(players);
  const seen = total[0]?.n ?? 0;
  const isFirst = seen === 0;

  try {
    await db.insert(players).values({
      id,
      name,
      email,
      passwordHash: await hashPassword(password),
      // El primero en entrar se queda como dueño de la liga.
      role: isFirst ? "owner" : (claimed.role === "admin" ? "admin" : "player"),
      active: true,
      color: PALETTE[seen % PALETTE.length],
      joined: todayISO(),
      lastSeenAt: new Date(),
    });
  } catch {
    // Si el alta se cae, devolvemos el uso: la invitación no se puede quedar
    // gastada por un error nuestro.
    await db.update(invites)
      .set({ uses: sql`greatest(${invites.uses} - 1, 0)` })
      .where(eq(invites.token, token));
    return { error: "No se ha podido crear la cuenta. Vuelve a intentarlo." };
  }

  await writeSession(id);
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/entrar");
}

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActor();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  if (!(await verifyPassword(current, actor.passwordHash))) {
    return { error: "La contraseña actual no es correcta." };
  }
  const bad = passwordProblem(next);
  if (bad) return { error: bad };
  await db.update(players).set({ passwordHash: await hashPassword(next) }).where(eq(players.id, actor.id));
  // La sesión actual sigue valiendo; se vuelve a emitir para que la cookie
  // cuente desde ahora.
  await writeSession(actor.id);
  return { ok: "Contraseña cambiada." };
}

/* -------------------------------------------------------- invitaciones -- */

export async function createInvite(fd: FormData) {
  const actor = await requireManager();
  const days = int(fd, "days", 14, 0, 365);
  await db.insert(invites).values({
    token: newInviteToken(),
    label: str(fd, "label").slice(0, 80),
    role: str(fd, "role") === "admin" ? "admin" : "player",
    maxUses: int(fd, "maxUses", 1, 0, 100),
    expiresAt: days > 0 ? new Date(Date.now() + days * 86400000) : null,
    createdBy: actor.id,
  });
  refresh();
}

export async function revokeInvite(fd: FormData) {
  await requireManager();
  await db.update(invites).set({ revoked: true }).where(eq(invites.token, str(fd, "token")));
  refresh();
}

/* ----------------------------------------------------------- jugadores -- */

export async function saveProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActor();
  const targetId = str(fd, "id") || actor.id;
  if (!owns(actor, targetId)) return { error: "Solo puedes editar tu propio perfil." };

  const name = str(fd, "name");
  if (!name) return { error: "Falta el nombre." };

  const avatarKind = pick(fd, "avatarKind", ["none", "pokemon", "image"] as const, "none");
  const rawAvatar = str(fd, "avatarValue");
  let avatarValue = "";
  if (avatarKind === "pokemon") {
    avatarValue = pokeSlug(rawAvatar);
  } else if (avatarKind === "image") {
    // Solo https. Una URL de un servidor cualquiera convierte el ranking en un
    // registro de quién lo mira y desde dónde.
    if (rawAvatar && !/^https:\/\//i.test(rawAvatar)) {
      return { error: "La imagen tiene que ser una dirección que empiece por https://" };
    }
    avatarValue = rawAvatar.slice(0, 500);
  }

  await db.update(players).set({
    name: name.slice(0, 60),
    color: /^#[0-9a-f]{6}$/i.test(str(fd, "color")) ? str(fd, "color") : "#f0b429",
    avatarKind,
    avatarValue,
    bio: str(fd, "bio").slice(0, 280),
    favoriteArchetypeId: str(fd, "favoriteArchetypeId") || null,
    playerTag: str(fd, "playerTag").slice(0, 60) || null,
  }).where(eq(players.id, targetId));

  refresh();
  return { ok: "Perfil guardado." };
}

export async function setPlayerRole(fd: FormData) {
  const actor = await requireManager();
  const id = str(fd, "id");
  const role = pick(fd, "role", ["owner", "admin", "player"] as const, "player");
  if (!id || id === actor.id) return; // nadie se cambia el papel a sí mismo

  const target = (await db.select().from(players).where(eq(players.id, id)))[0];
  if (!target) return;

  // Dar o quitar "propietario" es cosa del propietario, no de un organizador:
  // si no, un admin podía ascender a un cómplice o degradar al dueño.
  if ((role === "owner" || target.role === "owner") && !isOwner(actor.role)) return;
  // Y nunca dejamos la liga sin dueño.
  if (target.role === "owner" && role !== "owner" && (await ownerCount()) <= 1) return;

  await db.update(players).set({ role }).where(eq(players.id, id));
  refresh();
}

export async function setPlayerActive(fd: FormData) {
  const actor = await requireManager();
  const id = str(fd, "id");
  const active = bool(fd, "active");
  if (!id || id === actor.id) return; // no te desactivas a ti mismo

  const target = (await db.select().from(players).where(eq(players.id, id)))[0];
  if (!target) return;
  if (target.role === "owner" && !isOwner(actor.role)) return;
  if (!active && target.role === "owner" && (await ownerCount()) <= 1) return;

  await db.update(players).set({ active }).where(eq(players.id, id));
  refresh();
}

export async function deletePlayer(fd: FormData) {
  const actor = await requireManager();
  const id = str(fd, "id");
  if (!id || id === actor.id) return;

  const target = (await db.select().from(players).where(eq(players.id, id)))[0];
  if (!target) return;
  if (target.role === "owner") return; // al dueño se le degrada antes de borrarlo

  // Con historial no se borra: se desactiva. Si se borrara, el borrado en
  // cascada se llevaría por delante sus mazos y sus resultados de torneo —y con
  // ellos los CP— y el ranking dejaría de cuadrar.
  const [m, r, d] = await Promise.all([
    db.select({ id: matches.id }).from(matches)
      .where(or(eq(matches.playerAId, id), eq(matches.playerBId, id))).limit(1),
    db.select({ id: tournamentResults.id }).from(tournamentResults)
      .where(eq(tournamentResults.playerId, id)).limit(1),
    db.select({ id: decks.id }).from(decks).where(eq(decks.playerId, id)).limit(1),
  ]);

  if (m.length || r.length || d.length) {
    await db.update(players).set({ active: false }).where(eq(players.id, id));
  } else {
    await db.delete(players).where(eq(players.id, id));
  }
  refresh();
}

/* ---------------------------------------------------------- arquetipos -- */

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

/**
 * Crear arquetipos lo puede hacer cualquiera (hace falta al registrar una
 * partida). Editar uno que ya existe, no: cambia las estadísticas de todos.
 */
export async function saveArchetype(fd: FormData) {
  const actor = await requireActor();
  const editing = str(fd, "id");
  if (editing && !canManageLeague(actor.role)) return;

  const id = editing || newId("a");
  const main = pokeSlug(str(fd, "main"));
  const secondary = pokeSlug(str(fd, "secondary"));
  const values = {
    name: (str(fd, "name") || [main, secondary].filter(Boolean).join(" / ")).slice(0, 80),
    main, secondary,
    type: str(fd, "type") || "colorless",
  };
  if (!values.name) return;
  if (editing) await db.update(archetypes).set(values).where(eq(archetypes.id, id));
  else await db.insert(archetypes).values({ id, ...values });
  refresh();
}

/* --------------------------------------------------------------- mazos -- */

export async function saveDeck(fd: FormData) {
  const actor = await requireActor();
  const editing = str(fd, "id");
  const list = String(fd.get("list") ?? "");
  const parsed = list.trim() ? parseDeckList(list) : null;

  // Al editar, el dueño lo dice la fila que ya está guardada, no el formulario:
  // si no, mandando el id de un mazo ajeno te lo apropiabas.
  let owner = actor.id;
  if (editing) {
    const current = (await db.select().from(decks).where(eq(decks.id, editing)))[0];
    if (!current || !owns(actor, current.playerId)) return;
    owner = current.playerId;
  } else if (canManageLeague(actor.role)) {
    owner = str(fd, "playerId") || actor.id;
  }

  let main = str(fd, "main");
  let secondary = str(fd, "secondary");
  if (!main && parsed) {
    const s = suggestArchetype(parsed);
    main = s.main;
    secondary = s.secondary;
  }

  const picked = str(fd, "archetypeId");
  const archetypeId = picked || (await ensureArchetype(main, secondary, str(fd, "type"), str(fd, "archetypeName")));

  const values = {
    playerId: owner,
    archetypeId,
    name: (str(fd, "name") || [main, secondary].filter(Boolean).join(" / ") || "Mazo").slice(0, 80),
    list,
    listJson: parsed,
    format: str(fd, "format") || "standard",
    retired: bool(fd, "retired"),
    created: isoDate(fd, "created") ?? todayISO(),
  };

  if (editing) await db.update(decks).set(values).where(eq(decks.id, editing));
  else await db.insert(decks).values({ id: newId("d"), ...values });
  refresh();
  redirect("/mazos");
}

export async function deleteDeck(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const current = (await db.select().from(decks).where(eq(decks.id, id)))[0];
  if (!current || !owns(actor, current.playerId)) redirect("/mazos");
  await db.delete(decks).where(eq(decks.id, id));
  refresh();
  redirect("/mazos");
}

/* ------------------------------------------------------------ partidas -- */

const BEST_OF = [1, 3, 5];

export async function saveMatch(fd: FormData) {
  const actor = await requireActor();
  const editing = str(fd, "id");
  const bestOf = int(fd, "bestOf", 3, 1, 5);
  if (!BEST_OF.includes(bestOf)) return;

  const externalName = str(fd, "opponentName");
  const playerBId = str(fd, "playerBId");
  const playerAId = str(fd, "playerAId");
  if (!playerAId) return;
  if (!playerBId && !externalName) return;
  if (playerBId === playerAId) return;

  // Solo se registran partidas propias, salvo que seas organizador. Antes,
  // cualquiera podía inventar resultados entre terceros y mover el ranking.
  if (!canManageLeague(actor.role) && playerAId !== actor.id && playerBId !== actor.id) return;

  if (editing) {
    const current = (await db.select().from(matches).where(eq(matches.id, editing)))[0];
    if (!current) return;
    const mine = current.playerAId === actor.id || current.playerBId === actor.id
      || current.createdBy === actor.id;
    if (!mine && !canManageLeague(actor.role)) return;
  }

  const values = {
    competitionId: str(fd, "competitionId") || null,
    tournamentId: str(fd, "tournamentId") || null,
    round: int(fd, "round", 0, 0, 50),
    date: isoDate(fd, "date") ?? todayISO(),
    playerAId,
    playerBId: playerBId || null,
    opponentName: playerBId ? null : (externalName.slice(0, 60) || null),
    deckAId: str(fd, "deckAId") || null,
    deckBId: playerBId ? (str(fd, "deckBId") || null) : null,
    opponentArchetypeId: playerBId ? null : (str(fd, "opponentArchetypeId") || null),
    bestOf,
    status: "done" as const,
    note: str(fd, "note").slice(0, 500),
    createdBy: actor.id,
  };

  // Los juegos: solo los del 1 al bestOf, solo con ganador reconocible, y sin
  // pasarse de la mayoría. Un "3-0 en un Bo3" no debe poder guardarse, y un
  // ganador escrito a mano tipo "x" contaba como empate sin avisar.
  const need = Math.ceil(bestOf / 2);
  const rows: Array<{ number: number; winner: string; first: string; prizesLeft: number | null }> = [];
  let wonA = 0, wonB = 0;
  for (let i = 0; i < bestOf; i++) {
    const winner = str(fd, `g${i}_winner`);
    if (!["a", "b", "tie"].includes(winner)) continue;
    if (winner === "a") wonA++;
    if (winner === "b") wonB++;
    if (wonA > need || wonB > need) return;
    rows.push({
      number: i + 1,
      winner,
      first: pick(fd, `g${i}_first`, ["", "a", "b"] as const, ""),
      prizesLeft: maybeInt(fd, `g${i}_prizes`, 0, 6),
    });
  }
  if (!rows.length) return;

  const id = editing || newId("m");
  if (editing) {
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
  const actor = await requireActor();
  const id = str(fd, "id");
  const current = (await db.select().from(matches).where(eq(matches.id, id)))[0];
  if (!current) redirect("/resultados");
  const mine = current.playerAId === actor.id || current.playerBId === actor.id
    || current.createdBy === actor.id;
  if (!mine && !canManageLeague(actor.role)) redirect("/resultados");
  await db.delete(matches).where(eq(matches.id, id));
  refresh();
  redirect("/resultados");
}

/* ------------------------------------------------------------- torneos -- */

const TOURNAMENT_KINDS = [
  "league_challenge", "league_cup", "pokemon_challenge", "pokemon_cup", "regional",
  "special", "international", "worlds", "store", "online", "other",
] as const;

export async function saveTournament(fd: FormData) {
  const actor = await requireActor();
  const editing = str(fd, "id");

  // Editar la cabecera de un torneo recalcula los CP de todos los que fueron,
  // así que solo lo hace quien lo creó o un organizador.
  if (editing) {
    const current = (await db.select().from(tournaments).where(eq(tournaments.id, editing)))[0];
    if (!current) return;
    if (current.createdBy !== actor.id && !canManageLeague(actor.role)) return;
  }

  const date = isoDate(fd, "date") ?? todayISO();
  const values = {
    name: str(fd, "name").slice(0, 120),
    kind: pick(fd, "kind", TOURNAMENT_KINDS, "store"),
    scope: str(fd, "scope") === "online" ? "online" : "onsite",
    format: str(fd, "format") || "standard",
    bestOf: int(fd, "bestOf", 3, 1, 5),
    date,
    endDate: isoDate(fd, "endDate", null),
    venue: str(fd, "venue").slice(0, 120),
    city: str(fd, "city").slice(0, 80),
    country: str(fd, "country").slice(0, 80),
    organizer: str(fd, "organizer").slice(0, 120),
    url: /^https?:\/\//i.test(str(fd, "url")) ? str(fd, "url").slice(0, 400) : "",
    playerCount: maybeInt(fd, "playerCount", 0, 100000),
    rounds: maybeInt(fd, "rounds", 0, 50),
    topCut: maybeInt(fd, "topCut", 0, 512),
    // Sin temporada la deducimos de la fecha: julio abre la siguiente.
    season: maybeInt(fd, "season", 2000, 2100) ?? seasonOfDate(date),
    division: pick(fd, "division", ["masters", "seniors", "juniors"] as const, "masters"),
    notes: str(fd, "notes").slice(0, 1000),
    createdBy: actor.id,
  };
  if (!values.name) return;

  const id = editing || newId("t");
  if (editing) await db.update(tournaments).set(values).where(eq(tournaments.id, id));
  else await db.insert(tournaments).values({ id, ...values });

  // Si el formulario trae también mi resultado, lo guardo de una vez: es el
  // caso normal, y ahorra un segundo paso desde el móvil.
  if (str(fd, "withResult") === "1") {
    await upsertResult(id, actor.id, fd, values.kind, values.playerCount, values.season);
  }

  refresh();
  redirect(`/torneos/${id}`);
}

/**
 * Borrar un torneo: la cabecera, los resultados de todos y las rondas.
 *
 * Pide escribir el nombre del torneo. Y borra las rondas a mano, antes que la
 * cabecera, porque `matches.tournamentId` es ON DELETE SET NULL: sin este
 * paso, las rondas se quedaban como partidas sin competición y sin torneo
 * —invisibles en las pantallas, pero vivas en las estadísticas de arquetipo—.
 * Los resultados sí se van en cascada solos.
 */
export async function deleteTournament(fd: FormData) {
  await requireManager();
  const id = str(fd, "id");
  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, id)))[0];
  if (!tour || !confirmed(fd, tour.name)) return;

  // Solo las rondas: son las partidas del torneo contra rivales de fuera. Una
  // partida entre dos de la liga que además esté etiquetada a este torneo se
  // conserva, y simplemente se queda sin la etiqueta.
  await db.delete(matches).where(and(eq(matches.tournamentId, id), isNull(matches.playerBId)));
  await db.delete(tournaments).where(eq(tournaments.id, id));
  refresh();
  redirect("/torneos");
}

async function upsertResult(
  tournamentId: string,
  playerId: string,
  fd: FormData,
  kind: string,
  playerCount: number | null,
  season: number | null,
) {
  const placement = maybeInt(fd, "placement", 1, 100000);
  const cpManual = bool(fd, "cpManual");
  const cfg = (await db.select().from(settings).where(eq(settings.id, "default")))[0];
  const useSeason = season ?? cfg?.cpSeason ?? new Date().getFullYear();
  const auto = cpForPlacement(useSeason, kind, placement, playerCount);
  const cpEarned = cpManual ? int(fd, "cpEarned", 0, 0, 5000) : (auto ?? 0);

  const values = {
    tournamentId,
    playerId,
    placement,
    wins: int(fd, "wins", 0, 0, 50),
    losses: int(fd, "losses", 0, 0, 50),
    ties: int(fd, "ties", 0, 0, 50),
    deckId: str(fd, "deckId") || null,
    archetypeId: str(fd, "archetypeId") || null,
    cpEarned,
    cpManual,
    prizes: str(fd, "prizes").slice(0, 300),
    notes: str(fd, "resultNotes").slice(0, 1000),
    dropped: bool(fd, "dropped"),
  };

  // Upsert de verdad, contra el índice único (torneo, jugador): con select +
  // insert, un doble toque en el móvil provocaba un 23505 sin capturar.
  await db.insert(tournamentResults)
    .values({ id: newId("tr"), ...values })
    .onConflictDoUpdate({
      target: [tournamentResults.tournamentId, tournamentResults.playerId],
      set: values,
    });
}

export async function saveTournamentResult(fd: FormData) {
  const actor = await requireActor();
  const tournamentId = str(fd, "tournamentId");
  if (!tournamentId) return;

  const targetId = str(fd, "playerId") || actor.id;
  if (!owns(actor, targetId)) return;

  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)))[0];
  if (!tour) return;

  await upsertResult(tournamentId, targetId, fd, tour.kind, tour.playerCount, tour.season);
  refresh();
  redirect(`/torneos/${tournamentId}`);
}

export async function deleteTournamentResult(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const row = (await db.select().from(tournamentResults).where(eq(tournamentResults.id, id)))[0];
  if (!row || !owns(actor, row.playerId)) return;
  await db.delete(tournamentResults).where(eq(tournamentResults.id, id));
  refresh();
}

/* ------------------------------------------------------- competiciones -- */

export async function saveCompetition(fd: FormData) {
  // Una competición es de la liga entera: la organiza quien la organiza.
  await requireManager();
  const editing = str(fd, "id");
  const id = editing || newId("c");
  const values = {
    name: str(fd, "name").slice(0, 120),
    kind: pick(fd, "kind", ["league", "swiss", "bracket", "casual"] as const, "league"),
    bestOf: int(fd, "bestOf", 3, 1, 5),
    status: pick(fd, "status", ["draft", "live", "done"] as const, "live"),
    start: isoDate(fd, "start") ?? todayISO(),
    end: isoDate(fd, "end", null),
    rounds: int(fd, "rounds", 0, 0, 50),
    topCut: int(fd, "topCut", 0, 0, 64),
  };
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
  await db.delete(competitions).where(eq(competitions.id, str(fd, "id")));
  refresh();
  redirect("/competiciones");
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
      bestOf: comp.bestOf,
      status: "scheduled" as const,
    })),
  );
  refresh();
  redirect(`/competiciones/${compId}`);
}

/* ------------------------------------------------------------- eventos -- */

export async function saveEvent(fd: FormData) {
  // El calendario lo ve todo el mundo, así que lo escribe el organizador.
  await requireManager();
  const editing = str(fd, "id");
  const id = editing || newId("e");
  const values = {
    title: str(fd, "title").slice(0, 120),
    date: isoDate(fd, "date") ?? todayISO(),
    kind: str(fd, "kind") || "round",
    competitionId: str(fd, "competitionId") || null,
    tournamentId: str(fd, "tournamentId") || null,
    note: str(fd, "note").slice(0, 500),
  };
  if (!values.title) return;
  if (editing) await db.update(events).set(values).where(eq(events.id, id));
  else await db.insert(events).values({ id, ...values });
  refresh();
}

export async function deleteEvent(fd: FormData) {
  await requireManager();
  await db.delete(events).where(eq(events.id, str(fd, "id")));
  refresh();
}

/* ------------------------------------------------------------- ajustes -- */

export async function saveSettings(fd: FormData) {
  await requireManager();
  const values = {
    name: str(fd, "name").slice(0, 80) || "Liga Arena",
    season: str(fd, "season").slice(0, 80) || "Temporada 1",
    cpSeason: int(fd, "cpSeason", 2027, 2000, 2100),
    ptsWin: int(fd, "ptsWin", 3, 0, 100),
    ptsTie: int(fd, "ptsTie", 1, 0, 100),
    ptsLoss: int(fd, "ptsLoss", 0, 0, 100),
    eloStart: int(fd, "eloStart", 1000, 100, 4000),
    eloK: int(fd, "eloK", 24, 1, 100),
    ratingZone: str(fd, "ratingZone") || "europe",
    registrationOpen: bool(fd, "registrationOpen"),
    updatedAt: new Date(),
  };
  const existing = await db.select().from(settings).where(eq(settings.id, "default"));
  if (existing[0]) await db.update(settings).set(values).where(eq(settings.id, "default"));
  else await db.insert(settings).values({ id: "default", ...values });
  refresh();
}

/* ============================================================ v0.3.0 ==== */

/* ------------------------------------------------- rondas de un torneo -- */

/**
 * Registrar una ronda de un torneo de fuera, mientras se juega.
 *
 * Una ronda es una fila de `matches` con `tournamentId`, `round` y
 * `playerBId` nulo. No hay tabla nueva: ver la explicación en
 * `src/lib/stats.ts`, en la sección de rondas de torneo, que es donde está
 * el porqué.
 *
 * Dos maneras de rellenarla, porque el caso real es estar en el evento con
 * dos minutos antes de que salgan los emparejamientos:
 *
 *   · `mode=quick` — rival, su mazo, salí 1.º o 2.º, y gané/empaté/perdí.
 *     El resultado se guarda en `matches.seriesResult`. Cuatro toques.
 *   · `mode=games` — el desglose juego a juego. Es lo que alimenta la
 *     estadística de ventaja del primer turno, así que merece la pena cuando
 *     hay tiempo.
 *
 * Sin resultado la ronda se guarda abierta y se cierra luego: es justo lo que
 * pasa cuando apuntas el emparejamiento antes de empezar a jugar.
 */
export async function saveTournamentRound(fd: FormData) {
  const actor = await requireActor();

  const tournamentId = str(fd, "tournamentId");
  if (!tournamentId) return;
  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)))[0];
  if (!tour) return;

  // De quién es la ronda. La propia siempre; la de otro solo un organizador.
  const playerId = str(fd, "playerId") || actor.id;
  if (!owns(actor, playerId)) return;

  const round = int(fd, "round", 1, 1, 50);
  const bestOf = [1, 3, 5].includes(tour.bestOf) ? tour.bestOf : 3;
  const opponentName = str(fd, "opponentName").slice(0, 60);
  if (!opponentName) return;

  const first = pick(fd, "first", ["", "a", "b"] as const, "");
  const mode = pick(fd, "mode", ["quick", "games"] as const, "quick");

  // Los juegos: solo del 1 al bestOf, solo con ganador reconocible, y sin
  // pasarse de la mayoría —un 3-0 en un Bo3 no debe poder guardarse—. Es la
  // misma comprobación que en `saveMatch`, y por el mismo motivo.
  const need = Math.ceil(bestOf / 2);
  const rows: Array<{ number: number; winner: string; first: string; prizesLeft: number | null }> = [];
  if (mode === "games") {
    let wonA = 0, wonB = 0;
    for (let i = 0; i < bestOf; i++) {
      const winner = str(fd, `g${i}_winner`);
      if (!["a", "b", "tie"].includes(winner)) continue;
      if (winner === "a") wonA++;
      if (winner === "b") wonB++;
      if (wonA > need || wonB > need) return;
      rows.push({
        number: i + 1,
        winner,
        first: i === 0 ? first : pick(fd, `g${i}_first`, ["", "a", "b"] as const, ""),
        prizesLeft: maybeInt(fd, `g${i}_prizes`, 0, 6),
      });
    }
  }

  // El resultado declarado. Con desglose solo se guarda cuando hace falta para
  // desempatar: un 1–1 en un Bo3 es empate si se acabó el tiempo y una ronda a
  // medias si no, y los juegos apuntados son idénticos en los dos casos.
  const declared = pick(fd, "result", ["", "a", "b", "tie"] as const, "");
  let seriesResult: string | null = null;
  if (mode === "quick") {
    seriesResult = declared || null;
  } else {
    const wonA = rows.filter((r) => r.winner === "a").length;
    const wonB = rows.filter((r) => r.winner === "b").length;
    const settled = wonA >= need || wonB >= need;
    seriesResult = settled ? null : (bool(fd, "timeCalled") ? (wonA > wonB ? "a" : wonB > wonA ? "b" : "tie") : null);
  }

  const values = {
    competitionId: null,
    tournamentId,
    round,
    date: tour.date,
    playerAId: playerId,
    playerBId: null,
    opponentName,
    deckAId: str(fd, "deckAId") || null,
    deckBId: null,
    opponentArchetypeId: str(fd, "opponentArchetypeId") || null,
    bestOf,
    status: "done" as const,
    seriesResult,
    firstTurn: first,
    note: str(fd, "note").slice(0, 300),
    createdBy: actor.id,
  };

  // ¿Ya existe esa ronda? Se actualiza. El índice único de (torneo, jugador,
  // ronda) impide duplicarla si alguien toca dos veces el botón en el móvil.
  const existing = (await db.select({ id: matches.id }).from(matches).where(and(
    eq(matches.tournamentId, tournamentId),
    eq(matches.playerAId, playerId),
    eq(matches.round, round),
  )))[0];

  const id = existing?.id ?? newId("m");
  if (existing) {
    await db.update(matches).set(values).where(eq(matches.id, id));
    await db.delete(games).where(eq(games.matchId, id));
  } else {
    await db.insert(matches).values({ id, ...values });
  }
  if (rows.length) {
    await db.insert(games).values(rows.map((r) => ({ matchId: id, ...r, note: "" })));
  }

  await syncTournamentRecord(tournamentId, playerId);
  refresh();
  redirect(`/torneos/${tournamentId}`);
}

export async function deleteTournamentRound(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const row = (await db.select().from(matches).where(eq(matches.id, id)))[0];
  if (!row || !row.tournamentId) return;
  if (!owns(actor, row.playerAId)) return;

  await db.delete(matches).where(eq(matches.id, id));
  await syncTournamentRecord(row.tournamentId, row.playerAId);
  refresh();
  redirect(`/torneos/${row.tournamentId}`);
}

/**
 * Escribe en `tournament_results` el récord que sale de las rondas.
 *
 * El puesto, los CP y los premios NO se tocan: de tus propias rondas no se
 * puede deducir en qué posición has quedado, así que eso lo sigue metiendo
 * una persona cuando salga la clasificación final.
 *
 * Si todavía no había fila de resultado, se crea: apuntar la primera ronda es
 * lo que te inscribe en el torneo, sin un paso previo.
 */
async function syncTournamentRecord(tournamentId: string, playerId: string) {
  const rounds = await db.select().from(matches).where(and(
    eq(matches.tournamentId, tournamentId),
    eq(matches.playerAId, playerId),
    isNull(matches.playerBId),
  )).orderBy(asc(matches.round));
  if (!rounds.length) return;

  const ids = rounds.map((r) => r.id);
  const gameRows = ids.length
    ? await db.select().from(games).where(inArray(games.matchId, ids))
    : [];

  let wins = 0, losses = 0, ties = 0;
  for (const m of rounds) {
    const mine = gameRows.filter((g) => g.matchId === m.id);
    const need = Math.floor(m.bestOf / 2) + 1;
    const ga = mine.filter((g) => g.winner === "a").length;
    const gb = mine.filter((g) => g.winner === "b").length;

    let r: "w" | "l" | "d" | null = null;
    if (mine.length === 0) {
      r = m.seriesResult === "a" ? "w" : m.seriesResult === "b" ? "l" : m.seriesResult === "tie" ? "d" : null;
    } else if (ga >= need) r = "w";
    else if (gb >= need) r = "l";
    else if (m.seriesResult === "a") r = "w";
    else if (m.seriesResult === "b") r = "l";
    else if (m.seriesResult === "tie") r = "d";
    else if (mine.length >= m.bestOf) r = ga > gb ? "w" : gb > ga ? "l" : "d";

    if (r === "w") wins++;
    else if (r === "l") losses++;
    else if (r === "d") ties++;
  }

  await db.insert(tournamentResults)
    .values({ id: newId("tr"), tournamentId, playerId, wins, losses, ties })
    .onConflictDoUpdate({
      target: [tournamentResults.tournamentId, tournamentResults.playerId],
      set: { wins, losses, ties },
    });
}

/** Recalcular el récord a mano, por si alguien editó rondas sueltas. */
export async function refreshTournamentRecord(fd: FormData) {
  const actor = await requireActor();
  const tournamentId = str(fd, "tournamentId");
  const playerId = str(fd, "playerId") || actor.id;
  if (!tournamentId || !owns(actor, playerId)) return;
  await syncTournamentRecord(tournamentId, playerId);
  refresh();
}

/* --------------------------------------------------------- ladder manual -- */

/**
 * Poner o cambiar el rango del ladder.
 *
 * El rango propio lo cambia cada uno; el de otra persona, solo un
 * organizador. El rango se acota en el formulario, aquí, y con un CHECK en la
 * base de datos: tres sitios, porque una Server Action es un endpoint público
 * y a esta se puede llamar con 99999 desde la consola del navegador.
 */
export async function setLadderElo(fd: FormData) {
  const actor = await requireActor();
  const playerId = str(fd, "playerId") || actor.id;
  if (!owns(actor, playerId)) return;

  const raw = maybeNum(fd, "ladderElo");
  if (raw == null) return;
  const elo = Math.min(LADDER_MAX, Math.max(LADDER_MIN, Math.round(raw)));
  const note = str(fd, "ladderNote").slice(0, 200);

  await db.update(players)
    .set({ ladderElo: elo, ladderEloUpdatedAt: new Date(), ladderNote: note })
    .where(eq(players.id, playerId));

  // Cada cambio deja historial, que es lo que permite pintar la evolución.
  await db.insert(ladderEntries).values({
    id: newId("le"), playerId, elo, note, createdBy: actor.id,
  });

  refresh();
  redirect(`/perfil/${playerId}`);
}

export async function clearLadderElo(fd: FormData) {
  const actor = await requireActor();
  const playerId = str(fd, "playerId") || actor.id;
  if (!owns(actor, playerId)) return;
  await db.update(players)
    .set({ ladderElo: null, ladderEloUpdatedAt: new Date(), ladderNote: "" })
    .where(eq(players.id, playerId));
  refresh();
  redirect(`/perfil/${playerId}`);
}

/* ------------------------------------------------------ zona de riesgo -- */

/**
 * Compara lo que ha escrito la persona con lo que se espera, sin ser
 * quisquilloso con mayúsculas ni espacios de más.
 *
 * Todos los borrados gordos piden escribir a mano el nombre de lo que se
 * borra. Es el patrón de GitHub al borrar un repositorio, y está por una
 * razón concreta: un botón de «borrar torneo» sin fricción se pulsa sin mirar,
 * y esto no tiene deshacer.
 */
function confirmed(fd: FormData, expected: string) {
  const norm = (x: string) => x.trim().replace(/\s+/g, " ").toLowerCase();
  return Boolean(expected) && norm(str(fd, "confirm")) === norm(expected);
}

/**
 * Vaciar una temporada: sus torneos, las rondas de esos torneos y los
 * resultados. No toca jugadores, mazos, arquetipos ni la liga interna.
 */
export async function wipeSeason(fd: FormData) {
  const actor = await requireActor();
  if (!isOwner(actor.role)) return;
  const season = int(fd, "season", 0, 2000, 2100);
  if (!season || !confirmed(fd, `borrar temporada ${season}`)) return;

  const rows = await db.select({ id: tournaments.id }).from(tournaments)
    .where(eq(tournaments.season, season));
  if (rows.length) {
    const ids = rows.map((r) => r.id);
    // Las rondas primero: `matches.tournamentId` es ON DELETE SET NULL, así que
    // borrar el torneo sin más dejaría partidas huérfanas sin competición ni
    // torneo, invisibles en todas las pantallas pero contando en el ranking.
    await db.delete(matches).where(and(inArray(matches.tournamentId, ids), isNull(matches.playerBId)));
    await db.delete(tournaments).where(inArray(tournaments.id, ids));
  }
  refresh();
  redirect("/torneos");
}

/**
 * Borrar todo el historial de juego y quedarse con la gente.
 *
 * Sobreviven: jugadores con sus cuentas, mazos y arquetipos. Se van: partidas,
 * juegos, competiciones, torneos, resultados, eventos y el ladder.
 */
export async function resetLeague(fd: FormData) {
  const actor = await requireActor();
  if (!isOwner(actor.role)) return;
  if (!confirmed(fd, "borrar todo el historial")) return;

  await db.delete(matches);          // `games` se va en cascada
  await db.delete(competitionPlayers);
  await db.delete(competitions);
  await db.delete(tournamentResults);
  await db.delete(tournaments);
  await db.delete(events);
  await db.delete(ladderEntries);
  await db.update(players).set({ ladderElo: null, ladderNote: "" });
  refresh();
  redirect("/");
}

/**
 * Borrar de verdad a una persona, con todo lo suyo.
 *
 * `deletePlayer` desactiva en vez de borrar cuando hay historial, y hace bien:
 * es lo que mantiene el ranking coherente. Esto es la salida de emergencia
 * para cuando de verdad quieres que no quede rastro —una cuenta de prueba, un
 * alta duplicada—, y por eso es solo del propietario y pide el nombre escrito.
 */
export async function purgePlayer(fd: FormData) {
  const actor = await requireActor();
  if (!isOwner(actor.role)) return;
  const id = str(fd, "id");
  if (!id || id === actor.id) return;

  const target = (await db.select().from(players).where(eq(players.id, id)))[0];
  if (!target || !confirmed(fd, target.name)) return;
  if (target.role === "owner" && (await ownerCount()) <= 1) return;

  // Sus partidas primero: si no, el ON DELETE de `players` las deja con un
  // jugador que ya no existe y las clasificaciones dejan de cuadrar.
  await db.delete(matches).where(or(eq(matches.playerAId, id), eq(matches.playerBId, id)));
  await db.delete(players).where(eq(players.id, id));
  refresh();
  redirect("/ajustes");
}
