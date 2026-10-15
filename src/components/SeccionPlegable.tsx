"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";

/* =========================================================================
   Una sección de tarjeta que se pliega, y se acuerda.

   v0.38. El perfil se había quedado en una columna larguísima donde cada
   uno mira dos cosas y hace scroll por encima de las otras seis. Plegar lo
   resuelve, pero solo si se acuerda: un plegable que vuelve a abrirse en
   cada visita es un clic más, no una mejora.

   Por qué `useState` + `useEffect` y no `<details>` a secas: con `<details
   open>` el servidor tendría que saber qué dejó cerrado cada uno, y no lo
   sabe. Pintar siempre abierto y cerrar después del montaje evita el
   desajuste de hidratación, a cambio de un parpadeo en las que estén
   cerradas. Es el mismo patrón de `CaminoAlCorte`.

   La cabecera es un `<button>` de verdad: se llega con el tabulador, se
   abre con Enter y el lector de pantalla dice si está abierta o cerrada.
   ========================================================================= */

export function SeccionPlegable({
  titulo,
  nota,
  clave,
  abiertaPorDefecto = true,
  children,
}: {
  titulo: string;
  /** Lo que va a la derecha del título: «mín. 5 partidas», un recuento… */
  nota?: ReactNode;
  /** Identificador para recordar el estado. Único por sección. */
  clave: string;
  abiertaPorDefecto?: boolean;
  children: ReactNode;
}) {
  const [abierta, setAbierta] = useState(abiertaPorDefecto);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(`arena:seccion:${clave}`);
      if (v != null) setAbierta(v === "1");
    } catch {
      /* Navegador con el almacenamiento capado: se queda como estaba. */
    }
  }, [clave]);

  const alternar = () => {
    const v = !abierta;
    setAbierta(v);
    try {
      window.localStorage.setItem(`arena:seccion:${clave}`, v ? "1" : "0");
    } catch {
      /* Si no se puede guardar, al menos se ha plegado en esta visita. */
    }
  };

  return (
    <section className="card">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={abierta}
        className="card-head tap w-full cursor-pointer text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon
            name="chevron"
            className={`size-4 flex-none text-muted transition-transform ${abierta ? "" : "-rotate-90"}`}
          />
          <span className="truncate text-lg font-bold">{titulo}</span>
        </span>
        {nota ? <span className="flex-none text-xs text-muted">{nota}</span> : null}
      </button>
      {abierta ? children : null}
    </section>
  );
}
