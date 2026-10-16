"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/icons";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   Cuando una pantalla revienta.

   Sin este fichero, Next enseña su propia pantalla de error: fondo negro,
   tipografía de sistema y un texto en inglés. Funciona, pero parece que se ha
   caído otra web distinta.

   Tiene que ser un componente de cliente —lo exige el contrato de Next— y
   recibe dos cosas: el error y un `reset` que vuelve a intentar renderizar
   solo esta parte del árbol, sin recargar la página entera. Que el botón de
   "reintentar" sea de verdad importa: casi todos los errores de aquí son la
   base de datos despertándose o una llamada que ha tardado demasiado, y a la
   segunda va.

   Lo que NO se enseña: el mensaje del error. En producción Next ya lo esconde
   y solo deja un `digest`, y está bien que sea así — un mensaje de una
   consulta puede llevar dentro nombres de tabla o trozos de la cadena de
   conexión. Se enseña el digest, que es lo que sirve para buscarlo en los
   registros de Vercel, y nada más.
   ========================================================================= */

export default function Error({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  useEffect(() => {
    // Al menos queda en la consola del navegador y en los registros del
    // servidor. No se manda a ningún sitio: la liga no tiene servicio de
    // errores y montar uno para cinco personas es pasarse.
    console.error("[arena]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-loss/40 bg-loss-soft text-loss">
        <Icon name="alert" className="size-7" />
      </span>

      <h1 className="text-2xl font-extrabold">{tr(lng, "x.142581f0")}</h1>
      <p className="text-sm text-muted">
        {tr(lng, "x.2fab2257")}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button className="btn btn-brand" type="button" onClick={reset}>
          <Icon name="refresh" className="size-4" /> {tr(lng, "x.adec7b4f")}
        </button>
        <Link className="btn" href="/">{tr(lng, "x.099af5f0")}</Link>
      </div>

      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-muted">
          referencia {error.digest}
        </p>
      )}
    </div>
  );
}
