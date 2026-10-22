"use client";

import { useState } from "react";

/* v0.62 — El contador de mulligans, como un dado de veinte caras de D&D. El
   número cambia con «−» y «+», y cada cambio TIRA el dado (gira y rebota). De
   0 a 10. Lo que viaja en el formulario es el campo oculto, como antes. */
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
        <svg viewBox="0 0 40 40" aria-hidden="true" className="dado-svg">
          <polygon points="20,2 37,11 37,29 20,38 3,29 3,11" />
          <polygon points="20,10 30,27 10,27" className="dado-cara" />
          <path d="M20 2 20 10 M37 11 30 27 M3 11 10 27 M37 29 30 27 M3 29 10 27 M20 38 20 27" />
        </svg>
        <span className="dado-num tabular">{valor}</span>
      </span>
      <button type="button" className="dado-btn" onClick={() => cambia(1)} disabled={disabled || valor === 10}
        aria-label={`+ mulligan · ${etiqueta}`}>+</button>
      <input type="hidden" name={name} value={valor} />
    </div>
  );
}
