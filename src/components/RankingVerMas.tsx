"use client";

import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* v0.106 — El ranking enseña el top 10 y el resto tras «Ver los N restantes».
   Con 37 jugadores la tabla ocupaba tres pantallas en el móvil. El orden que
   elijas (puntos, %V, Elo…) se respeta: el top 10 es el de ESA columna. */
export const TOP_RANKING = 10;

export function VerTodosRanking({ total, abierto, onToggle }: { total: number; abierto: boolean; onToggle: () => void }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const resto = total - TOP_RANKING;
  if (resto <= 0) return null;
  return (
    <button type="button" onClick={onToggle} aria-expanded={abierto}
      className="card mt-2 flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-info hover:bg-surface-2">
      {abierto ? tr(lng, "rk.verTop") : trf(lng, "rk.verTodos", { n: resto })}
      <span aria-hidden="true" className={`transition-transform ${abierto ? "rotate-180" : ""}`}>▾</span>
    </button>
  );
}
