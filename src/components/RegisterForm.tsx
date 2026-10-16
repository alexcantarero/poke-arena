"use client";

import { useActionState, useState } from "react";
import { register } from "@/actions";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

export function RegisterForm({
  token, askForToken = false,
}: {
  token: string;
  /** true en `/registro`, donde el código se escribe a mano. */
  askForToken?: boolean;
}) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const [state, action, pending] = useActionState(register, null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState(token);

  // Se acepta el enlace entero pegado y se queda con la última parte: nadie va
  // a mirar dónde acaba la URL y dónde empieza el código.
  const cleanCode = code.trim().replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop() ?? "";

  // Aviso en vivo: es mucho menos frustrante que descubrirlo al enviar.
  const short = password.length > 0 && password.length < 8;
  const noDigit = password.length >= 8 && !(/[a-zA-Z]/.test(password) && /[0-9]/.test(password));

  return (
    <form action={action} className="flex flex-col gap-4">
      {askForToken ? (
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="code">{tr(lng, "x.f0ea57e1")}</label>
          <input
            className="input font-mono text-sm" id="code" required
            autoComplete="off" autoCapitalize="none" spellCheck={false}
            value={code} onChange={(e) => setCode(e.target.value)}
            placeholder={tr(lng, "x.578da78c")}
          />
        </div>
      ) : null}
      <input type="hidden" name="token" value={askForToken ? cleanCode : token} />

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="name">{tr(lng, "x.ae4670b4")}</label>
        <input
          className="input" id="name" name="name" required maxLength={40}
          autoComplete="nickname" placeholder={tr(lng, "x.fbfe9a85")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="email">{tr(lng, "x.98f00c3e")}</label>
        <input
          className="input" id="email" name="email" type="email" required
          autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false}
          placeholder={tr(lng, "x.771f5db9")}
        />
        <p className="text-xs text-muted">{tr(lng, "x.780c2ecd")}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="password">{tr(lng, "x.5a6d1c61")}</label>
        <input
          className="input" id="password" name="password" type="password" required
          autoComplete="new-password" minLength={8}
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        <p className={`text-xs ${short || noDigit ? "text-loss" : "text-muted"}`}>
          {short ? tr(lng, "x.1bfd8485")
            : noDigit ? tr(lng, "x.7d17004f")
            : tr(lng, "x.89a8078d")}
        </p>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-loss-soft px-3 py-2 text-sm font-medium text-loss">
          {state.error}
        </p>
      )}

      <button className="btn btn-brand w-full" type="submit" disabled={pending}>
        {pending ? "Creando la cuenta…" : tr(lng, "x.0ee455c3")}
      </button>
    </form>
  );
}
