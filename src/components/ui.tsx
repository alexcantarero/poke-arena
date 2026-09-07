import Link from "next/link";
import type { ReactNode } from "react";
import type { Archetype, MatchFull, Player, Side } from "@/lib/types";
import { spriteUrl, typeOf, prettyPokemon } from "@/lib/pokemon";
import { outcome } from "@/lib/stats";
import { clamp } from "@/lib/format";

/* Piezas de presentación compartidas por todas las pantallas. */

export function Avatar({ player, size = "" }: { player?: Player | null; size?: "" | "sm" | "lg" }) {
  if (!player) return <span className={`av ${size}`} style={{ background: "var(--surface-3)" }}>?</span>;
  return (
    <span className={`av ${size}`} style={{ background: player.color }}>
      {player.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function PlayerTag({ player, size = "" }: { player?: Player | null; size?: "" | "sm" | "lg" }) {
  if (!player) return <span className="pl"><span className="pn" style={{ color: "var(--muted)" }}>Jugador borrado</span></span>;
  return (
    <Link className="pl link-plain" href={`/perfil/${player.id}`}>
      <Avatar player={player} size={size} />
      <span className="pn">{player.name}</span>
    </Link>
  );
}

/** Los dos Pokémon del arquetipo. Si el sprite no existe, queda el disco de color. */
export function Sprites({ archetype, size = "" }: { archetype?: Archetype | null; size?: "" | "sm" | "lg" }) {
  if (!archetype) return <span className="disc"><span style={{ background: "var(--surface-3)" }}>?</span></span>;
  const t = typeOf(archetype.type);
  const list = [archetype.main, archetype.secondary].filter(Boolean);
  if (!list.length) {
    return <span className="disc"><span style={{ background: t.color }}>{archetype.name.slice(0, 1)}</span></span>;
  }
  return (
    <span className="sprites">
      {list.map((slug) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slug}
          className={`sprite ${size}`}
          src={spriteUrl(slug)}
          alt={prettyPokemon(slug)}
          title={prettyPokemon(slug)}
          loading="lazy"
        />
      ))}
    </span>
  );
}

export function ArchTag({ archetype, withName = true }: { archetype?: Archetype | null; withName?: boolean }) {
  if (!archetype) return <span className="arch"><span className="an" style={{ color: "var(--muted)" }}>Sin mazo</span></span>;
  return (
    <Link className="arch link-plain" href={`/estadisticas?arch=${archetype.id}`} title={archetype.name}>
      <Sprites archetype={archetype} size="sm" />
      {withName && <span className="an">{archetype.name}</span>}
    </Link>
  );
}

export function Pips({ match, from }: { match: MatchFull; from: Side }) {
  const bo = match.bestOf || 1;
  return (
    <span className="pips" title="Juego a juego">
      {Array.from({ length: bo }, (_, i) => {
        const g = match.games[i];
        const cls = !g ? "o" : g.winner === "tie" ? "t" : g.winner === from ? "a" : "b";
        return <i key={i} className={`pip ${cls}`} />;
      })}
    </span>
  );
}

export function Record({ w, d, l }: { w: number; d: number; l: number }) {
  return (
    <span className="rec">
      <b>{w}</b>–{d > 0 && <><i>{d}</i>–</>}<s>{l}</s>
    </span>
  );
}

export function StreakChip({ kind, n }: { kind: string; n: number }) {
  if (!n) return <span className="chip">—</span>;
  const cls = kind === "w" ? "w" : kind === "l" ? "l" : "t";
  const label = kind === "w" ? "V" : kind === "l" ? "D" : "E";
  return <span className={`chip ${cls}`}>{label}{n}</span>;
}

export function Kpi({ label, value, note, highlight }: { label: string; value: ReactNode; note?: ReactNode; highlight?: boolean }) {
  const long = typeof value === "string" && value.length > 11;
  return (
    <div className={`kpi${highlight ? " hi" : ""}`}>
      <div className="k-lab">{label}</div>
      <div className={`k-val${long ? " sm" : ""}`}>{value}</div>
      <div className="k-note">{note}</div>
    </div>
  );
}

export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card empty">
      <h3>{title}</h3>
      {children && <p style={{ maxWidth: "46ch", margin: "0 auto 14px" }}>{children}</p>}
      {action}
    </div>
  );
}

export type BarRow = { label: ReactNode; value: number; right: string; color?: string };

export function Bars({ rows, max }: { rows: BarRow[]; max?: number }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bars">
      {rows.map((r, i) => (
        <div className="bar-row" key={i}>
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${clamp((r.value / top) * 100, 0, 100).toFixed(1)}%`, background: r.color }} />
          </div>
          <div className="bar-val">{r.right}</div>
        </div>
      ))}
    </div>
  );
}

export function Sparkline({ values, width = 260, height = 46 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <div className="hint">Sin datos suficientes</div>;
  const mn = Math.min(...values), mx = Math.max(...values);
  const pad = 4, span = mx - mn || 1;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (values.length - 1);
  const y = (v: number) => height - pad - ((v - mn) / span) * (height - pad * 2);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `M${x(0).toFixed(1)},${height - pad} L${pts.split(" ").join(" L")} L${x(values.length - 1).toFixed(1)},${height - pad} Z`;
  const last = values[values.length - 1];
  const color = last >= values[0] ? "var(--win)" : "var(--loss)";
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Evolución">
      <path d={area} fill={color} opacity="0.14" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx={x(values.length - 1).toFixed(1)} cy={y(last).toFixed(1)} r="2.8" fill={color} />
    </svg>
  );
}

export function MatchRow({
  match, playerA, playerB, archA, archB, compName,
}: {
  match: MatchFull; playerA?: Player; playerB?: Player;
  archA?: Archetype; archB?: Archetype; compName?: string;
}) {
  const o = outcome(match);
  const wA = o.winner === "a", wB = o.winner === "b";
  return (
    <tr>
      <td className="num" style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
        {match.date}
        {compName && (
          <><br /><span style={{ fontFamily: "var(--f-body)", fontSize: 11 }}>
            {compName}{match.round ? ` · J${match.round}` : ""}
          </span></>
        )}
      </td>
      <td style={{ textAlign: "right" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
          <div style={{ minWidth: 0, textAlign: "right" }}>
            <div style={{ fontWeight: wA ? 700 : 500 }}>{playerA?.name ?? "—"}</div>
            {archA && <div style={{ fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{archA.name}</div>}
          </div>
          <Avatar player={playerA} />
        </div>
      </td>
      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
        <div className="score" style={{ color: wA ? "var(--win)" : wB ? "var(--loss)" : "var(--tie)" }}>
          {o.ga}–{o.gb}{o.ties ? `–${o.ties}` : ""}
        </div>
        <div style={{ marginTop: 2 }}><Pips match={match} from="a" /></div>
      </td>
      <td>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Avatar player={playerB} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: wB ? 700 : 500 }}>{playerB?.name ?? "—"}</div>
            {archB && <div style={{ fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{archB.name}</div>}
          </div>
        </div>
      </td>
      <td className="num"><span className="chip">Bo{match.bestOf}</span></td>
      <td className="num">
        <Link className="btn btn-sm btn-ghost" href={`/partidas/${match.id}`}>Ver</Link>
      </td>
    </tr>
  );
}

export function MatchTable({ children }: { children: ReactNode }) {
  return (
    <div className="tw">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th style={{ textAlign: "right" }}>Jugador A</th>
            <th style={{ textAlign: "center" }}>Serie</th>
            <th>Jugador B</th>
            <th className="num">Fmt</th>
            <th />
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
