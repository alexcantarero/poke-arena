"use client";

import { useActionState, useState } from "react";
import { register } from "@/actions";

export function RegisterForm({
  token, askForToken = false,
}: {
  token: string;
  /** true en `/registro`, donde el código se escribe a mano. */
  askForToken?: boolean;
}) {
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
          <label className="label" htmlFor="code">Código de invitación</label>
          <input
            className="input font-mono text-sm" id="code" required
            autoComplete="off" autoCapitalize="none" spellCheck={false}
            value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="Pega aquí el código o el enlace entero"
          />
        </div>
      ) : null}
      <input type="hidden" name="token" value={askForToken ? cleanCode : token} />

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="name">Cómo te llamamos</label>
        <input
          className="input" id="name" name="name" required maxLength={40}
          autoComplete="nickname" placeholder="Ibai"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="email">Correo</label>
        <input
          className="input" id="email" name="email" type="email" required
          autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false}
          placeholder="tu@correo.com"
        />
        <p className="text-xs text-muted">Solo se usa para entrar. No se enseña a nadie más.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="password">Contraseña</label>
        <input
          className="input" id="password" name="password" type="password" required
          autoComplete="new-password" minLength={8}
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        <p className={`text-xs ${short || noDigit ? "text-loss" : "text-muted"}`}>
          {short ? "Al menos 8 caracteres."
            : noDigit ? "Mezcla al menos una letra y un número."
            : "Al menos 8 caracteres, con letras y números."}
        </p>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-loss-soft px-3 py-2 text-sm font-medium text-loss">
          {state.error}
        </p>
      )}

      <button className="btn btn-brand w-full" type="submit" disabled={pending}>
        {pending ? "Creando la cuenta…" : "Unirme a la liga"}
      </button>
    </form>
  );
}
