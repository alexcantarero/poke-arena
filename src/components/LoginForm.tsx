"use client";

import { useActionState } from "react";
import { login } from "@/actions";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

export function LoginForm() {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const [state, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="email">{tr(lng, "x.98f00c3e")}</label>
        <input
          className="input" id="email" name="email" type="email" required
          autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false}
          placeholder={tr(lng, "x.771f5db9")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="password">{tr(lng, "x.5a6d1c61")}</label>
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
        {pending ? "Entrando…" : tr(lng, "x.7573ba85")}
      </button>
    </form>
  );
}
