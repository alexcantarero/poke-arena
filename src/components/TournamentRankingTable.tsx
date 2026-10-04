"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { pct, wrColor } from "@/lib/format";

/* =========================================================================
   v0.15 — Ranking de torneos: torneos jugados, V–D–E, conversión al top cut,
   puesto medio y CP. Mismo patrón que `RankingTable`: tarjetas en móvil,
   tabla en escritorio, avatar pintado en el servidor.

   La conversión enseña su denominador («1/2») porque solo cuenta torneos que
   tenían corte: sin eso, un 100% de un solo torneo y un 100% de diez se leen
   igual. Y un guion no es un 0%: es que no hay dato.
   ========================================================================= */

export type TourRankRow = {
  playerId: string;
  name: string;
  avatar: ReactNode;
  avatarSm: ReactNode;
  torneos: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number | null;
  conCorte: number;
  cortes: number;
  cutRate: number | null;
  avgPlacement: number | null;
  bestPlacement: number | null;
  drops: number;
  cp: number;
};

type Key = "cp" | "torneos" | "winRate" | "cutRate" | "avgPlacement" | "wins";

const COLS: Array<{ key: Key; label: string; short: string }> = [
  { key: "cp", label: "Championship Points", short: "CP" },
  { key: "torneos", label: "Torneos jugados", short: "Torneos" },
  { key: "wins", label: "Rondas ganadas", short: "V" },
  { key: "winRate", label: "% de victorias en rondas", short: "%V" },
  { key: "cutRate", label: "Conversión al top cut", short: "%Cut" },
  { key: "avgPlacement", label: "Puesto medio", short: "Media" },
];

/** El puesto medio ordena al revés: más bajo es mejor. */
const ASC_ES_MEJOR: Partial<Record<Key, true>> = { avgPlacement: true };

export function TournamentRankingTable({ rows, cpLabel }: { rows: TourRankRow[]; cpLabel: string }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "cp", dir: -1 });

  const val = (r: TourRankRow, k: Key): number => {
    const v = r[k];
    // Los vacíos, siempre al final, ordenes como ordenes.
    if (v == null) return sort.dir < 0 ? -Infinity : Infinity;
    return v as number;
  };
  const sorted = [...rows].sort((a, b) => {
    const va = val(a, sort.key), vb = val(b, sort.key);
    if (va === vb) return b.cp - a.cp || b.torneos - a.torneos || a.name.localeCompare(b.name, "es");
    return sort.dir * (va < vb ? -1 : 1);
  });
  const click = (k: Key) => setSort((s) => (s.key === k
    ? { key: k, dir: (s.dir * -1) as 1 | -1 }
    : { key: k, dir: ASC_ES_MEJOR[k] ? 1 : -1 }));

  const media = (v: number | null) => (v == null ? "—" : v.toFixed(1).replace(".", ","));
  const corte = (r: TourRankRow) => (r.cutRate == null ? "—" : `${pct(r.cutRate, 0)}`);

  if (!rows.length) {
    return (
      <p className="card px-4 py-8 text-center text-sm text-muted">
        Nadie tiene torneos con este filtro.
      </p>
    );
  }

  const destacado = (r: TourRankRow) => {
    switch (sort.key) {
      case "cp": return { v: r.cp, l: cpLabel };
      case "torneos": return { v: r.torneos, l: "torneos" };
      case "wins": return { v: r.wins, l: "rondas ganadas" };
      case "winRate": return { v: pct(r.winRate, 0), l: "%V" };
      case "cutRate": return { v: corte(r), l: r.conCorte ? `corte ${r.cortes}/${r.conCorte}` : "sin corte" };
      case "avgPlacement": return { v: media(r.avgPlacement), l: "puesto medio" };
      default: return { v: r.cp, l: cpLabel };
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
          return (
            <li key={r.playerId}>
              <Link href={`/perfil/${r.playerId}`} className="flex items-center gap-3 px-3 py-3 hover:bg-surface-2">
                <span className={`w-6 flex-none text-center font-display text-xl font-extrabold tabular ${i === 0 ? "text-brand" : "text-muted"}`}>
                  {i + 1}
                </span>
                <span className="flex-none">{r.avatar}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.name}</span>
                  <span className="block truncate text-xs text-muted tabular">
                    {r.torneos} torneo{r.torneos === 1 ? "" : "s"} ·{" "}
                    <span className="text-win">{r.wins}</span>–<span className="text-loss">{r.losses}</span>–<span className="text-tie">{r.ties}</span>
                    {" · "}media {media(r.avgPlacement)}
                    {r.conCorte ? ` · corte ${r.cortes}/${r.conCorte}` : ""}

                  </span>
                </span>
                <span className="flex-none text-right">
                  <span className="block font-display text-xl font-extrabold tabular leading-none">{d.v}</span>
                  <span className="block text-[10px] uppercase tracking-wide text-muted">{d.l}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {/* -------- escritorio -------- */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="tbl">
          <thead>
            <tr>
              <th className="w-10 text-center">#</th>
              <th>Jugador</th>
              <th>V–D–E</th>
              {COLS.filter((c) => c.key !== "wins").map((c) => (
                <th key={c.key} className="text-right">
                  <button type="button" onClick={() => click(c.key)} className="hover:text-ink" title={c.label}>
                    {c.short}{sort.key === c.key && <span className="opacity-60"> {sort.dir < 0 ? "▼" : "▲"}</span>}
                  </button>
                </th>
              ))}
              <th className="text-right">Mejor</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.playerId} className="hover:bg-surface-2">
                <td className={`text-center font-display text-lg font-extrabold tabular ${i === 0 ? "text-brand" : "text-muted"}`}>{i + 1}</td>
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
                <td className="text-right font-semibold tabular">{r.cp || "—"}</td>
                <td className="text-right tabular">{r.torneos}</td>
                <td className="text-right font-semibold tabular" style={{ color: wrColor(r.winRate) }}>{pct(r.winRate, 1)}</td>
                <td className="text-right tabular">
                  {corte(r)}
                  {r.conCorte > 0 && <span className="ml-1 text-[11px] text-muted">{r.cortes}/{r.conCorte}</span>}
                </td>
                <td className="text-right tabular">{media(r.avgPlacement)}</td>
                <td className="text-right tabular text-muted">{r.bestPlacement ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
