"use client";

import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/i18n";

/* v0.56 — plegar la barra lateral a solo iconos, para dar más sitio al
   contenido. La preferencia se guarda en una cookie y el SERVIDOR la lee al
   pintar la página: así llega ya plegada, sin parpadeo. Aquí solo se cambia el
   atributo al momento y se guarda la cookie para la próxima vez. */
export function BarraToggle({ mini }: { mini: boolean }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const alternar = () => {
    const shell = document.querySelector(".app-shell");
    const ahora = shell?.getAttribute("data-barra") === "mini";
    if (ahora) shell?.removeAttribute("data-barra"); else shell?.setAttribute("data-barra", "mini");
    document.cookie = `arena-barra=${ahora ? "abierta" : "mini"}; path=/; max-age=31536000; samesite=lax`;
  };
  return (
    /* v0.58 — discreto: un icono pequeño y tenue en la esquina, que se marca
       al pasar el ratón. Antes era un botón ancho con una flecha grande. */
    <button type="button" onClick={alternar}
      className="barra-toggle ml-auto grid size-6 place-items-center rounded-md text-muted/50 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:text-ink"
      title={tr(lng, mini ? "barra.desplegar" : "barra.plegar")}
      aria-label={tr(lng, "barra.alternar")}>
      <svg viewBox="0 0 16 16" className="barra-flecha size-3.5 transition-transform" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 3.5 5.5 8l4.5 4.5" />
      </svg>
    </button>
  );
}
