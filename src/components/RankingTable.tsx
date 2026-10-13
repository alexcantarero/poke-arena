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
            className={`chip flex-none transition duration-150 hover:-translate-y-0.5 hover:shadow-sm ${sort.key === c.key ? "chip-brand" : ""}`}
            aria-pressed={sort.key === c.key}
          >
            {c.short}{sort.key === c.key && (sort.dir < 0 ? " ▼" : " ▲")}
          </button>
        ))}
      </div>

      {/* -------- móvil: tarjetas -------- */}
      <ol className="card divide-y divide-line-soft md:hidden">
        {sorted.map((r, i) => {
          const isTop1 = i === 0;
          const isTop2 = i === 1;
          const isTop3 = i === 2;
          const rowBg = isTop1
            ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--brand-soft)_60%,transparent),transparent_85%)] border-l-[3px] border-l-brand"
            : isTop2
            ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--surface-3)_70%,transparent),transparent_85%)] border-l-[3px] border-l-line"
            : isTop3
            ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--tier-bronce)_25%,transparent),transparent_85%)] border-l-[3px] border-l-tier-bronce"
            : "border-l-[3px] border-l-transparent hover:bg-surface-2/60";

          return (
            <li key={r.playerId} className={`group transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-sm motion-reduce:transition-none ${rowBg}`}>
              <Link href={`/perfil/${r.playerId}`} className="flex items-center gap-3 rounded-r-lg px-3.5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info">
                {isTop1 ? (
                  <span className="flex size-7 flex-none items-center justify-center rounded-full bg-brand/20 font-display text-xs font-black text-brand ring-1 ring-brand/40 shadow-xs">
                    1
                  </span>
                ) : isTop2 ? (
                  <span className="flex size-7 flex-none items-center justify-center rounded-full bg-surface-3 font-display text-xs font-black text-ink-2 ring-1 ring-line shadow-xs">
                    2
                  </span>
                ) : isTop3 ? (
                  <span className="flex size-7 flex-none items-center justify-center rounded-full bg-tier-bronce/20 font-display text-xs font-black text-tier-bronce ring-1 ring-tier-bronce/40 shadow-xs">
                    3
                  </span>
                ) : (
                  <span className="flex size-7 flex-none items-center justify-center font-display text-xs font-bold tabular text-muted">
                    {i + 1}
                  </span>
                )}
                <span className="flex-none">{r.avatar}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-bold tracking-tight text-ink transition-colors group-hover:text-info">{r.name}</span>
                  <span className="block truncate font-mono text-[11px] text-muted">
                    <span className="font-semibold text-win">{r.wins}V</span> <span className="font-semibold text-loss">{r.losses}D</span>
                    {r.ties ? <> <span className="font-semibold text-tie">{r.ties}E</span></> : ""} · {r.played} PJ
                    {r.topArchName ? ` · ${r.topArchName}` : ""}
                  </span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-surface-3" title={`${pct(r.winRate, 0)} de victorias`}>
                    <span
                      className="block h-full rounded-full transition-[width,filter] duration-300 group-hover:brightness-125 motion-reduce:transition-none"
                      style={{
                        width: `${Math.max(0, Math.min(100, (r.winRate ?? 0) * 100))}%`,
                        background: r.winRate != null && r.winRate >= 0.5 ? "var(--win)" : "var(--loss)",
                      }}
                    />
                  </span>
                </span>
                <span className="flex-none text-right">
                  <span
                    className="block font-display text-xl font-black tabular leading-none text-ink"
                    style={{ color: sort.key === "winRate" ? wrColor(r.winRate) : undefined }}
                  >
                    {sort.key === "winRate" ? pct(r.winRate, 0)
                      : sort.key === "resistance" ? pct(r.resistance, 0)
                      : sort.key === "diff" ? (r.diff > 0 ? `+${r.diff}` : r.diff)
                      : r[sort.key]}
                  </span>
                  <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                    {COLS.find((c) => c.key === sort.key)?.short}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        {!sorted.length && <li className="px-4 py-8 text-center text-sm text-muted">Sin jugadores.</li>}
      </ol>

      {/* -------- escritorio: tabla -------- */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="tbl">
          <thead>
            <tr>
              <th className="w-10 text-center font-display font-extrabold">#</th>
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
            {sorted.map((r, i) => {
              const isTop1 = i === 0;
              const isTop2 = i === 1;
              const isTop3 = i === 2;
              const rowClass = isTop1
                ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--brand-soft)_50%,transparent),transparent_70%)] border-l-4 border-l-brand"
                : isTop2
                ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--surface-3)_60%,transparent),transparent_70%)] border-l-4 border-l-line"
                : isTop3
                ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--tier-bronce)_20%,transparent),transparent_70%)] border-l-4 border-l-tier-bronce"
                : "border-l-4 border-l-transparent hover:bg-surface-2/60";

              return (
                <tr key={r.playerId} className={`transition-[background-color,box-shadow] duration-200 hover:shadow-sm motion-reduce:transition-none ${rowClass}`}>
                  <td className="text-center">
                    {isTop1 ? (
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand/20 font-display text-xs font-black text-brand ring-1 ring-brand/40 shadow-xs">
                        1
                      </span>
                    ) : isTop2 ? (
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-surface-3 font-display text-xs font-black text-ink-2 ring-1 ring-line shadow-xs">
                        2
                      </span>
                    ) : isTop3 ? (
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-tier-bronce/20 font-display text-xs font-black text-tier-bronce ring-1 ring-tier-bronce/40 shadow-xs">
                        3
                      </span>
                    ) : (
                      <span className="font-display text-sm font-bold tabular text-muted">{i + 1}</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/perfil/${r.playerId}`} className="group inline-flex items-center gap-2 rounded-md outline-none transition-transform hover:translate-x-0.5 focus-visible:ring-2 focus-visible:ring-info">
                      <span className="flex-none">{r.avatarSm}</span>
                      <span className="font-display text-base font-bold tracking-tight text-ink transition-colors group-hover:text-info">{r.name}</span>
                    </Link>
                  </td>
                  <td className="font-mono text-xs tabular font-medium">
                    {/* V–D–E, como se dice: un «3–1» son tres victorias y una derrota. */}
                    <b className="font-bold text-win">{r.wins}</b>–<span className="font-semibold text-loss">{r.losses}</span>{r.ties ? <>–<span className="font-semibold text-tie">{r.ties}</span></> : null}
                  </td>
                  <td className="text-right font-display text-base font-black tabular text-ink">{r.points}</td>
                  <td className="text-right">
                    <span className="block font-mono text-xs font-bold tabular" style={{ color: wrColor(r.winRate) }}>{pct(r.winRate, 1)}</span>
                    <span className="ml-auto mt-1 block h-1 w-14 overflow-hidden rounded-full bg-surface-3">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.max(0, Math.min(100, (r.winRate ?? 0) * 100))}%`,
                          background: r.winRate != null && r.winRate >= 0.5 ? "var(--win)" : "var(--loss)",
                        }}
                      />
                    </span>
                  </td>
                  <td className="text-right font-mono text-xs tabular text-ink-2">{r.elo}</td>
                  <td className="text-right font-mono text-xs tabular text-ink-2">{r.cp || "—"}</td>
                  <td className="text-right font-mono text-xs tabular text-muted">{r.played}</td>
                  <td className="text-right font-mono text-xs tabular text-muted">{pct(r.resistance, 1)}</td>
                  <td className="text-right font-mono text-xs tabular text-muted">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                  <td className="max-w-40 truncate font-sans text-xs font-medium text-ink-2">{r.topArchName ?? <span className="text-muted">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
