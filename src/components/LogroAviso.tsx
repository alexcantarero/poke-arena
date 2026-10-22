"use client";

import { useEffect, useState } from "react";
import { LOGROS } from "@/lib/logros";
import { spriteUrl } from "@/lib/pokemon";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* v0.65 — El aviso de «logro desbloqueado»: abajo, unos segundos, con el
   Pokémon del logro. Solo sale la PRIMERA vez que se encuentra cada uno. */
export function LogroAviso() {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const [clave, setClave] = useState<string | null>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const al = (e: Event) => {
      setClave((e as CustomEvent<string>).detail);
      if (t) clearTimeout(t);
      t = setTimeout(() => setClave(null), 4200);
    };
    window.addEventListener("arena:logro", al);
    return () => { window.removeEventListener("arena:logro", al); if (t) clearTimeout(t); };
  }, []);

  const logro = LOGROS.find((l) => l.clave === clave);
  if (!logro) return null;
  return (
    <div className="logro-aviso" role="status">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={spriteUrl(logro.pokemon)} alt="" className="logro-aviso-img" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-brand">{tr(lng, "logro.desbloqueado")}</span>
        <span className="block truncate font-display text-base font-extrabold">{tr(lng, `logro.${logro.clave}.nombre`)}</span>
      </span>
    </div>
  );
}
