"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { syncArchetypes } from "@/actions";
import type { FormState } from "@/lib/types";
import { Icon } from "./icons";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

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
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const [state, action] = useActionState<FormState, FormData>(syncArchetypes, null);

  return (
    <form action={action} className="card mb-6 flex flex-col gap-3 p-4">
      <div>
        <h3 className="font-bold">{tr(lng, "x.ab58585e")}</h3>
        <p className="mt-0.5 text-sm text-ink-2">
          {tr(lng, "x.938cab5f")} <b className="tabular">{total}</b> {tr(lng, "x.55f073e9")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="sync-tournaments">{tr(lng, "x.f21ae80f")}</label>
          <input
            className="input tabular" id="sync-tournaments" name="tournaments"
            type="number" min={5} max={60} defaultValue={25} inputMode="numeric"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="sync-min">{tr(lng, "x.776df7e6")}</label>
          <input
            className="input tabular" id="sync-min" name="minPlayers"
            type="number" min={0} max={5000} defaultValue={16} inputMode="numeric"
          />
        </div>
      </div>
      <p className="text-xs text-muted">
        {tr(lng, "x.a55d1c50")}
      </p>

      <SyncButton />

      {state?.ok && <p className="text-sm font-semibold text-win">{state.ok}</p>}
      {state?.error && <p className="text-sm font-semibold text-loss">{state.error}</p>}
    </form>
  );
}

function SyncButton() {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const { pending } = useFormStatus();
  return (
    <button className="btn btn-brand w-full" type="submit" disabled={pending}>
      <Icon name="refresh" className="size-4" />
      {pending ? "Preguntando a Limitless…" : tr(lng, "x.ae1eebf4")}
    </button>
  );
}
