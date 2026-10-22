"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
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
  if (bloqueado || !t || vistosAqui.has(t.clave)) return null;
  const i = paso?.clave === t.clave ? paso.i : 0;
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
