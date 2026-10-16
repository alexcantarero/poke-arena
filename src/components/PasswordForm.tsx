"use client";

import { useActionState } from "react";
import { changePassword } from "@/actions";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

export function PasswordForm() {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="card flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">{tr(lng, "x.0d53f463")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="pw-current">{tr(lng, "x.7bb2ee60")}</label>
          <input className="input" id="pw-current" name="current" type="password" required autoComplete="current-password" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="pw-next">{tr(lng, "x.47a1ddc9")}</label>
          <input className="input" id="pw-next" name="next" type="password" required minLength={8} autoComplete="new-password" />
        </div>
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-loss-soft px-3 py-2 text-sm font-medium text-loss">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-win-soft px-3 py-2 text-sm font-medium text-win">{state.ok}</p>}
      <button className="btn btn-brand w-full sm:w-auto" type="submit" disabled={pending}>
        {pending ? "Guardando…" : tr(lng, "x.0d53f463")}
      </button>
    </form>
  );
}
