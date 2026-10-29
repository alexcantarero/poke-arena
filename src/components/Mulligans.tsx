"use client";

import { useState } from "react";
import { urlDeObjeto } from "@/lib/objetos";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   v0.76 — Los mulligans de un juego, para los dos jugadores.

   Misma familia visual que «Premios cogidos»: una caja con cabecera y, por
   jugador, su MANO — cartas con SU funda (el color del perfil). Cada mulligan
   añade una carta al abanico, que se baraja; «−» la quita. Debajo, lo que
   importa en la mesa: el rival puede robar una carta extra por cada mulligan.

   Lo que viaja en el formulario son los mismos campos de siempre
   (`g{i}_mulligans_a` / `_b`), así que guardar no cambia.
   ========================================================================= */

function Lado({ name, inicial, nombre, rival, color, disabled }: {
  name: string; inicial: number; nombre: string; rival: string; color?: string; disabled?: boolean;
}) {
  const lng = useLang(); // v0.49
  const [n, setN] = useState(Math.max(0, Math.min(10, inicial)));
  const [baraja, setBaraja] = useState(0);
  const cambia = (d: number) => {
    const v = Math.max(0, Math.min(10, n + d));
    if (v !== n) { setN(v); setBaraja((b) => b + 1); }
  };
  const visibles = Math.min(n, 5);
  return (
    <div className="mull-lado" style={{ "--funda": color ?? "var(--info)" } as React.CSSProperties}>
      <span className="mull-nombre" title={nombre}>{nombre}</span>
      <div className="mull-control">
        <button type="button" className="mull-btn" onClick={() => cambia(-1)} disabled={disabled || n === 0}
          aria-label={`− mulligan · ${nombre}`}>−</button>
        <span key={baraja} className="mull-mano" data-cero={n === 0} data-baraja={baraja > 0}
          aria-live="polite" aria-label={trf(lng, "mull.aria", { n, nombre })}>
          {n === 0
            ? <span className="mull-vacia">{tr(lng, "mull.ninguno")}</span>
            : Array.from({ length: visibles }, (_, i) => (
                <span key={i} className="mull-carta" style={{ "--i": i, "--total": visibles } as React.CSSProperties} />
              ))}
          {n > 0 && <span className="mull-num tabular">{n}</span>}
        </span>
        <button type="button" className="mull-btn" onClick={() => cambia(1)} disabled={disabled || n === 10}
          aria-label={`+ mulligan · ${nombre}`}>+</button>
      </div>
      <span className="mull-pista">{n > 0 ? trf(lng, "mull.pista", { n, rival }) : "\u00a0"}</span>
      <input type="hidden" name={name} value={n} />
    </div>
  );
}

export function Mulligans({ juego, nombreA, nombreB, inicialA = 0, inicialB = 0, colorA, colorB, disabled }: {
  juego: number; nombreA: string; nombreB: string; inicialA?: number; inicialB?: number;
  colorA?: string; colorB?: string; disabled?: boolean;
}) {
  const lng = useLang(); // v0.49
  return (
    <div className="mull-caja mt-2 rounded-xl border p-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urlDeObjeto("poke-ball")} alt="" aria-hidden="true" width={20} height={20} className="objeto-sprite size-5" />
        {tr(lng, "mull.titulo")}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Lado name={`g${juego}_mulligans_a`} inicial={inicialA} nombre={nombreA} rival={nombreB} color={colorA} disabled={disabled} />
        <Lado name={`g${juego}_mulligans_b`} inicial={inicialB} nombre={nombreB} rival={nombreA} color={colorB} disabled={disabled} />
      </div>
    </div>
  );
}
