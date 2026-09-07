import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

/* =========================================================================
   Autenticación por código de invitación.

   No hay servicio externo ni contraseñas: quien conoce el código de la liga
   entra, elige quién es y esa elección se guarda en una cookie firmada.
   Si un jugador tiene PIN, hay que teclearlo para actuar en su nombre.

   Cuando la liga crezca y esto se quede corto, el punto de sustitución es
   este fichero: cambia `readSession`/`writeSession` por el proveedor que
   quieras (Auth.js, Clerk, Supabase Auth) sin tocar el resto de la app.
   ========================================================================= */

const COOKIE = "arena_session";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 días

export type Session = { playerId: string; issuedAt: number };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Falta SESSION_SECRET en las variables de entorno.");
  return s;
}

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
  const expected = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
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
  return raw ? deserialize(raw) : null;
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

/** Compara el código escrito con el de la liga, sin distinguir mayúsculas. */
export function codeMatches(input: string, expected: string) {
  const a = (input || "").trim().toLowerCase();
  const b = (expected || "").trim().toLowerCase();
  return b.length > 0 && a === b;
}

/** El código configurado en la base de datos manda; si está vacío, se usa el del entorno. */
export function effectiveInviteCode(dbCode: string) {
  return (dbCode || "").trim() || (process.env.LEAGUE_INVITE_CODE || "").trim();
}
