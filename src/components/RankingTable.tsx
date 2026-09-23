"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { pct, wrColor } from "@/lib/format";

export type RankRow = {
  playerId: string;
  name: string;
  /**
   * El avatar ya pintado, que llega desde el servidor.
   *
   * Antes esta tabla recibía `avatarKind` y `avatarValue` y **no los usaba**:
   * dibujaba un círculo con la inicial, así que quien tenía un Pokémon o una
   * foto de perfil no la veía en el ranking. Y es una pantalla de cliente
   * —ordena sin recargar—, así que importar el `Avatar` de `ui.tsx` se
   * llevaría `lib/stats` y `lib/pokemon` enteros al navegador.
   *
   * La solución es la misma que ya usaban las gráficas de la portada: el
   * servidor pinta el avatar y manda el nodo hecho. Van dos tamaños porque
   * la tarjeta del móvil y la fila de la tabla no usan el mismo, y estirar
   * uno con CSS deja el sprite borroso.
   */
  avatar: ReactNode;
  avatarSm: ReactNode;
  played: number; wins: number; ties: number; losses: number;
  points: number; winRate: number | null; resistance: number | null;
  diff: number; elo: number; cp: number;
  streakKind: string; streakN: number;
  topArchId: string | null; topArchName: string | null;
};

type Key = "played" | "winRate" | "points" | "elo" | "resistance" | "diff" | "cp";

const COLS: Array<{ key: Key; label: string; short: string }> = [
  { key: "points", label: "Puntos", short: "Pts" },
  { key: "winRate", label: "% victorias", short: "%V" },
  { key: "elo", label: "Elo", short: "Elo" },
  { key: "cp", label: "Championship Points", short: "CP" },
  { key: "played", label: "Partidas", short: "PJ" },
  { key: "resistance", label: "Resistencia", short: "Res." },
  { key: "diff", label: "Diferencia de juegos", short: "Dif." },
];

/**
 * En móvil son tarjetas y en escritorio una tabla: los mismos datos, con la
 * forma que funciona en cada sitio. Una tabla de diez columnas en 375px no
 * hay manera de leerla.
 */
export function RankingTable({ rows }: { rows: RankRow[] }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "points", dir: -1 });

  const val = (r: RankRow, k: Key) => (r[k] == null ? -1 : (r[k] as number));
  const sorted = [...rows].sort((a, b) => sort.dir * (val(a, sort.key) - val(b, sort.key)) || a.name.localeCompare(b.name));
  const click = (k: Key) => setSort((s) => (s.key === k ? { key: k, dir: (s.dir * -1) as 1 | -1 } : { key: k, dir: -1 }));

  return (
    <>
      {/* selector de orden, solo en móvil */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
        {COLS.map((c) => (
          <button
            key={c.key} type="button" onClick={() => click(c.key)}
            className={`chip flex-none ${sort.key === c.key ? "chip-brand" : ""}`}
            aria-pressed={sort.key === c.key}
          >
            {c.short}{sort.key === c.key && (sort.dir < 0 ? " ▼" : " ▲")}
          </button>
        ))}
      </div>

      {/* -------- móvil: tarjetas -------- */}
      <ol className="card divide-y divide-line-soft md:hidden">
        {sorted.map((r, i) => (
          <li key={r.playerId}>
            <Link href={`/perfil/${r.playerId}`} className="flex items-center gap-3 px-3 py-3 hover:bg-surface-2">
              <span className={`w-6 flex-none text-center font-display text-xl font-extrabold tabular
                ${i === 0 && sort.key === "points" ? "text-brand" : "text-muted"}`}>{i + 1}</span>
              <span className="flex-none">{r.avatar}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.name}</span>
                <span className="block truncate text-xs text-muted">
                  {r.wins}–{r.losses}{r.ties ? `–${r.ties}` : ""} · {r.played} partidas
                  {r.topArchName ? ` · ${r.topArchName}` : ""}
                </span>
              </span>
              <span className="flex-none text-right">
                <span className="block font-display text-xl font-extrabold tabular leading-none">
                  {sort.key === "winRate" ? pct(r.winRate, 0)
                    : sort.key === "resistance" ? pct(r.resistance, 0)
                    : sort.key === "diff" ? (r.diff > 0 ? `+${r.diff}` : r.diff)
                    : r[sort.key]}
                </span>
                <span className="block text-[10px] uppercase tracking-wide text-muted">
                  {COLS.find((c) => c.key === sort.key)?.short}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {!sorted.length && <li className="px-4 py-8 text-center text-sm text-muted">Sin jugadores.</li>}
      </ol>

      {/* -------- escritorio: tabla -------- */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="tbl">
          <thead>
            <tr>
              <th className="w-10 text-center">#</th>
              <th>Jugador</th>
              <th>Récord</th>
              {COLS.map((c) => (
                <th key={c.key} className="text-right">
                  <button type="button" onClick={() => click(c.key)} className="hover:text-ink" title={c.label}>
                    {c.short}{sort.key === c.key && <span className="opacity-60"> {sort.dir < 0 ? "▼" : "▲"}</span>}
                  </button>
                </th>
              ))}
              <th>Mazo habitual</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.playerId} className="hover:bg-surface-2">
                <td className={`text-center font-display text-lg font-extrabold tabular
                  ${i === 0 && sort.key === "points" ? "text-brand" : "text-muted"}`}>{i + 1}</td>
                <td>
                  <Link href={`/perfil/${r.playerId}`} className="inline-flex items-center gap-2 hover:text-info">
                    <span className="flex-none">{r.avatarSm}</span>
                    <span className="font-semibold">{r.name}</span>
                  </Link>
                </td>
                <td className="font-mono text-[13px]">
                  {/* V–D–E, como se dice: un «3–1» son tres victorias y una derrota. */}
                  <b className="text-win">{r.wins}</b>–<span className="text-loss">{r.losses}</span>{r.ties ? <>–<span className="text-tie">{r.ties}</span></> : null}
                </td>
                <td className="text-right font-semibold tabular">{r.points}</td>
                <td className="text-right font-semibold tabular" style={{ color: wrColor(r.winRate) }}>{pct(r.winRate, 1)}</td>
                <td className="text-right tabular">{r.elo}</td>
                <td className="text-right tabular">{r.cp || "—"}</td>
                <td className="text-right tabular">{r.played}</td>
                <td className="text-right tabular text-muted">{pct(r.resistance, 1)}</td>
                <td className="text-right tabular">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                <td className="max-w-40 truncate text-[13px]">{r.topArchName ?? <span className="text-muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
