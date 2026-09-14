"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { syncArchetypes } from "@/actions";
import type { FormState } from "@/lib/types";
import { Icon } from "./icons";

/* =========================================================================
   Traer del metagame los mazos que falten, sin salir de la web.

   Existía ya como script (`npm run archetypes:sync`), pero para usarlo hace
   falta tener el proyecto abierto en un ordenador con Node, y en la práctica
   eso significa que no se hace nunca: el catálogo se quedaba viejo y faltaban
   arquetipos. Un botón en Ajustes lo arregla de verdad.

   Tarda: son varias llamadas a Limitless y otras tantas a PokéAPI para saber
   el color de cada Pokémon. Por eso el botón dice lo que está pasando en vez
   de quedarse quieto.
   ========================================================================= */

export function ArchetypeSync({ total }: { total: number }) {
  const [state, action] = useActionState<FormState, FormData>(syncArchetypes, null);

  return (
    <form action={action} className="card mb-6 flex flex-col gap-3 p-4">
      <div>
        <h3 className="font-bold">Catálogo de mazos</h3>
        <p className="mt-0.5 text-sm text-ink-2">
          Ahora mismo tenéis <b className="tabular">{total}</b> arquetipos. Esto mira los torneos
          recientes de Limitless, añade los que falten y pone el color a los que estén en
          incoloro. Nunca renombra lo que ya tenéis.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="sync-tournaments">Torneos a mirar</label>
          <input
            className="input tabular" id="sync-tournaments" name="tournaments"
            type="number" min={5} max={60} defaultValue={25} inputMode="numeric"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="sync-min">Mínimo de gente</label>
          <input
            className="input tabular" id="sync-min" name="minPlayers"
            type="number" min={0} max={5000} defaultValue={16} inputMode="numeric"
          />
        </div>
      </div>
      <p className="text-xs text-muted">
        Más torneos, más cola del metagame —también más rarezas—. El mínimo de gente quita el
        ruido de los torneos de cuatro personas.
      </p>

      <SyncButton />

      {state?.ok && <p className="text-sm font-semibold text-win">{state.ok}</p>}
      {state?.error && <p className="text-sm font-semibold text-loss">{state.error}</p>}
    </form>
  );
}

function SyncButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-brand w-full" type="submit" disabled={pending}>
      <Icon name="refresh" className="size-4" />
      {pending ? "Preguntando a Limitless…" : "Actualizar catálogo"}
    </button>
  );
}
