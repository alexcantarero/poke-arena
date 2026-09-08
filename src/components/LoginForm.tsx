"use client";

import { useActionState } from "react";
import { login } from "@/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="email">Correo</label>
        <input
          className="input" id="email" name="email" type="email" required
          autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false}
          placeholder="tu@correo.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="password">Contraseña</label>
        <input
          className="input" id="password" name="password" type="password" required
          autoComplete="current-password"
        />
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-loss-soft px-3 py-2 text-sm font-medium text-loss">
          {state.error}
        </p>
      )}

      <button className="btn btn-brand w-full" type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
