"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { pct, wrColor } from "@/lib/format";
import { num } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

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
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

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

  const media = (v: number | null) => num(v, 1);
  const corte = (r: TourRankRow) => (r.cutRate == null ? "—" : `${pct(r.cutRate, 0)}`);

  if (!rows.length) {
    return (
      <p className="card px-4 py-8 text-center text-sm text-muted">
        {tr(lng, "x.89a3c73f")}
      </p>
    );
  }

  const destacado = (r: TourRankRow) => {
    switch (sort.key) {
      case "cp": return { v: r.cp, l: cpLabel };
      case "torneos": return { v: r.torneos, l: "torneos" };
      case "wins": return { v: r.wins, l: tr(lng, "x.bd9480f2") };
      case "winRate": return { v: pct(r.winRate, 0), l: "%V" };
      case "cutRate": return { v: corte(r), l: r.conCorte ? `corte ${r.cortes}/${r.conCorte}` : tr(lng, "x.ebc2ebf2") };
      case "avgPlacement": return { v: media(r.avgPlacement), l: tr(lng, "x.faf6cb86") };
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
                    {r.torneos} torneo{r.torneos === 1 ? "" : "s"} ·{" "}
                    <span className="text-win">{r.wins}</span>–<span className="text-loss">{r.losses}</span>–<span className="text-tie">{r.ties}</span>
                    {" · "}media {media(r.avgPlacement)}
                    {r.conCorte ? ` · corte ${r.cortes}/${r.conCorte}` : ""}

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
              <th>{tr(lng, "x.588eb828")}</th>
              <th>{tr(lng, "x.e5f65dc6")}</th>
              {COLS.filter((c) => c.key !== "wins").map((c) => (
                <th key={c.key} className="text-right">
                  <button type="button" onClick={() => click(c.key)} className="hover:text-ink" title={c.label}>
                    {c.short}{sort.key === c.key && <span className="opacity-60"> {sort.dir < 0 ? "▼" : "▲"}</span>}
                  </button>
                </th>
              ))}
              <th className="text-right">{tr(lng, "x.fa3a0d02")}</th>
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
                <td className="text-right font-semibold tabular">{r.cp || "—"}</td>
                <td className="text-right tabular">{r.torneos}</td>
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
                <td className="text-right">
                  <span className="block tabular">{corte(r)}</span>
                  {r.conCorte > 0 && (
                    <>
                      <span className="ml-1 text-[11px] text-muted">{r.cortes}/{r.conCorte}</span>
                      <span className="ml-auto mt-1 block h-1 w-14 overflow-hidden rounded-full bg-surface-3">
                        <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(0, Math.min(100, (r.cutRate ?? 0) * 100))}%` }} />
                      </span>
                    </>
                  )}
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
