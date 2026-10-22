"use client";

import { useActionState, useState } from "react";
import { restablecerContrasena } from "@/actions";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* v0.67 — Contraseña nueva, dos veces. Los avisos en vivo son los mismos que
   en el alta: más vale verlo antes de enviar. Al guardar, entras. */
export function RecuperarForm({ token }: { token: string }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const [state, action, pending] = useActionState(restablecerContrasena, null);
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const corta = next.length > 0 && next.length < 8;
  const sinMezcla = next.length >= 8 && !(/[a-zA-Z]/.test(next) && /[0-9]/.test(next));
  const distinta = repeat.length > 0 && repeat !== next;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="next">{tr(lng, "rec.nueva")}</label>
        <input className="input" id="next" name="next" type="password" required autoComplete="new-password"
          value={next} onChange={(e) => setNext(e.target.value)} />
        {(corta || sinMezcla) && <p className="text-xs text-loss">{tr(lng, corta ? "rec.corta" : "rec.mezcla")}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="repeat">{tr(lng, "rec.repite")}</label>
        <input className="input" id="repeat" name="repeat" type="password" required autoComplete="new-password"
          value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        {distinta && <p className="text-xs text-loss">{tr(lng, "rec.errNoCoinciden")}</p>}
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-loss-soft px-3 py-2 text-sm font-medium text-loss">{state.error}</p>
      )}
      <button className="btn btn-brand w-full" type="submit" disabled={pending || corta || sinMezcla || distinta}>
        {pending ? tr(lng, "rec.guardando") : tr(lng, "rec.guardar")}
      </button>
      <p className="text-xs text-muted">{tr(lng, "rec.nota")}</p>
    </form>
  );
}
