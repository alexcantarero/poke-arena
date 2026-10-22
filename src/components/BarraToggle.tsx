"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/i18n";
import { urlDeObjeto } from "@/lib/objetos";
import { spriteUrl } from "@/lib/pokemon";
import { registrarClic } from "@/lib/rafaga";
import { ganarLogro } from "@/components/logroCliente";

/* v0.56 — plegar la barra lateral a solo iconos. La preferencia va en una
   cookie que el SERVIDOR lee al pintar: llega ya plegada, sin parpadeo.

   v0.65 — ya no es un botón arriba (dejaba una franja muerta encima de la
   marca): es una Poké Ball enganchada al BORDE de la barra, a la altura de
   «Análisis». Se mide dónde cae ese grupo y se recoloca al cambiar el tamaño,
   al hacer scroll dentro de la barra y al plegarla. Va `fixed` y fuera de la
   barra porque la barra tiene `overflow-y-auto`, que recortaría la mitad que
   sobresale.

   La Ball es el sprite publicado de PokéAPI, no un dibujo (la regla de
   `balls.ts`). Y un secreto: si se machaca, la Ball resulta ser un Voltorb. */
const GRUPO = '[data-grupo="nav.group.analysis"]';

export function BarraToggle({ mini }: { mini: boolean }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const [plegada, setPlegada] = useState(mini);
  const [top, setTop] = useState<number | null>(null);
  const [voltorb, setVoltorb] = useState(0);
  const historial = useRef<number[]>([]);

  const medir = useCallback(() => {
    const g = document.querySelector<HTMLElement>(`.barra-lateral ${GRUPO}`);
    if (!g) { setTop(null); return; }
    const r = g.getBoundingClientRect();
    // A la altura del título del grupo (su primera línea), sin salirse de la pantalla.
    setTop(Math.max(12, Math.min(window.innerHeight - 48, r.top + 4)));
  }, []);

  useLayoutEffect(() => { medir(); }, [medir, plegada]);
  useEffect(() => {
    const barra = document.querySelector(".barra-lateral");
    window.addEventListener("resize", medir);
    barra?.addEventListener("scroll", medir, { passive: true });
    return () => { window.removeEventListener("resize", medir); barra?.removeEventListener("scroll", medir); };
  }, [medir]);

  const alternar = () => {
    const shell = document.querySelector(".app-shell");
    const ahora = shell?.getAttribute("data-barra") === "mini";
    if (ahora) shell?.removeAttribute("data-barra"); else shell?.setAttribute("data-barra", "mini");
    document.cookie = `arena-barra=${ahora ? "abierta" : "mini"}; path=/; max-age=31536000; samesite=lax`;
    setPlegada(!ahora);
    // Tras el cambio de ancho, el grupo «Análisis» puede haber cambiado de altura.
    requestAnimationFrame(medir);

    const r = registrarClic(historial.current, Date.now());
    historial.current = r.historial;
    if (r.rafaga) {
      setVoltorb((n) => n + 1);
      ganarLogro("voltorb");
      setTimeout(() => setVoltorb(0), 1800);
    }
  };

  if (top == null) return null;
  return createPortal(
    <>
      <button type="button" onClick={alternar}
        className="barra-ball" data-plegada={plegada ? "true" : "false"} style={{ top }}
        title={tr(lng, plegada ? "barra.desplegar" : "barra.plegar")}
        aria-label={tr(lng, "barra.alternar")} aria-expanded={!plegada}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urlDeObjeto("poke-ball")} alt="" aria-hidden="true" width={30} height={30} className="barra-ball-img" />
      </button>
      {voltorb > 0 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={voltorb} src={spriteUrl("voltorb")} alt="" aria-hidden="true" className="barra-voltorb" style={{ top: top - 6 }} />
      )}
    </>,
    document.body,
  );
}
