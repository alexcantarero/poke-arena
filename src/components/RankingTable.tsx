"use client";

import { useState } from "react";
import Link from "next/link";
import { pct, wrColor } from "@/lib/format";

/** Fila ya aplanada en el servidor: el cliente solo ordena y pinta. */
export type RankRow = {
  playerId: string;
  name: string;
  color: string;
  played: number; wins: number; ties: number; losses: number;
  points: number; winRate: number | null; resistance: number | null;
  diff: number; elo: number;
  streakKind: string; streakN: number;
  topArchId: string | null; topArchName: string | null;
};

type Key = "played" | "winRate" | "points" | "elo" | "resistance" | "diff" | "streak";

const COLUMNS: Array<{ key: Key | null; label: string; num?: boolean }> = [
  { key: "played", label: "PJ", num: true },
  { key: null, label: "V–E–D" },
  { key: "winRate", label: "%V", num: true },
  { key: "points", label: "Pts", num: true },
  { key: "elo", label: "Elo", num: true },
  { key: "resistance", label: "Res.", num: true },
  { key: "diff", label: "Dif. juegos", num: true },
  { key: "streak", label: "Racha", num: true },
];

export function RankingTable({ rows }: { rows: RankRow[] }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "points", dir: -1 });

  const value = (r: RankRow, k: Key) => {
    if (k === "streak") return (r.streakKind === "w" ? 1 : r.streakKind === "l" ? -1 : 0) * r.streakN;
    const v = r[k];
    return v == null ? -1 : (v as number);
  };
  const sorted = [...rows].sort((a, b) => sort.dir * (value(a, sort.key) - value(b, sort.key)) || a.name.localeCompare(b.name));
  const click = (k: Key) => setSort((s) => (s.key === k ? { key: k, dir: (s.dir * -1) as 1 | -1 } : { key: k, dir: -1 }));

  return (
    <div className="tw">
      <table>
        <thead>
          <tr>
            <th className="rk">#</th>
            <th>Jugador</th>
            {COLUMNS.map((c) =>
              c.key ? (
                <th
                  key={c.label}
                  className={`sortable ${c.num ? "num" : ""}`}
                  onClick={() => click(c.key as Key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") click(c.key as Key); }}
                >
                  {c.label}
                  {sort.key === c.key && <span className="arw"> {sort.dir < 0 ? "▼" : "▲"}</span>}
                </th>
              ) : (
                <th key={c.label}>{c.label}</th>
              ),
            )}
            <th>Mazo habitual</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={11} className="empty">Sin jugadores en esta competición.</td></tr>
          )}
          {sorted.map((r, i) => (
            <tr key={r.playerId} className={i === 0 && sort.key === "points" && sort.dir === -1 ? "r1" : ""}>
              <td className="rk">{i + 1}</td>
              <td>
                <Link className="pl link-plain" href={`/perfil/${r.playerId}`}>
                  <span className="av" style={{ background: r.color }}>{r.name.slice(0, 1).toUpperCase()}</span>
                  <span className="pn">{r.name}</span>
                </Link>
              </td>
              <td className="num">{r.played}</td>
              <td>
                <span className="rec"><b>{r.wins}</b>–{r.ties > 0 && <><i>{r.ties}</i>–</>}<s>{r.losses}</s></span>
              </td>
              <td className="num" style={{ color: wrColor(r.winRate), fontWeight: 600 }}>{pct(r.winRate, 1)}</td>
              <td className="num" style={{ fontWeight: 700 }}>{r.points}</td>
              <td className="num">{r.elo}</td>
              <td className="num" style={{ color: "var(--muted)" }}>{pct(r.resistance, 1)}</td>
              <td className="num">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
              <td className="num">
                {r.streakN ? (
                  <span className={`chip ${r.streakKind === "w" ? "w" : r.streakKind === "l" ? "l" : "t"}`}>
                    {r.streakKind === "w" ? "V" : r.streakKind === "l" ? "D" : "E"}{r.streakN}
                  </span>
                ) : <span className="chip">—</span>}
              </td>
              <td>
                {r.topArchId
                  ? <Link className="link-plain" href={`/estadisticas?arch=${r.topArchId}`} style={{ fontSize: 12.5 }}>{r.topArchName}</Link>
                  : <span className="hint">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
