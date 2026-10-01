"use client";

import type { ReactNode } from "react";

/**
 * v0.16 — Botón de envío que pregunta antes. Para borrar cosas desde un
 * componente de servidor sin convertir la ficha entera en cliente: el
 * formulario y la Server Action siguen siendo del servidor, y esto solo
 * pone el `confirm()` delante.
 */
export function ConfirmButton({
  children, message, className = "btn btn-ghost btn-sm btn-danger", title,
}: {
  children: ReactNode;
  message: string;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      title={title}
      onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}
    >
      {children}
    </button>
  );
}
