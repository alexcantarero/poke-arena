import type { Archetype } from "@/lib/types";
import type { Matrix as MatrixData } from "@/lib/stats";
import { Sprites } from "./ui";
import { spriteUrl } from "@/lib/pokemon";
import { clamp } from "@/lib/format";
import { wilsonScore } from "@/lib/stats";

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
    /* `overscroll-x-contain` es lo que arregla la matriz en el móvil: sin
       ello, al llegar al final del desplazamiento lateral el gesto se lo
       queda el navegador y se va a la página anterior. Con diez columnas eso
       pasa cada dos por tres.

       El borde derecho de la primera columna se pinta con una sombra y no con
       un `border`, para que se vea que la columna flota por encima de lo que
       pasa por debajo y no que la tabla tiene una raya más. */
    <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 sm:mx-0 sm:px-0">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th
              className="sticky left-0 z-10 bg-surface p-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted"
              style={{ boxShadow: "6px 0 8px -8px rgb(0 0 0 / 0.35)" }}
            >
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
                <td
                  className="sticky left-0 z-10 max-w-44 truncate border-y border-line-soft bg-surface px-2 py-1"
                  style={{ boxShadow: "6px 0 8px -8px rgb(0 0 0 / 0.35)" }}
                >
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
                  const [wCenter] = wilsonScore(v.wins, v.n);
                  const displayRate = v.n >= 10 ? v.winRate : wCenter;
                  const base = displayRate >= 0.55 ? "var(--win)" : displayRate <= 0.45 ? "var(--loss)" : "var(--series-1)";
                  return (
                    <td
                      key={colId}
                      className="border border-line-soft p-0"
                      title={`${rowArch?.name} contra ${byId.get(colId)?.name}: ${Math.round(displayRate * 100)}% en ${v.n} partida${v.n === 1 ? "" : "s"}`}
                    >
                      <div
                        className="grid h-8 place-items-center font-mono text-[11px] tabular"
                        style={{ background: `color-mix(in srgb, ${base} ${(alpha * 100).toFixed(0)}%, transparent)` }}
                      >
                        {Math.round(displayRate * 100)}
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
