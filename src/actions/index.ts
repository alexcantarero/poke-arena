"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
import { validarMazosPorJuego } from "@/lib/juegosMazos";
import { MODALIDADES, TAM_EQUIPO, asModalidad, jornadaEquipos, partidasDeDuelo } from "@/lib/modalidades";
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

   Todo lo que escribe en la base de datos pasa por aquÃƒÂ­. Dos reglas que no
   se saltan nunca:

   Ã‚Â· Una Server Action es un endpoint pÃƒÂºblico. Que la pantalla esconda un
     botÃƒÂ³n no protege nada: la comprobaciÃƒÂ³n de permisos va SIEMPRE dentro de
     la acciÃƒÂ³n, comparando con quiÃƒÂ©n estÃƒÂ¡ firmado en la cookie.
   Ã‚Â· Lo que llega en el FormData es texto de fuera. Se valida antes de tocar
     una columna Ã¢â‚¬â€ fechas, nÃƒÂºmeros y enumerados incluidos.
   ========================================================================= */

/* ---------------------------------------------------------- utilidades -- */

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/**
 * NÃƒÂºmero de un campo, con valor por defecto de verdad.
 *
 * Ojo con la trampa: `fd.get(k)` es null cuando el campo no viene, y
 * `Number(null)` es 0, que es finito. Con la versiÃƒÂ³n ingenua, un formulario
 * incompleto ponÃƒÂ­a maxUses a 0 (= invitaciÃƒÂ³n ilimitada) en vez de a 1.
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

/** Precio de entrada, en cÃƒÂ©ntimos. Lo que se teclea es en euros ("5", "5,50" o "5.50"). */
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
 * lib/data). AquÃƒÂ­ hay que deshacer eso antes de tocar la base, porque cada uno
 * va a una columna distinta y las dos son claves ajenas: guardar `arch:a12` en
 * `deck_id` es una violaciÃƒÂ³n de clave ajena y un error 500.
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
 * Ruta a la que volver despuÃƒÂ©s de guardar, saneada.
 *
 * Varios formularios llevan un campo `back` para devolverte a donde estabas
 * en vez de a la pantalla de siempre. Ese campo llega del navegador, asÃƒÂ­ que
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

/** QuiÃƒÂ©n estÃƒÂ¡ actuando. Si no hay sesiÃƒÂ³n vÃƒÂ¡lida, a la puerta. */
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

/** Solo organizadores. Los demÃƒÂ¡s se van a la portada en vez de ver un error feo. */
async function requireManager() {
  const actor = await requireActor();
  if (!canManageLeague(actor.role)) redirect("/");
  return actor;
}

type Actor = Awaited<ReturnType<typeof requireActor>>;

/** Ã‚Â¿Puede este actor tocar algo que pertenece a `ownerId`? */
const owns = (actor: Actor, ownerId: string | null | undefined) =>
  ownerId === actor.id || canManageLeague(actor.role);

/** CuÃƒÂ¡ntos propietarios activos quedan. La liga nunca puede quedarse sin ninguno. */
async function ownerCount() {
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(players)
    .where(and(eq(players.role, "owner"), eq(players.active, true)));
  return rows[0]?.n ?? 0;
}

/* -------------------------------------------------------------- acceso -- */

const loginSchema = z.object({
  email: z.string().email("Correo invÃ¡lido"),
  password: z.string().min(1, "Falta la contraseÃ±a"),
});

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: normalizeEmail(str(fd, "email")),
    password: String(fd.get("password") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;

  const rows = await db.select().from(players).where(eq(players.email, email));
  const player = rows[0];
  const bad = { error: "Correo o contraseÃ±a incorrectos." };

  if (!player) {
    await verifyPassword(password, DUMMY_HASH);
    return bad;
  }

  if (player.lockedUntil && player.lockedUntil > new Date()) {
    const mins = Math.ceil((player.lockedUntil.getTime() - Date.now()) / 60000);
    return { error: "Cuenta bloqueada. IntÃ©ntalo de nuevo en " + mins + " minuto(s)." };
  }

  const valid = await verifyPassword(password, player.passwordHash);
  if (!valid) {
    const attempts = (player.loginAttempts ?? 0) + 1;
    const lock = attempts >= 5 ? new Date(Date.now() + 15 * 60000) : null;
    await db.update(players).set({ loginAttempts: attempts, lockedUntil: lock }).where(eq(players.id, player.id));
    if (lock) return { error: "Cuenta bloqueada temporalmente por demasiados intentos fallidos." };
    return bad;
  }

  if (!player.active) return { error: "Tu cuenta estÃ¡ desactivada. Habla con el organizador." };

  await db.update(players).set({ 
    lastSeenAt: new Date(),
    loginAttempts: 0,
    lockedUntil: null
  }).where(eq(players.id, player.id));
  
  await writeSession(player.id, player.sessionVersion ?? 1);
  redirect("/");
}

const PALETTE = ["#f0b429", "#4aa8e8", "#63bd5a", "#e987b8", "#b271c9", "#f0803c", "#9aa6b4", "#c8a94a", "#5c9ea8", "#d4675f"];

/**
 * Alta desde un enlace de invitaciÃƒÂ³n.
 *
 * El orden importa: primero se consume la invitaciÃƒÂ³n con un UPDATE
 * condicional Ã¢â‚¬â€una sola sentencia, asÃƒÂ­ que la base de datos serializa las
 * carrerasÃ¢â‚¬â€ y solo si esa sentencia devuelve fila se crea el jugador. Al revÃƒÂ©s,
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
    return { error: "Las altas estÃƒÂ¡n cerradas ahora mismo." };
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
    // Puede ser que no exista, que estÃƒÂ© anulada, caducada o agotada. Para quien
    // se registra da igual: en los cuatro casos necesita otra.
    return { error: "Esta invitaciÃƒÂ³n ya no vale. PÃƒÂ­dele a quien te la mandÃƒÂ³ que genere otra." };
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
      // El primero en entrar se queda como dueÃƒÂ±o de la liga.
      role: isFirst ? "owner" : (claimed.role === "admin" ? "admin" : "player"),
      active: true,
      color: PALETTE[seen % PALETTE.length],
      joined: todayISO(),
      lastSeenAt: new Date(),
    });
  } catch {
    // Si el alta se cae, devolvemos el uso: la invitaciÃƒÂ³n no se puede quedar
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
    return { error: "La contraseÃƒÂ±a actual no es correcta." };
  }
  const bad = passwordProblem(next);
  if (bad) return { error: bad };
  await db.update(players).set({ passwordHash: await hashPassword(next) }).where(eq(players.id, actor.id));
  // La sesiÃƒÂ³n actual sigue valiendo; se vuelve a emitir para que la cookie
  // cuente desde ahora.
  await writeSession(actor.id);
  return { ok: "ContraseÃƒÂ±a cambiada." };
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
  redirect(withFlash("/ajustes", "ok", "InvitaciÃƒÂ³n creada. Copia el enlace y mÃƒÂ¡ndalo."));
}

export async function revokeInvite(fd: FormData) {
  await requireManager();
  await db.update(invites).set({ revoked: true }).where(eq(invites.token, str(fd, "token")));
  refresh();
  redirect(withFlash("/ajustes", "ok", "InvitaciÃƒÂ³n anulada."));
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
    // registro de quiÃƒÂ©n lo mira y desde dÃƒÂ³nde.
    if (rawAvatar && !/^https:\/\//i.test(rawAvatar)) {
      return { error: "La imagen tiene que ser una direcciÃƒÂ³n que empiece por https://" };
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
  if (!id || id === actor.id) return; // nadie se cambia el papel a sÃƒÂ­ mismo

  const target = (await db.select().from(players).where(eq(players.id, id)))[0];
  if (!target) return;

  // Dar o quitar "propietario" es cosa del propietario, no de un organizador:
  // si no, un admin podÃƒÂ­a ascender a un cÃƒÂ³mplice o degradar al dueÃƒÂ±o.
  if ((role === "owner" || target.role === "owner") && !isOwner(actor.role)) return;
  // Y nunca dejamos la liga sin dueÃƒÂ±o.
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
  if (target.role === "owner") return; // al dueÃƒÂ±o se le degrada antes de borrarlo

  // Con historial no se borra: se desactiva. Si se borrara, el borrado en
  // cascada se llevarÃƒÂ­a por delante sus mazos y sus resultados de torneo Ã¢â‚¬â€y con
  // ellos los CPÃ¢â‚¬â€ y el ranking dejarÃƒÂ­a de cuadrar.
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
 * partida). Editar uno que ya existe, no: cambia las estadÃƒÂ­sticas de todos.
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
 * Ã‚Â¿Puede este actor tocar este mazo?
 *
 * Un mazo de la biblioteca compartida (sin dueÃƒÂ±o) lo edita quien lo creÃƒÂ³ y
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

  // `scope` decide de quiÃƒÂ©n es: "shared" lo deja sin dueÃƒÂ±o, en la biblioteca
  // de la liga, que es lo que hace falta para apuntar el mazo de un rival sin
  // tener que inventarle una cuenta.
  const scope = pick(fd, "scope", ["mine", "shared"] as const, "mine");

  // Al editar, el dueÃƒÂ±o lo dice la fila que ya estÃƒÂ¡ guardada, no el formulario:
  // si no, mandando el id de un mazo ajeno te lo apropiabas.
  let owner: string | null = scope === "shared" ? null : actor.id;
  if (editing) {
    const current = (await db.select().from(decks).where(eq(decks.id, editing)))[0];
    if (!current || !canEditDeck(actor, current)) return;
    // Mover un mazo entre Ã‚Â«mÃƒÂ­oÃ‚Â» y Ã‚Â«de la ligaÃ‚Â» sÃƒÂ­ se permite, porque es una
    // decisiÃƒÂ³n legÃƒÂ­tima; lo que no se permite es quedÃƒÂ¡rselo de otra persona.
    if (scope === "shared") {
      owner = null;
    } else if (canManageLeague(actor.role)) {
      // Un organizador sÃƒÂ­ puede decir de quiÃƒÂ©n es: el selector de jugador que
      // le enseÃƒÂ±a el formulario tiene que hacer algo.
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
    liveWins: int(fd, "liveWins", 0, 0, 99999),
    liveLosses: int(fd, "liveLosses", 0, 0, 99999),
    created: isoDate(fd, "created") ?? todayISO(),
  };

  if (editing) {
    await db.update(decks).set(values).where(eq(decks.id, editing));
  } else {
    await db.insert(decks).values({ id: newId("d"), ...values, createdBy: actor.id });
  }
  refresh();
  // Volver a donde estabas. Crear un mazo casi siempre es un desvÃƒÂ­o en mitad
  // de otra cosa Ã¢â‚¬â€apuntando una ronda, rellenando un torneoÃ¢â‚¬â€, y mandar a todo
  // el mundo a /mazos era perder el hilo.
  redirect(withFlash(safeBack(fd, "/mazos"), "ok", editing ? "Mazo guardado." : "Mazo creado."));
}

export async function deleteDeck(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const current = (await db.select().from(decks).where(eq(decks.id, id)))[0];
  if (!current || !canEditDeck(actor, current)) redirect("/mazos");

  /* Un mazo de la biblioteca lo puede estar usando gente que no eres tÃƒÂº, y las
     claves ajenas son ON DELETE SET NULL: borrarlo deja las rondas y los
     resultados de otros sin mazo, en silencio y sin deshacer. Si estÃƒÂ¡ en uso
     se retira en vez de borrarse Ã¢â‚¬â€ sigue en el historial de quien lo jugÃƒÂ³ y
     desaparece de los selectores, que es lo que se querÃƒÂ­a. */
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
  // uso no ha desaparecido, y quien le dÃƒÂ© a Ã‚Â«borrarÃ‚Â» tiene que enterarse.
  redirect(withFlash(
    "/mazos", "ok",
    uses > 0
      ? `Ã‚Â«${current.name}Ã‚Â» estÃƒÂ¡ en uso en ${uses} sitio(s): se ha retirado en vez de borrarse.`
      : `Mazo Ã‚Â«${current.name}Ã‚Â» borrado.`,
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
      // Dos toques seguidos en el mÃƒÂ³vil no deben reventar con un 23505.
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
  // cualquiera podÃƒÂ­a inventar resultados entre terceros y mover el ranking.
  if (!canManageLeague(actor.role) && playerAId !== actor.id && playerBId !== actor.id) return;

  let current: typeof matches.$inferSelect | undefined;
  if (editing) {
    current = (await db.select().from(matches).where(eq(matches.id, editing)))[0];
    if (!current) return;
    const mine = current.playerAId === actor.id || current.playerBId === actor.id
      || current.createdBy === actor.id;
    if (!mine && !canManageLeague(actor.role)) return;
  }
  /* v0.15 Ã¢â‚¬â€ el enlace al rival del grupo de una ronda de torneo se conserva
     al editar desde aquÃƒÂ­ solo si el rival sigue siendo el mismo nombre. */
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
    // v0.24: en el selector de mazo tambiÃƒÂ©n se puede elegir solo un ARQUETIPO
    // (`arch:<id>`), para los dos lados. El de A va a `archetypeAId`; el del
    // rival del grupo, a `opponentArchetypeId` (mismo hueco que el de fuera).
    deckAId: str(fd, "deckAId").startsWith("arch:") ? null : (str(fd, "deckAId") || null),
    archetypeAId: str(fd, "deckAId").startsWith("arch:") ? str(fd, "deckAId").slice(5) || null : null,
    deckBId: playerBId && !str(fd, "deckBId").startsWith("arch:") ? (str(fd, "deckBId") || null) : null,
    opponentArchetypeId: playerBId
      ? (str(fd, "deckBId").startsWith("arch:") ? str(fd, "deckBId").slice(5) || null : null)
      : (str(fd, "opponentArchetypeId") || null),
    bestOf,
    status: "done" as const,
    note: str(fd, "note").slice(0, 500),
    createdBy: actor.id,
  };

  /* v0.24 Ã¢â‚¬â€ Ya no se imponen mazos de liga: cada partida lleva el mazo o
     arquetipo que se apunte. Solo queda la regla de la modalidad Ã‚Â«Bo3Ã‚Â». */
  if (values.competitionId) {
    const comp = (await db.select({ modality: competitions.modality })
      .from(competitions).where(eq(competitions.id, values.competitionId)))[0];
    if (comp && asModalidad(comp.modality) === "tres_mazos" && bestOf !== 3) {
      redirect(withFlash(editing ? `/partidas/${editing}` : "/partidas/nueva", "error",
        "En esta liga las series son al mejor de tres (Bo3)."));
    }
  }

  // Los juegos: solo los del 1 al bestOf, solo con ganador reconocible, y sin
  // pasarse de la mayorÃƒÂ­a. Un "3-0 en un Bo3" no debe poder guardarse, y un
  // ganador escrito a mano tipo "x" contaba como empate sin avisar.
  const need = Math.ceil(bestOf / 2);
  const rows: Array<{
    number: number; winner: string; first: string; prizesLeft: number | null;
    archetypeAId: string | null; archetypeBId: string | null;
    mulligansA: number; mulligansB: number;
  }> = [];
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
      mulligansA: maybeInt(fd, `g${i}_mulligans_a`, 0, 99) ?? 0,
      mulligansB: maybeInt(fd, `g${i}_mulligans_b`, 0, 99) ?? 0,
      prizesLeft: maybeInt(fd, `g${i}_prizes`, 0, 6),
      // v0.25: mazo (arquetipo) de cada lado en este juego, opcional.
      archetypeAId: str(fd, `g${i}_archA`) || null,
      archetypeBId: str(fd, `g${i}_archB`) || null,
    });
  }
  if (!rows.length) return;

  // v0.25 Ã¢â‚¬â€ regla de liga: no se repite un arquetipo con el que ya ganaste un
  // juego de esta serie. Los ids tienen que existir (no se fÃƒÂ­a del formulario).
  const archsUsados = [...new Set(rows.flatMap((r) => [r.archetypeAId, r.archetypeBId]).filter((x): x is string => Boolean(x)))];
  if (archsUsados.length) {
    const existen = new Set((await db.select({ id: archetypes.id }).from(archetypes)
      .where(inArray(archetypes.id, archsUsados))).map((r) => r.id));
    for (const r of rows) {
      if (r.archetypeAId && !existen.has(r.archetypeAId)) r.archetypeAId = null;
      if (r.archetypeBId && !existen.has(r.archetypeBId)) r.archetypeBId = null;
    }
  }
  if (values.competitionId) {
    const fallo = validarMazosPorJuego(rows.map((r) => ({ winner: r.winner, archA: r.archetypeAId, archB: r.archetypeBId })));
    if (fallo) {
      redirect(withFlash(editing ? `/partidas/${editing}` : "/partidas/nueva", "error",
        `Juego ${fallo.juego}: no se puede repetir un mazo con el que ya se ganÃƒÂ³ un juego de esta serie.`));
    }
  }

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
// puntÃƒÂºan exactamente igual que "league_challenge"/"league_cup" (son alias en
// cp.ts) y tenerlos como opciÃƒÂ³n aparte era la confusiÃƒÂ³n que seÃƒÂ±alaba Alex.
// `pick()` cae a "store" si llega cualquier otra cosa, asÃƒÂ­ que un formulario
// viejo en cachÃƒÂ© que aÃƒÂºn los mandara simplemente no los aceptarÃƒÂ­a.
const TOURNAMENT_KINDS = [
  "league_challenge", "league_cup", "regional",
  "special", "international", "worlds", "store", "online", "other",
] as const;

export async function saveTournament(fd: FormData) {
  const actor = await requireActor();
  const editing = str(fd, "id");

  // Editar la cabecera de un torneo recalcula los CP de todos los que fueron,
  // asÃƒÂ­ que solo lo hace quien lo creÃƒÂ³ o un organizador.
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
       el formulario ni siquiera trae el campo Ã¢â‚¬â€el de editar no lo tieneÃ¢â‚¬â€ se
       respeta lo que ya hubiera: recalcularlo movÃƒÂ­a de temporada los CP de un
       torneo al que alguien le habÃƒÂ­a puesto la suya a mano. */
    season: fd.has("season")
      ? (maybeInt(fd, "season", 2000, 2100) ?? seasonOfDate(date))
      : (current?.season ?? seasonOfDate(date)),
    division: pick(fd, "division", ["masters", "seniors", "juniors"] as const, "masters"),
    notes: str(fd, "notes").slice(0, 1000),
  };
  if (!values.name) return;

  // El estado solo se toca desde el formulario al crear. DespuÃƒÂ©s se cambia con
  // los botones del ciclo (`setTournamentStatus`), porque cerrar un torneo es
  // una decisiÃƒÂ³n, no un campo mÃƒÂ¡s que se guarda sin darte cuenta.
  const status = editing ? undefined : pick(fd, "status", TOURNAMENT_STATUSES, "open");

  const id = editing || newId("t");
  if (editing) {
    await db.update(tournaments).set(values).where(eq(tournaments.id, id));
  } else {
    await db.insert(tournaments).values({
      id, ...values, createdBy: actor.id, status: status ?? "open",
    });
  }

  /* Corregir la asistencia o el tipo cambia lo que vale cada puesto, asÃƒÂ­ que
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
 * asistencia desde su ficha. Vive aparte porque el caso mÃƒÂ¡s normal del mundo
 * Ã¢â‚¬â€Ã‚Â«se me olvidÃƒÂ³ apuntar cuÃƒÂ¡nta gente huboÃ‚Â»Ã¢â‚¬â€ tiene que arreglarse desde
 * cualquiera de los dos caminos, y tener la cuenta escrita dos veces es
 * garantÃƒÂ­a de que un dÃƒÂ­a solo se arregle uno.
 *
 * Los resultados con el CP puesto a mano no se tocan nunca: alguien escribiÃƒÂ³
 * ese nÃƒÂºmero por algo, y machacarlo con la tabla serÃƒÂ­a perder informaciÃƒÂ³n.
 *
 * Devuelve cuÃƒÂ¡ntas filas ha cambiado, para poder decirlo en el aviso.
 */
async function recalcTournamentCp(
  tournamentId: string,
  t: { kind: string; playerCount: number | null; season?: number },
): Promise<number> {
  const rows = await db.select().from(tournamentResults)
    .where(eq(tournamentResults.tournamentId, tournamentId));
  if (!rows.length) return 0;

  // Sin temporada explÃƒÂ­cita se deduce de la fecha del torneo, nunca del aÃƒÂ±o
  // natural: en septiembre el aÃƒÂ±o natural es 2026 y la temporada es 2027, y
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
    // Un CP a mano se respetaÃ¢â‚¬Â¦ salvo que el torneo ya no reparta CP (p. ej.
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
 * Un torneo se crea dÃƒÂ­as antes y nadie sabe cuÃƒÂ¡nta gente irÃƒÂ¡ hasta que se
 * cierra el registro. DespuÃƒÂ©s, con el evento ya jugado, hay que volver y
 * apuntarla Ã¢â‚¬â€ y el sitio donde estaba ese campo era el formulario de editar,
 * con otros veinte campos al lado. El resultado prÃƒÂ¡ctico era que no se
 * rellenaba nunca, y sin asistencia el kicker deja los tramos bajos a cero:
 * un 15.Ã‚Âº puesto que valÃƒÂ­a 6 CP aparecÃƒÂ­a como 0.
 *
 * Esto es un campo y un botÃƒÂ³n en la ficha del torneo. Nada mÃƒÂ¡s.
 *
 * Y sÃƒÂ­, **recalcula**: el mismo ayudante que usa el formulario de editar.
 * Los CP con el nÃƒÂºmero puesto a mano se respetan.
 */
export async function setTournamentAttendance(fd: FormData) {
  const actor = await currentPlayer();
  if (!actor) redirect("/entrar");

  const id = str(fd, "id");
  if (!id) redirect(withFlash("/torneos", "error", "Falta el torneo."));

  const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id));
  if (!t) redirect(withFlash("/torneos", "error", "Ese torneo ya no existe."));

  // La comprobaciÃƒÂ³n de permiso va aquÃƒÂ­ y no en la pantalla: una Server Action
  // es un endpoint pÃƒÂºblico y esconder el formulario no protege nada.
  if (t.createdBy !== actor.id && !canManageLeague(actor.role)) {
    redirect(withFlash(`/torneos/${id}`, "error", "Esto solo lo cambia quien creÃƒÂ³ el torneo o un organizador."));
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
 * Mover el torneo por su ciclo: borrador Ã¢â€ â€™ abierto Ã¢â€ â€™ cerrado.
 *
 * Cerrar es lo ÃƒÂºnico que tiene consecuencia: a partir de ahÃƒÂ­ no se apuntan
 * rondas. Se puede reabrir, y por eso no pide confirmaciÃƒÂ³n Ã¢â‚¬â€ lo que pide
 * confirmaciÃƒÂ³n es borrar, que sÃƒÂ­ es irreversible.
 *
 * Lo hace quien creÃƒÂ³ el torneo y los organizadores. Un participante cualquiera
 * no cierra el torneo de otro: perderÃƒÂ­a las rondas que a ese otro le faltan
 * por meter.
 */
/**
 * Del estado en que estÃƒÂ¡, a los que tiene sentido ir.
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

/* ------------------------------------------------ catÃƒÂ¡logo de arquetipos -- */

/**
 * Traer del metagame los arquetipos que falten, sin salir de la web.
 *
 * Es lo mismo que `npm run archetypes:sync`, pero desde Ajustes: para usar el
 * script hace falta tener el proyecto abierto en un ordenador con Node, y eso
 * en la prÃƒÂ¡ctica significa que no se hace nunca. El catÃƒÂ¡logo se quedaba viejo
 * y faltaban mazos Ã¢â‚¬â€Grimmsnarl, sin ir mÃƒÂ¡s lejosÃ¢â‚¬â€.
 *
 * Solo aÃƒÂ±ade y solo pinta lo que estÃƒÂ¡ en incoloro. Nunca renombra nada que ya
 * exista: si le habÃƒÂ©is puesto vuestro nombre a un arquetipo, ese se queda.
 */
export async function syncArchetypes(_prev: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireManager();
  void actor;

  // Ojo con el nombre: `tournaments` a secas taparÃƒÂ­a la tabla importada arriba.
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
  if (!found.length) return { error: "Limitless no ha devuelto ningÃƒÂºn mazo. Prueba mÃƒÂ¡s tarde." };

  const existing = await db.select().from(archetypes);
  const byLimitlessId = new Set(existing.map((a) => a.limitlessId).filter(Boolean));
  const byPair = new Set(existing.map((a) => `${a.main}|${a.secondary}`));

  const nuevos = found.filter(
    (d) => !byLimitlessId.has(d.identifier) && !byPair.has(`${d.main}|${d.secondary}`),
  );
  /* Los que se quedaron en incoloro. Se acotan a 40 por pasada porque cada uno
     es una consulta a PokÃƒÂ©API y esto corre dentro de una funciÃƒÂ³n serverless con
     lÃƒÂ­mite de tiempo: mÃƒÂ¡s vale pintar cuarenta y volver a pulsar que quedarse
     a medias y no guardar nada. */
  const sinColor = existing.filter((a) => a.type === "colorless" && a.main).slice(0, 40);

  if (!nuevos.length && !sinColor.length) {
    return { ok: `El catÃƒÂ¡logo ya estÃƒÂ¡ al dÃƒÂ­a: ${existing.length} arquetipos.` };
  }

  const types = await energyTypesOf([
    ...nuevos.map((d) => d.main),
    ...sinColor.map((a) => a.main),
  ]);

  if (nuevos.length) {
    // `onConflictDoNothing` porque el id se trunca a 60 caracteres y dos
    // identificadores largos podrÃƒÂ­an chocar: mejor saltarse uno que tirar el
    // insert entero con un 23505 y no aÃƒÂ±adir ninguno.
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
 * paso, las rondas se quedaban como partidas sin competiciÃƒÂ³n y sin torneo
 * Ã¢â‚¬â€invisibles en las pantallas, pero vivas en las estadÃƒÂ­sticas de arquetipoÃ¢â‚¬â€.
 * Los resultados sÃƒÂ­ se van en cascada solos.
 */
export async function deleteTournament(fd: FormData) {
  await requireManager();
  const id = str(fd, "id");
  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, id)))[0];
  if (!tour || !confirmed(fd, tour.name)) return;

  // Solo las rondas: son las partidas del torneo contra rivales de fuera. Una
  // partida entre dos de la liga que ademÃƒÂ¡s estÃƒÂ© etiquetada a este torneo se
  // conserva, y simplemente se queda sin la etiqueta.
  await db.delete(matches).where(and(eq(matches.tournamentId, id), isNull(matches.playerBId)));
  await db.delete(tournaments).where(eq(tournaments.id, id));
  refresh();
  redirect(withFlash("/torneos", "ok", `Torneo Ã‚Â«${tour.name}Ã‚Â» borrado.`));
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
  // `auto` es null cuando el tipo no reparte CP (online incluido, v0.15): ahÃƒÂ­
  // no se guarda ningÃƒÂºn nÃƒÂºmero, tampoco uno tecleado a mano.
  const cpEarned = !awardsCp(useSeason, kind) ? 0
    : cpManual ? int(fd, "cpEarned", 0, 0, 5000) : (auto ?? 0);

  /* Dos maneras de decir quÃƒÂ© rÃƒÂ©cord hiciste, y las dos son legÃƒÂ­timas:
     Ã‚Â· "rounds": sale de las rondas apuntadas. Es la buena cuando las hay,
       porque ademÃƒÂ¡s trae el mazo del rival y alimenta la matriz.
     Ã‚Â· "manual": lo tecleas. Es la ÃƒÂºnica posible cuando vuelves de un torneo
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
    // SimÃƒÂ©trico al de arriba: los dos campos aceptan las dos formas, porque
    // esto es un endpoint pÃƒÂºblico y lo que llega no lo decide el formulario.
    archetypeId: deckOrArchetype(fd, "archetypeId").archetypeId
      ?? deckOrArchetype(fd, "archetypeId").deckId,
    cpEarned,
    cpManual,
    prizes: str(fd, "prizes").slice(0, 300),
    notes: str(fd, "resultNotes").slice(0, 1000),
    dropped: bool(fd, "dropped"),
  };

  // Upsert de verdad, contra el ÃƒÂ­ndice ÃƒÂºnico (torneo, jugador): con select +
  // insert, un doble toque en el mÃƒÂ³vil provocaba un 23505 sin capturar.
  const full = record ? { ...values, ...record } : values;
  await db.insert(tournamentResults)
    .values({ id: newId("tr"), ...full })
    .onConflictDoUpdate({
      target: [tournamentResults.tournamentId, tournamentResults.playerId],
      set: full,
    });

  /* El mazo del torneo es de todo el torneo, asÃƒÂ­ que baja a las rondas ya
     apuntadas. Si no, la ficha decÃƒÂ­a Ã‚Â«jugando Dragapult todo el torneoÃ‚Â» y las
     rondas seguÃƒÂ­an guardadas sin mazo: las estadÃƒÂ­sticas por arquetipo y la
     matriz de emparejamientos no las veÃƒÂ­an, y no habÃƒÂ­a forma de darse cuenta. */
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

  /* Con Ã‚Â«de mis rondasÃ‚Â», el rÃƒÂ©cord lo pone el contador y no el formulario. Hay
     que recalcularlo aquÃƒÂ­ mismo: si no, lo guardado seguÃƒÂ­a siendo lo que
     tecleÃƒÂ³ alguien la ÃƒÂºltima vez, y la pantalla enseÃƒÂ±aba dos rÃƒÂ©cords distintos
     Ã¢â‚¬â€el de la cabecera de rondas y el de la lista de resultadosÃ¢â‚¬â€ a diez
     centÃƒÂ­metros uno del otro. */
  if (pick(fd, "recordMode", ["manual", "rounds"] as const, "manual") === "rounds") {
    await syncTournamentRecord(tournamentId, targetId);
  }

  refresh();
  redirect(withFlash(`/torneos/${tournamentId}`, "ok", "Resultado guardado."));
}

/**
 * v0.16 Ã¢â‚¬â€ Borrar la participaciÃƒÂ³n de alguien en un torneo: su resultado Y
 * sus rondas.
 *
 * EL FALLO QUE ARREGLA: antes solo borraba la fila de `tournament_results`.
 * Las rondas seguÃƒÂ­an ahÃƒÂ­ (asÃƒÂ­ que Ã‚Â«no borraba nadaÃ‚Â», visto desde la ficha),
 * y con el resultado se iba tambiÃƒÂ©n el mazo fijado del torneo, con lo que la
 * ronda siguiente volvÃƒÂ­a a pedir el arquetipo. Borrar a medias deja un estado
 * que no corresponde a nada: o estÃƒÂ¡s en el torneo o no estÃƒÂ¡s.
 *
 * Para borrar una sola ronda estÃƒÂ¡ el botÃƒÂ³n Ã‚Â«EliminarÃ‚Â» de cada ronda.
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
  redirect(withFlash(`/torneos/${row.tournamentId}`, "ok", "ParticipaciÃƒÂ³n borrada: resultado y rondas."));
}

/* ------------------------------------------------------- competiciones -- */

export async function saveCompetition(fd: FormData) {
  // Una competiciÃƒÂ³n es de la liga entera: la organiza quien la organiza.
  await requireManager();
  const editing = str(fd, "id");
  const id = editing || newId("c");
  const values = {
    name: str(fd, "name").slice(0, 120),
    // v0.19: sin Ã‚Â«casualÃ‚Â». Los amistosos son partidas sin competiciÃƒÂ³n.
    kind: pick(fd, "kind", ["league", "swiss", "bracket"] as const, "league"),
    bestOf: int(fd, "bestOf", 3, 1, 5),
    status: pick(fd, "status", ["draft", "live", "done"] as const, "live"),
    start: isoDate(fd, "start") ?? todayISO(),
    end: isoDate(fd, "end", null),
    rounds: int(fd, "rounds", 0, 0, 50),
    topCut: int(fd, "topCut", 0, 0, 64),
    // v0.23: modalidad. Ã‚Â«Bo3 Ã‚Â· hasta 3 mazosÃ‚Â» fuerza series al mejor de tres.
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
    comp ? `CompeticiÃƒÂ³n Ã‚Â«${comp.name}Ã‚Â» borrada.` : "CompeticiÃƒÂ³n borrada.",
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

  // v0.23 Ã¢â‚¬â€ duelo por equipos: la jornada cruza EQUIPOS (todos contra todos)
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
  // El calendario lo ve todo el mundo, asÃƒÂ­ que lo escribe el organizador.
  await requireManager();
  const editing = str(fd, "id");
  const id = editing || newId("e");
  const values = {
    title: str(fd, "title").slice(0, 120),
    date: isoDate(fd, "date") ?? todayISO(),
    endDate: isoDate(fd, "endDate", null),
    kind: str(fd, "kind") || "round",
    // VacÃƒÂ­o es vÃƒÂ¡lido: una jornada de la liga no es ningÃƒÂºn tipo de torneo
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
  redirect(withFlash("/calendario", "ok", editing ? "Evento guardado." : "Evento aÃƒÂ±adido."));
}

/**
 * Empezar el Elo de cero desde hoy.
 *
 * No borra nada: pone la fecha de corte a hoy, y a partir de ahÃƒÂ­ `eloTable`
 * ignora lo anterior. Todos vuelven al Elo inicial y se reconstruye con las
 * partidas nuevas.
 *
 * Es reversible desde Ajustes quitando la fecha, porque las partidas siguen
 * exactamente donde estaban. Por eso esto no pide confirmaciÃƒÂ³n: lo que pide
 * confirmaciÃƒÂ³n es lo que no se puede deshacer.
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
 * La lista estÃƒÂ¡ escrita a mano en `src/data/eventos-europa.ts`, con sus
 * fuentes y con marca en los que no coinciden entre ellas. **No hay ninguna
 * llamada automÃƒÂ¡tica a ninguna web**: ni hace falta para diez eventos al aÃƒÂ±o
 * ni serÃƒÂ­a correcto con las webs de las que salen.
 *
 * Es idempotente: cada evento lleva un id fijo, asÃƒÂ­ que volver a pulsarlo
 * actualiza los que ya estÃƒÂ¡n en vez de duplicarlos. Eso permite corregir la
 * lista del fichero y volver a importar sin limpiar nada antes.
 *
 * Lo que NO hace: borrar. Si alguien quitÃƒÂ³ del calendario un evento que no le
 * interesaba, volver a importar no se lo devuelve a la cara... bueno, sÃƒÂ­ se
 * lo devuelve, porque el id vuelve a no existir y se inserta. Es el precio de
 * que sea idempotente sin llevar una tabla de Ã‚Â«borrados a propÃƒÂ³sitoÃ‚Â», y para
 * diez eventos al aÃƒÂ±o compensa.
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
 * v0.15 Ã¢â‚¬â€ Importar los torneos de la zona de octubre y noviembre de 2026
 * (`src/data/torneos-zona-2026.ts`) como borradores.
 *
 * Solo inserta: si el torneo ya existe Ã¢â‚¬â€por id, o porque alguien lo creÃƒÂ³ a
 * mano el mismo dÃƒÂ­a, del mismo tipo y en la misma tiendaÃ¢â‚¬â€ se salta y no se
 * toca. AsÃƒÂ­ se puede pulsar las veces que haga falta sin pisar correcciones.
 *
 * Los Regionales se enlazan con su evento del calendario (los de Europa), y
 * el calendario deja de pintar el evento suelto: si no, Niza salÃƒÂ­a dos veces.
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
    // VacÃƒÂ­o = desde el principio. `isoDate` con null por defecto ya rechaza
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
 * `playerBId` nulo. No hay tabla nueva: ver la explicaciÃƒÂ³n en
 * `src/lib/stats.ts`, en la secciÃƒÂ³n de rondas de torneo, que es donde estÃƒÂ¡
 * el porquÃƒÂ©.
 *
 * Dos maneras de rellenarla, porque el caso real es estar en el evento con
 * dos minutos antes de que salgan los emparejamientos:
 *
 *   Ã‚Â· `mode=quick` Ã¢â‚¬â€ rival, su mazo, salÃƒÂ­ 1.Ã‚Âº o 2.Ã‚Âº, y ganÃƒÂ©/empatÃƒÂ©/perdÃƒÂ­.
 *     El resultado se guarda en `matches.seriesResult`. Cuatro toques.
 *   Ã‚Â· `mode=games` Ã¢â‚¬â€ el desglose juego a juego. Es lo que alimenta la
 *     estadÃƒÂ­stica de ventaja del primer turno, asÃƒÂ­ que merece la pena cuando
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

  // De quiÃƒÂ©n es la ronda. La propia siempre; la de otro solo un organizador.
  const playerId = str(fd, "playerId") || actor.id;
  if (!owns(actor, playerId)) return;

  /* Solo un torneo abierto acepta rondas. Cerrado, porque es el sentido de
     cerrarlo Ã¢â‚¬â€si se pudiera seguir escribiendo, Ã‚Â«cerradoÃ‚Â» serÃƒÂ­a un adornoÃ¢â‚¬â€; y
     en borrador, porque la ficha ni siquiera enseÃƒÂ±a el formulario, asÃƒÂ­ que una
     ronda ahÃƒÂ­ solo puede llegar por un POST a mano. */
  // v0.16: el organizador puede corregir rondas tambiÃƒÂ©n con el torneo cerrado.
  if (tour.status !== "open" && !canManageLeague(actor.role)) return;

  const round = int(fd, "round", 1, 1, 50);

  /* v0.13 Ã¢â‚¬â€ el tope de rondas. Un League Challenge es solo suizo (Ã‚Â§5.5.6.1,
     Variante #2): en uno de 5 rondas no existe la 6. En una Cup se admite el
     suizo mÃƒÂ¡s su eliminatoria, y en un Regional el suizo mÃƒÂ¡s el corte. El
     formulario ya no se enseÃƒÂ±a al llegar al tope, pero una Server Action es
     un endpoint pÃƒÂºblico: la comprobaciÃƒÂ³n buena es esta. */
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

  /* v0.15 Ã¢â‚¬â€ el rival puede ser alguien del grupo. Se comprueba que exista y
     que no seas tÃƒÂº; si llega algo raro, se ignora y la ronda se guarda con el
     nombre a secas, como siempre. */
  const rivalPick = str(fd, "opponentPlayerId");
  const rivalPlayer = rivalPick && rivalPick !== playerId
    ? (await db.select({ id: players.id, name: players.name }).from(players)
      .where(eq(players.id, rivalPick)))[0]
    : undefined;
  const opponentName = (str(fd, "opponentName") || rivalPlayer?.name || "").slice(0, 60);
  if (!opponentName) return;

  // QuiÃƒÂ©n saliÃƒÂ³ primero en el JUEGO 1. Del resto se encarga `g{i}_first`, que
  // ahora se marca a mano juego por juego: en la mesa no siempre empieza quien
  // perdiÃƒÂ³ el anterior (concesiones, penalizaciones, reinicios).
  const first = pick(fd, "g0_first", ["", "a", "b"] as const, "")
    || pick(fd, "first", ["", "a", "b"] as const, "");
  const mode = pick(fd, "mode", ["quick", "games"] as const, "quick");

  /* El mazo del torneo se elige UNA vez y no cambia entre rondas: en un suizo
     juegas el mismo mazo de la primera a la ÃƒÂºltima. Vive en el resultado del
     torneo, no en la ronda, y desde aquÃƒÂ­ solo se rellena si aÃƒÂºn no estaba. */
  const existingResult = (await db.select().from(tournamentResults).where(and(
    eq(tournamentResults.tournamentId, tournamentId),
    eq(tournamentResults.playerId, playerId),
  )))[0];

  /* El mazo propio tambiÃƒÂ©n se puede fijar solo por arquetipo, sin lista de 60
     cartas: el selector ofrece las dos cosas en la misma lista Ã¢â‚¬â€igual que ya
     pasaba con el mazo del rivalÃ¢â‚¬â€ y `deckOrArchetype` deshace el prefijo
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
  // pasarse de la mayorÃƒÂ­a Ã¢â‚¬â€un 3-0 en un Bo3 no debe poder guardarseÃ¢â‚¬â€. Es la
  // misma comprobaciÃƒÂ³n que en `saveMatch`, y por el mismo motivo.
  const need = Math.ceil(bestOf / 2);
  const rows: Array<{ 
    number: number; winner: string; first: string; prizesLeft: number | null; 
    mulligansA: number; mulligansB: number;
  }> = [];
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
        // Cada juego lleva el suyo. Era lo que pedÃƒÂ­a la lista: Ã‚Â«marcar si salÃƒÂ­
        // 1.Ã‚Âº o 2.Ã‚Âº por cada juego de la rondaÃ‚Â», no solo en el primero.
        first: pick(fd, `g${i}_first`, ["", "a", "b"] as const, i === 0 ? first : ""),
        mulligansA: maybeInt(fd, `g${i}_mulligans_a`, 0, 99) ?? 0,
        mulligansB: maybeInt(fd, `g${i}_mulligans_b`, 0, 99) ?? 0,
        prizesLeft: maybeInt(fd, `g${i}_prizes`, 0, 6),
      });
      /* Un juego empatado corta la ronda ahÃƒÂ­ mismo: en la mesa un empate sale
         del reloj, y del reloj no se juega un juego mÃƒÂ¡s. El cliente ya deja
         de mandar campos de juegos posteriores (`visibleGames` en
         TournamentRounds), pero esto es la comprobaciÃƒÂ³n de verdad Ã¢â‚¬â€ una
         Server Action es un endpoint pÃƒÂºblico y no se fÃƒÂ­a de quÃƒÂ© campos decide
         mandar el formulario. */
      if (winner === "tie") break;
    }
  }

  // El resultado declarado. Con desglose solo se guarda cuando hace falta para
  // desempatar: un 1Ã¢â‚¬â€œ1 en un Bo3 es empate si se acabÃƒÂ³ el tiempo y una ronda a
  // medias si no, y los juegos apuntados son idÃƒÂ©nticos en los dos casos.
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
      // Un juego marcado como empate decide la ronda ÃƒÂ©l solo, sin necesidad de
      // marcar ademÃƒÂ¡s Ã‚Â«se acabÃƒÂ³ el tiempoÃ‚Â»: es la misma situaciÃƒÂ³n, vista desde
      // el juego en vez de desde el reloj. Sin desglose de empate, se sigue
      // necesitando el checkbox para la ambigÃƒÂ¼edad de siempre (1-1 esperando
      // el tercer juego frente a 1-1 con el tiempo agotado).
      : hasTieGame
        ? (wonA > wonB ? "a" : wonB > wonA ? "b" : "tie")
        : (bool(fd, "timeCalled") ? (wonA > wonB ? "a" : wonB > wonA ? "b" : "tie") : null);
  }

  /* QuÃƒÂ© llevaba el rival. El selector ofrece en la misma lista los mazos de
     la biblioteca compartida y los arquetipos sueltos: si eliges un mazo se
     guarda en `deckBId` Ã¢â‚¬â€y con ÃƒÂ©l la lista de 60 cartas, que es lo que
     distingue un mazo de un arquetipoÃ¢â‚¬â€, y si eliges un arquetipo va a
     `opponentArchetypeId`. Las estadÃƒÂ­sticas miran primero el mazo y caen al
     arquetipo, asÃƒÂ­ que las dos formas alimentan la matriz igual. */
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

  /* QuÃƒÂ© fila se toca. Si el formulario viene de editar, trae el id de la
     ronda: hay que ir por ÃƒÂ©l y no por el nÃƒÂºmero, porque el nÃƒÂºmero es
     precisamente lo que se puede estar cambiando Ã¢â‚¬â€editar la ronda 3 y escribir
     Ã‚Â«4Ã‚Â» insertaba una cuarta ronda nueva y dejaba la tercera intactaÃ¢â‚¬â€.
     Si no viene id, se busca por (torneo, jugador, ronda), que es el ÃƒÂ­ndice
     ÃƒÂºnico que impide duplicar de un doble toque en el mÃƒÂ³vil. */
  const editingId = str(fd, "matchId");
  const existing = editingId
    ? (await db.select().from(matches).where(eq(matches.id, editingId)))[0]
    : (await db.select().from(matches).where(and(
      eq(matches.tournamentId, tournamentId),
      eq(matches.playerAId, playerId),
      eq(matches.round, round),
      // Una ronda de torneo tiene el rival fuera de la liga. Sin este filtro,
      // una partida interna etiquetada a este torneo y con el mismo nÃƒÂºmero de
      // ronda entraba aquÃƒÂ­ y se sobreescribÃƒÂ­a con playerBId nulo: el jugador B
      // desaparecÃƒÂ­a y sus juegos se borraban, sin deshacer y sin avisar.
      isNull(matches.playerBId),
    )))[0];

  // Una ronda que llega por id tiene que ser de este torneo, de este jugador, y
  // ser una ronda de verdad y no una partida interna.
  if (existing && (
    existing.tournamentId !== tournamentId
    || existing.playerAId !== playerId
    || existing.playerBId !== null
  )) return;

  /* v0.15 Ã¢â‚¬â€ el drop. Con Ã‚Â«No he acabado el torneoÃ‚Â» guardado no se aceptan
     rondas NUEVAS; corregir las que ya estaban sÃƒÂ­. La ficha ya no enseÃƒÂ±a el
     formulario, pero esto es la comprobaciÃƒÂ³n de verdad. */
  if (!existing && existingResult?.dropped) {
    redirect(withFlash(`/torneos/${tournamentId}`, "error",
      "Marcaste que no acabaste el torneo (DROP): no se pueden apuntar mÃƒÂ¡s rondas."));
  }

  const id = existing?.id ?? newId("m");
  if (existing) {
    /* Editar el nÃƒÂºmero de ronda puede llevarla a un hueco que ya ocupa otra:
       editar la ronda 2 para ponerle un 1 cuando la 1 ya existe. Un UPDATE
       directo revienta contra `matches_tour_round_idx` a mitad de la
       sentencia, porque el ÃƒÂ­ndice es real y no se puede aplazar hasta el
       final de la transacciÃƒÂ³n.

       Se resuelve como un intercambio, en tres pasos con un nÃƒÂºmero de ronda
       centinela (-1) que ninguna ronda de verdad usa Ã¢â‚¬â€siempre son >= 1Ã¢â‚¬â€: la
       que estorba se aparta, la que se edita ocupa el hueco, y la que se
       apartÃƒÂ³ se queda con el nÃƒÂºmero que la primera dejÃƒÂ³ libre. El resultado
       es que las dos rondas cambian de nÃƒÂºmero entre sÃƒÂ­, que es justo lo que
       alguien renumerando esperarÃƒÂ­a que pasara. */
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
    /* El ÃƒÂ­ndice ÃƒÂºnico puede saltar en una carrera: dos envÃƒÂ­os a la vez con el
       mismo nÃƒÂºmero. Que gane el ÃƒÂºltimo en vez de reventar con un 500.

       `targetWhere` no es opcional aquÃƒÂ­: `matches_tour_round_idx` es un ÃƒÂ­ndice
       PARCIAL (solo donde `tournament_id` no es nulo), y PostgreSQL descarta
       los ÃƒÂ­ndices parciales al inferir el ÃƒÂ¡rbitro de un ON CONFLICT salvo que
       se repita el predicado. Sin esta lÃƒÂ­nea el error no serÃƒÂ­a de carrera sino
       de planificaciÃƒÂ³n, y fallarÃƒÂ­a al apuntar CUALQUIER ronda nueva. */
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

  // Si el mazo (o el arquetipo) del torneo se acaba de elegir aquÃƒÂ­, queda
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
 * v0.15.1 Ã¢â‚¬â€ Drop desde la ronda, en vez de apuntar la siguiente.
 *
 * Pone `dropped` en el resultado del torneo (creÃƒÂ¡ndolo si aÃƒÂºn no habÃƒÂ­a) y
 * vuelve a la ficha: allÃƒÂ­ ya no sale el formulario de ronda, y
 * `saveTournamentRound` rechaza rondas nuevas. Corregir las apuntadas sigue
 * pudiÃƒÂ©ndose.
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
    dropped ? "Drop apuntado: ya no se piden mÃƒÂ¡s rondas." : "Drop deshecho: puedes seguir apuntando rondas."));
}

export async function deleteTournamentRound(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const row = (await db.select().from(matches).where(eq(matches.id, id)))[0];
  if (!row || !row.tournamentId) return;
  if (!owns(actor, row.playerAId)) return;

  // La misma puerta que al guardar: la ficha esconde el botÃƒÂ³n en un torneo
  // cerrado, pero esconder un botÃƒÂ³n no protege nada.
  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, row.tournamentId)))[0];
  // v0.16: un organizador puede corregir tambiÃƒÂ©n un torneo ya cerrado.
  if (!tour || (tour.status !== "open" && !canManageLeague(actor.role))) return;

  await db.delete(matches).where(eq(matches.id, id));
  await syncTournamentRecord(row.tournamentId, row.playerAId);
  refresh();
  redirect(withFlash(`/torneos/${row.tournamentId}`, "ok", "Ronda borrada."));
}

/**
 * Escribe en `tournament_results` el rÃƒÂ©cord que sale de las rondas.
 *
 * El puesto, los CP y los premios NO se tocan: de tus propias rondas no se
 * puede deducir en quÃƒÂ© posiciÃƒÂ³n has quedado, asÃƒÂ­ que eso lo sigue metiendo
 * una persona cuando salga la clasificaciÃƒÂ³n final.
 *
 * Si todavÃƒÂ­a no habÃƒÂ­a fila de resultado, se crea: apuntar la primera ronda es
 * lo que te inscribe en el torneo, sin un paso previo.
 */
async function syncTournamentRecord(
  tournamentId: string,
  playerId: string,
  /** Mazo a fijar, solo cuando el resultado todavÃƒÂ­a no tenÃƒÂ­a ninguno. */
  deckId: string | null = null,
  /** Arquetipo a fijar, cuando lo que se fija es solo el arquetipo y no un mazo. */
  archetypeId: string | null = null,
) {
  const rounds = await db.select().from(matches).where(and(
    eq(matches.tournamentId, tournamentId),
    eq(matches.playerAId, playerId),
    isNull(matches.playerBId),
  )).orderBy(asc(matches.round));

  /* Sin rondas, el rÃƒÂ©cord es 0-0-0 y no lo que hubiera antes. Salir sin
     escribir dejaba el rÃƒÂ©cord viejo para siempre al borrar la ÃƒÂºltima. */
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

/** Recalcular el rÃƒÂ©cord a mano, por si alguien editÃƒÂ³ rondas sueltas. */
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
 * organizador. El rango se acota en el formulario, aquÃƒÂ­, y con un CHECK en la
 * base de datos: tres sitios, porque una Server Action es un endpoint pÃƒÂºblico
 * y a esta se puede llamar con 99999 desde la consola del navegador.
 */
export async function setLadderElo(fd: FormData) {
  const actor = await requireActor();
  const playerId = str(fd, "playerId") || actor.id;
  if (!owns(actor, playerId)) return;

  // v0.18: 1Ã¢â‚¬â€œ550 y 1350Ã¢â‚¬â€œ2100; entre medias es el salto Arceus (Ã¢â€ â€™ 1500).
  const elo = normalizeLadderInput(maybeNum(fd, "ladderElo"));
  if (elo == null) {
    redirect(withFlash(`/perfil/${playerId}`, "error", "El rango va de 1 a 550 (Novato) o de 1350 a 2100."));
  }
  const note = str(fd, "ladderNote").slice(0, 200);

  await db.update(players)
    .set({ ladderElo: elo, ladderEloUpdatedAt: new Date(), ladderNote: note })
    .where(eq(players.id, playerId));

  // Cada cambio deja historial, que es lo que permite pintar la evoluciÃƒÂ³n.
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
 * quisquilloso con mayÃƒÂºsculas ni espacios de mÃƒÂ¡s.
 *
 * Todos los borrados gordos piden escribir a mano el nombre de lo que se
 * borra. Es el patrÃƒÂ³n de GitHub al borrar un repositorio, y estÃƒÂ¡ por una
 * razÃƒÂ³n concreta: un botÃƒÂ³n de Ã‚Â«borrar torneoÃ‚Â» sin fricciÃƒÂ³n se pulsa sin mirar,
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
    // Las rondas primero: `matches.tournamentId` es ON DELETE SET NULL, asÃƒÂ­ que
    // borrar el torneo sin mÃƒÂ¡s dejarÃƒÂ­a partidas huÃƒÂ©rfanas sin competiciÃƒÂ³n ni
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
 * para cuando de verdad quieres que no quede rastro Ã¢â‚¬â€una cuenta de prueba, un
 * alta duplicadaÃ¢â‚¬â€, y por eso es solo del propietario y pide el nombre escrito.
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
 * Importar lo que se jugÃƒÂ³ en un Regional, pegando la clasificaciÃƒÂ³n.
 *
 * POR QUÃƒâ€° ES UN PEGADO Y NO UN BOTÃƒâ€œN QUE VA A BUSCARLO
 * ----------------------------------------------------
 * Porque no hay de dÃƒÂ³nde traerlo con permiso. La API de Limitless sirve su
 * plataforma online y deja los presenciales fuera; RK9 y pokemon.com
 * prohÃƒÂ­ben expresamente la extracciÃƒÂ³n automatizada, Ã‚Â«con o sin fines
 * comercialesÃ‚Â», y que el botÃƒÂ³n se pulse una vez al mes no cambia lo que dicen
 * sus condiciones: lo que estÃƒÂ¡ prohibido es el mÃƒÂ©todo, no la frecuencia.
 * pokedata.ovh republica lo de RK9, asÃƒÂ­ que pasar por ahÃƒÂ­ no arregla el
 * origen, solo aÃƒÂ±ade un intermediario.
 *
 * AsÃƒÂ­ que la persona copia lo que ya estÃƒÂ¡ viendo y lo pega. A partir de ahÃƒÂ­
 * es todo automÃƒÂ¡tico: trocear, casar arquetipos, poner sprites y guardar.
 *
 * DOS PASADAS, Y LA PRIMERA NO ESCRIBE
 * ------------------------------------
 * Sin `confirmar` devuelve el recuento y no toca la base. Es lo que deja ver
 * cuÃƒÂ¡ntas filas han entrado, cuÃƒÂ¡ntas se han descartado y quÃƒÂ© mazos no
 * conocÃƒÂ­a el catÃƒÂ¡logo, **antes** de guardar nada. El segundo envÃƒÂ­o es el que
 * escribe.
 *
 * Lo que vuelve al navegador en esa primera pasada es el recuento por mazo,
 * no el texto pegado ni ninguna lÃƒÂ­nea suelta.
 */
export async function importMetaEvent(
  _prev: MetaImportState, fd: FormData,
): Promise<MetaImportState> {
  const actor = await requireManager();

  const texto = String(fd.get("texto") ?? "");
  if (!texto.trim()) return { error: "Pega antes la clasificaciÃƒÂ³n o el desglose por mazos." };

  const modo: PasteMode = str(fd, "modo") === "summary" ? "summary" : "standings";
  const catalogo = await db.select().from(archetypes);
  const known = catalogo.map((a) => ({
    id: a.id, name: a.name, main: a.main, secondary: a.secondary,
  }));

  const parsed = modo === "summary" ? parseSummary(texto, known) : parseStandings(texto, known);

  if (!parsed.entries.length) {
    return {
      error: parsed.descartadas > 0
        ? `No se ha reconocido ningÃƒÂºn mazo: ${parsed.descartadas} fila(s) descartadas. Prueba a pulsar Ã‚Â«Actualizar catÃƒÂ¡logoÃ‚Â» aquÃƒÂ­ arriba y vuelve a pegarlo.`
        : "No se ha entendido nada de lo pegado. Revisa que sean filas de clasificaciÃƒÂ³n o lÃƒÂ­neas Ã‚Â«mazo Ã¢â‚¬â€ nÃƒÂºmeroÃ‚Â».",
    };
  }

  const preview = resumenImportacion(modo, parsed);

  if (str(fd, "confirmar") !== "si") return { preview };

  /* ------------------------------------------------ a partir de aquÃƒÂ­, escribe */

  const name = str(fd, "name").slice(0, 120);
  const date = isoDate(fd, "date", null);
  if (!name) return { error: "Ponle nombre al evento.", preview };
  if (!date) return { error: "La fecha no es vÃƒÂ¡lida.", preview };

  const kind = CALENDAR_KINDS[str(fd, "kind")] ? str(fd, "kind") : "regional";
  const division = DIVISIONS[str(fd, "division") as keyof typeof DIVISIONS]
    ? str(fd, "division") : "masters";

  /* El id de un evento importado: legible, y sobre todo determinista.
     Determinista es lo que hace que volver a pegar el mismo Regional lo
     actualice en vez de duplicarlo.

     Lleva la divisiÃƒÂ³n porque el mismo Regional tiene tres, con el mismo
     nombre y la misma fecha y clasificaciones distintas; sin ella, importar
     Seniors machacaba Masters en silencio.

     Y lleva una firma corta del nombre completo porque el trozo legible va
     recortado a 40 caracteres: dos eventos que solo se diferencien a partir
     del carÃƒÂ¡cter 41 tendrÃƒÂ­an el mismo id y el segundo pisarÃƒÂ­a al primero sin
     decir nada. Con la firma, identidades distintas dan ids distintos y el
     ÃƒÂ­ndice ÃƒÂºnico de (nombre, fecha, divisiÃƒÂ³n) nunca salta. */
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

  // Volver a importar el mismo evento Ã¢â‚¬â€porque la primera vez aÃƒÂºn no estaba el
  // top cutÃ¢â‚¬â€ actualiza la cabecera y reemplaza las filas. Basta con mirar el
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

  /* Reemplazo, no mezcla: borrar y volver a insertar. Sin transacciÃƒÂ³n porque
     el driver `neon-http` no las tiene; la ventana en la que el evento se
     queda sin filas dura milisegundos y, si el insert fallara, lo que queda es
     un evento vacÃƒÂ­o que se arregla volviendo a pegar Ã¢â‚¬â€no datos mezclados de
     dos pegados distintos, que serÃƒÂ­a mucho peor de detectarÃ¢â‚¬â€. */
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

  // A trozos: una clasificaciÃƒÂ³n de top 256 en un solo insert es una sentencia
  // con miles de parÃƒÂ¡metros, y el driver HTTP la corta.
  for (let i = 0; i < filas.length; i += 200) {
    await db.insert(metaEntries).values(filas.slice(i, i + 200));
  }

  refresh();
  const avisos = [
    `${filas.length} fila(s) guardadas`,
    parsed.descartadas ? `${parsed.descartadas} descartada(s) por no repetirse` : "",
    parsed.nuevos.length ? `${parsed.nuevos.length} mazo(s) fuera del catÃƒÂ¡logo` : "",
  ].filter(Boolean);
  return { ok: `${name}: ${avisos.join(", ")}.`, preview };
}

/**
 * Una firma corta y estable de una cadena (FNV-1a, 32 bits en hexadecimal).
 *
 * No es criptografÃƒÂ­a y no pretende serlo: solo hace falta que la misma
 * entrada dÃƒÂ© siempre la misma salida y que dos entradas distintas casi nunca
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
 * Los slugs de PokÃƒÂ©mon que el catÃƒÂ¡logo ya conoce.
 *
 * Es la forma de ponerle sprite a un mazo que no estÃƒÂ¡ dado de alta: si en su
 * nombre aparece un PokÃƒÂ©mon que sÃƒÂ­ sale en algÃƒÂºn arquetipo del catÃƒÂ¡logo, ese
 * es el icono. No se inventa ningÃƒÂºn slug Ã¢â‚¬â€ un slug inventado es una imagen
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
  // Primero las parejas ("Raging Bolt"), que son mÃƒÂ¡s especÃƒÂ­ficas que la
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
 * Sin pedir que se escriba el nombre, al revÃƒÂ©s que borrar un torneo: aquÃƒÂ­ no
 * se pierde nada que no se pueda recuperar volviendo a pegar la clasificaciÃƒÂ³n
 * de una web pÃƒÂºblica.
 */
export async function deleteMetaEvent(fd: FormData) {
  await requireManager();
  const id = str(fd, "id");
  if (!id) return;
  await db.delete(metaEvents).where(eq(metaEvents.id, id));
  refresh();
  redirect(withFlash("/ajustes", "ok", "Evento quitado del metagame presencial."));
}

/* ================================================ v0.14 Ã¢â‚¬â€ Limitless web ====

   Un botÃƒÂ³n de organizador en Ajustes: trae los Regionales y las City Leagues
   que falten desde limitlesstcg.com y los guarda en el metagame presencial
   (`meta_events` + `meta_entries`), la misma tabla que la importaciÃƒÂ³n a mano.

   Ã‚Â· Solo mazos. Los parsers no leen nombres de persona (ver
     `lib/limitlessHtml.ts`) y la tabla no tiene dÃƒÂ³nde guardarlos.
   Ã‚Â· Idempotente: los ids son `lt-<id>` y `ltjp-<id>`, y lo que ya estÃƒÂ¡ no se
     vuelve a pedir. Pulsarlo dos veces seguidas no hace ninguna peticiÃƒÂ³n de
     torneo la segunda vez.
   Ã‚Â· Con tope: 6 Regionales y 15 City Leagues por pulsaciÃƒÂ³n, con pausa entre
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
    // Si alguien ya lo pegÃƒÂ³ a mano con el mismo nombre y fecha, manda lo suyo.
    if (identidades.has(`${ev.name}|${ev.date}|${ev.division}`)) return false;
    const insertado = await db.insert(metaEvents).values(ev)
      .onConflictDoNothing()
      .returning({ id: metaEvents.id });
    if (!insertado.length) return false;
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
        notes: "Recuento de mazos del DÃƒÂ­a 2 (fase 2) publicado por Limitless TCG; el top cut va puesto a puesto. Sin nombres.",
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
        location: `${x.liga.prefecture}, JapÃƒÂ³n`, format: "standard", division: "masters",
        season: seasonOfDate(x.liga.date), playerCount: null, topCut: 8, coverage: x.puestos.length,
        sourceUrl: x.url, sourceName: "Limitless TCG",
        notes: "City League de JapÃƒÂ³n: top del evento, solo puesto y mazo. Formato japonÃƒÂ©s, que va por delante del internacional.",
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

/* ============================================ v0.14 Ã¢â‚¬â€ buscador de eventos ====

   Challenges y Cups pegados desde el Event Locator oficial (ver
   `lib/eventosPegados.ts`: pokemon.com prohÃƒÂ­be la extracciÃƒÂ³n automatizada,
   asÃƒÂ­ que se copia a mano y se pega). Idempotente por id: pegar la misma
   lista otra vez actualiza y no duplica.
   ========================================================================= */

export async function importPastedEvents(fd: FormData) {
  await requireManager();
  const texto = String(fd.get("texto") ?? "").slice(0, 200_000);
  const { eventos, ignorados } = parseEventosPegados(texto);
  if (!eventos.length) {
    redirect(withFlash("/calendario", "error",
      "No he reconocido ningÃƒÂºn torneo en lo pegado. Puedes pegar la lista del buscador oficial o un listado por meses (CHALLENGE / CUP / REGIONAL)."));
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

    // Si ya existe un torneo en la app para este dÃƒÂ­a y tienda, lo enlazamos para evitar duplicados en calendario
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
      note: [e.time ? `Empieza a las ${e.time}` : "", e.note ?? "Del listado pegado"].filter(Boolean).join(" Ã‚Â· "),
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
 * Cambiar de idioma. Se guarda en una cookie de un aÃƒÂ±o y se vuelve a la
 * misma pantalla. No necesita sesiÃƒÂ³n: tambiÃƒÂ©n sirve en la de entrar.
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
 * Seguir / dejar de seguir a alguien. Siempre sobre la lista de quien estÃƒÂ¡
 * firmado: el `playerId` del formulario es a QUIÃƒâ€°N se sigue, nunca el dueÃƒÂ±o.
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
      // Dos toques seguidos en el mÃƒÂ³vil no deben reventar con un 23505.
      .onConflictDoNothing();
  }
  refresh();
  redirect(safeBack(fd, `/perfil/${favoriteId}`));
}

/** Un puesto de leaderboard: entero entre 1 y 100.000, o nulo si viene vacÃƒÂ­o. */
const puestoDe = (fd: FormData, k: string): number | null => {
  const n = maybeNum(fd, k);
  if (n == null) return null;
  const r = Math.round(n);
  return r >= 1 && r <= 100_000 ? r : null;
};

/**
 * Apuntar el puesto en el leaderboard oficial (EspaÃƒÂ±a y Europa).
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
 * Entregar el mazo de liga. Una vez guardado queda BLOQUEADO: su dueÃƒÂ±o ya no
 * puede cambiarlo; solo un organizador puede desbloquearlo (o ponerlo por
 * otra persona). La comprobaciÃƒÂ³n va aquÃƒÂ­ y no en la pantalla.
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

  // Solo participantes: los apuntados a la competiciÃƒÂ³n o, si no hay lista, cualquiera activo.
  const apuntados = await db.select({ playerId: competitionPlayers.playerId }).from(competitionPlayers)
    .where(eq(competitionPlayers.competitionId, competitionId));
  if (apuntados.length && !apuntados.some((r) => r.playerId === playerId)) {
    redirect(withFlash(back, "error", "Esa persona no participa en esta liga."));
  }

  // v0.23: segÃƒÂºn la modalidad, uno (`deck`) o hasta tres (`deck1`Ã¢â‚¬Â¦`deck3`).
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
    redirect(withFlash(back, "error", "Tus mazos de liga ya estÃƒÂ¡n bloqueados. PÃƒÂ­dele a un organizador que los desbloquee."));
  }

  // Un organizador que rehace la entrega: se cambia entera.
  if (existing) await db.delete(leagueDecks).where(where);
  await db.insert(leagueDecks)
    .values(unicos.map((d, i) => ({
      competitionId, playerId, slot: i + 1, deckId: d.deckId, archetypeId: d.archetypeId, createdBy: actor.id,
    })))
    // Dos envÃƒÂ­os seguidos no deben pisar el primero: el bloqueo es el bloqueo.
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
 * grÃƒÂ¡fica del lÃƒÂ­der empieza a contar desde aquÃƒÂ­. Opcionalmente reinicia
 * tambiÃƒÂ©n el Elo de la liga (fecha de corte, reversible).
 */
export async function resetLadderSeason(fd: FormData) {
  const actor = await requireManager();
  if (!confirmed(fd, "nueva temporada")) {
    redirect(withFlash("/ajustes", "error", "Escribe Ã‚Â«nueva temporadaÃ‚Â» para confirmar."));
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

  // v0.19: queda apuntado, para la lÃƒÂ­nea roja de la grÃƒÂ¡fica del ladder.
  await db.insert(seasonResets).values({ id: newId("sr"), at: ahora, createdBy: actor.id });

  const cambios = { ladderSince: ahora, updatedAt: ahora, ...(tambienElo ? { eloSince: todayISO() } : {}) };
  const existing = await db.select({ id: settings.id }).from(settings).where(eq(settings.id, "default"));
  if (existing[0]) await db.update(settings).set(cambios).where(eq(settings.id, "default"));
  else await db.insert(settings).values({ id: "default", ...cambios });

  refresh();
  redirect(withFlash("/ajustes", "ok",
    `Temporada nueva: rangos del ladder a cero${tambienElo ? ", Elo de la liga desde hoy" : ""}${tambienPuestos ? " y puestos oficiales borrados" : ""}.`));
}

/** v0.19 Ã¢â‚¬â€ Lo mismo que el cron diario, a mano. Solo organizadores. */
export async function limpiarTorneosAbandonados() {
  await requireManager();
  const borrados = await borrarTorneosAbandonados();
  refresh();
  redirect(withFlash("/ajustes", "ok", borrados.length
    ? `Borrados ${borrados.length} torneo(s) sin participaciÃƒÂ³n: ${borrados.map((t) => t.name).join(", ").slice(0, 160)}.`
    : "No habÃƒÂ­a ningÃƒÂºn torneo abandonado."));
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
    `${cambios} arquetipo(s) actualizado(s)${rechazados ? `; ${rechazados} sin cambiar porque harÃƒÂ­an un cÃƒÂ­rculo` : ""}.`));
}

/* ================================================================ v0.23 -- */

/**
 * Crear o editar un equipo de una liga Ã‚Â«Duelo por equiposÃ‚Â». Solo
 * organizadores. Tres miembros, distintos, que participen en la liga y que no
 * estÃƒÂ©n ya en otro equipo de la misma liga. El orden es el puesto.
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
  if (repetido) redirect(withFlash(back, "error", "Alguien ya estÃƒÂ¡ en otro equipo de esta liga."));

  if (editing) {
    await db.update(competitionTeams).set({ name, members })
      .where(and(eq(competitionTeams.id, editing), eq(competitionTeams.competitionId, competitionId)));
  } else {
    await db.insert(competitionTeams).values({ id: newId("tm"), competitionId, name, members });
  }
  refresh();
  redirect(withFlash(back, "ok", `Equipo Ã‚Â«${name}Ã‚Â» guardado.`));
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

/* ================================================================ v0.25 -- */

export async function setPersonalRegional(fd: FormData) {
  const id = str(fd, "regionalId");
  const c = await cookies();
  if (id) {
    c.set("personalRegional", id, { maxAge: 31536000 });
  } else {
    c.delete("personalRegional");
  }
  redirect("/#ultimo-regional");
}
