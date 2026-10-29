import Link from "next/link";
import { Database, Globe, Landmark, MapPin, Trophy } from "lucide-react";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

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
  // v0.58 — fuera «Comparar»: no aportaba lo bastante. El valor «both» sigue
  // existiendo por si alguien llega con un enlace antiguo; solo deja de ofrecerse.
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

export async function SourceTabs({
  current, query,
}: { current: Fuente; query: string }) {
  const lng = await getLang(); // v0.49

  const href = (v: string) => {
    const p = new URLSearchParams(query);
    if (v === "local") p.delete("fuente");
    else p.set("fuente", v);
    const qs = p.toString();
    return qs ? `/estadisticas?${qs}` : "/estadisticas";
  };

  return (
    /* v0.76 — mismas pestañas que Herramientas (`.pestanas`). */
    <div className="pestanas mb-4" role="tablist" aria-label={tr(lng, "x.da8315d3")}>
      {OPCIONES.map(({ value, label, Icon }) => {
        const activo = value === current;
        return (
          <Link
            key={value}
            href={href(value)}
            role="tab"
            aria-selected={activo}
            className="pestana" data-on={activo}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
