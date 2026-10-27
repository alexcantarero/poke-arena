"use client";

import { useRef, useState } from "react";
import { Icon } from "./icons";
import { spriteUrl } from "@/lib/pokemon";
import { registrarClic } from "@/lib/rafaga";
import { ganarLogro } from "@/components/logroCliente";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   v0.72 — La rueda de Ajustes, arriba a la izquierda, con la versión.

   Cada toque la hace girar. Y un secreto: si se machaca, los engranajes
   resultan ser Pokémon — Klink, Klang y Klinklang, uno detrás de otro — y se
   gana el logro «Engranaje perfecto». Sprites de la app, no dibujados.
   ========================================================================= */

const ENGRANAJES = ["klink", "klang", "klinklang"];

export function RuedaAjustes({ version }: { version: string }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const [giro, setGiro] = useState(0);
  const [secreto, setSecreto] = useState(0);
  const historial = useRef<number[]>([]);

  const tocar = () => {
    setGiro((g) => g + 1);
    const r = registrarClic(historial.current, Date.now());
    historial.current = r.historial;
    if (r.rafaga) {
      setSecreto((s) => s + 1);
      ganarLogro("klinklang");
      setTimeout(() => setSecreto(0), 2600);
    }
  };

  return (
    <span className="relative flex flex-col items-center gap-1">
      <button type="button" onClick={tocar} aria-label={tr(lng, "rueda.aria")} title={`v${version}`}
        className="rueda-ajustes grid size-12 place-items-center rounded-2xl border border-line bg-surface-2 text-brand">
        <Icon name="cog" className="size-8" style={{ transform: `rotate(${giro * 72}deg)` }} />
      </button>
      <span className="font-mono text-[10px] font-semibold text-muted tabular">v{version}</span>
      {secreto > 0 && (
        <span key={secreto} className="rueda-secreto" aria-hidden="true">
          {ENGRANAJES.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p} src={spriteUrl(p)} alt="" style={{ animationDelay: `${i * 0.35}s` }}
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ))}
        </span>
      )}
    </span>
  );
}
