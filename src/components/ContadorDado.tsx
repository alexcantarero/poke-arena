"use client";

import { useState } from "react";
import { urlDeObjeto } from "@/lib/objetos";

/* v0.62 — El contador de mulligans, con «−» y «+». De 0 a 10. Lo que viaja en
   el formulario es el campo oculto, como antes.

   v0.65 — el fondo ya no es un dado de rol: es una Poké Ball (el sprite de
   PokéAPI, no un dibujo) que se zarandea como en una captura cada vez que
   cambia, con el número en una chapa. Con 0 va apagada. */
export function ContadorDado({ name, defaultValue = 0, disabled, etiqueta }: {
  name: string; defaultValue?: number; disabled?: boolean; etiqueta: string;
}) {
  const [valor, setValor] = useState(defaultValue);
  const [tirada, setTirada] = useState(0);
  const cambia = (d: number) => {
    const n = Math.max(0, Math.min(10, valor + d));
    if (n !== valor) { setValor(n); setTirada((t) => t + 1); }
  };
  return (
    <div className="dado-contador">
      <button type="button" className="dado-btn" onClick={() => cambia(-1)} disabled={disabled || valor === 0}
        aria-label={`− mulligan · ${etiqueta}`}>−</button>
      {/* `key`: al cambiar, el dado se monta otra vez y la animación vuelve a empezar. */}
      <span key={tirada} className={`dado ${tirada ? "dado-tira" : ""}`} data-cero={valor === 0} aria-live="polite" aria-label={`${valor} mulligans · ${etiqueta}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urlDeObjeto("poke-ball")} alt="" aria-hidden="true" width={30} height={30} className="dado-ball"
          onError={(e) => { e.currentTarget.style.display = "none"; }} />
        <span className="dado-num tabular">{valor}</span>
      </span>
      <button type="button" className="dado-btn" onClick={() => cambia(1)} disabled={disabled || valor === 10}
        aria-label={`+ mulligan · ${etiqueta}`}>+</button>
      <input type="hidden" name={name} value={valor} />
    </div>
  );
}
