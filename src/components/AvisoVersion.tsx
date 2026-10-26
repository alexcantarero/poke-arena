"use client";

import { useCallback, useEffect, useState } from "react";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   v0.69 — «Hay una versión nueva».

   El porqué: las páginas siempre se piden a la red (ver `public/sw.js`), así
   que el problema no es la caché. Es que una app instalada en el móvil no se
   recarga al abrirla: el sistema la «despierta» con el código que ya tenía, y
   se puede quedar varias versiones por detrás hasta que alguien la cierra del
   todo. Al volver a la app (y al cargarla), se pregunta a `/api/version`; si
   el despliegue es otro, sale un aviso con «Actualizar», que recarga.

   Nunca rompe nada: sin red o con error, simplemente no avisa.
   ========================================================================= */

const MIO = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

export function AvisoVersion() {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const [nueva, setNueva] = useState<string | null>(null);

  const comprobar = useCallback(async () => {
    if (MIO === "dev" || document.visibilityState !== "visible") return;
    try {
      const r = await fetch("/api/version", { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { version?: string; build?: string };
      if (d.build && d.build !== "dev" && d.build !== MIO) setNueva(d.version ?? "");
    } catch { /* sin red: ya avisará otra vez */ }
  }, []);

  useEffect(() => {
    comprobar();
    const al = () => { if (document.visibilityState === "visible") comprobar(); };
    document.addEventListener("visibilitychange", al);
    window.addEventListener("focus", al);
    return () => { document.removeEventListener("visibilitychange", al); window.removeEventListener("focus", al); };
  }, [comprobar]);

  if (nueva == null) return null;
  return (
    <div className="aviso-version" role="status">
      <span className="min-w-0 flex-1 text-sm">
        <b>{tr(lng, "ver.nueva")}</b>{nueva ? ` · v${nueva}` : ""}
      </span>
      <button type="button" className="btn btn-brand btn-sm" onClick={() => {
        // Que el service worker baje también el suyo nuevo, y recargar.
        navigator.serviceWorker?.getRegistration?.().then((r) => r?.update()).catch(() => {}).finally(() => location.reload());
      }}>{tr(lng, "ver.actualizar")}</button>
      <button type="button" className="btn btn-ghost btn-sm" aria-label={tr(lng, "ver.luego")} onClick={() => setNueva(null)}>×</button>
    </div>
  );
}

/** Para «Más»: la versión de lo que estás viendo y un botón para forzar la recarga. */
export function VersionActual() {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const [estado, setEstado] = useState<"idle" | "mirando" | "aldia">("idle");
  const env = process.env.NEXT_PUBLIC_DEPLOY_ENV;
  const mirar = async () => {
    setEstado("mirando");
    try {
      const r = await fetch("/api/version", { cache: "no-store" });
      const d = (await r.json()) as { build?: string };
      if (d.build && d.build !== MIO) { await navigator.serviceWorker?.getRegistration?.().then((x) => x?.update()).catch(() => {}); location.reload(); return; }
      setEstado("aldia");
    } catch { setEstado("idle"); }
  };
  return (
    <div className="card flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">PokeArena v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
        <span className={`block text-xs ${env === "preview" ? "text-brand" : "text-muted"}`}>
          {env === "preview" ? `${tr(lng, "ver.preview")} · ${process.env.NEXT_PUBLIC_GIT_REF}` : env === "production" ? tr(lng, "ver.produccion") : env}
          {estado === "aldia" ? ` · ${tr(lng, "ver.alDia")}` : ""}
        </span>
      </span>
      <button type="button" className="btn btn-sm" onClick={mirar} disabled={estado === "mirando"}>
        {estado === "mirando" ? tr(lng, "ver.mirando") : tr(lng, "ver.comprobar")}
      </button>
    </div>
  );
}
