"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

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
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

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
      <span className="label">{tr(lng, "x.a45e7802")}</span>
      <div className="seg w-full sm:w-auto" role="radiogroup" aria-label={tr(lng, "x.a45e7802")}>
        {OPCIONES.map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={modo === o.v}
            data-on={modo === o.v} onClick={() => elegir(o.v)}>
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        {modo === "auto" && sistemaReduce
          ? tr(lng, "x.23d3fdef")
          : modo === "auto"
            ? tr(lng, "x.30f1ea0e")
            : modo === "on" ? "Siempre activadas en este navegador." : tr(lng, "x.fd743455")}
      </p>
    </div>
  );
}
