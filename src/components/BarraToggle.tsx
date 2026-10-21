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
    <button type="button" onClick={alternar}
      className="barra-toggle btn btn-ghost btn-sm w-full justify-center px-2 text-muted"
      title={tr(lng, mini ? "barra.desplegar" : "barra.plegar")}
      aria-label={tr(lng, "barra.alternar")}>
      <span aria-hidden="true" className="barra-flecha inline-block transition-transform">«</span>
    </button>
  );
}
