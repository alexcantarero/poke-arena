"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * v0.19 - Formulario GET que se envía solo al cambiar un desplegable o una
 * fecha. Sin JavaScript sigue funcionando con el botón "Aplicar" (va dentro
 * de <noscript>). Los filtros siguen yendo por URL.
 */
export function AutoSubmitForm({
  action, children, className = "",
}: { action: string; children: ReactNode; className?: string }) {
  const router = useRouter();

  return (
    <form
      method="get"
      action={action}
      className={className}
      onChange={(e) => {
        const f = e.currentTarget;
        const data = new FormData(f);
        const sp = new URLSearchParams();
        data.forEach((value, key) => {
          if (typeof value === "string" && value.trim() !== "") {
            sp.append(key, value);
          }
        });
        const qs = sp.toString();
        router.push(qs ? `${action}?${qs}` : action, { scroll: false });
      }}
      onSubmit={(e) => {
        // En caso de que se envíe con Enter en un input de fecha, por ejemplo.
        e.preventDefault();
        const f = e.currentTarget;
        const data = new FormData(f);
        const sp = new URLSearchParams();
        data.forEach((value, key) => {
          if (typeof value === "string" && value.trim() !== "") {
            sp.append(key, value);
          }
        });
        const qs = sp.toString();
        router.push(qs ? `${action}?${qs}` : action, { scroll: false });
      }}
    >
      {children}
      <noscript>
        <button className="btn btn-brand btn-sm" type="submit">Aplicar</button>
      </noscript>
    </form>
  );
}
