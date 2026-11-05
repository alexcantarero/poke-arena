"use client";

import { useEffect } from "react";
import { leerVistos, nuevosDesde } from "@/lib/novedades";

/* =========================================================================
   v0.107 — Celebra medallas y títulos nuevos (ver `lib/novedades.ts`).

   Recibe lo que tienes AHORA (calculado en el servidor) y lo compara con lo
   que este navegador vio la última vez. Cada novedad lanza `arena:celebrar`;
   `LogroAviso` las pone en cola y las enseña una detrás de otra.
   ========================================================================= */
export type Novedad = { id: string; etiqueta: string; nombre: string; img: string | null };

export function CelebrarNuevos({ ambito, items }: { ambito: string; items: Novedad[] }) {
  useEffect(() => {
    const CLAVE = `arena:vistos:${ambito}`;
    try {
      const { nuevos, guardar } = nuevosDesde(leerVistos(localStorage.getItem(CLAVE)), items.map((i) => i.id));
      localStorage.setItem(CLAVE, JSON.stringify(guardar));
      if (!nuevos.length) return;
      const t = setTimeout(() => {
        for (const id of nuevos) {
          const n = items.find((i) => i.id === id);
          if (n) window.dispatchEvent(new CustomEvent("arena:celebrar", { detail: { etiqueta: n.etiqueta, nombre: n.nombre, img: n.img } }));
        }
      }, 700);
      return () => clearTimeout(t);
    } catch { /* sin almacenamiento: sin celebración */ }
  }, [ambito, items]);
  return null;
}
