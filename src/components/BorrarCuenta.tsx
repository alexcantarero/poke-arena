"use client";

import { useActionState } from "react";
import { borrarMiCuenta } from "@/actions";
import type { FormState } from "@/lib/types";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* v0.134 — Borrar mi cuenta: contraseña + escribir el nombre. Lo que pasa
   (anonimizar, no borrar las partidas) se dice ANTES de pulsar. */
export function BorrarCuenta({ nombre }: { nombre: string }) {
  const lng = useLang();
  const [estado, accion, enviando] = useActionState<FormState, FormData>(borrarMiCuenta, null);
  return (
    <details className="card border-loss/40">
      <summary className="tap cursor-pointer justify-start px-4 text-sm font-semibold text-loss">{tr(lng, "v134.borrar")}</summary>
      <form action={accion} className="flex flex-col gap-3 border-t border-line-soft p-4">
        <p className="text-sm text-ink-2">{tr(lng, "v134.borrarExplica")}</p>
        <label className="flex flex-col gap-1.5">
          <span className="label">{tr(lng, "v134.tuContrasena")}</span>
          <input className="input" type="password" name="password" required autoComplete="current-password" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">{trf(lng, "v134.escribeNombre", { n: nombre })}</span>
          <input className="input" name="confirm" required autoComplete="off" />
        </label>
        {estado?.error && <p role="alert" className="text-sm font-semibold text-loss">{estado.error}</p>}
        <button className="btn w-full border-loss/50 text-loss sm:w-fit" type="submit" disabled={enviando}>
          {tr(lng, enviando ? "v134.borrando" : "v134.borrarDefinitivo")}
        </button>
      </form>
    </details>
  );
}
