"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/i18n";
import { tutorialDe } from "@/lib/tutorialesPagina";
import { marcarTutorialPagina } from "@/actions/cuenta";

/* v0.61 — El tutorial de cada página: la PRIMERA vez que entras en ella, para
   qué sirve y cómo se usa. Una vez por cuenta (lo visto viene del servidor y
   se apunta al cerrarlo). Mientras toque el tutorial general, este espera: no
   se apilan dos tarjetas. Misma tarjeta que el general (`.tour-tarjeta`). */
export function TutorialPagina({ vistos, bloqueado }: { vistos: string[]; bloqueado: boolean }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const ruta = usePathname();
  const [vistosAqui, setVistosAqui] = useState<Set<string>>(() => new Set(vistos));
  const [paso, setPaso] = useState<{ clave: string; i: number } | null>(null);

  const t = tutorialDe(ruta);
  const activo = Boolean(!bloqueado && t && !vistosAqui.has(t.clave));
  const iActual = t && paso?.clave === t.clave ? paso.i : 0;

  /* v0.73 — señalar lo que explica el paso: se resalta, se trae a la vista y
     el resto se oscurece un poco. Si no está en la página, el primer paso
     señala el título; los demás, nada (la tarjeta sola). */
  useEffect(() => {
    if (!activo || !t) return;
    const visible = (el: Element) => (el as HTMLElement).offsetParent !== null;
    let el = Array.from(document.querySelectorAll(t.pasos[iActual].foco)).find(visible) as HTMLElement | undefined;
    if (!el && iActual === 0) el = document.querySelector("main h1") as HTMLElement | undefined ?? undefined;
    if (!el) return;
    const posicionada = getComputedStyle(el).position !== "static";
    if (!posicionada) el.style.position = "relative";
    el.classList.add("tour-foco", "tour-luz");
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    return () => {
      el!.classList.remove("tour-foco", "tour-luz");
      if (!posicionada) el!.style.position = "";
    };
  }, [activo, t?.clave, iActual]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activo || !t) return null;
  const i = iActual;
  const p = t.pasos[i];
  const ultimo = i === t.pasos.length - 1;

  const cerrar = () => {
    setVistosAqui((s) => new Set(s).add(t.clave));
    marcarTutorialPagina(t.clave).catch(() => {}); // sin red: saldría otra vez, que es lo menos malo
  };

  return (
    <div className="tour-tarjeta" role="dialog" aria-modal="false" aria-labelledby="tp-titulo">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">{tr(lng, "tp.etiqueta")}</span>
        <span className="text-xs text-muted tabular">{i + 1} / {t.pasos.length}</span>
      </div>
      <h2 id="tp-titulo" className="font-display text-lg font-bold">{tr(lng, p.titulo)}</h2>
      <p className="mt-1 text-sm text-ink-2">{tr(lng, p.texto)}</p>
      <div className="mt-4 flex items-center gap-2">
        {i > 0 && <button type="button" className="btn btn-sm" onClick={() => setPaso({ clave: t.clave, i: i - 1 })}>{tr(lng, "tut.atras")}</button>}
        <button type="button" className="btn btn-brand btn-sm" onClick={() => (ultimo ? cerrar() : setPaso({ clave: t.clave, i: i + 1 }))}>
          {tr(lng, ultimo ? "tp.entendido" : "tut.siguiente")}
        </button>
        {!ultimo && <button type="button" className="ml-auto text-xs text-muted underline underline-offset-2" onClick={cerrar}>{tr(lng, "tp.cerrar")}</button>}
      </div>
    </div>
  );
}
