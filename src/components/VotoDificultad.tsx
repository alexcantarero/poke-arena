import type { CSSProperties } from "react";
import { votarDificultad } from "@/actions";
import { DIFICULTAD, NIVELES_DIFICULTAD, type ResumenDificultad } from "@/lib/dificultad";
import { ChipDificultad } from "@/components/ChipDificultad";
import { tr, type Lang } from "@/lib/i18n";

/* v0.139 — Votar la dificultad de un mazo: la media de todos y tus cinco
   botones (pulsar el tuyo otra vez lo quita). Sirve en la ficha del mazo, en
   «Comparar versiones» y en la biblioteca: cualquier cuenta puede votar
   cualquier mazo, sea suyo o no. */
export function VotoDificultad({ deckId, resumen, miVoto, back, lng, compacto = false }: {
  deckId: string; resumen: ResumenDificultad | undefined; miVoto: number | undefined; back: string; lng: Lang; compacto?: boolean;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${compacto ? "" : "mt-3"}`}>
      <ChipDificultad r={resumen} lng={lng} />
      <form action={votarDificultad} className="flex flex-wrap items-center gap-1">
        <input type="hidden" name="deckId" value={deckId} />
        <input type="hidden" name="back" value={back} />
        <span className="mr-1 text-xs text-muted">{tr(lng, "v137.tuVoto")}</span>
        {NIVELES_DIFICULTAD.map((n) => (
          <button key={n} type="submit" name="nivel" value={miVoto === n ? 0 : n}
            className="dif-voto" data-on={miVoto === n} style={{ "--dif": DIFICULTAD[n].color } as CSSProperties}
            title={tr(lng, DIFICULTAD[n].clave)} aria-label={tr(lng, DIFICULTAD[n].clave)} aria-pressed={miVoto === n}>
            {n}
          </button>
        ))}
      </form>
    </div>
  );
}
