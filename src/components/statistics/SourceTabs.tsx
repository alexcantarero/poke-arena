import Link from "next/link";
import { Database, Globe, GitCompare, Trophy } from "lucide-react";

/* =========================================================================
   De dónde miramos los datos: tu liga, el mundo, o los dos.

   Son enlaces y no botones con estado, por lo mismo que los filtros: el
   modo acaba en la URL, se puede compartir, y la vuelta atrás del navegador
   hace lo que se espera. Cambiar de fuente es navegar.

   Los iconos son de `lucide-react`, que es la librería que usa shadcn y la
   que instala su CLI, así que ya viene con el resto.
   ========================================================================= */

const OPCIONES = [
  {
    value: "local" as const,
    label: "Tu liga",
    Icon: Database,
    on: "border-source-local bg-source-local-soft text-source-local",
  },
  {
    value: "global" as const,
    label: "Meta online",
    Icon: Globe,
    on: "border-source-global bg-source-global-soft text-source-global",
  },
  {
    value: "both" as const,
    label: "Comparar",
    Icon: GitCompare,
    on: "border-source-diff bg-source-diff-soft text-source-diff",
  },
  {
    value: "evento" as const,
    label: "Último torneo",
    Icon: Trophy,
    on: "border-brand-line bg-brand-soft text-brand",
  },
];

export function SourceTabs({
  current, query,
}: { current: "local" | "global" | "both" | "evento"; query: string }) {
  const href = (v: string) => {
    const p = new URLSearchParams(query);
    if (v === "local") p.delete("fuente");
    else p.set("fuente", v);
    const qs = p.toString();
    return qs ? `/estadisticas?${qs}` : "/estadisticas";
  };

  return (
    <div className="scroll-x mb-4 flex gap-2" role="tablist" aria-label="Fuente de los datos">
      {OPCIONES.map(({ value, label, Icon, on }) => {
        const activo = value === current;
        return (
          <Link
            key={value}
            href={href(value)}
            role="tab"
            aria-selected={activo}
            className={`tap flex-none rounded-lg border px-3.5 text-sm font-semibold transition-colors
              ${activo ? on : "border-line bg-surface text-muted hover:text-ink"}`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
