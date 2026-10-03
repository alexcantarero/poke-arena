import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, asLang, type Lang } from "./i18n";

/** El idioma elegido, leído de la cookie. Español si no hay ninguno. */
export async function getLang(): Promise<Lang> {
  const jar = await cookies();
  return asLang(jar.get(LANG_COOKIE)?.value);
}
