import type { Archetype } from "@/lib/types";
import type { Matrix as MatrixData } from "@/lib/stats";
import { Sprites } from "./ui";
import { clamp } from "@/lib/format";

/**
 * Matriz de emparejamientos: % de victorias de la fila contra la columna.
 *
 * La opacidad crece con el número de partidas, a propósito: un 100% de una
 * sola partida se ve pálido y un 60% de doce se ve sólido. Es lo que evita
 * leer ruido como si fuera señal.
 */
export function Matrix({
  data, byId, limit = 10,
}: { data: MatrixData; byId: Map<string, Archetype>; limit?: number }) {
  const ids = data.ids.slice(0, limit);
  if (!ids.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        Aún no hay emparejamientos. Registra partidas indicando el mazo de los dos lados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-surface p-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted">
              Mi mazo \ Rival
            </th>
            {ids.map((id) => (
              <th key={id} className="h-24 w-9 p-0 align-bottom">
                <div className="mx-auto max-h-22 overflow-hidden text-ellipsis whitespace-nowrap pb-1.5 text-[10px] font-semibold text-muted"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                  {byId.get(id)?.name ?? id}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ids.map((rowId) => {
            const rowArch = byId.get(rowId);
            return (
              <tr key={rowId}>
                <td className="sticky left-0 z-10 max-w-44 truncate border-y border-line-soft bg-surface px-2 py-1">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Sprites archetype={rowArch} size="sm" />
                    <span className="truncate">{rowArch?.name ?? rowId}</span>
                  </span>
                </td>
                {ids.map((colId) => {
                  if (rowId === colId) {
                    return <td key={colId} className="border border-line-soft bg-surface-3 text-center text-muted">·</td>;
                  }
                  const v = data.cell(rowId, colId);
                  if (!v) {
                    return <td key={colId} className="border border-line-soft text-center text-muted opacity-40">–</td>;
                  }
                  const alpha = clamp(0.16 + v.n * 0.1, 0.16, 0.85);
                  const base = v.winRate >= 0.55 ? "var(--win)" : v.winRate <= 0.45 ? "var(--loss)" : "var(--series-1)";
                  return (
                    <td
                      key={colId}
                      className="border border-line-soft p-0"
                      title={`${rowArch?.name} contra ${byId.get(colId)?.name}: ${Math.round(v.winRate * 100)}% en ${v.n} partida${v.n === 1 ? "" : "s"}`}
                    >
                      <div
                        className="grid h-8 place-items-center font-mono text-[11px] tabular"
                        style={{ background: `color-mix(in srgb, ${base} ${(alpha * 100).toFixed(0)}%, transparent)` }}
                      >
                        {Math.round(v.winRate * 100)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
