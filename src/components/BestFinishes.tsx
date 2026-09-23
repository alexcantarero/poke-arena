import Link from "next/link";
import type { Archetype } from "@/lib/types";
import type { ConvStats, PlacementRow } from "@/lib/tournamentStats";
import { pct } from "@/lib/format";
import { Sprites } from "./ui";
import { Icon } from "./icons";

/* =========================================================================
   Los mejores resultados, como en el stream.

   En las retransmisiones, debajo del nombre de cada jugador salen sus mejores
   puestos de la temporada. Es la carta de presentación de alguien en cuatro
   líneas, y aquí cumple la misma función.

   Dos detalles que hacen que el orden signifique algo:

   · **A igual puesto manda el torneo más grande.** Un top 8 de 300 personas
     no es un top 8 de 20, y el que más cuesta va delante.
   · **Se enseña el tamaño del torneo siempre.** Sin él, un «1.º» no dice si
     fue un Regional o una tarde de tienda con seis personas.

   Encima van las cuatro cifras de conversión, que responden a la otra
   pregunta: no «qué es lo mejor que has hecho» sino «cuántas veces que vas,
   llegas».
   ========================================================================= */

type Props = {
  rows: PlacementRow[];
  stats: ConvStats;
  season: number;
  nameOf: (kind: string) => string;
  archOf: (archetypeId: string | null) => Archetype | undefined;
  tournamentOf: (date: string, kind: string) => string;
  hrefOf: (date: string, kind: string) => string | undefined;
};

/** Medalla de puesto: oro, plata, bronce y «top» para el resto. */
function colorDePuesto(p: number): string {
  if (p === 1) return "var(--brand)";
  if (p === 2) return "#9aa6b8";
  if (p === 3) return "#b07a45";
  if (p <= 8) return "var(--series-1)";
  return "var(--muted)";
}

export function BestFinishes({ rows, stats, season, nameOf, archOf, tournamentOf, hrefOf }: Props) {
  return (
    <section className="card mb-6">
      <div className="card-head">
        <h2 className="text-lg font-bold">Mejores resultados</h2>
        <span className="text-xs text-muted">temporada {season}</span>
      </div>

      {/* Las cuatro cifras. `cutRate` puede ser null aunque haya torneos: si
          ninguno tuvo top cut, no hay nada que convertir y un 0% mentiría. */}
      <div className="grid grid-cols-2 gap-px border-b border-line-soft bg-line-soft sm:grid-cols-4">
        <Cifra label="Torneos" value={String(stats.entries)} nota={`${stats.wins} ganado${stats.wins === 1 ? "" : "s"}`} />
        <Cifra label="Conversión a cut" value={pct(stats.cutRate, 0)}
          nota={stats.cutEligible ? `${stats.cut} de ${stats.cutEligible}` : "ninguno con corte"} />
        <Cifra label="Top 8" value={pct(stats.top8Rate, 0)} nota={`${stats.top8} veces`} />
        <Cifra label="Top 4" value={pct(stats.top4Rate, 0)} nota={`${stats.top4} veces`} />
      </div>

      {rows.length ? (
        <ol className="divide-y divide-line-soft">
          {rows.map((r, i) => {
            const arch = archOf(r.archetypeId);
            const href = hrefOf(r.date, r.kind);
            const fila = (
              <>
                <span
                  className="grid size-10 flex-none place-items-center rounded-full border-2 font-display text-base font-extrabold tabular"
                  style={{
                    borderColor: colorDePuesto(r.placement as number),
                    color: colorDePuesto(r.placement as number),
                  }}
                >
                  {r.placement}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {tournamentOf(r.date, r.kind)}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                    {arch && <Sprites archetype={arch} size="sm" />}
                    <span className="truncate">
                      {nameOf(r.kind)}
                      {r.playerCount ? ` · ${r.playerCount} jugadores` : ""}
                      {arch ? ` · ${arch.name}` : ""}
                    </span>
                  </span>
                </span>
                {href && <Icon name="back" className="size-4 flex-none rotate-180 text-muted" />}
              </>
            );
            const clase = "flex items-center gap-3 px-4 py-3";
            return (
              <li key={`${r.date}-${r.kind}-${i}`}>
                {href
                  ? <Link href={href} className={`${clase} hover:bg-surface-2`}>{fila}</Link>
                  : <div className={clase}>{fila}</div>}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-muted">
          Todavía no hay ningún torneo con el puesto apuntado. En la ficha de cada torneo se
          rellena en dos toques.
        </p>
      )}
    </section>
  );
}

function Cifra({ label, value, nota }: { label: string; value: string; nota: string }) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="font-display text-2xl font-extrabold tabular leading-none">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-muted">{nota}</p>
    </div>
  );
}
