"use client";

import { useEffect } from "react";
import { NIVELES_BALL } from "@/lib/logros";

/* =========================================================================
   v0.106 — ¡Has subido de Poké Ball! Lanza la celebración de `LogroAviso`.

   La Ball se calcula en el servidor; aquí solo se compara con la última que
   vio ESTE navegador (`localStorage`). La primera vez solo se guarda: si no,
   todo el mundo vería fuegos artificiales al abrir la versión nueva.
   ========================================================================= */
export function CelebrarBall({ ball, nombre, etiqueta, img }: { ball: string; nombre: string; etiqueta: string; img: string }) {
  useEffect(() => {
    const CLAVE = "arena:ball-vista";
    try {
      const antes = localStorage.getItem(CLAVE);
      localStorage.setItem(CLAVE, ball);
      if (!antes || antes === ball) return;
      const i = NIVELES_BALL.findIndex((n) => n.ball === ball);
      const j = NIVELES_BALL.findIndex((n) => n.ball === antes);
      if (i > j && j >= 0) {
        // Un respiro para que la página termine de pintarse antes de la fiesta.
        const t = setTimeout(() => window.dispatchEvent(new CustomEvent("arena:celebrar", { detail: { etiqueta, nombre, img } })), 600);
        return () => clearTimeout(t);
      }
    } catch { /* sin almacenamiento: sin celebración, nada se rompe */ }
  }, [ball, nombre, etiqueta, img]);
  return null;
}
