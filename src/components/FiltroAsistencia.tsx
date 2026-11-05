"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Opcion = { value: string; label: string; href: string };

export function FiltroAsistencia({
  etiqueta, valor, opciones, ayuda,
}: {
  etiqueta: string;
  valor: string;
  opciones: Opcion[];
  ayuda: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <label className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="label">{etiqueta}</span>
        <select
          className="input min-h-10 min-w-56 py-1.5 text-sm"
          value={valor}
          aria-busy={pendiente}
          onChange={(event) => {
            const opcion = opciones.find((x) => x.value === event.target.value);
            if (opcion) startTransition(() => router.push(opcion.href, { scroll: false }));
          }}
        >
          {opciones.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
          ))}
        </select>
      </label>
      <span className="text-[11px] text-muted">{ayuda}</span>
    </div>
  );
}
