"use client";

import { useActionState } from "react";
import { changePassword } from "@/actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="card flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">Cambiar contraseña</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="pw-current">Actual</label>
          <input className="input" id="pw-current" name="current" type="password" required autoComplete="current-password" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="pw-next">Nueva</label>
          <input className="input" id="pw-next" name="next" type="password" required minLength={8} autoComplete="new-password" />
        </div>
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-loss-soft px-3 py-2 text-sm font-medium text-loss">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-win-soft px-3 py-2 text-sm font-medium text-win">{state.ok}</p>}
      <button className="btn btn-brand w-full sm:w-auto" type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
