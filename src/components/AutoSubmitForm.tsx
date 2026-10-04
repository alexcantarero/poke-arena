"use client";

import type { ReactNode } from "react";

/**
 * v0.19 — Formulario GET que se envía solo al cambiar un desplegable o una
 * fecha. Sin JavaScript sigue funcionando con el botón «Aplicar» (va dentro
 * de <noscript>). Los filtros siguen yendo por URL.
 */
export function AutoSubmitForm({
  action, children, className = "",
}: { action: string; children: ReactNode; className?: string }) {
  return (
    <form
      method="get"
      action={action}
      className={className}
      onChange={(e) => {
        const f = e.currentTarget;
        // Los vacíos fuera de la URL: `?tipo=&fecha=` es ruido.
        for (const el of Array.from(f.elements) as HTMLInputElement[]) {
          if (el.name && !el.value) el.disabled = true;
        }
        f.requestSubmit();
      }}
    >
      {children}
      <noscript>
        <button className="btn btn-brand btn-sm" type="submit">Aplicar</button>
      </noscript>
    </form>
  );
}
