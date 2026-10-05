"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  archetypes, competitionPlayers, competitions, deckFavorites, decks, events, games, invites,
  competitionTeams, ladderEntries, leagueDecks, matches, metaEntries, metaEvents, playerFavorites,
  players, seasonResets, settings, tournamentResults, tournaments,
} from "@/db/schema";
import { LANG_COOKIE, asLang } from "@/lib/i18n";
import { borrarTorneosAbandonados } from "@/lib/limpiezaDb";
import { creaCiclo } from "@/lib/arquetipos";
import { MODALIDADES, TAM_EQUIPO, asModalidad, jornadaEquipos, mazoDePartida, partidasDeDuelo } from "@/lib/modalidades";
import {
  canManageLeague, clearSession, DUMMY_HASH, emailProblem, hashPassword, INVITE_MESSAGES,
  isOwner, newInviteToken, normalizeEmail, passwordProblem, readSession, verifyPassword,
  writeSession,
} from "@/lib/auth";
import { parseDeckList, suggestArchetype } from "@/lib/decklist";
import { EVENTOS_EUROPA_2027, TEMPORADA_EVENTOS } from "@/data/eventos-europa";
import { TORNEOS_ZONA_2026, yaExiste } from "@/data/torneos-zona-2026";
import { isIsoDate, newId, todayISO } from "@/lib/format";
import { pokeSlug } from "@/lib/pokemon";
import { awardsCp, cpForPlacement, cpKindOf, seasonOfDate } from "@/lib/cp";
import { withFlash } from "@/lib/flash";
import { pairRound } from "@/lib/stats";
import { familiaDe, maxRondasDe } from "@/lib/estructura";
import { normalizeLadderInput, rankOf } from "@/lib/rank";
import { currentPlayer, loadSnapshot } from "@/lib/data";
import { fetchArchetypeCatalog } from "@/lib/sources/limitless";
import { recogerCityLeagues, recogerRegionales } from "@/lib/sources/limitlessWeb";
import { filasParaGuardar } from "@/lib/limitlessHtml";
import { parseEventosPegados } from "@/lib/eventosPegados";
import { energyTypesOf } from "@/lib/sources/pokeapi";
import { ARCHETYPE_PREFIX, DIVISIONS, TOURNAMENT_FORMATS, TOURNAMENT_STATUSES } from "@/lib/types";
import type { FormState, MetaImportState, MetaPreview, MetaPreviewRow } from "@/lib/types";
import { CALENDAR_KINDS } from "@/lib/calendar";
import {
  coverageOf, parseStandings, parseSummary, type ParseResult, type PasteMode,
} from "@/lib/standings";

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

/** "HH:MM" en 24h, o null. Igual de estricto que `isoDate`: una hora rara no debe llegar a la columna. */
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const timeOfDay = (fd: FormData, k: string): string | null => {
  const raw = str(fd, k);
  return HHMM.test(raw) ? raw : null;
};

/** Precio de entrada, en céntimos. Lo que se teclea es en euros ("5", "5,50" o "5.50"). */
const priceCents = (fd: FormData, k: string): number | null => {
  const raw = str(fd, k).replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
};

/**
 * El id que manda un selector de mazo, separado en sus dos formas.
 *
 * `DeckPicker` ofrece en la misma lista mazos registrados y arquetipos
 * sueltos, y los distingue con el prefijo `arch:` (ver `ARCHETYPE_PREFIX` en
 * lib/data). Aquí hay que deshacer eso antes de tocar la base, porque cada uno
 * va a una columna distinta y las dos son claves ajenas: guardar `arch:a12` en
 * `deck_id` es una violación de clave ajena y un error 500.
 */
function deckOrArchetype(fd: FormData, k: string): { deckId: string | null; archetypeId: string | null } {
  const raw = str(fd, k);
  if (!raw) return { deckId: null, archetypeId: null };
  if (raw.startsWith(ARCHETYPE_PREFIX)) {
    return { deckId: null, archetypeId: raw.slice(ARCHETYPE_PREFIX.length) || null };
  }
  return { deckId: raw, archetypeId: null };
}

/** Valor de una lista cerrada, o el primero de la lista. */
const pick = <T extends string>(fd: FormData, k: string, allowed: readonly T[], dflt: T): T => {
  const v = str(fd, k) as T;
  return allowed.includes(v) ? v : dflt;
};

function refresh() {
  revalidatePath("/", "layout");
}

/**
 * Ruta a la que volver después de guardar, saneada.
 *
 * Varios formularios llevan un campo `back` para devolverte a donde estabas
 * en vez de a la pantalla de siempre. Ese campo llega del navegador, así que
 * sin filtrar convierte cualquiera de estas acciones en un redirector abierto:
 * un enlace con `back=https://otra-cosa.example` y alguien acaba fuera de la
 * app creyendo que sigue dentro. Solo se aceptan rutas internas, y `//` queda
 * fuera porque el navegador lo lee como otro dominio.
 */
function safeBack(fd: FormData, dflt: string): string {
  const raw = str(fd, "back");
  if (!raw.startsWith("/") || raw.startsWith("//")) return dflt;
  return raw.slice(0, 300);
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
  redirect(withFlash("/ajustes", "ok", "Invitación creada. Copia el enlace y mándalo."));
}

export async function revokeInvite(fd: FormData) {
  await requireManager();
  await db.update(invites).set({ revoked: true }).where(eq(invites.token, str(fd, "token")));
  refresh();
  redirect(withFlash("/ajustes", "ok", "Invitación anulada."));
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

/**
 * ¿Puede este actor tocar este mazo?
 *
 * Un mazo de la biblioteca compartida (sin dueño) lo edita quien lo creó y
 * los organizadores. Que sea de todos significa que todos lo pueden **usar**,
 * no que todos lo puedan reescribir: si no, el primero que pase te cambia la
 * lista de debajo de los pies.
 */
function canEditDeck(actor: Actor, deck: { playerId: string | null; createdBy: string | null }) {
  if (canManageLeague(actor.role)) return true;
  if (deck.playerId) return deck.playerId === actor.id;
  return deck.createdBy === actor.id;
}

export async function saveDeck(fd: FormData) {
  const actor = await requireActor();
  const editing = str(fd, "id");
  const list = String(fd.get("list") ?? "");
  const parsed = list.trim() ? parseDeckList(list) : null;

  // `scope` decide de quién es: "shared" lo deja sin dueño, en la biblioteca
  // de la liga, que es lo que hace falta para apuntar el mazo de un rival sin
  // tener que inventarle una cuenta.
  const scope = pick(fd, "scope", ["mine", "shared"] as const, "mine");

  // Al editar, el dueño lo dice la fila que ya está guardada, no el formulario:
  // si no, mandando el id de un mazo ajeno te lo apropiabas.
  let owner: string | null = scope === "shared" ? null : actor.id;
  if (editing) {
    const current = (await db.select().from(decks).where(eq(decks.id, editing)))[0];
    if (!current || !canEditDeck(actor, current)) return;
    // Mover un mazo entre «mío» y «de la liga» sí se permite, porque es una
    // decisión legítima; lo que no se permite es quedárselo de otra persona.
    if (scope === "shared") {
      owner = null;
    } else if (canManageLeague(actor.role)) {
      // Un organizador sí puede decir de quién es: el selector de jugador que
      // le enseña el formulario tiene que hacer algo.
      owner = str(fd, "playerId") || current.playerId || actor.id;
    } else {
      owner = current.playerId ?? actor.id;
    }
  } else if (scope === "mine" && canManageLeague(actor.role)) {
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

  if (editing) {
    await db.update(decks).set(values).where(eq(decks.id, editing));
  } else {
    await db.insert(decks).values({ id: newId("d"), ...values, createdBy: actor.id });
  }
  refresh();
  // Volver a donde estabas. Crear un mazo casi siempre es un desvío en mitad
  // de otra cosa —apuntando una ronda, rellenando un torneo—, y mandar a todo
  // el mundo a /mazos era perder el hilo.
  redirect(withFlash(safeBack(fd, "/mazos"), "ok", editing ? "Mazo guardado." : "Mazo creado."));
}

export async function deleteDeck(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const current = (await db.select().from(decks).where(eq(decks.id, id)))[0];
  if (!current || !canEditDeck(actor, current)) redirect("/mazos");

  /* Un mazo de la biblioteca lo puede estar usando gente que no eres tú, y las
     claves ajenas son ON DELETE SET NULL: borrarlo deja las rondas y los
     resultados de otros sin mazo, en silencio y sin deshacer. Si está en uso
     se retira en vez de borrarse — sigue en el historial de quien lo jugó y
     desaparece de los selectores, que es lo que se quería. */
  const [inResults] = await db.select({ n: sql<number>`count(*)::int` })
    .from(tournamentResults).where(eq(tournamentResults.deckId, id));
  const [inMatches] = await db.select({ n: sql<number>`count(*)::int` })
    .from(matches).where(or(eq(matches.deckAId, id), eq(matches.deckBId, id)));
  const uses = (inResults?.n ?? 0) + (inMatches?.n ?? 0);

  if (uses > 0) {
    await db.update(decks).set({ retired: true }).where(eq(decks.id, id));
  } else {
    await db.delete(decks).where(eq(decks.id, id));
  }
  refresh();
  // Retirar y borrar no son lo mismo, y el aviso lo dice: si el mazo estaba en
  // uso no ha desaparecido, y quien le dé a «borrar» tiene que enterarse.
  redirect(withFlash(
    "/mazos", "ok",
    uses > 0
      ? `«${current.name}» está en uso en ${uses} sitio(s): se ha retirado en vez de borrarse.`
      : `Mazo «${current.name}» borrado.`,
  ));
}

/**
 * Marcar o desmarcar un mazo como favorito.
 *
 * Un favorito no es propiedad: es solo lo que sale primero en los selectores.
 * Puedes marcar un mazo de la biblioteca compartida sin que deje de ser de
 * todos, que es justo para lo que sirve.
 */
export async function toggleDeckFavorite(fd: FormData) {
  const actor = await requireActor();
  const deckId = str(fd, "deckId");
  if (!deckId) return;

  const deck = (await db.select({ id: decks.id }).from(decks).where(eq(decks.id, deckId)))[0];
  if (!deck) return;

  const existing = (await db.select().from(deckFavorites).where(and(
    eq(deckFavorites.playerId, actor.id),
    eq(deckFavorites.deckId, deckId),
  )))[0];

  if (existing) {
    await db.delete(deckFavorites).where(and(
      eq(deckFavorites.playerId, actor.id),
      eq(deckFavorites.deckId, deckId),
    ));
  } else {
    await db.insert(deckFavorites)
      .values({ playerId: actor.id, deckId })
      // Dos toques seguidos en el móvil no deben reventar con un 23505.
      .onConflictDoNothing();
  }
  refresh();
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

  let current: typeof matches.$inferSelect | undefined;
  if (editing) {
    current = (await db.select().from(matches).where(eq(matches.id, editing)))[0];
    if (!current) return;
    const mine = current.playerAId === actor.id || current.playerBId === actor.id
      || current.createdBy === actor.id;
    if (!mine && !canManageLeague(actor.role)) return;
  }
  /* v0.15 — el enlace al rival del grupo de una ronda de torneo se conserva
     al editar desde aquí solo si el rival sigue siendo el mismo nombre. */
  const keepRivalLink = Boolean(
    current?.opponentPlayerId && !playerBId
    && (current.opponentName ?? "") === externalName.slice(0, 60),
  );

  const values = {
    competitionId: str(fd, "competitionId") || null,
    tournamentId: str(fd, "tournamentId") || null,
    round: int(fd, "round", 0, 0, 50),
    date: isoDate(fd, "date") ?? todayISO(),
    playerAId,
    playerBId: playerBId || null,
    opponentName: playerBId ? null : (externalName.slice(0, 60) || null),
    opponentPlayerId: keepRivalLink ? current!.opponentPlayerId : null,
    deckAId: str(fd, "deckAId") || null,
    deckBId: playerBId ? (str(fd, "deckBId") || null) : null,
    opponentArchetypeId: playerBId ? null : (str(fd, "opponentArchetypeId") || null),
    bestOf,
    status: "done" as const,
    note: str(fd, "note").slice(0, 500),
    createdBy: actor.id,
  };

  /* v0.23 — Mazos de liga. Si la persona entregó mazo(s) para esta liga, la
     partida tiene que ir con uno de ellos (mazo fijo: ese; Bo3 · 3 mazos:
     uno de los tres). Para TU lado (o cualquiera, si eres organizador) un
     mazo que no vale es un error con mensaje. Para el lado del rival se
     corrige en silencio: decir «ese no es su mazo» sería ir revelando los
     mazos que entregó, que son privados. */
  if (values.competitionId) {
    const comp = (await db.select({ modality: competitions.modality, bestOf: competitions.bestOf })
      .from(competitions).where(eq(competitions.id, values.competitionId)))[0];
    if (comp) {
      const back = editing ? `/partidas/${editing}` : "/partidas/nueva";
      if (asModalidad(comp.modality) === "tres_mazos" && bestOf !== 3) {
        redirect(withFlash(back, "error", "En esta liga las series son al mejor de tres (Bo3)."));
      }
      const quienes = [playerAId, ...(playerBId ? [playerBId] : [])];
      const filas = await db.select({ playerId: leagueDecks.playerId, deckId: leagueDecks.deckId })
        .from(leagueDecks)
        .where(and(eq(leagueDecks.competitionId, values.competitionId), inArray(leagueDecks.playerId, quienes)));
      const entregadosDe = (pid: string) =>
        filas.filter((r) => r.playerId === pid && r.deckId).map((r) => r.deckId!);
      const manda = canManageLeague(actor.role);
      for (const [pid, campo] of [[playerAId, "deckAId"], [playerBId, "deckBId"]] as const) {
        if (!pid) continue;
        const r = mazoDePartida(entregadosDe(pid), values[campo]);
        if (r.ok) { values[campo] = r.deckId; continue; }
        if (manda || pid === actor.id) redirect(withFlash(back, "error", r.error));
        // Rival: con un solo mazo entregado, ese; con varios, sin mazo antes que uno falso.
        const suyos = entregadosDe(pid);
        values[campo] = suyos.length === 1 ? suyos[0] : null;
      }
    }
  }

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
  redirect(withFlash("/resultados", "ok", editing ? "Partida guardada." : "Partida registrada."));
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
  redirect(withFlash("/resultados", "ok", "Partida borrada."));
}

/* ------------------------------------------------------------- torneos -- */

// "pokemon_challenge"/"pokemon_cup" ya no se pueden elegir al crear o editar:
// puntúan exactamente igual que "league_challenge"/"league_cup" (son alias en
// cp.ts) y tenerlos como opción aparte era la confusión que señalaba Alex.
// `pick()` cae a "store" si llega cualquier otra cosa, así que un formulario
// viejo en caché que aún los mandara simplemente no los aceptaría.
const TOURNAMENT_KINDS = [
  "league_challenge", "league_cup", "regional",
  "special", "international", "worlds", "store", "online", "other",
] as const;

export async function saveTournament(fd: FormData) {
  const actor = await requireActor();
  const editing = str(fd, "id");

  // Editar la cabecera de un torneo recalcula los CP de todos los que fueron,
  // así que solo lo hace quien lo creó o un organizador.
  let current: typeof tournaments.$inferSelect | undefined;
  if (editing) {
    current = (await db.select().from(tournaments).where(eq(tournaments.id, editing)))[0];
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
    startTime: timeOfDay(fd, "startTime"),
    entryFeeCents: priceCents(fd, "entryFee"),
    venue: str(fd, "venue").slice(0, 120),
    city: str(fd, "city").slice(0, 80),
    country: fd.has("country") ? str(fd, "country").slice(0, 80) : (current?.country ?? ""),
    organizer: str(fd, "organizer").slice(0, 120),
    url: /^https?:\/\//i.test(str(fd, "url")) ? str(fd, "url").slice(0, 400) : "",
    playerCount: maybeInt(fd, "playerCount", 0, 100000),
    rounds: maybeInt(fd, "rounds", 0, 50),
    topCut: maybeInt(fd, "topCut", 0, 512),
    /* Sin temporada la deducimos de la fecha: julio abre la siguiente. Pero si
       el formulario ni siquiera trae el campo —el de editar no lo tiene— se
       respeta lo que ya hubiera: recalcularlo movía de temporada los CP de un
       torneo al que alguien le había puesto la suya a mano. */
    season: fd.has("season")
      ? (maybeInt(fd, "season", 2000, 2100) ?? seasonOfDate(date))
      : (current?.season ?? seasonOfDate(date)),
    division: pick(fd, "division", ["masters", "seniors", "juniors"] as const, "masters"),
    notes: str(fd, "notes").slice(0, 1000),
  };
  if (!values.name) return;

  // El estado solo se toca desde el formulario al crear. Después se cambia con
  // los botones del ciclo (`setTournamentStatus`), porque cerrar un torneo es
  // una decisión, no un campo más que se guarda sin darte cuenta.
  const status = editing ? undefined : pick(fd, "status", TOURNAMENT_STATUSES, "open");

  const id = editing || newId("t");
  if (editing) {
    await db.update(tournaments).set(values).where(eq(tournaments.id, id));
  } else {
    await db.insert(tournaments).values({
      id, ...values, createdBy: actor.id, status: status ?? "open",
    });
  }

  /* Corregir la asistencia o el tipo cambia lo que vale cada puesto, así que
     los CP guardados se vuelven a calcular. */
  if (editing) {
    await recalcTournamentCp(id, {
      kind: cpKindOf(values),
      playerCount: values.playerCount,
      season: values.season ?? seasonOfDate(date) ?? undefined,
    });
  }

  refresh();
  redirect(withFlash(`/torneos/${id}`, "ok", editing ? "Torneo guardado." : "Torneo creado."));
}

/**
 * Volver a calcular los CP guardados de un torneo.
 *
 * Se llama desde dos sitios: al guardar el torneo editado y al poner la
 * asistencia desde su ficha. Vive aparte porque el caso más normal del mundo
 * —«se me olvidó apuntar cuánta gente hubo»— tiene que arreglarse desde
 * cualquiera de los dos caminos, y tener la cuenta escrita dos veces es
 * garantía de que un día solo se arregle uno.
 *
 * Los resultados con el CP puesto a mano no se tocan nunca: alguien escribió
 * ese número por algo, y machacarlo con la tabla sería perder información.
 *
 * Devuelve cuántas filas ha cambiado, para poder decirlo en el aviso.
 */
async function recalcTournamentCp(
  tournamentId: string,
  t: { kind: string; playerCount: number | null; season?: number },
): Promise<number> {
  const rows = await db.select().from(tournamentResults)
    .where(eq(tournamentResults.tournamentId, tournamentId));
  if (!rows.length) return 0;

  // Sin temporada explícita se deduce de la fecha del torneo, nunca del año
  // natural: en septiembre el año natural es 2026 y la temporada es 2027, y
  // las dos tablas tienen kickers distintos.
  let season = t.season;
  if (season == null) {
    const [row] = await db.select({ date: tournaments.date, season: tournaments.season })
      .from(tournaments).where(eq(tournaments.id, tournamentId));
    season = row?.season ?? seasonOfDate(row?.date) ?? new Date().getFullYear();
  }

  const temporada: number = season ?? new Date().getFullYear();
  let cambiadas = 0;
  for (const r of rows) {
    const auto = cpForPlacement(temporada, t.kind, r.placement, t.playerCount);
    // Un CP a mano se respeta… salvo que el torneo ya no reparta CP (p. ej.
    // porque se ha marcado como online): entonces no hay nada que respetar.
    if (r.cpManual && awardsCp(temporada, t.kind)) continue;
    const cp = auto ?? 0;
    if (cp !== r.cpEarned) {
      await db.update(tournamentResults).set({ cpEarned: cp })
        .where(eq(tournamentResults.id, r.id));
      cambiadas++;
    }
  }
  return cambiadas;
}

/**
 * Poner (o corregir) la asistencia de un torneo desde su propia ficha.
 *
 * EL PROBLEMA QUE RESUELVE
 * ------------------------
 * Un torneo se crea días antes y nadie sabe cuánta gente irá hasta que se
 * cierra el registro. Después, con el evento ya jugado, hay que volver y
 * apuntarla — y el sitio donde estaba ese campo era el formulario de editar,
 * con otros veinte campos al lado. El resultado práctico era que no se
 * rellenaba nunca, y sin asistencia el kicker deja los tramos bajos a cero:
 * un 15.º puesto que valía 6 CP aparecía como 0.
 *
 * Esto es un campo y un botón en la ficha del torneo. Nada más.
 *
 * Y sí, **recalcula**: el mismo ayudante que usa el formulario de editar.
 * Los CP con el número puesto a mano se respetan.
 */
export async function setTournamentAttendance(fd: FormData) {
  const actor = await currentPlayer();
  if (!actor) redirect("/entrar");

  const id = str(fd, "id");
  if (!id) redirect(withFlash("/torneos", "error", "Falta el torneo."));

  const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id));
  if (!t) redirect(withFlash("/torneos", "error", "Ese torneo ya no existe."));

  // La comprobación de permiso va aquí y no en la pantalla: una Server Action
  // es un endpoint público y esconder el formulario no protege nada.
  if (t.createdBy !== actor.id && !canManageLeague(actor.role)) {
    redirect(withFlash(`/torneos/${id}`, "error", "Esto solo lo cambia quien creó el torneo o un organizador."));
  }

  const playerCount = maybeInt(fd, "playerCount", 1, 100000);
  const rounds = fd.has("rounds") ? maybeInt(fd, "rounds", 1, 50) : t.rounds;
  const topCut = fd.has("topCut") ? maybeInt(fd, "topCut", 0, 512) : t.topCut;

  await db.update(tournaments)
    .set({ playerCount, rounds, topCut })
    .where(eq(tournaments.id, id));

  const cambiadas = await recalcTournamentCp(id, {
    kind: cpKindOf(t),
    playerCount,
    season: t.season ?? seasonOfDate(t.date) ?? undefined,
  });

  refresh();
  redirect(withFlash(
    `/torneos/${id}`,
    "ok",
    playerCount == null
      ? "Asistencia borrada."
      : cambiadas > 0
        ? `Asistencia: ${playerCount}. Se han recalculado los CP de ${cambiadas} resultado${cambiadas === 1 ? "" : "s"}.`
        : `Asistencia: ${playerCount}. Los CP no cambian con esa cifra.`,
  ));
}

/**
 * Mover el torneo por su ciclo: borrador → abierto → cerrado.
 *
 * Cerrar es lo único que tiene consecuencia: a partir de ahí no se apuntan
 * rondas. Se puede reabrir, y por eso no pide confirmación — lo que pide
 * confirmación es borrar, que sí es irreversible.
 *
 * Lo hace quien creó el torneo y los organizadores. Un participante cualquiera
 * no cierra el torneo de otro: perdería las rondas que a ese otro le faltan
 * por meter.
 */
/**
 * Del estado en que está, a los que tiene sentido ir.
 *
 * No es burocracia: volver a borrador un torneo con quince rondas apuntadas
 * las esconde de la ficha entera, y los datos se quedan vivos pero sin ninguna
 * pantalla desde la que verlos. Un camino que solo puede acabar mal es mejor
 * no tenerlo.
 */
const STATUS_FLOW: Record<string, string[]> = {
  draft: ["open"],
  open: ["draft", "closed"],
  closed: ["open"],
};

export async function setTournamentStatus(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const status = pick(fd, "status", TOURNAMENT_STATUSES, "open");

  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, id)))[0];
  if (!tour) return;
  if (tour.createdBy !== actor.id && !canManageLeague(actor.role)) return;
  if (!STATUS_FLOW[tour.status]?.includes(status)) return;

  // Y volver a borrador solo mientras no haya nada apuntado.
  if (status === "draft") {
    const [used] = await db.select({ n: sql<number>`count(*)::int` }).from(matches)
      .where(and(eq(matches.tournamentId, id), isNull(matches.playerBId)));
    if ((used?.n ?? 0) > 0) return;
  }

  await db.update(tournaments)
    .set({ status, closedAt: status === "closed" ? new Date() : null })
    .where(eq(tournaments.id, id));

  refresh();
  const STATUS_MESSAGE: Record<string, string> = {
    draft: "Torneo vuelto a borrador.",
    open: tour.status === "draft" ? "Torneo empezado." : "Torneo reabierto.",
    closed: "Torneo cerrado.",
  };
  redirect(withFlash(`/torneos/${id}`, "ok", STATUS_MESSAGE[status] ?? "Torneo actualizado."));
}

/* ------------------------------------------------ catálogo de arquetipos -- */

/**
 * Traer del metagame los arquetipos que falten, sin salir de la web.
 *
 * Es lo mismo que `npm run archetypes:sync`, pero desde Ajustes: para usar el
 * script hace falta tener el proyecto abierto en un ordenador con Node, y eso
 * en la práctica significa que no se hace nunca. El catálogo se quedaba viejo
 * y faltaban mazos —Grimmsnarl, sin ir más lejos—.
 *
 * Solo añade y solo pinta lo que está en incoloro. Nunca renombra nada que ya
 * exista: si le habéis puesto vuestro nombre a un arquetipo, ese se queda.
 */
export async function syncArchetypes(_prev: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireManager();
  void actor;

  // Ojo con el nombre: `tournaments` a secas taparía la tabla importada arriba.
  const toScan = int(fd, "tournaments", 20, 5, 40);
  const minPlayers = int(fd, "minPlayers", 16, 0, 5000);

  let found;
  try {
    const res = await fetchArchetypeCatalog({
      tournaments: toScan,
      minPlayers,
      apiKey: process.env.LIMITLESS_API_KEY,
    });
    found = res.archetypes;
  } catch (e) {
    return {
      error: `No se ha podido hablar con Limitless: ${e instanceof Error ? e.message : "error de red"}.`,
    };
  }
  if (!found.length) return { error: "Limitless no ha devuelto ningún mazo. Prueba más tarde." };

  const existing = await db.select().from(archetypes);
  const byLimitlessId = new Set(existing.map((a) => a.limitlessId).filter(Boolean));
  const byPair = new Set(existing.map((a) => `${a.main}|${a.secondary}`));

  const nuevos = found.filter(
    (d) => !byLimitlessId.has(d.identifier) && !byPair.has(`${d.main}|${d.secondary}`),
  );
  /* Los que se quedaron en incoloro. Se acotan a 40 por pasada porque cada uno
     es una consulta a PokéAPI y esto corre dentro de una función serverless con
     límite de tiempo: más vale pintar cuarenta y volver a pulsar que quedarse
     a medias y no guardar nada. */
  const sinColor = existing.filter((a) => a.type === "colorless" && a.main).slice(0, 40);

  if (!nuevos.length && !sinColor.length) {
    return { ok: `El catálogo ya está al día: ${existing.length} arquetipos.` };
  }

  const types = await energyTypesOf([
    ...nuevos.map((d) => d.main),
    ...sinColor.map((a) => a.main),
  ]);

  if (nuevos.length) {
    // `onConflictDoNothing` porque el id se trunca a 60 caracteres y dos
    // identificadores largos podrían chocar: mejor saltarse uno que tirar el
    // insert entero con un 23505 y no añadir ninguno.
    await db.insert(archetypes).values(
      nuevos.map((d) => ({
        id: `lt-${d.identifier}`.slice(0, 60),
        name: d.name,
        main: d.main,
        secondary: d.secondary,
        type: types.get(d.main) ?? "colorless",
        limitlessId: d.identifier,
      })),
    ).onConflictDoNothing();
  }

  let pintados = 0;
  for (const a of sinColor) {
    const t = types.get(a.main);
    if (!t || t === "colorless") continue;
    await db.update(archetypes).set({ type: t }).where(eq(archetypes.id, a.id));
    pintados++;
  }

  refresh();
  const partes = [
    nuevos.length ? `${nuevos.length} arquetipo(s) nuevo(s)` : "",
    pintados ? `${pintados} con el color puesto` : "",
  ].filter(Boolean);
  return { ok: `Listo: ${partes.join(" y ")}.` };
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
  redirect(withFlash("/torneos", "ok", `Torneo «${tour.name}» borrado.`));
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
  // `auto` es null cuando el tipo no reparte CP (online incluido, v0.15): ahí
  // no se guarda ningún número, tampoco uno tecleado a mano.
  const cpEarned = !awardsCp(useSeason, kind) ? 0
    : cpManual ? int(fd, "cpEarned", 0, 0, 5000) : (auto ?? 0);

  /* Dos maneras de decir qué récord hiciste, y las dos son legítimas:
     · "rounds": sale de las rondas apuntadas. Es la buena cuando las hay,
       porque además trae el mazo del rival y alimenta la matriz.
     · "manual": lo tecleas. Es la única posible cuando vuelves de un torneo
       viejo y no vas a reconstruir siete rondas de memoria.
     Con "rounds" ni se tocan las columnas: las lleva `syncTournamentRecord`. */
  const recordMode = pick(fd, "recordMode", ["manual", "rounds"] as const, "manual");
  const record = recordMode === "manual"
    ? {
      wins: int(fd, "wins", 0, 0, 50),
      losses: int(fd, "losses", 0, 0, 50),
      ties: int(fd, "ties", 0, 0, 50),
    }
    : null;

  const values = {
    tournamentId,
    playerId,
    placement,
    // Los dos selectores mandan ids que pueden venir prefijados.
    deckId: deckOrArchetype(fd, "deckId").deckId,
    // Simétrico al de arriba: los dos campos aceptan las dos formas, porque
    // esto es un endpoint público y lo que llega no lo decide el formulario.
    archetypeId: deckOrArchetype(fd, "archetypeId").archetypeId
      ?? deckOrArchetype(fd, "archetypeId").deckId,
    cpEarned,
    cpManual,
    prizes: str(fd, "prizes").slice(0, 300),
    notes: str(fd, "resultNotes").slice(0, 1000),
    dropped: bool(fd, "dropped"),
  };

  // Upsert de verdad, contra el índice único (torneo, jugador): con select +
  // insert, un doble toque en el móvil provocaba un 23505 sin capturar.
  const full = record ? { ...values, ...record } : values;
  await db.insert(tournamentResults)
    .values({ id: newId("tr"), ...full })
    .onConflictDoUpdate({
      target: [tournamentResults.tournamentId, tournamentResults.playerId],
      set: full,
    });

  /* El mazo del torneo es de todo el torneo, así que baja a las rondas ya
     apuntadas. Si no, la ficha decía «jugando Dragapult todo el torneo» y las
     rondas seguían guardadas sin mazo: las estadísticas por arquetipo y la
     matriz de emparejamientos no las veían, y no había forma de darse cuenta. */
  if (values.deckId) {
    await db.update(matches)
      .set({ deckAId: values.deckId })
      .where(and(
        eq(matches.tournamentId, tournamentId),
        eq(matches.playerAId, playerId),
        isNull(matches.playerBId),
      ));
  }
}

export async function saveTournamentResult(fd: FormData) {
  const actor = await requireActor();
  const tournamentId = str(fd, "tournamentId");
  if (!tournamentId) return;

  const targetId = str(fd, "playerId") || actor.id;
  if (!owns(actor, targetId)) return;

  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)))[0];
  if (!tour) return;

  await upsertResult(tournamentId, targetId, fd, cpKindOf(tour), tour.playerCount, tour.season);

  /* Con «de mis rondas», el récord lo pone el contador y no el formulario. Hay
     que recalcularlo aquí mismo: si no, lo guardado seguía siendo lo que
     tecleó alguien la última vez, y la pantalla enseñaba dos récords distintos
     —el de la cabecera de rondas y el de la lista de resultados— a diez
     centímetros uno del otro. */
  if (pick(fd, "recordMode", ["manual", "rounds"] as const, "manual") === "rounds") {
    await syncTournamentRecord(tournamentId, targetId);
  }

  refresh();
  redirect(withFlash(`/torneos/${tournamentId}`, "ok", "Resultado guardado."));
}

/**
 * v0.16 — Borrar la participación de alguien en un torneo: su resultado Y
 * sus rondas.
 *
 * EL FALLO QUE ARREGLA: antes solo borraba la fila de `tournament_results`.
 * Las rondas seguían ahí (así que «no borraba nada», visto desde la ficha),
 * y con el resultado se iba también el mazo fijado del torneo, con lo que la
 * ronda siguiente volvía a pedir el arquetipo. Borrar a medias deja un estado
 * que no corresponde a nada: o estás en el torneo o no estás.
 *
 * Para borrar una sola ronda está el botón «Eliminar» de cada ronda.
 */
export async function deleteTournamentResult(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const row = (await db.select().from(tournamentResults).where(eq(tournamentResults.id, id)))[0];
  if (!row || !owns(actor, row.playerId)) return;
  await db.delete(matches).where(and(
    eq(matches.tournamentId, row.tournamentId),
    eq(matches.playerAId, row.playerId),
    isNull(matches.playerBId),
  ));
  await db.delete(tournamentResults).where(eq(tournamentResults.id, id));
  refresh();
  redirect(withFlash(`/torneos/${row.tournamentId}`, "ok", "Participación borrada: resultado y rondas."));
}

/* ------------------------------------------------------- competiciones -- */

export async function saveCompetition(fd: FormData) {
  // Una competición es de la liga entera: la organiza quien la organiza.
  await requireManager();
  const editing = str(fd, "id");
  const id = editing || newId("c");
  const values = {
    name: str(fd, "name").slice(0, 120),
    // v0.19: sin «casual». Los amistosos son partidas sin competición.
    kind: pick(fd, "kind", ["league", "swiss", "bracket"] as const, "league"),
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
      redirect(withFlash(`/competiciones/${compId}`, "error", "Hacen falta al menos dos equipos completos de 3."));
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

/* ------------------------------------------------------------- eventos -- */

export async function saveEvent(fd: FormData) {
  // El calendario lo ve todo el mundo, así que lo escribe el organizador.
  await requireManager();
  const editing = str(fd, "id");
  const id = editing || newId("e");
  const values = {
    title: str(fd, "title").slice(0, 120),
    date: isoDate(fd, "date") ?? todayISO(),
    endDate: isoDate(fd, "endDate", null),
    kind: str(fd, "kind") || "round",
    // Vacío es válido: una jornada de la liga no es ningún tipo de torneo
    // del circuito. El color del calendario cae entonces al de `kind`.
    tournamentKind: CALENDAR_EVENT_KINDS.includes(str(fd, "tournamentKind"))
      ? str(fd, "tournamentKind")
      : "",
    location: str(fd, "location").slice(0, 120),
    url: /^https?:\/\//i.test(str(fd, "url")) ? str(fd, "url").slice(0, 400) : "",
    competitionId: str(fd, "competitionId") || null,
    tournamentId: str(fd, "tournamentId") || null,
    note: str(fd, "note").slice(0, 500),
  };
  if (!values.title) return;
  if (editing) await db.update(events).set(values).where(eq(events.id, id));
  else await db.insert(events).values({ id, ...values });
  refresh();
  redirect(withFlash("/calendario", "ok", editing ? "Evento guardado." : "Evento añadido."));
}

/**
 * Empezar el Elo de cero desde hoy.
 *
 * No borra nada: pone la fecha de corte a hoy, y a partir de ahí `eloTable`
 * ignora lo anterior. Todos vuelven al Elo inicial y se reconstruye con las
 * partidas nuevas.
 *
 * Es reversible desde Ajustes quitando la fecha, porque las partidas siguen
 * exactamente donde estaban. Por eso esto no pide confirmación: lo que pide
 * confirmación es lo que no se puede deshacer.
 */
export async function resetElo() {
  await requireManager();
  const hoy = todayISO();

  const existing = await db.select().from(settings).where(eq(settings.id, "default"));
  if (existing[0]) {
    await db.update(settings).set({ eloSince: hoy, updatedAt: new Date() })
      .where(eq(settings.id, "default"));
  } else {
    await db.insert(settings).values({ id: "default", eloSince: hoy });
  }

  refresh();
  redirect(withFlash("/ajustes", "ok", `Elo reiniciado: solo cuentan las partidas desde el ${hoy}.`));
}

/** Volver a contar el Elo desde el principio. */
export async function clearEloReset() {
  await requireManager();
  await db.update(settings).set({ eloSince: null, updatedAt: new Date() })
    .where(eq(settings.id, "default"));
  refresh();
  redirect(withFlash("/ajustes", "ok", "El Elo vuelve a contar todas las partidas."));
}

/** Los tipos de torneo que el calendario sabe colorear. */
const CALENDAR_EVENT_KINDS: string[] = [
  "league_challenge", "league_cup", "regional",
  "special", "international", "worlds", "store", "online", "other",
];

/**
 * Meter en el calendario los eventos oficiales de Europa.
 *
 * La lista está escrita a mano en `src/data/eventos-europa.ts`, con sus
 * fuentes y con marca en los que no coinciden entre ellas. **No hay ninguna
 * llamada automática a ninguna web**: ni hace falta para diez eventos al año
 * ni sería correcto con las webs de las que salen.
 *
 * Es idempotente: cada evento lleva un id fijo, así que volver a pulsarlo
 * actualiza los que ya están en vez de duplicarlos. Eso permite corregir la
 * lista del fichero y volver a importar sin limpiar nada antes.
 *
 * Lo que NO hace: borrar. Si alguien quitó del calendario un evento que no le
 * interesaba, volver a importar no se lo devuelve a la cara... bueno, sí se
 * lo devuelve, porque el id vuelve a no existir y se inserta. Es el precio de
 * que sea idempotente sin llevar una tabla de «borrados a propósito», y para
 * diez eventos al año compensa.
 */
export async function importEuropeanEvents() {
  await requireManager();

  const existentes = new Set(
    (await db.select({ id: events.id }).from(events)
      .where(inArray(events.id, EVENTOS_EUROPA_2027.map((e) => e.id))))
      .map((r) => r.id),
  );

  let nuevos = 0;
  let actualizados = 0;

  for (const e of EVENTOS_EUROPA_2027) {
    const values = {
      title: e.title,
      date: e.date,
      endDate: e.endDate ?? null,
      kind: "tourney",
      tournamentKind: e.tournamentKind,
      location: e.location,
      url: e.url ?? "",
      competitionId: null,
      tournamentId: null,
      note: e.confirmar ? "Fecha por confirmar: las fuentes no coinciden." : "",
    };
    if (existentes.has(e.id)) {
      await db.update(events).set(values).where(eq(events.id, e.id));
      actualizados++;
    } else {
      await db.insert(events).values({ id: e.id, ...values });
      nuevos++;
    }
  }

  refresh();
  redirect(withFlash(
    "/calendario",
    "ok",
    `Eventos de Europa ${TEMPORADA_EVENTOS}: ${nuevos} nuevo(s) y ${actualizados} actualizado(s).`,
  ));
}

/**
 * v0.15 — Importar los torneos de la zona de octubre y noviembre de 2026
 * (`src/data/torneos-zona-2026.ts`) como borradores.
 *
 * Solo inserta: si el torneo ya existe —por id, o porque alguien lo creó a
 * mano el mismo día, del mismo tipo y en la misma tienda— se salta y no se
 * toca. Así se puede pulsar las veces que haga falta sin pisar correcciones.
 *
 * Los Regionales se enlazan con su evento del calendario (los de Europa), y
 * el calendario deja de pintar el evento suelto: si no, Niza salía dos veces.
 */
export async function importLocalTournaments() {
  const actor = await requireManager();

  const existentes = await db.select({
    id: tournaments.id, date: tournaments.date, kind: tournaments.kind,
    name: tournaments.name, venue: tournaments.venue, city: tournaments.city,
  }).from(tournaments);

  let nuevos = 0;
  let saltados = 0;
  for (const z of TORNEOS_ZONA_2026) {
    if (yaExiste(z, existentes)) { saltados++; continue; }
    await db.insert(tournaments).values({
      id: z.id,
      name: z.name,
      kind: z.kind,
      status: "draft",
      scope: "onsite",
      format: "standard",
      bestOf: z.bestOf,
      date: z.date,
      endDate: z.endDate ?? null,
      startTime: z.startTime ?? null,
      venue: z.venue,
      city: z.city,
      country: z.country,
      season: seasonOfDate(z.date),
      division: "masters",
      notes: z.revisar ? `Revisar la fecha: ${z.revisar}` : "",
      createdBy: actor.id,
    }).onConflictDoNothing();
    existentes.push({ id: z.id, date: z.date, kind: z.kind, name: z.name, venue: z.venue, city: z.city });
    if (z.eventoId) {
      await db.update(events).set({ tournamentId: z.id })
        .where(and(eq(events.id, z.eventoId), isNull(events.tournamentId)));
    }
    nuevos++;
  }

  refresh();
  redirect(withFlash("/torneos", "ok",
    `Torneos de la zona: ${nuevos} nuevo(s)${saltados ? `, ${saltados} ya estaban` : ""}.`));
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
    // Cualquier otra cosa cae en el valor recomendado en vez de romper: el
    // campo viene de un desplegable, pero un formulario se puede manipular.
    eloScope: ["all", "competitive", "tournaments"].includes(str(fd, "eloScope"))
      ? str(fd, "eloScope")
      : "competitive",
    // Vacío = desde el principio. `isoDate` con null por defecto ya rechaza
    // cualquier cosa que no sea una fecha de verdad.
    eloSince: isoDate(fd, "eloSince", null),
    ratingZone: str(fd, "ratingZone") || "europe",
    registrationOpen: bool(fd, "registrationOpen"),
    updatedAt: new Date(),
  };
  const existing = await db.select().from(settings).where(eq(settings.id, "default"));
  if (existing[0]) await db.update(settings).set(values).where(eq(settings.id, "default"));
  else await db.insert(settings).values({ id: "default", ...values });
  refresh();
  redirect(withFlash("/ajustes", "ok", "Ajustes guardados."));
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

  /* Solo un torneo abierto acepta rondas. Cerrado, porque es el sentido de
     cerrarlo —si se pudiera seguir escribiendo, «cerrado» sería un adorno—; y
     en borrador, porque la ficha ni siquiera enseña el formulario, así que una
     ronda ahí solo puede llegar por un POST a mano. */
  // v0.16: el organizador puede corregir rondas también con el torneo cerrado.
  if (tour.status !== "open" && !canManageLeague(actor.role)) return;

  const round = int(fd, "round", 1, 1, 50);

  /* v0.13 — el tope de rondas. Un League Challenge es solo suizo (§5.5.6.1,
     Variante #2): en uno de 5 rondas no existe la 6. En una Cup se admite el
     suizo más su eliminatoria, y en un Regional el suizo más el corte. El
     formulario ya no se enseña al llegar al tope, pero una Server Action es
     un endpoint público: la comprobación buena es esta. */
  const tope = maxRondasDe({
    kind: tour.kind, playerCount: tour.playerCount, rounds: tour.rounds, topCut: tour.topCut,
  });
  if (tope != null && round > tope) {
    redirect(withFlash(`/torneos/${tournamentId}`, "error",
      familiaDe(tour.kind) === "challenge"
        ? `Este Challenge tiene ${tope} rondas y no hay top cut: la ronda ${round} no existe.`
        : `Este torneo admite como mucho ${tope} rondas (suizo + top cut).`));
  }

  const bestOf = [1, 3, 5].includes(tour.bestOf) ? tour.bestOf : 3;

  /* v0.15 — el rival puede ser alguien del grupo. Se comprueba que exista y
     que no seas tú; si llega algo raro, se ignora y la ronda se guarda con el
     nombre a secas, como siempre. */
  const rivalPick = str(fd, "opponentPlayerId");
  const rivalPlayer = rivalPick && rivalPick !== playerId
    ? (await db.select({ id: players.id, name: players.name }).from(players)
      .where(eq(players.id, rivalPick)))[0]
    : undefined;
  const opponentName = (str(fd, "opponentName") || rivalPlayer?.name || "").slice(0, 60);
  if (!opponentName) return;

  // Quién salió primero en el JUEGO 1. Del resto se encarga `g{i}_first`, que
  // ahora se marca a mano juego por juego: en la mesa no siempre empieza quien
  // perdió el anterior (concesiones, penalizaciones, reinicios).
  const first = pick(fd, "g0_first", ["", "a", "b"] as const, "")
    || pick(fd, "first", ["", "a", "b"] as const, "");
  const mode = pick(fd, "mode", ["quick", "games"] as const, "quick");

  /* El mazo del torneo se elige UNA vez y no cambia entre rondas: en un suizo
     juegas el mismo mazo de la primera a la última. Vive en el resultado del
     torneo, no en la ronda, y desde aquí solo se rellena si aún no estaba. */
  const existingResult = (await db.select().from(tournamentResults).where(and(
    eq(tournamentResults.tournamentId, tournamentId),
    eq(tournamentResults.playerId, playerId),
  )))[0];

  /* El mazo propio también se puede fijar solo por arquetipo, sin lista de 60
     cartas: el selector ofrece las dos cosas en la misma lista —igual que ya
     pasaba con el mazo del rival— y `deckOrArchetype` deshace el prefijo
     "arch:" antes de que cualquiera de los dos ids toque una columna que no
     es la suya. */
  let deckAId: string | null = existingResult?.deckId ?? null;
  let archetypeAId: string | null = existingResult?.archetypeId ?? null;
  if (!deckAId && !archetypeAId) {
    const proposed = deckOrArchetype(fd, "deckAId");
    deckAId = proposed.deckId;
    archetypeAId = proposed.archetypeId;
  }

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
        // Cada juego lleva el suyo. Era lo que pedía la lista: «marcar si salí
        // 1.º o 2.º por cada juego de la ronda», no solo en el primero.
        first: pick(fd, `g${i}_first`, ["", "a", "b"] as const, i === 0 ? first : ""),
        prizesLeft: maybeInt(fd, `g${i}_prizes`, 0, 6),
      });
      /* Un juego empatado corta la ronda ahí mismo: en la mesa un empate sale
         del reloj, y del reloj no se juega un juego más. El cliente ya deja
         de mandar campos de juegos posteriores (`visibleGames` en
         TournamentRounds), pero esto es la comprobación de verdad — una
         Server Action es un endpoint público y no se fía de qué campos decide
         mandar el formulario. */
      if (winner === "tie") break;
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
    const hasTieGame = rows.some((r) => r.winner === "tie");
    const settled = wonA >= need || wonB >= need;
    seriesResult = settled
      ? null
      // Un juego marcado como empate decide la ronda él solo, sin necesidad de
      // marcar además «se acabó el tiempo»: es la misma situación, vista desde
      // el juego en vez de desde el reloj. Sin desglose de empate, se sigue
      // necesitando el checkbox para la ambigüedad de siempre (1-1 esperando
      // el tercer juego frente a 1-1 con el tiempo agotado).
      : hasTieGame
        ? (wonA > wonB ? "a" : wonB > wonA ? "b" : "tie")
        : (bool(fd, "timeCalled") ? (wonA > wonB ? "a" : wonB > wonA ? "b" : "tie") : null);
  }

  /* Qué llevaba el rival. El selector ofrece en la misma lista los mazos de
     la biblioteca compartida y los arquetipos sueltos: si eliges un mazo se
     guarda en `deckBId` —y con él la lista de 60 cartas, que es lo que
     distingue un mazo de un arquetipo—, y si eliges un arquetipo va a
     `opponentArchetypeId`. Las estadísticas miran primero el mazo y caen al
     arquetipo, así que las dos formas alimentan la matriz igual. */
  const rival = deckOrArchetype(fd, "opponentDeck");
  const rivalDeckId = rival.deckId ?? (str(fd, "deckBId") || null);
  const rivalArchId = rival.archetypeId
    ?? deckOrArchetype(fd, "opponentArchetypeId").archetypeId
    ?? deckOrArchetype(fd, "opponentArchetypeId").deckId;

  const values = {
    competitionId: null,
    tournamentId,
    round,
    date: tour.date,
    playerAId: playerId,
    playerBId: null,
    opponentName,
    opponentPlayerId: rivalPlayer?.id ?? null,
    deckAId,
    archetypeAId,
    deckBId: rivalDeckId,
    opponentArchetypeId: rivalArchId,
    bestOf,
    status: "done" as const,
    seriesResult,
    firstTurn: first,
    note: str(fd, "note").slice(0, 300),
    createdBy: actor.id,
  };

  /* Qué fila se toca. Si el formulario viene de editar, trae el id de la
     ronda: hay que ir por él y no por el número, porque el número es
     precisamente lo que se puede estar cambiando —editar la ronda 3 y escribir
     «4» insertaba una cuarta ronda nueva y dejaba la tercera intacta—.
     Si no viene id, se busca por (torneo, jugador, ronda), que es el índice
     único que impide duplicar de un doble toque en el móvil. */
  const editingId = str(fd, "matchId");
  const existing = editingId
    ? (await db.select().from(matches).where(eq(matches.id, editingId)))[0]
    : (await db.select().from(matches).where(and(
      eq(matches.tournamentId, tournamentId),
      eq(matches.playerAId, playerId),
      eq(matches.round, round),
      // Una ronda de torneo tiene el rival fuera de la liga. Sin este filtro,
      // una partida interna etiquetada a este torneo y con el mismo número de
      // ronda entraba aquí y se sobreescribía con playerBId nulo: el jugador B
      // desaparecía y sus juegos se borraban, sin deshacer y sin avisar.
      isNull(matches.playerBId),
    )))[0];

  // Una ronda que llega por id tiene que ser de este torneo, de este jugador, y
  // ser una ronda de verdad y no una partida interna.
  if (existing && (
    existing.tournamentId !== tournamentId
    || existing.playerAId !== playerId
    || existing.playerBId !== null
  )) return;

  /* v0.15 — el drop. Con «No he acabado el torneo» guardado no se aceptan
     rondas NUEVAS; corregir las que ya estaban sí. La ficha ya no enseña el
     formulario, pero esto es la comprobación de verdad. */
  if (!existing && existingResult?.dropped) {
    redirect(withFlash(`/torneos/${tournamentId}`, "error",
      "Marcaste que no acabaste el torneo (DROP): no se pueden apuntar más rondas."));
  }

  const id = existing?.id ?? newId("m");
  if (existing) {
    /* Editar el número de ronda puede llevarla a un hueco que ya ocupa otra:
       editar la ronda 2 para ponerle un 1 cuando la 1 ya existe. Un UPDATE
       directo revienta contra `matches_tour_round_idx` a mitad de la
       sentencia, porque el índice es real y no se puede aplazar hasta el
       final de la transacción.

       Se resuelve como un intercambio, en tres pasos con un número de ronda
       centinela (-1) que ninguna ronda de verdad usa —siempre son >= 1—: la
       que estorba se aparta, la que se edita ocupa el hueco, y la que se
       apartó se queda con el número que la primera dejó libre. El resultado
       es que las dos rondas cambian de número entre sí, que es justo lo que
       alguien renumerando esperaría que pasara. */
    if (existing.round !== round) {
      const clash = (await db.select().from(matches).where(and(
        eq(matches.tournamentId, tournamentId),
        eq(matches.playerAId, playerId),
        eq(matches.round, round),
        isNull(matches.playerBId),
      )))[0];
      if (clash && clash.id !== id) {
        await db.update(matches).set({ round: -1 }).where(eq(matches.id, clash.id));
        await db.update(matches).set(values).where(eq(matches.id, id));
        await db.update(matches).set({ round: existing.round }).where(eq(matches.id, clash.id));
      } else {
        await db.update(matches).set(values).where(eq(matches.id, id));
      }
    } else {
      await db.update(matches).set(values).where(eq(matches.id, id));
    }
    await db.delete(games).where(eq(games.matchId, id));
  } else {
    /* El índice único puede saltar en una carrera: dos envíos a la vez con el
       mismo número. Que gane el último en vez de reventar con un 500.

       `targetWhere` no es opcional aquí: `matches_tour_round_idx` es un índice
       PARCIAL (solo donde `tournament_id` no es nulo), y PostgreSQL descarta
       los índices parciales al inferir el árbitro de un ON CONFLICT salvo que
       se repita el predicado. Sin esta línea el error no sería de carrera sino
       de planificación, y fallaría al apuntar CUALQUIER ronda nueva. */
    await db.insert(matches).values({ id, ...values })
      .onConflictDoUpdate({
        target: [matches.tournamentId, matches.playerAId, matches.round],
        targetWhere: sql`${matches.tournamentId} is not null`,
        set: values,
      });
  }
  if (rows.length) {
    await db.insert(games).values(rows.map((r) => ({ matchId: id, ...r, note: "" })));
  }

  // Si el mazo (o el arquetipo) del torneo se acaba de elegir aquí, queda
  // fijado en el resultado: a partir de la ronda siguiente ya viene puesto y
  // bloqueado.
  const justLocked = !(existingResult?.deckId || existingResult?.archetypeId);
  await syncTournamentRecord(
    tournamentId, playerId,
    justLocked ? deckAId : null,
    justLocked ? archetypeAId : null,
  );
  refresh();
  redirect(withFlash(`/torneos/${tournamentId}`, "ok", `Ronda ${round} guardada.`));
}

/**
 * v0.15.1 — Drop desde la ronda, en vez de apuntar la siguiente.
 *
 * Pone `dropped` en el resultado del torneo (creándolo si aún no había) y
 * vuelve a la ficha: allí ya no sale el formulario de ronda, y
 * `saveTournamentRound` rechaza rondas nuevas. Corregir las apuntadas sigue
 * pudiéndose.
 */
export async function dropFromTournament(fd: FormData) {
  await setDropped(fd, true);
}

/** Deshacer el drop: vuelve a dejar apuntar rondas. */
export async function undoDrop(fd: FormData) {
  await setDropped(fd, false);
}

async function setDropped(fd: FormData, dropped: boolean) {
  const actor = await requireActor();
  const tournamentId = str(fd, "tournamentId");
  if (!tournamentId) return;
  const playerId = str(fd, "playerId") || actor.id;
  if (!owns(actor, playerId)) return;
  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)))[0];
  if (!tour) return;

  await db.insert(tournamentResults)
    .values({ id: newId("tr"), tournamentId, playerId, dropped })
    .onConflictDoUpdate({
      target: [tournamentResults.tournamentId, tournamentResults.playerId],
      set: { dropped },
    });
  await syncTournamentRecord(tournamentId, playerId);
  refresh();
  redirect(withFlash(`/torneos/${tournamentId}`, "ok",
    dropped ? "Drop apuntado: ya no se piden más rondas." : "Drop deshecho: puedes seguir apuntando rondas."));
}

export async function deleteTournamentRound(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const row = (await db.select().from(matches).where(eq(matches.id, id)))[0];
  if (!row || !row.tournamentId) return;
  if (!owns(actor, row.playerAId)) return;

  // La misma puerta que al guardar: la ficha esconde el botón en un torneo
  // cerrado, pero esconder un botón no protege nada.
  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, row.tournamentId)))[0];
  // v0.16: un organizador puede corregir también un torneo ya cerrado.
  if (!tour || (tour.status !== "open" && !canManageLeague(actor.role))) return;

  await db.delete(matches).where(eq(matches.id, id));
  await syncTournamentRecord(row.tournamentId, row.playerAId);
  refresh();
  redirect(withFlash(`/torneos/${row.tournamentId}`, "ok", "Ronda borrada."));
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
async function syncTournamentRecord(
  tournamentId: string,
  playerId: string,
  /** Mazo a fijar, solo cuando el resultado todavía no tenía ninguno. */
  deckId: string | null = null,
  /** Arquetipo a fijar, cuando lo que se fija es solo el arquetipo y no un mazo. */
  archetypeId: string | null = null,
) {
  const rounds = await db.select().from(matches).where(and(
    eq(matches.tournamentId, tournamentId),
    eq(matches.playerAId, playerId),
    isNull(matches.playerBId),
  )).orderBy(asc(matches.round));

  /* Sin rondas, el récord es 0-0-0 y no lo que hubiera antes. Salir sin
     escribir dejaba el récord viejo para siempre al borrar la última. */
  if (!rounds.length) {
    await db.update(tournamentResults)
      .set({ wins: 0, losses: 0, ties: 0 })
      .where(and(
        eq(tournamentResults.tournamentId, tournamentId),
        eq(tournamentResults.playerId, playerId),
      ));
    return;
  }

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

  const set = deckId
    ? { wins, losses, ties, deckId }
    : archetypeId
      ? { wins, losses, ties, archetypeId }
      : { wins, losses, ties };
  await db.insert(tournamentResults)
    .values({ id: newId("tr"), tournamentId, playerId, wins, losses, ties, deckId, archetypeId })
    .onConflictDoUpdate({
      target: [tournamentResults.tournamentId, tournamentResults.playerId],
      set,
    });
}

/** Recalcular el récord a mano, por si alguien editó rondas sueltas. */
export async function refreshTournamentRecord(fd: FormData) {
  const actor = await requireActor();
  const tournamentId = str(fd, "tournamentId");
  const playerId = str(fd, "playerId") || actor.id;
  if (!tournamentId || !owns(actor, playerId)) return;
  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)))[0];
  if (tour?.status !== "open") return;
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

  // v0.18: 1–550 y 1350–2100; entre medias es el salto Arceus (→ 1500).
  const elo = normalizeLadderInput(maybeNum(fd, "ladderElo"));
  if (elo == null) {
    redirect(withFlash(`/perfil/${playerId}`, "error", "El rango va de 1 a 550 (Novato) o de 1350 a 2100."));
  }
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

/* ------------------------------------------- metagame presencial --- */

/**
 * Importar lo que se jugó en un Regional, pegando la clasificación.
 *
 * POR QUÉ ES UN PEGADO Y NO UN BOTÓN QUE VA A BUSCARLO
 * ----------------------------------------------------
 * Porque no hay de dónde traerlo con permiso. La API de Limitless sirve su
 * plataforma online y deja los presenciales fuera; RK9 y pokemon.com
 * prohíben expresamente la extracción automatizada, «con o sin fines
 * comerciales», y que el botón se pulse una vez al mes no cambia lo que dicen
 * sus condiciones: lo que está prohibido es el método, no la frecuencia.
 * pokedata.ovh republica lo de RK9, así que pasar por ahí no arregla el
 * origen, solo añade un intermediario.
 *
 * Así que la persona copia lo que ya está viendo y lo pega. A partir de ahí
 * es todo automático: trocear, casar arquetipos, poner sprites y guardar.
 *
 * DOS PASADAS, Y LA PRIMERA NO ESCRIBE
 * ------------------------------------
 * Sin `confirmar` devuelve el recuento y no toca la base. Es lo que deja ver
 * cuántas filas han entrado, cuántas se han descartado y qué mazos no
 * conocía el catálogo, **antes** de guardar nada. El segundo envío es el que
 * escribe.
 *
 * Lo que vuelve al navegador en esa primera pasada es el recuento por mazo,
 * no el texto pegado ni ninguna línea suelta.
 */
export async function importMetaEvent(
  _prev: MetaImportState, fd: FormData,
): Promise<MetaImportState> {
  const actor = await requireManager();

  const texto = String(fd.get("texto") ?? "");
  if (!texto.trim()) return { error: "Pega antes la clasificación o el desglose por mazos." };

  const modo: PasteMode = str(fd, "modo") === "summary" ? "summary" : "standings";
  const catalogo = await db.select().from(archetypes);
  const known = catalogo.map((a) => ({
    id: a.id, name: a.name, main: a.main, secondary: a.secondary,
  }));

  const parsed = modo === "summary" ? parseSummary(texto, known) : parseStandings(texto, known);

  if (!parsed.entries.length) {
    return {
      error: parsed.descartadas > 0
        ? `No se ha reconocido ningún mazo: ${parsed.descartadas} fila(s) descartadas. Prueba a pulsar «Actualizar catálogo» aquí arriba y vuelve a pegarlo.`
        : "No se ha entendido nada de lo pegado. Revisa que sean filas de clasificación o líneas «mazo — número».",
    };
  }

  const preview = resumenImportacion(modo, parsed);

  if (str(fd, "confirmar") !== "si") return { preview };

  /* ------------------------------------------------ a partir de aquí, escribe */

  const name = str(fd, "name").slice(0, 120);
  const date = isoDate(fd, "date", null);
  if (!name) return { error: "Ponle nombre al evento.", preview };
  if (!date) return { error: "La fecha no es válida.", preview };

  const kind = CALENDAR_KINDS[str(fd, "kind")] ? str(fd, "kind") : "regional";
  const division = DIVISIONS[str(fd, "division") as keyof typeof DIVISIONS]
    ? str(fd, "division") : "masters";

  /* El id de un evento importado: legible, y sobre todo determinista.
     Determinista es lo que hace que volver a pegar el mismo Regional lo
     actualice en vez de duplicarlo.

     Lleva la división porque el mismo Regional tiene tres, con el mismo
     nombre y la misma fecha y clasificaciones distintas; sin ella, importar
     Seniors machacaba Masters en silencio.

     Y lleva una firma corta del nombre completo porque el trozo legible va
     recortado a 40 caracteres: dos eventos que solo se diferencien a partir
     del carácter 41 tendrían el mismo id y el segundo pisaría al primero sin
     decir nada. Con la firma, identidades distintas dan ids distintos y el
     índice único de (nombre, fecha, división) nunca salta. */
  const id = [
    "mev",
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40),
    date,
    division,
    firma(`${name}|${date}|${division}`),
  ].join("-");

  const fila = {
    id,
    name,
    date,
    kind,
    location: str(fd, "location").slice(0, 120),
    format: TOURNAMENT_FORMATS[str(fd, "format") as keyof typeof TOURNAMENT_FORMATS]
      ? str(fd, "format") : "standard",
    division,
    season: maybeInt(fd, "season", 2000, 2100) ?? seasonOfDate(date),
    playerCount: maybeInt(fd, "playerCount", 0, 100000),
    topCut: maybeInt(fd, "topCut", 0, 1024),
    coverage: coverageOf(parsed.entries),
    sourceUrl: str(fd, "sourceUrl").slice(0, 300),
    sourceName: str(fd, "sourceName").slice(0, 80),
    notes: str(fd, "notes").slice(0, 500),
    createdBy: actor.id,
    updatedAt: new Date(),
  };

  // Volver a importar el mismo evento —porque la primera vez aún no estaba el
  // top cut— actualiza la cabecera y reemplaza las filas. Basta con mirar el
  // id porque es determinista: la misma identidad da siempre el mismo id, y
  // dos identidades distintas nunca dan el mismo.
  await db.insert(metaEvents).values(fila).onConflictDoUpdate({
    target: metaEvents.id,
    set: {
      name: fila.name, date: fila.date, kind: fila.kind, location: fila.location,
      format: fila.format, division: fila.division, season: fila.season,
      playerCount: fila.playerCount, topCut: fila.topCut, coverage: fila.coverage,
      sourceUrl: fila.sourceUrl, sourceName: fila.sourceName, notes: fila.notes,
      updatedAt: fila.updatedAt,
    },
  });

  /* Reemplazo, no mezcla: borrar y volver a insertar. Sin transacción porque
     el driver `neon-http` no las tiene; la ventana en la que el evento se
     queda sin filas dura milisegundos y, si el insert fallara, lo que queda es
     un evento vacío que se arregla volviendo a pegar —no datos mezclados de
     dos pegados distintos, que sería mucho peor de detectar—. */
  await db.delete(metaEntries).where(eq(metaEntries.eventId, id));

  const sprites = indiceDeSprites(catalogo);
  const archById = new Map(catalogo.map((a) => [a.id, a]));

  const filas = parsed.entries.map((e) => {
    const arch = e.archetypeId ? archById.get(e.archetypeId) : undefined;
    const iconos = arch
      ? { main: arch.main, secondary: arch.secondary }
      : spritesDe(e.deck, sprites);
    return {
      eventId: id,
      placement: e.placement,
      copies: Math.max(1, e.copies),
      archetypeId: arch?.id ?? null,
      archetypeName: e.deck.slice(0, 120),
      main: iconos.main,
      secondary: iconos.secondary,
      wins: e.wins, losses: e.losses, ties: e.ties,
    };
  });

  // A trozos: una clasificación de top 256 en un solo insert es una sentencia
  // con miles de parámetros, y el driver HTTP la corta.
  for (let i = 0; i < filas.length; i += 200) {
    await db.insert(metaEntries).values(filas.slice(i, i + 200));
  }

  refresh();
  const avisos = [
    `${filas.length} fila(s) guardadas`,
    parsed.descartadas ? `${parsed.descartadas} descartada(s) por no repetirse` : "",
    parsed.nuevos.length ? `${parsed.nuevos.length} mazo(s) fuera del catálogo` : "",
  ].filter(Boolean);
  return { ok: `${name}: ${avisos.join(", ")}.`, preview };
}

/**
 * Una firma corta y estable de una cadena (FNV-1a, 32 bits en hexadecimal).
 *
 * No es criptografía y no pretende serlo: solo hace falta que la misma
 * entrada dé siempre la misma salida y que dos entradas distintas casi nunca
 * coincidan. Se usa para desempatar ids de eventos, no para proteger nada.
 */
function firma(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** El recuento por mazo que ve la pantalla antes de guardar. */
function resumenImportacion(mode: PasteMode, parsed: ParseResult): MetaPreview {
  const acc = new Map<string, MetaPreviewRow>();
  for (const e of parsed.entries) {
    const row = acc.get(e.deck) ?? { name: e.deck, entries: 0, conocido: e.archetypeId != null, top8: 0 };
    row.entries += Math.max(1, e.copies);
    if (e.placement != null && e.placement <= 8) row.top8 += 1;
    acc.set(e.deck, row);
  }
  const rows = [...acc.values()].sort((a, b) => b.entries - a.entries || a.name.localeCompare(b.name, "es"));
  return {
    mode,
    rows,
    total: rows.reduce((a, r) => a + r.entries, 0),
    coverage: coverageOf(parsed.entries),
    skipped: parsed.skipped,
    descartadas: parsed.descartadas,
    nuevos: parsed.nuevos,
  };
}

/**
 * Los slugs de Pokémon que el catálogo ya conoce.
 *
 * Es la forma de ponerle sprite a un mazo que no está dado de alta: si en su
 * nombre aparece un Pokémon que sí sale en algún arquetipo del catálogo, ese
 * es el icono. No se inventa ningún slug — un slug inventado es una imagen
 * rota, y una fila con el dibujo equivocado se lee peor que una sin dibujo.
 */
function indiceDeSprites(catalogo: Array<{ main: string; secondary: string }>): Set<string> {
  const set = new Set<string>();
  for (const a of catalogo) {
    if (a.main) set.add(a.main);
    if (a.secondary) set.add(a.secondary);
  }
  return set;
}

function spritesDe(nombre: string, conocidos: Set<string>): { main: string; secondary: string } {
  const palabras = nombre.split(/\s+/).filter(Boolean);
  const hits: string[] = [];
  // Primero las parejas ("Raging Bolt"), que son más específicas que la
  // palabra suelta ("Raging" no es nadie, "Bolt" tampoco).
  for (let n = 2; n >= 1; n--) {
    for (let i = 0; i + n <= palabras.length; i++) {
      const slug = pokeSlug(palabras.slice(i, i + n).join(" "));
      if (slug && conocidos.has(slug) && !hits.includes(slug)) hits.push(slug);
      if (hits.length >= 2) break;
    }
    if (hits.length >= 2) break;
  }
  return { main: hits[0] ?? "", secondary: hits[1] ?? "" };
}

/**
 * Quitar un evento importado, con sus filas.
 *
 * Sin pedir que se escriba el nombre, al revés que borrar un torneo: aquí no
 * se pierde nada que no se pueda recuperar volviendo a pegar la clasificación
 * de una web pública.
 */
export async function deleteMetaEvent(fd: FormData) {
  await requireManager();
  const id = str(fd, "id");
  if (!id) return;
  await db.delete(metaEvents).where(eq(metaEvents.id, id));
  refresh();
  redirect(withFlash("/ajustes", "ok", "Evento quitado del metagame presencial."));
}

/* ================================================ v0.14 — Limitless web ====

   Un botón de organizador en Ajustes: trae los Regionales y las City Leagues
   que falten desde limitlesstcg.com y los guarda en el metagame presencial
   (`meta_events` + `meta_entries`), la misma tabla que la importación a mano.

   · Solo mazos. Los parsers no leen nombres de persona (ver
     `lib/limitlessHtml.ts`) y la tabla no tiene dónde guardarlos.
   · Idempotente: los ids son `lt-<id>` y `ltjp-<id>`, y lo que ya está no se
     vuelve a pedir. Pulsarlo dos veces seguidas no hace ninguna petición de
     torneo la segunda vez.
   · Con tope: 6 Regionales y 15 City Leagues por pulsación, con pausa entre
     peticiones. Si falta algo, se vuelve a pulsar.
   ========================================================================= */

export async function syncLimitlessIrl(fd: FormData) {
  const actor = await requireManager();
  const que = str(fd, "que") === "city" ? "city" : str(fd, "que") === "regionales" ? "regionales" : "todo";

  const existentes = await db.select({ id: metaEvents.id, name: metaEvents.name, date: metaEvents.date, division: metaEvents.division })
    .from(metaEvents);
  const ids = new Set<string>(existentes.map((e) => e.id));
  const identidades = new Set<string>(existentes.map((e) => `${e.name}|${e.date}|${e.division}`));

  const catalogo = await db.select().from(archetypes);
  const normA = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
  const porNombre = new Map(catalogo.map((a) => [normA(a.name), a]));
  const porSprites = new Map(catalogo.map((a) => [`${a.main}|${a.secondary}`, a]));
  const casar = (name: string, main: string, secondary: string) =>
    porNombre.get(normA(name)) ?? porSprites.get(`${main}|${secondary}`) ?? porSprites.get(`${main}|`) ?? null;

  const guardar = async (
    ev: typeof metaEvents.$inferInsert,
    filas: Array<{ placement: number | null; copies: number; name: string; main: string; secondary: string }>,
  ) => {
    // Si alguien ya lo pegó a mano con el mismo nombre y fecha, manda lo suyo.
    if (identidades.has(`${ev.name}|${ev.date}|${ev.division}`)) return false;
    await db.insert(metaEvents).values(ev).onConflictDoNothing();
    await db.delete(metaEntries).where(eq(metaEntries.eventId, ev.id));
    const rows = filas.map((f) => {
      const a = casar(f.name, f.main, f.secondary);
      return {
        eventId: ev.id, placement: f.placement, copies: Math.max(1, f.copies),
        archetypeId: a?.id ?? null,
        archetypeName: (a?.name ?? f.name).slice(0, 120),
        main: a?.main ?? f.main, secondary: a?.secondary ?? f.secondary,
        wins: null, losses: null, ties: null,
      };
    });
    for (let i = 0; i < rows.length; i += 200) await db.insert(metaEntries).values(rows.slice(i, i + 200));
    return true;
  };

  const desde = `${(seasonOfDate(todayISO()) ?? 2027) - 1}-07-01`; // la temporada en curso
  const avisos: string[] = [];
  const fallos: string[] = [];

  if (que !== "city") {
    const r = await recogerRegionales({
      yaTenemos: new Set([...ids].filter((i) => i.startsWith("lt-")).map((i) => i.slice(3))),
      desde,
    });
    let n = 0;
    for (const x of r.leidos) {
      const ok = await guardar({
        id: `lt-${x.torneo.id}`, name: x.torneo.name, date: x.torneo.date, kind: x.kind,
        location: x.torneo.country, format: "standard", division: "masters",
        season: seasonOfDate(x.torneo.date), playerCount: x.torneo.players,
        topCut: x.cabeza.length || 8, coverage: null,
        sourceUrl: x.url, sourceName: "Limitless TCG",
        notes: "Recuento de mazos del Día 2 (fase 2) publicado por Limitless TCG; el top cut va puesto a puesto. Sin nombres.",
        createdBy: actor.id,
      }, filasParaGuardar(x.stats, x.cabeza));
      if (ok) n++;
    }
    avisos.push(`${n} Regional(es) nuevo(s)`);
    fallos.push(...r.fallos);
  }

  if (que !== "regionales") {
    const r = await recogerCityLeagues({
      yaTenemos: new Set([...ids].filter((i) => i.startsWith("ltjp-")).map((i) => i.slice(5))),
    });
    let n = 0;
    for (const x of r.leidas) {
      const ok = await guardar({
        id: `ltjp-${x.liga.id}`, name: `City League ${x.liga.prefecture} ${x.liga.date.slice(5).replace("-", "/")}`,
        date: x.liga.date, kind: "city_league",
        location: `${x.liga.prefecture}, Japón`, format: "standard", division: "masters",
        season: seasonOfDate(x.liga.date), playerCount: null, topCut: 8, coverage: x.puestos.length,
        sourceUrl: x.url, sourceName: "Limitless TCG",
        notes: "City League de Japón: top del evento, solo puesto y mazo. Formato japonés, que va por delante del internacional.",
        createdBy: actor.id,
      }, x.puestos.map((p) => ({ ...p, copies: 1 })));
      if (ok) n++;
    }
    avisos.push(`${n} City League(s) nueva(s)`);
    fallos.push(...r.fallos);
  }

  refresh();
  const msg = `Limitless: ${avisos.join(", ")}.${fallos.length ? ` ${fallos.length} con problemas: ${fallos.slice(0, 2).join("; ")}` : ""}`;
  redirect(withFlash("/ajustes", fallos.length && !avisos.some((a) => !a.startsWith("0")) ? "error" : "ok", msg));
}

/* ============================================ v0.14 — buscador de eventos ====

   Challenges y Cups pegados desde el Event Locator oficial (ver
   `lib/eventosPegados.ts`: pokemon.com prohíbe la extracción automatizada,
   así que se copia a mano y se pega). Idempotente por id: pegar la misma
   lista otra vez actualiza y no duplica.
   ========================================================================= */

export async function importPastedEvents(fd: FormData) {
  await requireManager();
  const texto = String(fd.get("texto") ?? "").slice(0, 200_000);
  const { eventos, ignorados } = parseEventosPegados(texto);
  if (!eventos.length) {
    redirect(withFlash("/calendario", "error",
      "No he reconocido ningún torneo en lo pegado. Puedes pegar la lista del buscador oficial o un listado por meses (CHALLENGE / CUP / REGIONAL)."));
  }
  const [yaRegistrados, toursExistentes, evOficiales] = await Promise.all([
    db.select({ id: events.id }).from(events).where(inArray(events.id, eventos.map((e) => e.id))),
    db.select({ id: tournaments.id, date: tournaments.date, kind: tournaments.kind, venue: tournaments.venue }).from(tournaments),
    db.select({ id: events.id, date: events.date, tournamentKind: events.tournamentKind, title: events.title }).from(events),
  ]);
  const ya = new Set(yaRegistrados.map((r) => r.id));

  let nuevos = 0;
  for (const e of eventos) {
    // Si ya existe un evento oficial en esa fecha para ese Regional (ej: eu-2027-nice), reutilizamos su id
    const evCoincidente = evOficiales.find((x) =>
      x.id === e.id ||
      (e.kind === "regional" && x.tournamentKind === "regional" && x.date === e.date)
    );
    const idAGuardar = evCoincidente ? evCoincidente.id : e.id;

    // Si ya existe un torneo en la app para este día y tienda, lo enlazamos para evitar duplicados en calendario
    const tourCoincidente = toursExistentes.find((t) =>
      t.date === e.date && t.kind === e.kind && (
        t.venue.toLowerCase().includes(e.store.toLowerCase()) ||
        e.store.toLowerCase().includes(t.venue.toLowerCase())
      )
    );

    const values = {
      title: e.title.slice(0, 120),
      date: e.date,
      endDate: e.endDate ?? null,
      kind: "tourney",
      tournamentKind: e.kind,
      location: e.location,
      url: "",
      competitionId: null,
      tournamentId: tourCoincidente?.id ?? null,
      note: [e.time ? `Empieza a las ${e.time}` : "", e.note ?? "Del listado pegado"].filter(Boolean).join(" · "),
    };
    if (ya.has(idAGuardar) || evCoincidente) {
      await db.update(events).set(values).where(eq(events.id, idAGuardar));
    } else {
      await db.insert(events).values({ id: idAGuardar, ...values });
      nuevos++;
    }
  }
  refresh();
  redirect(withFlash("/calendario", "ok",
    `${nuevos} evento(s) nuevo(s), ${eventos.length - nuevos} actualizado(s)${ignorados ? `, ${ignorados} ignorado(s) (otros juegos o tipos)` : ""}.`));
}


/* ================================================================ v0.17 -- */

/**
 * Cambiar de idioma. Se guarda en una cookie de un año y se vuelve a la
 * misma pantalla. No necesita sesión: también sirve en la de entrar.
 */
export async function setLang(fd: FormData) {
  const lang = asLang(str(fd, "lang"));
  const jar = await cookies();
  jar.set(LANG_COOKIE, lang, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  refresh();
  redirect(safeBack(fd, "/"));
}

/**
 * Seguir / dejar de seguir a alguien. Siempre sobre la lista de quien está
 * firmado: el `playerId` del formulario es a QUIÉN se sigue, nunca el dueño.
 */
export async function togglePlayerFavorite(fd: FormData) {
  const actor = await requireActor();
  const favoriteId = str(fd, "playerId");
  if (!favoriteId || favoriteId === actor.id) return;

  const target = (await db.select({ id: players.id }).from(players).where(eq(players.id, favoriteId)))[0];
  if (!target) return;

  const where = and(eq(playerFavorites.playerId, actor.id), eq(playerFavorites.favoriteId, favoriteId));
  const existing = (await db.select().from(playerFavorites).where(where))[0];
  if (existing) await db.delete(playerFavorites).where(where);
  else {
    await db.insert(playerFavorites)
      .values({ playerId: actor.id, favoriteId })
      // Dos toques seguidos en el móvil no deben reventar con un 23505.
      .onConflictDoNothing();
  }
  refresh();
  redirect(safeBack(fd, `/perfil/${favoriteId}`));
}

/** Un puesto de leaderboard: entero entre 1 y 100.000, o nulo si viene vacío. */
const puestoDe = (fd: FormData, k: string): number | null => {
  const n = maybeNum(fd, k);
  if (n == null) return null;
  const r = Math.round(n);
  return r >= 1 && r <= 100_000 ? r : null;
};

/**
 * Apuntar el puesto en el leaderboard oficial (España y Europa).
 * El propio, cada uno; el de otra persona, un organizador.
 */
export async function setZoneRanks(fd: FormData) {
  const actor = await requireActor();
  const playerId = str(fd, "playerId") || actor.id;
  if (!owns(actor, playerId)) return;

  const borrar = str(fd, "clear") === "1";
  await db.update(players)
    .set({
      rankSpain: borrar ? null : puestoDe(fd, "rankSpain"),
      rankEurope: borrar ? null : puestoDe(fd, "rankEurope"),
      rankZoneUpdatedAt: new Date(),
    })
    .where(eq(players.id, playerId));

  refresh();
  redirect(withFlash(`/perfil/${playerId}`, "ok", borrar ? "Puestos borrados." : "Puestos guardados."));
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
    redirect(withFlash(back, "error", "Esa persona no participa en esta liga."));
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
  if (!unicos.length) redirect(withFlash(back, "error", "Elige un mazo o, al menos, el arquetipo."));

  const where = and(eq(leagueDecks.competitionId, competitionId), eq(leagueDecks.playerId, playerId));
  const existing = (await db.select({ playerId: leagueDecks.playerId }).from(leagueDecks).where(where))[0];
  if (existing && !manager) {
    redirect(withFlash(back, "error", "Tus mazos de liga ya están bloqueados. Pídele a un organizador que los desbloquee."));
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
  redirect(withFlash(`/competiciones/${competitionId}`, "ok", "Mazo desbloqueado: ya puede entregarlo otra vez."));
}

/**
 * Reset global del ladder para el cambio de temporada. Solo organizadores y
 * con la frase escrita, porque toca a todo el mundo a la vez.
 *
 * Quita el rango de todos y marca el inicio de temporada (`ladder_since`).
 * El historial (`ladder_entries`) NO se borra: queda como archivo y la
 * gráfica del líder empieza a contar desde aquí. Opcionalmente reinicia
 * también el Elo de la liga (fecha de corte, reversible).
 */
export async function resetLadderSeason(fd: FormData) {
  const actor = await requireManager();
  if (!confirmed(fd, "nueva temporada")) {
    redirect(withFlash("/ajustes", "error", "Escribe «nueva temporada» para confirmar."));
  }
  const ahora = new Date();
  const tambienElo = str(fd, "elo") === "1";
  const tambienPuestos = str(fd, "puestos") === "1";

  await db.update(players).set({
    ladderElo: null,
    ladderNote: "",
    ladderEloUpdatedAt: ahora,
    ...(tambienPuestos ? { rankSpain: null, rankEurope: null, rankZoneUpdatedAt: ahora } : {}),
  });

  // v0.19: queda apuntado, para la línea roja de la gráfica del ladder.
  await db.insert(seasonResets).values({ id: newId("sr"), at: ahora, createdBy: actor.id });

  const cambios = { ladderSince: ahora, updatedAt: ahora, ...(tambienElo ? { eloSince: todayISO() } : {}) };
  const existing = await db.select({ id: settings.id }).from(settings).where(eq(settings.id, "default"));
  if (existing[0]) await db.update(settings).set(cambios).where(eq(settings.id, "default"));
  else await db.insert(settings).values({ id: "default", ...cambios });

  refresh();
  redirect(withFlash("/ajustes", "ok",
    `Temporada nueva: rangos del ladder a cero${tambienElo ? ", Elo de la liga desde hoy" : ""}${tambienPuestos ? " y puestos oficiales borrados" : ""}.`));
}

/** v0.19 — Lo mismo que el cron diario, a mano. Solo organizadores. */
export async function limpiarTorneosAbandonados() {
  await requireManager();
  const borrados = await borrarTorneosAbandonados();
  refresh();
  redirect(withFlash("/ajustes", "ok", borrados.length
    ? `Borrados ${borrados.length} torneo(s) sin participación: ${borrados.map((t) => t.name).join(", ").slice(0, 160)}.`
    : "No había ningún torneo abandonado."));
}

/* ================================================================ v0.21 -- */

/**
 * Familias de arquetipos: guarda de una vez el padre de cada arquetipo
 * (campos `parent:<id>`). Solo organizadores. Rechaza ciclos en silencio
 * (deja ese arquetipo como estaba) y lo cuenta en el aviso.
 */
export async function saveArchetypeParents(fd: FormData) {
  await requireManager();
  const filas = await db.select({ id: archetypes.id, parentId: archetypes.parentId }).from(archetypes);
  const ids = new Set(filas.map((f) => f.id));
  const parentOf = new Map<string, string | null>(filas.map((f) => [f.id, f.parentId]));

  let cambios = 0, rechazados = 0;
  for (const [k, v] of fd.entries()) {
    if (typeof k !== "string" || !k.startsWith("parent:")) continue;
    const id = k.slice("parent:".length);
    if (!ids.has(id)) continue;
    const padre = typeof v === "string" && v && ids.has(v) ? v : null;
    if (padre === (parentOf.get(id) ?? null)) continue;
    if (padre && creaCiclo(id, padre, parentOf)) { rechazados++; continue; }
    parentOf.set(id, padre);
    await db.update(archetypes).set({ parentId: padre }).where(eq(archetypes.id, id));
    cambios++;
  }
  refresh();
  redirect(withFlash("/ajustes", rechazados ? "error" : "ok",
    `${cambios} arquetipo(s) actualizado(s)${rechazados ? `; ${rechazados} sin cambiar porque harían un círculo` : ""}.`));
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
  if (!competitionId || !name) redirect(withFlash(back, "error", "El equipo necesita un nombre."));
  if (members.length !== TAM_EQUIPO || new Set(members).size !== TAM_EQUIPO) {
    redirect(withFlash(back, "error", "Un equipo son tres personas distintas."));
  }
  const apuntados = await db.select({ playerId: competitionPlayers.playerId }).from(competitionPlayers)
    .where(eq(competitionPlayers.competitionId, competitionId));
  if (apuntados.length && members.some((m) => !apuntados.some((a) => a.playerId === m))) {
    redirect(withFlash(back, "error", "Todos los miembros tienen que participar en la liga."));
  }
  const otros = (await db.select().from(competitionTeams)
    .where(eq(competitionTeams.competitionId, competitionId)))
    .filter((e) => e.id !== editing);
  const repetido = members.find((m) => otros.some((e) => e.members.includes(m)));
  if (repetido) redirect(withFlash(back, "error", "Alguien ya está en otro equipo de esta liga."));

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
  redirect(withFlash(`/competiciones/${competitionId}`, "ok", "Equipo borrado."));
}
