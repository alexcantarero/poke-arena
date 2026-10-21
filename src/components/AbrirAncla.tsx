"use client";

import { useEffect } from "react";

/* v0.55 — al llegar a una sección de Ajustes por su enlace (#liga), se abre.
   Los grupos son <details> cerrados: sin esto, el menú te llevaba a un
   desplegable cerrado y había que tocarlo otra vez. */
export function AbrirAncla() {
  useEffect(() => {
    const abrir = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (el instanceof HTMLDetailsElement) el.open = true;
    };
    abrir();
    window.addEventListener("hashchange", abrir);
    return () => window.removeEventListener("hashchange", abrir);
  }, []);
  return null;
}
