"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* v0.90 — Compartir el resumen del torneo. En el móvil, el menú de compartir
   del sistema con la IMAGEN (WhatsApp incluido); si no se puede, se abre
   WhatsApp con el texto. */
export function CompartirResumen({ url, texto, nombreFichero }: { url: string; texto: string; nombreFichero: string }) {
  const lng = useLang(); // v0.49
  const [estado, setEstado] = useState<"" | "cargando" | "error">("");
  const compartir = async () => {
    setEstado("cargando");
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const f = new File([await r.blob()], nombreFichero, { type: "image/png" });
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], text: texto });
        setEstado("");
        return;
      }
      throw new Error("sin share");
    } catch (e) {
      if ((e as Error)?.name === "AbortError") { setEstado(""); return; }
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
      setEstado("");
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn btn-brand" onClick={compartir} disabled={estado === "cargando"}>
        {estado === "cargando" ? tr(lng, "v90.preparando") : tr(lng, "v90.compartir")}
      </button>
      <a className="btn" href={url} target="_blank" rel="noopener noreferrer">{tr(lng, "v90.verImagen")}</a>
    </div>
  );
}
