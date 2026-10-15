"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { pct, wrColor } from "@/lib/format";
import { num } from "@/lib/format";

/* =========================================================================
   v0.15.1 — El ranking con «Todo»: UNA tabla con todo sumado.

   En la v0.15.0 «Todo» enseñaba dos tablas, liga y torneos, una debajo de
   otra. Lo que se pedía es una sola: por persona, todas sus partidas —liga,
   amistosos y rondas de torneo, presenciales y online— y, al lado, lo que
   solo existe en torneos (cuántos, conversión al corte, puesto medio) y los
   CP de la temporada.

   Los puntos son los de siempre (3 / 1 / 0 por defecto) sobre TODAS las
   partidas. La resistencia y la diferencia de juegos no están: solo tienen
   sentido entre gente del grupo, y siguen en la vista «Liga».
   ========================================================================= */

export type TodoRow = {
  playerId: string;
  name: string;
  avatar: ReactNode;
  avatarSm: ReactNode;
  points: number;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number | null;
  elo: number;
  cp: number;
  torneos: number;
  conCorte: number;
  cortes: number;
  cutRate: number | null;
  avgPlacement: number | null;
  drops: number;
};

type Key = "points" | "winRate" | "played" | "elo" | "cp" | "torneos" | "cutRate" | "avgPlacement";

const COLS: Array<{ key: Key; short: string; label: string }> = [
  { key: "winRate", short: "%V", label: "% de victorias (empate = media)" },
  { key: "played", short: "PJ", label: "Partidas jugadas" },
  { key: "elo", short: "Elo", label: "Elo (solo partidas entre gente del grupo)" },
  { key: "cp", short: "CP", label: "Championship Points de la temporada" },
  { key: "torneos", short: "Torneos", label: "Torneos jugados" },
  { key: "cutRate", short: "%Cut", label: "Conversión al top cut (solo torneos con corte)" },
  { key: "avgPlacement", short: "Media", label: "Puesto medio en torneos" },
];

const ASC_ES_MEJOR: Partial<Record<Key, true>> = { avgPlacement: true };

export function RankingTodoTable({ rows }: { rows: TodoRow[] }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "points", dir: -1 });

  const val = (r: TodoRow, k: Key): number => {
    const v = r[k];
    if (v == null) return sort.dir < 0 ? -Infinity : Infinity;
    return v as number;
  };
  const sorted = [...rows].sort((a, b) => {
    const va = val(a, sort.key), vb = val(b, sort.key);
    if (va === vb) {
      return b.points - a.points || (b.winRate ?? -1) - (a.winRate ?? -1) || b.cp - a.cp
        || a.name.localeCompare(b.name, "es");
    }
    return sort.dir * (va < vb ? -1 : 1);
  });
  const click = (k: Key) => setSort((s) => (s.key === k
    ? { key: k, dir: (s.dir * -1) as 1 | -1 }
    : { key: k, dir: ASC_ES_MEJOR[k] ? 1 : -1 }));

  const media = (v: number | null) => num(v, 1);
  const destacado = (r: TodoRow): { v: ReactNode; l: string } => {
    switch (sort.key) {
      case "winRate": return { v: pct(r.winRate, 0), l: "%V" };
      case "played": return { v: r.played, l: "partidas" };
      case "elo": return { v: r.elo, l: "Elo" };
      case "cp": return { v: r.cp, l: "CP" };
      case "torneos": return { v: r.torneos, l: "torneos" };
      case "cutRate": return { v: pct(r.cutRate, 0), l: r.conCorte ? `corte ${r.cortes}/${r.conCorte}` : "sin corte" };
      case "avgPlacement": return { v: media(r.avgPlacement), l: "puesto medio" };
      default: return { v: r.points, l: "pts" };
    }
  };

  return (
    <>
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

      {/* -------- móvil -------- */}
      <ol className="card divide-y divide-line-soft md:hidden">
        {sorted.map((r, i) => {
          const d = destacado(r);
          const podio = i === 0 ? "bg-brand-soft/50 border-l-4 border-l-brand"
            : i === 1 ? "bg-surface-2 border-l-4 border-l-line"
            : i === 2 ? "bg-tier-bronce/10 border-l-4 border-l-tier-bronce"
            : "border-l-4 border-l-transparent";
          return (
            <li key={r.playerId} className={podio}>
              <Link href={`/perfil/${r.playerId}`} className="flex items-center gap-3 px-3 py-3 hover:bg-surface-2">
                <span className={`grid size-7 flex-none place-items-center rounded-full font-display text-xs font-black tabular ${i === 0 ? "bg-brand/20 text-brand ring-1 ring-brand/40" : i === 1 ? "bg-surface-3 text-ink-2 ring-1 ring-line" : i === 2 ? "bg-tier-bronce/20 text-tier-bronce ring-1 ring-tier-bronce/40" : "text-muted"}`}>
                  {i + 1}
                </span>
                <span className="flex-none">{r.avatar}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.name}</span>
                  <span className="block truncate text-xs text-muted tabular">
                    <span className="text-win">{r.wins}</span>–<span className="text-loss">{r.losses}</span>–<span className="text-tie">{r.ties}</span>
                    {` · ${r.played} partidas`}
                    {r.torneos ? ` · ${r.torneos} torneo${r.torneos === 1 ? "" : "s"}` : ""}
                    {r.cp ? ` · ${r.cp} CP` : ""}
                  </span>
                  <span className="mt-1 block h-1 max-w-32 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(100, (r.winRate ?? 0) * 100))}%`,
                        background: r.winRate != null && r.winRate >= 0.5 ? "var(--win)" : "var(--loss)",
                      }}
                    />
                  </span>
                </span>
                {sort.key !== "points" && (
                  <span className="flex-none text-right">
                    <span className="block font-display text-xl font-extrabold tabular leading-none">{d.v}</span>
                    <span className="block text-[10px] uppercase tracking-wide text-muted">{d.l}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        {!sorted.length && <li className="px-4 py-8 text-center text-sm text-muted">Sin jugadores.</li>}
      </ol>

      {/* -------- escritorio -------- */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="tbl">
          <thead>
            <tr>
              <th className="w-10 text-center">#</th>
              <th>Jugador</th>
              <th>V–D–E</th>
              {COLS.map((c) => (
                <th key={c.key} className="text-right">
                  <button type="button" onClick={() => click(c.key)} className="hover:text-ink" title={c.label}>
                    {c.short}{sort.key === c.key && <span className="opacity-60"> {sort.dir < 0 ? "▼" : "▲"}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.playerId} className={i === 0 ? "bg-brand-soft/40 border-l-4 border-l-brand" : i === 1 ? "bg-surface-2/70 border-l-4 border-l-line" : i === 2 ? "bg-tier-bronce/10 border-l-4 border-l-tier-bronce" : "border-l-4 border-l-transparent hover:bg-surface-2"}>
                <td className="text-center">
                  <span className={`inline-grid size-6 place-items-center rounded-full font-display text-xs font-black tabular ${i === 0 ? "bg-brand/20 text-brand ring-1 ring-brand/40" : i === 1 ? "bg-surface-3 text-ink-2 ring-1 ring-line" : i === 2 ? "bg-tier-bronce/20 text-tier-bronce ring-1 ring-tier-bronce/40" : "text-muted"}`}>{i + 1}</span>
                </td>
                <td>
                  <Link href={`/perfil/${r.playerId}`} className="inline-flex items-center gap-2 hover:text-info">
                    <span className="flex-none">{r.avatarSm}</span>
                    <span className="font-semibold">{r.name}</span>
                    {/* v0.19: sin etiqueta de drop en el ranking (sigue en la ficha del torneo). */}
                  </Link>
                </td>
                <td className="font-mono text-[13px]">
                  <b className="text-win">{r.wins}</b>–<span className="text-loss">{r.losses}</span>–<span className="text-tie">{r.ties}</span>
                </td>
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
                <td className="text-right tabular">{r.played}</td>
                <td className="text-right tabular">{r.elo}</td>
                <td className="text-right tabular">{r.cp || "—"}</td>
                <td className="text-right tabular">{r.torneos || "—"}</td>
                <td className="text-right tabular">
                  {pct(r.cutRate, 0)}
                  {r.conCorte > 0 && <span className="ml-1 text-[11px] text-muted">{r.cortes}/{r.conCorte}</span>}
                </td>
                <td className="text-right tabular">{media(r.avgPlacement)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
