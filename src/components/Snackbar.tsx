"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FLASH_PARAM, parseFlash } from "@/lib/flash";
import { Icon } from "./icons";

/* =========================================================================
   Snackbar de feedback: "torneo creado correctamente", "no se ha podido
   guardar", etc.

   Vive de un parámetro en la URL (`?flash=tipo:mensaje`) porque el mensaje
   lo deja una Server Action justo antes de hacer `redirect()`, y en ese
   momento no hay ningún otro sitio donde dejarlo — ver `src/lib/flash.ts`.

   Debe montarse dentro de un `<Suspense>`: `useSearchParams` obliga a ello
   fuera de una ruta ya dinámica, o Next se queja en el build. En el layout:

     import { Suspense } from "react";
     import { Snackbar } from "@/components/Snackbar";
     ...
     <Suspense fallback={null}><Snackbar /></Suspense>
   ========================================================================= */

export function Snackbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get(FLASH_PARAM);
  const flash = parseFlash(raw);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!raw) return;
    setVisible(true);

    // Se quita de la URL enseguida: si no, recargar la página o volver atrás
    // con el navegador enseña otra vez el mismo aviso.
    const params = new URLSearchParams(searchParams);
    params.delete(FLASH_PARAM);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });

    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
    // Solo cuando cambia el mensaje en sí: `searchParams`/`router` cambian de
    // identidad en cada navegación y reiniciarían el timer sin necesidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  if (!flash || !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-md items-start gap-2.5 rounded-xl
        border p-3 shadow-lg md:inset-x-auto md:bottom-5 md:right-5
        ${flash.kind === "error" ? "border-loss/40 bg-loss-soft" : "border-win/40 bg-win-soft"}`}
    >
      <Icon
        name={flash.kind === "error" ? "alert" : "check"}
        className={`mt-0.5 size-4 flex-none ${flash.kind === "error" ? "text-loss" : "text-win"}`}
      />
      <p className="min-w-0 flex-1 text-sm font-medium text-ink">{flash.message}</p>
      <button
        type="button"
        aria-label="Cerrar aviso"
        className="flex-none text-muted hover:text-ink"
        onClick={() => setVisible(false)}
      >
        <Icon name="close" className="size-4" />
      </button>
    </div>
  );
}
