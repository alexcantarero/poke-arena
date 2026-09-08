import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string, salt: Buffer, keylen: number,
) => Promise<Buffer>;

/* =========================================================================
   Acceso.

   Cada jugador tiene cuenta propia: correo y contraseña. Se entra por un
   enlace de invitación, que es lo que mantiene la liga cerrada.

   No hay proveedor externo ni tabla de sesiones: la sesión es una cookie
   firmada con HMAC. Para un grupo de amigos sobra, y el día que os quedéis
   cortos este es el único fichero que hay que cambiar.

   Las contraseñas se guardan con scrypt, que viene en Node y no necesita
   compilar nada nativo — importa, porque bcrypt da guerra en el despliegue.
   ========================================================================= */

const COOKIE = "arena_session";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 días
const KEYLEN = 64;

export type Session = { playerId: string; issuedAt: number };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Falta SESSION_SECRET en las variables de entorno.");
  return s;
}

/* --------------------------------------------------------- contraseñas -- */

/** Devuelve "salt:hash" en hexadecimal. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEYLEN);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

/** Comparación en tiempo constante: no filtra información por lo que tarda. */
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  try {
    const derived = await scrypt(password, Buffer.from(saltHex, "hex"), KEYLEN);
    const expected = Buffer.from(hashHex, "hex");
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Un hash de mentira, para gastar el mismo tiempo cuando el correo no existe.
 *
 * Sin esto, `verifyPassword(x, null)` sale en la primera línea y un correo
 * desconocido responde en microsegundos frente a los ~50 ms de scrypt: el
 * mensaje de error es el mismo, pero el reloj delata qué correos tienen cuenta.
 */
export const DUMMY_HASH =
  "00000000000000000000000000000000:" +
  "9f9b1a6b4c1e0d5a3f2e8c7b6a594837261504f3e2d1c0b9a8978685746352413" +
  "02f1e0d9c8b7a6958483726150f4e3d2c1b0a9988776655443322110ffeeddcc";

/** Requisitos mínimos. Devuelve el problema, o null si vale. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "La contraseña necesita al menos 8 caracteres.";
  if (password.length > 200) return "La contraseña es demasiado larga.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Mezcla al menos una letra y un número.";
  }
  return null;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function emailProblem(email: string): string | null {
  const e = normalizeEmail(email);
  if (!e) return "Falta el correo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return "Ese correo no tiene buena pinta.";
  return null;
}

/* ------------------------------------------------------------- sesión -- */

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function serialize(session: Session) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function deserialize(token: string): Session | null {
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  const session = raw ? deserialize(raw) : null;
  if (!session) return null;
  // La caducidad se comprueba aquí, no solo en el `maxAge` de la cookie: el
  // maxAge lo controla el navegador, y una cookie copiada valdría para siempre.
  if (!Number.isFinite(session.issuedAt)) return null;
  if (Date.now() - session.issuedAt > MAX_AGE * 1000) return null;
  return session;
}

export async function writeSession(playerId: string) {
  const jar = await cookies();
  jar.set(COOKIE, serialize({ playerId, issuedAt: Date.now() }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/* -------------------------------------------------------- invitaciones -- */

/** Token de invitación: 32 caracteres imposibles de adivinar. */
export function newInviteToken() {
  return randomBytes(24).toString("base64url");
}

export type InviteState =
  | { ok: true }
  | { ok: false; reason: "revoked" | "expired" | "exhausted" | "missing" };

export function inviteState(invite: {
  revoked: boolean; uses: number; maxUses: number; expiresAt: Date | null;
} | undefined | null): InviteState {
  if (!invite) return { ok: false, reason: "missing" };
  if (invite.revoked) return { ok: false, reason: "revoked" };
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (invite.maxUses > 0 && invite.uses >= invite.maxUses) return { ok: false, reason: "exhausted" };
  return { ok: true };
}

export const INVITE_MESSAGES: Record<Exclude<InviteState, { ok: true }>["reason"], string> = {
  missing: "Esta invitación no existe. Pídele a quien te la mandó que genere otra.",
  revoked: "Esta invitación se ha anulado. Pide una nueva.",
  expired: "Esta invitación ha caducado. Pide una nueva.",
  exhausted: "Esta invitación ya se ha usado. Pide una nueva.",
};

/* -------------------------------------------------------------- roles -- */

export type Role = "owner" | "admin" | "player";

export const canManageLeague = (role: string) => role === "owner" || role === "admin";
export const isOwner = (role: string) => role === "owner";
