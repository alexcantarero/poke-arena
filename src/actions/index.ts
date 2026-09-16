"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  archetypes, competitionPlayers, competitions, deckFavorites, decks, events, games, invites,
  ladderEntries, matches, players, settings, tournamentResults, tournaments,
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
import { withFlash } from "@/lib/flash";
import { pairRound } from "@/lib/stats";
import { LADDER_MAX, LADDER_MIN, rankOf } from "@/lib/rank";
import { loadSnapshot } from "@/lib/data";
import { fetchArchetypeCatalog } from "@/lib/sources/limitless";
import { energyTypesOf } from "@/lib/sources/pokeapi";
import { ARCHETYPE_PREFIX, TOURNAMENT_STATUSES } from "@/lib/types";
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
     los CP guardados se vuelven a calcular. Sin esto, el caso más normal del
     mundo —«se me olvidó poner cuánta gente hubo»— dejaba el perfil diciendo
     una cifra y la ficha del torneo otra distinta. Los puestos a mano no se
     tocan: alguien los puso por algo. */
  if (editing) {
    const rows = await db.select().from(tournamentResults)
      .where(eq(tournamentResults.tournamentId, id));
    const season = values.season ?? new Date().getFullYear();
    for (const r of rows) {
      if (r.cpManual) continue;
      const cp = cpForPlacement(season, values.kind, r.placement, values.playerCount) ?? 0;
      if (cp !== r.cpEarned) {
        await db.update(tournamentResults).set({ cpEarned: cp })
          .where(eq(tournamentResults.id, r.id));
      }
    }
  }

  refresh();
  redirect(withFlash(`/torneos/${id}`, "ok", editing ? "Torneo guardado." : "Torneo creado."));
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
  const cpEarned = cpManual ? int(fd, "cpEarned", 0, 0, 5000) : (auto ?? 0);

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

  await upsertResult(tournamentId, targetId, fd, tour.kind, tour.playerCount, tour.season);

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
  if (tour.status !== "open") return;

  const round = int(fd, "round", 1, 1, 50);
  const bestOf = [1, 3, 5].includes(tour.bestOf) ? tour.bestOf : 3;
  const opponentName = str(fd, "opponentName").slice(0, 60);
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

export async function deleteTournamentRound(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const row = (await db.select().from(matches).where(eq(matches.id, id)))[0];
  if (!row || !row.tournamentId) return;
  if (!owns(actor, row.playerAId)) return;

  // La misma puerta que al guardar: la ficha esconde el botón en un torneo
  // cerrado, pero esconder un botón no protege nada.
  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, row.tournamentId)))[0];
  if (tour?.status !== "open") return;

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
