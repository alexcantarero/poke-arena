"use server";

/* Cuentas, sesiones, invitaciones, perfil, jugadores y preferencias.
   v0.47 — partido de `src/actions/index.ts`. */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { decks, invites, matches, passwordResets, playerFavorites, players, settings, tournamentResults } from "@/db/schema";
import { LANG_COOKIE, asLang } from "@/lib/i18n";
import { hashResetToken, clearSession, DUMMY_HASH, emailProblem, hashPassword, INVITE_MESSAGES, isOwner, newInviteToken, normalizeEmail, passwordProblem, verifyPassword, writeSession } from "@/lib/auth";
import { newId, todayISO } from "@/lib/format";
import { pokeSlug } from "@/lib/pokemon";
import { withFlash } from "@/lib/flash";
import type { FormState } from "@/lib/types";
import {
  str, int, bool, pick, refresh, safeBack, requireActor, requireManager, owns, ownerCount, loginSchema, PALETTE, confirmed, puestoDe,
  msj,
} from "./_comun";
import { anadirVisto } from "@/lib/tutorialesPagina";
import { anadirLogro, CLAVES_LOGRO } from "@/lib/logros";
import { caducidadRecuperacion, limpiarToken, type EstadoEnlace } from "@/lib/recuperacion";

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: normalizeEmail(str(fd, "email")),
    password: String(fd.get("password") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;

  const rows = await db.select().from(players).where(eq(players.email, email));
  const player = rows[0];
  const bad = { error: await msj("x.a38d41f7") };

  if (!player) {
    await verifyPassword(password, DUMMY_HASH);
    return bad;
  }

  if (player.lockedUntil && player.lockedUntil > new Date()) {
    const mins = Math.ceil((player.lockedUntil.getTime() - Date.now()) / 60000);
    return { error: "Cuenta bloqueada. Inténtalo de nuevo en " + mins + " minuto(s)." };
  }

  const valid = await verifyPassword(password, player.passwordHash);
  if (!valid) {
    const attempts = (player.loginAttempts ?? 0) + 1;
    const lock = attempts >= 5 ? new Date(Date.now() + 15 * 60000) : null;
    await db.update(players).set({ loginAttempts: attempts, lockedUntil: lock }).where(eq(players.id, player.id));
    if (lock) return { error: await msj("x.42d50dda") };
    return bad;
  }

  if (!player.active) return { error: await msj("x.54cacfe2") };

  await db.update(players).set({ 
    lastSeenAt: new Date(),
    loginAttempts: 0,
    lockedUntil: null
  }).where(eq(players.id, player.id));
  
  await writeSession(player.id, player.sessionVersion ?? 1);
  redirect("/");
}

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
    return { error: await msj("x.262c29ce") };
  }

  if (!name) return { error: await msj("x.3abbc5bd") };
  const emailBad = emailProblem(email);
  if (emailBad) return { error: emailBad };
  const passBad = passwordProblem(password);
  if (passBad) return { error: passBad };

  const existing = await db.select({ id: players.id }).from(players).where(eq(players.email, email));
  if (existing[0]) return { error: await msj("x.1607734f") };

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
    return { error: await msj("x.58f24670") };
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
    return { error: await msj("x.04b38418") };
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
    return { error: await msj("x.8539a5c2") };
  }
  const bad = passwordProblem(next);
  if (bad) return { error: bad };
  /* v0.67 — cambiar la contraseña cierra las DEMÁS sesiones (sube la versión
     de la cuenta) y deja abierta esta, que se vuelve a emitir con la nueva. */
  const version = (actor.sessionVersion ?? 1) + 1;
  await db.update(players).set({ passwordHash: await hashPassword(next), sessionVersion: version }).where(eq(players.id, actor.id));
  await writeSession(actor.id, version);
  return { ok: "Contraseña cambiada." };
}

/* -------------------------------------------------- v0.67: recuperación -- */

/**
 * Un organizador crea un enlace para que alguien ponga contraseña nueva.
 *
 * Las mismas reglas que el resto de la gestión de jugadores: no para uno mismo
 * (para eso está «Cambiar contraseña»), y al organizador principal solo lo
 * toca otro organizador principal. Crear uno nuevo anula los pendientes de esa
 * persona. Se guarda el hash; el token solo se devuelve aquí, una vez, para
 * que lo copie quien lo ha pedido.
 */
export async function crearEnlaceRecuperacion(_prev: EstadoEnlace, fd: FormData): Promise<EstadoEnlace> {
  const actor = await requireManager();
  const id = str(fd, "id");
  const rows = await db.select({ id: players.id, name: players.name, role: players.role, active: players.active })
    .from(players).where(eq(players.id, id));
  const target = rows[0];
  if (!target) return { error: await msj("rec.errNoExiste") };
  if (target.id === actor.id) return { error: await msj("rec.errTuMismo") };
  if (target.role === "owner" && !isOwner(actor.role)) return { error: await msj("rec.errOwner") };
  if (!target.active) return { error: await msj("rec.errInactivo") };

  await db.delete(passwordResets).where(and(eq(passwordResets.playerId, target.id), isNull(passwordResets.usedAt)));
  const token = newInviteToken();
  await db.insert(passwordResets).values({
    tokenHash: hashResetToken(token), playerId: target.id, createdBy: actor.id, expiresAt: caducidadRecuperacion(),
  });
  return { enlace: `/recuperar/${token}`, nombre: target.name };
}

/**
 * Poner contraseña nueva con un enlace de recuperación. Sin sesión: es justo
 * para quien no puede entrar.
 *
 * Orden: primero se valida la contraseña (una errata no debe gastar el
 * enlace); después se CONSUME el enlace con un UPDATE condicional —una sola
 * sentencia, así dos pestañas no lo usan dos veces—; y solo si devuelve fila
 * se cambia la contraseña, se sube la versión de la cuenta (las sesiones
 * viejas mueren) y se entra con la nueva.
 */
export async function restablecerContrasena(_prev: FormState, fd: FormData): Promise<FormState> {
  const token = limpiarToken(str(fd, "token"));
  const next = String(fd.get("next") ?? "");
  const repeat = String(fd.get("repeat") ?? "");
  if (next !== repeat) return { error: await msj("rec.errNoCoinciden") };
  const bad = passwordProblem(next);
  if (bad) return { error: bad };
  if (!token) return { error: await msj("rec.errEnlace") };

  const usados = await db.update(passwordResets)
    .set({ usedAt: new Date() })
    .where(and(
      eq(passwordResets.tokenHash, hashResetToken(token)),
      isNull(passwordResets.usedAt),
      gt(passwordResets.expiresAt, new Date()),
    ))
    .returning({ playerId: passwordResets.playerId });
  const playerId = usados[0]?.playerId;
  if (!playerId) return { error: await msj("rec.errEnlace") };

  const rows = await db.select({ active: players.active, version: players.sessionVersion }).from(players).where(eq(players.id, playerId));
  if (!rows[0]?.active) return { error: await msj("rec.errInactivo") };
  const version = (rows[0].version ?? 1) + 1;
  await db.update(players).set({
    passwordHash: await hashPassword(next), sessionVersion: version, loginAttempts: 0, lockedUntil: null, lastSeenAt: new Date(),
  }).where(eq(players.id, playerId));
  await writeSession(playerId, version);
  redirect(withFlash("/", "ok", await msj("rec.hecho")));
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
  redirect(withFlash("/ajustes", "ok", await msj("x.b96bd2a8")));
}

export async function revokeInvite(fd: FormData) {
  await requireManager();
  await db.update(invites).set({ revoked: true }).where(eq(invites.token, str(fd, "token")));
  refresh();
  redirect(withFlash("/ajustes", "ok", await msj("x.aa152260")));
}

/* ----------------------------------------------------------- jugadores -- */

export async function saveProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireActor();
  const targetId = str(fd, "id") || actor.id;
  if (!owns(actor, targetId)) return { error: await msj("x.b64d8ec7") };

  const name = str(fd, "name");
  if (!name) return { error: await msj("x.e5aebb07") };

  const avatarKind = pick(fd, "avatarKind", ["none", "pokemon", "image"] as const, "none");
  const rawAvatar = str(fd, "avatarValue");
  let avatarValue = "";
  if (avatarKind === "pokemon") {
    avatarValue = pokeSlug(rawAvatar);
  } else if (avatarKind === "image") {
    // Solo https. Una URL de un servidor cualquiera convierte el ranking en un
    // registro de quién lo mira y desde dónde.
    if (rawAvatar && !/^https:\/\//i.test(rawAvatar)) {
      return { error: await msj("x.0610fd75") };
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
    // v0.36 — el nick de Limitless. Se guarda tal cual se escribe; la
    // comparación al importar ya es insensible a mayúsculas.
    limitlessHandle: str(fd, "limitlessHandle").trim().slice(0, 60) || null,
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

/** v0.60 — el tutorial ya se vio (terminado o saltado). Solo la cuenta de quien llama. */
export async function marcarTutorialVisto() {
  const actor = await requireActor();
  await db.update(players).set({ tutorialVistoAt: new Date() }).where(eq(players.id, actor.id));
}

/** v0.65 — un logro secreto encontrado. Solo la cuenta de quien llama y solo
    claves conocidas: es un endpoint público, y desde la consola se podría
    pedir cualquier cosa. Devuelve si era nuevo, para avisar una sola vez. */
export async function desbloquearLogro(clave: string): Promise<boolean> {
  const actor = await requireActor();
  if (!CLAVES_LOGRO.includes(clave)) return false;
  const r = await db.select({ v: players.logros }).from(players).where(eq(players.id, actor.id));
  const antes = r[0]?.v ?? "";
  const despues = anadirLogro(antes, clave);
  if (despues === antes) return false;
  await db.update(players).set({ logros: despues }).where(eq(players.id, actor.id));
  return true;
}

/** v0.61 — un tutorial de página ya visto. Solo la cuenta de quien llama, y solo claves conocidas. */
export async function marcarTutorialPagina(clave: string) {
  const actor = await requireActor();
  const r = await db.select({ v: players.tutorialesVistos }).from(players).where(eq(players.id, actor.id));
  await db.update(players).set({ tutorialesVistos: anadirVisto(r[0]?.v ?? "", clave) }).where(eq(players.id, actor.id));
}
