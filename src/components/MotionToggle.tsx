"use client";

import { useEffect, useState } from "react";

/* =========================================================================
   v0.22 — Ajuste «Animaciones»: Automático (lo que diga el móvil), Sí o No.

   Por qué hacía falta: muchos Android traen «Quitar animaciones» o el ahorro
   de batería activados, y eso le dice al navegador «reducir movimiento». La
   app lo respetaba y apagaba TODO, así que en esos móviles las animaciones
   no se veían nunca. Con «Sí» se fuerzan; con «No» se apagan siempre.

   Se guarda en este navegador (`arena-motion`) y lo aplica el script del
   layout raíz antes de pintar, como el tema: sin parpadeo.
   ========================================================================= */

type Modo = "auto" | "on" | "off";
const OPCIONES: Array<{ v: Modo; label: string }> = [
  { v: "auto", label: "Automático" },
  { v: "on", label: "Sí" },
  { v: "off", label: "No" },
];

export function MotionToggle() {
  const [modo, setModo] = useState<Modo>("auto");
  const [sistemaReduce, setSistemaReduce] = useState(false);

  useEffect(() => {
    try {
      const g = localStorage.getItem("arena-motion");
      if (g === "on" || g === "off") setModo(g);
      setSistemaReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch { /* sin almacenamiento: se queda en automático */ }
  }, []);

  const elegir = (v: Modo) => {
    setModo(v);
    try {
      if (v === "auto") localStorage.removeItem("arena-motion");
      else localStorage.setItem("arena-motion", v);
    } catch { /* nada */ }
    document.documentElement.dataset.motion = v;
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="label">Animaciones</span>
      <div className="seg w-full sm:w-auto" role="radiogroup" aria-label="Animaciones">
        {OPCIONES.map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={modo === o.v}
            data-on={modo === o.v} onClick={() => elegir(o.v)}>
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        {modo === "auto" && sistemaReduce
          ? "Tu móvil tiene «reducir movimiento» activado, así que ahora mismo están apagadas. Pulsa «Sí» para verlas."
          : modo === "auto"
            ? "Sigue el ajuste de tu móvil. Incluye las partículas de temporada del fondo."
            : modo === "on" ? "Siempre activadas en este navegador." : "Siempre apagadas en este navegador."}
      </p>
    </div>
  );
}
