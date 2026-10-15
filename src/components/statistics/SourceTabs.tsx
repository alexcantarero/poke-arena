import Link from "next/link";
import { Database, Globe, GitCompare, Landmark, MapPin, Trophy } from "lucide-react";

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
    // v0.14: el nombre dice lo que es — solo lo que habéis jugado vosotros.
    label: "Jugadores de la app",
    Icon: Database,
    on: "border-source-local bg-source-local-soft text-source-local",
  },
  {
    value: "regionales" as const,
    label: "Regionales",
    Icon: Landmark,
    on: "border-brand-line bg-brand-soft text-brand",
  },
  {
    value: "city" as const,
    label: "City Leagues",
    Icon: MapPin,
    on: "border-brand-line bg-brand-soft text-brand",
  },
  {
    value: "global" as const,
    label: "Online",
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
    value: "live" as const,
    label: "PTCG Live",
    Icon: Database,
    on: "border-brand-line bg-brand-soft text-brand",
  },
  {
    value: "evento" as const,
    label: "Último torneo online",
    Icon: Trophy,
    on: "border-brand-line bg-brand-soft text-brand",
  },
];

export type Fuente = "local" | "regionales" | "city" | "global" | "both" | "evento" | "live";

export function SourceTabs({
  current, query,
}: { current: Fuente; query: string }) {
  const href = (v: string) => {
    const p = new URLSearchParams(query);
    if (v === "local") p.delete("fuente");
    else p.set("fuente", v);
    const qs = p.toString();
    return qs ? `/estadisticas?${qs}` : "/estadisticas";
  };

  return (
    <div className="scroll-x scroll-fade mb-4 flex snap-x snap-proximity gap-2" role="tablist" aria-label="Fuente de los datos">
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
