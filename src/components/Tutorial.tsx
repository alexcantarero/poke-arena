"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/i18n";
import { marcarTutorialVisto } from "@/actions/cuenta";

/* =========================================================================
   v0.60 — El tutorial de primera vez: cómo moverse y por dónde.

   Sale UNA VEZ POR CUENTA (lo decide el servidor con `tutorialVistoAt`), así
   que no se repite al entrar desde otro móvil u ordenador, y les sale también
   a los que ya estaban registrados. Al terminarlo o saltarlo se apunta en su
   cuenta.

   En cada paso RESALTA la parte de la app de la que habla (atributo
   `data-tour`): en el móvil, la barra de abajo; en el PC, la barra lateral. De
   cada selector se usa el primer elemento VISIBLE, porque los dos menús existen
   a la vez y uno de ellos está oculto. Si no hay nada que resaltar (por
   ejemplo, el Ranking en el móvil está en «Más»), se resalta lo que lleva allí.
   ========================================================================= */

type Paso = { titulo: string; texto: string; foco?: string };

const PASOS: Paso[] = [
  { titulo: "tut.p0", texto: "tut.p0t" },
  { titulo: "tut.p1", texto: "tut.p1t", foco: '[data-tour="registrar"]' },
  { titulo: "tut.p2", texto: "tut.p2t", foco: '[data-tour="/"]' },
  { titulo: "tut.p3", texto: "tut.p3t", foco: '[data-tour="/torneos"]' },
  { titulo: "tut.p4", texto: "tut.p4t", foco: '[data-tour="/estadisticas"]' },
  { titulo: "tut.p5", texto: "tut.p5t", foco: '[data-tour="/ranking"], [data-tour="mas"]' },
  { titulo: "tut.p6", texto: "tut.p6t", foco: '[data-tour^="/perfil"], [data-tour="mas"]' },
];

const visible = (el: Element) => (el as HTMLElement).offsetParent !== null || getComputedStyle(el).position === "fixed";

export function Tutorial() {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const [paso, setPaso] = useState(0);
  const [abierto, setAbierto] = useState(true);

  // Resaltar el elemento del paso (el primero visible de los que encajan).
  useEffect(() => {
    if (!abierto) return;
    const sel = PASOS[paso].foco;
    if (!sel) return;
    const el = Array.from(document.querySelectorAll(sel)).find(visible) as HTMLElement | undefined;
    if (!el) return;
    el.classList.add("tour-foco");
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return () => el.classList.remove("tour-foco");
  }, [paso, abierto]);

  const cerrar = () => {
    setAbierto(false);
    // Se apunta en la cuenta; si falla (sin red), sale otra vez la próxima vez, que es lo menos malo.
    marcarTutorialVisto().catch(() => {});
  };
  if (!abierto) return null;
  const p = PASOS[paso];
  const ultimo = paso === PASOS.length - 1;

  return (
    <div className="tour-tarjeta" role="dialog" aria-modal="false" aria-labelledby="tour-titulo">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">{tr(lng, "tut.titulo")}</span>
        <span className="text-xs text-muted tabular">{paso + 1} / {PASOS.length}</span>
      </div>
      <div className="mb-3 flex gap-1" aria-hidden="true">
        {PASOS.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= paso ? "bg-brand" : "bg-surface-3"}`} />)}
      </div>
      <h2 id="tour-titulo" className="font-display text-lg font-bold">{tr(lng, p.titulo)}</h2>
      <p className="mt-1 text-sm text-ink-2">{tr(lng, p.texto)}</p>
      <div className="mt-4 flex items-center gap-2">
        {paso > 0 && <button type="button" className="btn btn-sm" onClick={() => setPaso(paso - 1)}>{tr(lng, "tut.atras")}</button>}
        <button type="button" className="btn btn-brand btn-sm" onClick={() => (ultimo ? cerrar() : setPaso(paso + 1))}>
          {tr(lng, ultimo ? "tut.empezar" : "tut.siguiente")}
        </button>
        {!ultimo && <button type="button" className="ml-auto text-xs text-muted underline underline-offset-2" onClick={cerrar}>{tr(lng, "tut.saltar")}</button>}
      </div>
    </div>
  );
}
