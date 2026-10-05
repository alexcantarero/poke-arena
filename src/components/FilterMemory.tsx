"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/* =========================================================================
   v0.21 — Los filtros se quedan puestos.

   En Ranking, Estadísticas y Resultados, lo último que filtraste se guarda
   (en este navegador) y vuelve solo la próxima vez que entres a la pantalla
   sin filtros en la URL. Se borra únicamente con «Quitar filtros», que lleva
   `?limpiar=1`.

   La URL sigue siendo la fuente de verdad: esto solo la RELLENA al entrar.
   Así los enlaces compartidos siguen mandando y la vuelta atrás funciona.
   ========================================================================= */

const PANTALLAS = ["/ranking", "/estadisticas", "/resultados"];
/** Parámetros que no son filtros y no se recuerdan. */
const NO_GUARDAR = new Set(["limpiar", "flash", "n"]);
const clave = (path: string) => `arena-filtros:${path}`;

export function FilterMemory() {
  const path = usePathname() || "/";
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!PANTALLAS.includes(path)) return;
    try {
      if (params.get("limpiar") === "1") {
        localStorage.removeItem(clave(path));
        // Se conserva lo que no es filtro (p. ej. la pestaña de fuente).
        const resto = new URLSearchParams(params.toString());
        resto.delete("limpiar");
        const qs = resto.toString();
        router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
        return;
      }
      const filtros = new URLSearchParams();
      params.forEach((v, k) => { if (!NO_GUARDAR.has(k) && v) filtros.set(k, v); });
      const qs = filtros.toString();
      if (qs) {
        localStorage.setItem(clave(path), qs);
      } else {
        const guardado = localStorage.getItem(clave(path));
        if (guardado) router.replace(`${path}?${guardado}`, { scroll: false });
      }
    } catch {
      // Modo privado o almacenamiento bloqueado: sin memoria, sin más.
    }
  }, [path, params, router]);

  return null;
}

/** El enlace de «Quitar filtros» de una pantalla. */
export const limpiarHref = (path: string) => `${path}?limpiar=1`;
