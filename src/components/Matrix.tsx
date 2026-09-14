import type { Archetype } from "@/lib/types";
import type { Matrix as MatrixData } from "@/lib/stats";
import { Sprites } from "./ui";
import { spriteUrl } from "@/lib/pokemon";
import { clamp } from "@/lib/format";

/**
 * Matriz de emparejamientos: % de victorias de la fila contra la columna.
 *
 * La opacidad crece con el número de partidas, a propósito: un 100% de una
 * sola partida se ve pálido y un 60% de doce se ve sólido. Es lo que evita
 * leer ruido como si fuera señal.
 *
 * Las cabeceras de columna son el sprite y no el nombre. El nombre en vertical
 * se comía 96px de alto y aun así no se leía: en una matriz el ojo salta de
 * casilla a casilla, y para eso el dibujo del Pokémon identifica el mazo mucho
 * antes que el texto. El nombre sigue estando —en el `title` y en el
 * `aria-label`—, así que ni se pierde al pasar por encima ni para quien lo lee
 * con un lector de pantalla.
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
            {ids.map((id) => {
              const arch = byId.get(id);
              const name = arch?.name ?? id;
              return (
                <th
                  key={id} scope="col" title={name} aria-label={name}
                  className="w-10 p-1 align-bottom font-normal"
                >
                  <ColSprite archetype={arch} name={name} />
                </th>
              );
            })}
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

/**
 * El sprite de la cabecera de columna.
 *
 * No usa `Sprites` de ui.tsx porque allí cada imagen lleva su propio `alt` y
 * su `title`, y aquí el nombre ya va en la celda: repetido sonaría dos veces
 * en el lector de pantalla. Un arquetipo sin Pokémon —los hay, apuntados a
 * mano— cae a su inicial para que la columna no quede en blanco.
 */
function ColSprite({ archetype, name }: { archetype?: Archetype; name: string }) {
  if (!archetype?.main) {
    return (
      <span className="mx-auto grid size-7 place-items-center rounded-full bg-surface-3 text-[11px] font-semibold text-ink-2" aria-hidden="true">
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <span className="mx-auto flex w-10 items-center justify-center" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={spriteUrl(archetype.main)} alt="" loading="lazy" className="size-7 flex-none object-contain" />
      {archetype.secondary && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={spriteUrl(archetype.secondary)} alt="" loading="lazy" className="-ml-2.5 size-5 flex-none object-contain" />
      )}
    </span>
  );
}
