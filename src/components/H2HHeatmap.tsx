import type { ReactNode } from "react";
import Link from "next/link";
import type { MatrizH2H } from "@/lib/h2h";

/* =========================================================================
   v0.15 — Mapa de calor de enfrentamientos directos.

   Fila = quien mira; columna = contra quién. Cada celda dice cuántas veces os
   habéis cruzado y el récord de la FILA contra la COLUMNA («2–1»). El color
   es la cantidad de cruces, no quién gana: el mapa contesta «con quién me he
   enfrentado más», y el récord va escrito dentro para quien quiera más.

   Cuenta las partidas de liga y amistosos entre dos del grupo, y las rondas
   de torneo en las que el rival se eligió del grupo (v0.15). Una ronda que
   apuntan los dos jugadores cuenta una vez — ver `lib/h2h.ts`.

   Componente de servidor: una tabla, sin estado. Dentro de la tarjeta va
   `overflow-x-auto` y no `.scroll-x` (que sangra a los bordes de la página y
   se recorta dentro de una tarjeta; regla de la v0.11).
   ========================================================================= */

export type JugadorH2H = { id: string; name: string; avatar: ReactNode };

export function H2HHeatmap({
  matriz, jugadores,
}: {
  matriz: MatrizH2H;
  jugadores: JugadorH2H[];
}) {
  const byId = new Map(jugadores.map((j) => [j.id, j]));
  const ids = matriz.ids.filter((id) => byId.has(id));

  if (ids.length < 2) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        Todavía no hay enfrentamientos entre gente del grupo con este filtro. Se llenan con las
        partidas de liga y amistosos, y con las rondas de torneo en las que eliges al rival del
        grupo.
      </p>
    );
  }

  const intensidad = (n: number) =>
    n === 0 ? 0 : Math.round(14 + 66 * (n / Math.max(1, matriz.max)));

  return (
    <>
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-max min-w-full border-separate border-spacing-1 p-3 text-center">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface px-1 text-left text-[10px] font-semibold uppercase tracking-wide text-muted">
                contra →
              </th>
              {ids.map((id) => (
                <th key={id} scope="col" className="px-0.5 align-bottom">
                  <span className="flex flex-col items-center gap-1" title={byId.get(id)!.name}>
                    {byId.get(id)!.avatar}
                    <span className="block max-w-[3.25rem] truncate text-[10px] font-semibold text-ink-2">
                      {byId.get(id)!.name}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ids.map((fila) => (
              <tr key={fila}>
                <th scope="row" className="sticky left-0 z-10 bg-surface pr-2 text-left">
                  <Link href={`/perfil/${fila}`} className="flex items-center gap-1.5 hover:text-info">
                    {byId.get(fila)!.avatar}
                    <span className="max-w-[6rem] truncate text-xs font-semibold">{byId.get(fila)!.name}</span>
                  </Link>
                </th>
                {ids.map((col) => {
                  if (fila === col) {
                    return (
                      <td key={col} className="size-13 rounded-lg bg-surface-2 text-xs text-muted" aria-label="Uno mismo">
                        —
                      </td>
                    );
                  }
                  const c = matriz.celda(fila, col);
                  const pct = intensidad(c.partidas);
                  const titulo = `${byId.get(fila)!.name} contra ${byId.get(col)!.name}: ${c.partidas} ${c.partidas === 1 ? "vez" : "veces"} · ${c.gana}–${c.pierde}${c.empata ? `–${c.empata}` : ""}`;
                  return (
                    <td
                      key={col}
                      title={titulo}
                      className="size-13 rounded-lg border border-line-soft align-middle"
                      style={pct ? { background: `color-mix(in oklab, var(--series-1) ${pct}%, transparent)` } : undefined}
                    >
                      {c.partidas ? (
                        <>
                          <span className={`block font-display text-lg font-extrabold tabular leading-none ${pct > 55 ? "text-white" : ""}`}>
                            {c.partidas}
                          </span>
                          <span className={`block text-[10px] font-semibold tabular ${pct > 55 ? "text-white/90" : "text-muted"}`}>
                            {c.gana}–{c.pierde}{c.empata ? `–${c.empata}` : ""}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted/60">·</span>
                      )}
                      <span className="sr-only">{titulo}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line-soft px-4 py-2.5 text-[11px] text-muted">
        {matriz.total} enfrentamiento{matriz.total === 1 ? "" : "s"}. Cada celda: veces que os
        habéis cruzado y el récord V–D de la fila contra la columna. Más oscuro, más cruces.
      </p>
    </>
  );
}
