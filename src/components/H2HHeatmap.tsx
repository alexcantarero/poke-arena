import type { ReactNode } from "react";
import Link from "next/link";
import type { MatrizH2H } from "@/lib/h2h";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/* =========================================================================
   v0.15 — Mapa de calor de enfrentamientos directos.

   Fila = quien mira; columna = contra quién. En el modo predeterminado cada
   celda muestra cuántas veces os habéis cruzado y el récord V–D. El modo de
   porcentaje colorea según el rendimiento de la fila y conserva la intensidad
   por cantidad de cruces.

   Cuenta las partidas de liga y amistosos entre dos del grupo, y las rondas
   de torneo en las que el rival se eligió del grupo (v0.15). Una ronda que
   apuntan los dos jugadores cuenta una vez — ver `lib/h2h.ts`.

   Componente de servidor: una tabla, sin estado. Dentro de la tarjeta va
   `overflow-x-auto` y no `.scroll-x` (que sangra a los bordes de la página y
   se recorta dentro de una tarjeta; regla de la v0.11).
   ========================================================================= */

export type JugadorH2H = { id: string; name: string; avatar: ReactNode };

export async function H2HHeatmap({
  matriz, jugadores, colorMode = "volume",
}: {
  matriz: MatrizH2H;
  jugadores: JugadorH2H[];
  colorMode?: "volume" | "winRate";
}) {
  const lng = await getLang(); // v0.49

  const byId = new Map(jugadores.map((j) => [j.id, j]));
  const ids = matriz.ids.filter((id) => byId.has(id));

  if (ids.length < 2) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        {tr(lng, "x.497141c9")}
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
                {tr(lng, "x.37226785")}
              </th>
              {ids.map((id) => (
                <th key={id} scope="col" className="px-0.5 align-bottom">
                  <Link href={`/perfil/${id}`} className="flex flex-col items-center gap-1 hover:text-info" title={byId.get(id)!.name}>
                    {byId.get(id)!.avatar}
                    <span className="block max-w-[3.25rem] truncate text-[10px] font-semibold text-ink-2">
                      {byId.get(id)!.name}
                    </span>
                  </Link>
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
                      <td key={col} className="size-13 rounded-lg bg-surface-2 text-xs text-muted" aria-label={tr(lng, "x.61a470c5")}>
                        —
                      </td>
                    );
                  }
                  const c = matriz.celda(fila, col);
                  const intensidadCelda = intensidad(c.partidas);
                  const decididas = c.gana + c.pierde;
                  const winRate = decididas ? c.gana / decididas : null;
                  const tono = winRate == null ? "var(--series-1)" : winRate >= 0.55 ? "var(--win)" : winRate <= 0.45 ? "var(--loss)" : "var(--series-1)";
                  const titulo = `${byId.get(fila)!.name} contra ${byId.get(col)!.name}: ${c.gana} victorias, ${c.pierde} derrotas${c.empata ? ` y ${c.empata} empates` : ""} en ${c.partidas} ${c.partidas === 1 ? "partida" : tr(lng, "x.18fd2bbc")}${colorMode === "winRate" && winRate != null ? ` · ${Math.round(winRate * 100)}% de victorias` : ""}`;
                  return (
                    <td
                      key={col}
                      title={titulo}
                      className="size-13 rounded-lg border border-line-soft align-middle"
                      style={intensidadCelda ? {
                        background: `color-mix(in oklab, ${colorMode === "winRate" ? tono : "var(--series-1)"} ${intensidadCelda}%, transparent)`,
                      } : undefined}
                    >
                      {c.partidas ? (
                        <>
                          <span className={`block font-display text-lg font-extrabold tabular leading-none ${colorMode === "volume" && intensidadCelda > 55 ? "text-white" : ""}`}>
                            {colorMode === "winRate" ? (winRate == null ? "—" : `${Math.round(winRate * 100)}%`) : c.partidas}
                          </span>
                          {/* v0.38 — el récord de debajo del % no se leía.
                              Iba a 10 px con `text-muted`, que es un gris
                              pensado para el fondo de la tarjeta, no para una
                              celda teñida de verde o de rojo: sobre el tinte
                              se quedaba casi al nivel del fondo. Ahora hereda
                              el color del texto de la celda y se separa con
                              opacidad, que mantiene el contraste sea cual sea
                              el tinte, y sube a 11 px. */}
                          <span className={`block text-[11px] font-semibold tabular ${colorMode === "volume" && intensidadCelda > 55 ? "text-white/90" : "opacity-80"}`}>
                            {colorMode === "winRate" ? `${c.gana}–${c.pierde} · ${c.partidas}` : `${c.gana}–${c.pierde}${c.empata ? `–${c.empata}` : ""}`}
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
        {colorMode === "winRate"
          ? <>Cada celda: % de victorias y récord V–D · partidas disputadas. El color indica el rendimiento; más oscuro, más cruces.</>
          : <>{matriz.total} enfrentamiento{matriz.total === 1 ? "" : "s"}. Cada celda: veces que os habéis cruzado y el récord V–D de la fila contra la columna. Más oscuro, más cruces.</>}
      </p>
    </>
  );
}
