"use client";

import { useEffect } from "react";

/* =========================================================================
   Registro del service worker — v0.35.

   Lo único que hace es registrarlo, y con dos cautelas:

   · **Solo en producción.** En `npm run dev` un service worker en medio
     confunde el recargado en caliente y hace perder tardes enteras.
   · **Después de cargar la página.** Registrarlo durante la carga compite
     por el ancho de banda con lo que el usuario está esperando ver.

   El worker en sí está en `public/sw.js` y no guarda ni una página HTML: ver
   la cabecera de ese fichero.
   ========================================================================= */

export function ServiceWorker({ buildId }: { buildId: string }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const registrar = () => {
      navigator.serviceWorker
        .register(`/sw.js?v=${encodeURIComponent(buildId)}`)
        .catch(() => {
          /* Que falle el registro no puede romper nada: la app funciona
             igual sin él. Silencio deliberado. */
        });
    };

    if (document.readyState === "complete") registrar();
    else {
      window.addEventListener("load", registrar, { once: true });
      return () => window.removeEventListener("load", registrar);
    }
  }, [buildId]);

  return null;
}
