"use client";

import { useState } from "react";

/* =========================================================================
   La salida de emergencia — v0.35.

   Existe porque el fallo clásico de un service worker es servir una versión
   vieja de la app, y el síntoma es «a mí me va bien y a ti no». Cuando pasa,
   desde un móvil ajeno no hay forma cómoda de entrar en las herramientas del
   navegador. Esto es un botón.

   Da de baja el worker, borra sus cachés y recarga. La app sigue funcionando
   exactamente igual sin él; lo único que se pierde es la página de aviso
   cuando no hay cobertura.
   ========================================================================= */

export function ServiceWorkerOff() {
  const [estado, setEstado] = useState<"quieto" | "yendo" | "hecho" | "nada">("quieto");

  const desactivar = async () => {
    setEstado("yendo");
    try {
      if (!("serviceWorker" in navigator)) return setEstado("nada");
      const regs = await navigator.serviceWorker.getRegistrations();
      if (!regs.length) return setEstado("nada");

      // El propio worker borra sus cachés al recibir el mensaje; aquí se
      // fuerza la baja por si estuviera parado y no llegara a escucharlo.
      regs.forEach((r) => r.active?.postMessage("desactivar"));
      await Promise.all(regs.map((r) => r.unregister()));
      if ("caches" in window) {
        const nombres = await caches.keys();
        await Promise.all(
          nombres.filter((n) => n.startsWith("pokearena-")).map((n) => caches.delete(n)),
        );
      }
      setEstado("hecho");
      setTimeout(() => location.reload(), 600);
    } catch {
      setEstado("nada");
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <button type="button" className="btn w-fit" onClick={desactivar} disabled={estado === "yendo"}>
        {estado === "yendo" ? "Desactivando…" : "Desactivar modo sin conexión"}
      </button>
      <p className="text-xs text-muted">
        {estado === "hecho" && "Desactivado. Recargando…"}
        {estado === "nada" && "No había nada que desactivar."}
        {(estado === "quieto" || estado === "yendo") &&
          "Úsalo si la app se queda enseñando una versión antigua después de un despliegue. Se puede volver a activar recargando."}
      </p>
    </div>
  );
}
