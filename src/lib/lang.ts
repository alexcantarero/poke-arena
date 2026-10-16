import "server-only";
import { cookies } from "next/headers";
import { INGLES_DISPONIBLE, LANG_COOKIE, asLang, type Lang } from "./i18n";

/** El idioma elegido, leído de la cookie. Español si no hay ninguno. */
/**
 * v0.48 — ¿se ofrece el inglés en ESTE despliegue?
 *
 * `INGLES_DISPONIBLE` (en `lib/i18n.ts`) es para todo el mundo. La variable
 * de entorno `ARENA_INGLES=1` lo enciende solo donde esté puesta: en tu PC,
 * para ir viendo cómo queda la traducción mientras se termina, sin que los
 * demás vean una app a medias en producción.
 */
export function inglesDisponible(): boolean {
  return INGLES_DISPONIBLE || process.env.ARENA_INGLES === "1";
}

export async function getLang(): Promise<Lang> {
  // v0.47 — sin inglés disponible, español para todos, aunque la cookie diga
  // otra cosa: si no, quien la tuviera en inglés se quedaría sin botón para
  // volver.
  if (!inglesDisponible()) return "es";
  const jar = await cookies();
  return asLang(jar.get(LANG_COOKIE)?.value);
}
