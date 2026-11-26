import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pushEnviados, pushSuscripciones } from "@/db/schema";
import { enviarPush, vapidValida, type Aviso } from "@/lib/webpush";

/* =========================================================================
   v0.140 — Mandar notificaciones push: a quién, sin repetir y sin romper nada.

   Todo con try/catch: sin claves VAPID o sin la migración 0040, simplemente no
   se manda nada. Una suscripción que el navegador ya no acepta (404/410) se
   borra sola.
   ========================================================================= */

export function vapid() {
  const publica = process.env.VAPID_PUBLIC_KEY?.trim() ?? "", privada = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const sujeto = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@pokearena.invalid";
  return vapidValida(publica) && privada ? { publica, privada, sujeto } : null;
}

export async function guardarSuscripcion(playerId: string, s: { endpoint: string; p256dh: string; auth: string }) {
  await db.insert(pushSuscripciones).values({ playerId, ...s })
    .onConflictDoUpdate({ target: pushSuscripciones.endpoint, set: { playerId, p256dh: s.p256dh, auth: s.auth } });
}

export async function borrarSuscripcion(playerId: string, endpoint: string) {
  await db.delete(pushSuscripciones).where(and(eq(pushSuscripciones.endpoint, endpoint), eq(pushSuscripciones.playerId, playerId)));
}

/** ¿Tiene este jugador alguna suscripción? */
export async function tienePush(playerId: string): Promise<boolean> {
  try {
    const [s] = await db.select({ e: pushSuscripciones.endpoint }).from(pushSuscripciones).where(eq(pushSuscripciones.playerId, playerId)).limit(1);
    return Boolean(s);
  } catch { return false; }
}

/**
 * Manda `aviso` a estos jugadores (a todos sus navegadores). Con `clave`, cada
 * jugador lo recibe UNA vez (se guarda `clave:jugador`). Devuelve cuántos envíos salieron.
 */
export async function enviarA(playerIds: readonly string[], aviso: Aviso, clave?: string): Promise<number> {
  const v = vapid();
  if (!v || !playerIds.length) return 0;
  let enviados = 0;
  try {
    let destinatarios = [...new Set(playerIds)];
    if (clave) {
      const claves = destinatarios.map((p) => `${clave}:${p}`);
      const ya = new Set((await db.select({ c: pushEnviados.clave }).from(pushEnviados).where(inArray(pushEnviados.clave, claves))).map((x) => x.c));
      destinatarios = destinatarios.filter((p) => !ya.has(`${clave}:${p}`));
      if (!destinatarios.length) return 0;
      await db.insert(pushEnviados).values(destinatarios.map((p) => ({ clave: `${clave}:${p}` }))).onConflictDoNothing();
    }
    const subs = await db.select().from(pushSuscripciones).where(inArray(pushSuscripciones.playerId, destinatarios));
    const resultados = await Promise.all(subs.map(async (s) => ({ s, st: await enviarPush(s, aviso, v) })));
    for (const { s, st } of resultados) {
      if (st >= 200 && st < 300) enviados++;
      else if (st === 404 || st === 410) await db.delete(pushSuscripciones).where(eq(pushSuscripciones.endpoint, s.endpoint)).catch(() => undefined);
    }
  } catch (e) {
    console.warn("[push]", e instanceof Error ? e.message : e);
  }
  return enviados;
}
