import type { CSSProperties } from "react";
import { DIFICULTAD, type ResumenDificultad } from "@/lib/dificultad";
import { tr, type Lang } from "@/lib/i18n";

/* v0.137 — La etiqueta de dificultad de un mazo: el nivel con su color (de
   verde a rojo) y, en pequeño, cuántos han votado. Sin votos, nada. */
export function ChipDificultad({ r, lng, mini = false }: { r: ResumenDificultad | undefined; lng: Lang; mini?: boolean }) {
  if (!r) return null;
  const d = DIFICULTAD[r.nivel];
  return (
    <span className={`dif-chip ${mini ? "text-[10px]" : "text-xs"}`} style={{ "--dif": d.color } as CSSProperties}
      title={`${tr(lng, d.clave)} · ${r.media.toFixed(1)} (${r.votos})`}>
      <i aria-hidden="true">{"●".repeat(r.nivel)}{"○".repeat(5 - r.nivel)}</i> {tr(lng, d.clave)}
      {!mini && <small> · {r.votos}</small>}
    </span>
  );
}
