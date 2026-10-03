"use client";

import { usePathname } from "next/navigation";
import { setLang } from "@/actions";
import { tr, type Lang } from "@/lib/i18n";

/**
 * v0.17 — Botón ES/EN. Es un formulario de verdad (funciona sin JS): manda
 * el idioma contrario y la ruta actual, y la Server Action deja la cookie y
 * vuelve aquí. Enseña el idioma AL QUE se cambia, que es lo que se busca.
 */
export function LangToggle({ lang, className = "" }: { lang: Lang; className?: string }) {
  const path = usePathname() || "/";
  const otro: Lang = lang === "es" ? "en" : "es";
  return (
    <form action={setLang} className={className}>
      <input type="hidden" name="lang" value={otro} />
      <input type="hidden" name="back" value={path} />
      <button
        type="submit"
        className="btn btn-ghost btn-sm px-2 font-mono text-xs font-bold"
        title={`${tr(lang, "lang.switch")}: ${tr(lang, "lang.toOther")}`}
        aria-label={`${tr(lang, "lang.switch")}: ${tr(lang, "lang.toOther")}`}
      >
        {tr(lang, "lang.toOtherShort")}
      </button>
    </form>
  );
}
