import type { Archetype } from "@/lib/types";
import type { Matrix as MatrixData } from "@/lib/stats";
import { Sprites } from "./ui";
import { clamp } from "@/lib/format";

/** Matriz arquetipo (fila) contra arquetipo (columna), en % de victorias. */
export function Matrix({
  data, byId, limit = 12,
}: { data: MatrixData; byId: Map<string, Archetype>; limit?: number }) {
  const ids = data.ids.slice(0, limit);
  if (!ids.length) {
    return (
      <div className="empty">
        <h3>Aún no hay emparejamientos</h3>
        <p>Registra partidas indicando el mazo de cada jugador y aquí verás la matriz.</p>
      </div>
    );
  }
  return (
    <div className="mx">
      <table>
        <thead>
          <tr>
            <th style={{ minWidth: 150 }}>Mi mazo \ Rival</th>
            {ids.map((id) => (
              <th className="rot" key={id}><div>{byId.get(id)?.name ?? id}</div></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ids.map((rowId) => {
            const rowArch = byId.get(rowId);
            return (
              <tr key={rowId}>
                <td className="hd">
                  <span className="arch">
                    <Sprites archetype={rowArch} size="sm" />
                    <span className="an">{rowArch?.name ?? rowId}</span>
                  </span>
                </td>
                {ids.map((colId) => {
                  if (rowId === colId) return <td key={colId}><div className="cell dg">·</div></td>;
                  const v = data.cell(rowId, colId);
                  if (!v) return <td key={colId}><div className="cell na">–</div></td>;
                  const alpha = clamp(0.16 + v.n * 0.1, 0.16, 0.85);
                  const base = v.winRate >= 0.55 ? "var(--win)" : v.winRate <= 0.45 ? "var(--loss)" : "var(--blue)";
                  return (
                    <td key={colId} title={`${rowArch?.name} vs ${byId.get(colId)?.name} · ${v.n} partida(s)`}>
                      <div className="cell" style={{ background: `color-mix(in srgb, ${base} ${(alpha * 100).toFixed(0)}%, transparent)` }}>
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
