import Link from "next/link";
import type { ReactNode } from "react";
import type { Archetype, MatchFull, PublicPlayer, Side } from "@/lib/types";
import { prettyPokemon, spriteUrl, typeOf } from "@/lib/pokemon";
import { outcome } from "@/lib/stats";
import { clamp, pct } from "@/lib/format";
import { Icon } from "./icons";

/* `Kpi` y los esqueletos viven en `primitives.tsx` y se reexportan aquí.
   
   No es manía de ordenar: este fichero importa `outcome` de `@/lib/stats`
   para pintar una partida, y `lib/stats` son ochocientas líneas. Un
   componente de cliente que solo quisiera un `Kpi` se llevaría todo eso al
   navegador. Separados, se lleva lo que usa. Las pantallas que ya importaban
   de aquí siguen funcionando igual. */
export {
  Kpi, Skeleton, SkeletonText, SkeletonCard, SkeletonRows, PageSkeleton,
} from "./primitives";

/* Piezas compartidas por todas las pantallas. Todas pensadas para que
   funcionen igual de bien en 375px de ancho que en un monitor. */

/* ------------------------------------------------------------- jugador -- */

const AV_SIZES = { sm: "size-7 text-[11px]", md: "size-9 text-sm", lg: "size-14 text-xl" } as const;

export function Avatar({
  player, size = "md",
}: { player?: PublicPlayer | null; size?: keyof typeof AV_SIZES }) {
  const cls = `relative flex-none grid place-items-center rounded-full font-display font-extrabold
               text-[#0d1424] overflow-hidden ${AV_SIZES[size]}`;

  if (!player) return <span className={cls} style={{ background: "var(--surface-3)" }}>?</span>;

  if (player.avatarKind === "pokemon" && player.avatarValue) {
    return (
      <span className={cls} style={{ background: player.color }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={spriteUrl(player.avatarValue)} alt=""
          className="size-full scale-110 object-contain" loading="lazy"
        />
      </span>
    );
  }
  if (player.avatarKind === "image" && player.avatarValue) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={player.avatarValue} alt="" className={`${cls} object-cover`} loading="lazy" />;
  }
  return (
    <span className={cls} style={{ background: player.color }}>
      {player.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function PlayerTag({
  player, size = "md", className = "",
}: { player?: PublicPlayer | null; size?: keyof typeof AV_SIZES; className?: string }) {
  if (!player) {
    return <span className="text-muted">Jugador borrado</span>;
  }
  return (
    <Link
      href={`/perfil/${player.id}`}
      className={`inline-flex min-w-0 items-center gap-2 hover:text-info ${className}`}
    >
      <Avatar player={player} size={size} />
      <span className="truncate font-semibold">{player.name}</span>
    </Link>
  );
}

/** Rival de fuera de la liga: mismo hueco visual, sin enlace. */
export function ExternalTag({ name }: { name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="grid size-9 flex-none place-items-center rounded-full border border-dashed border-line text-xs text-muted">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className="truncate font-semibold text-ink-2">{name}</span>
    </span>
  );
}

/* ---------------------------------------------------------- arquetipos -- */

const SPRITE_SIZES = { sm: "size-6", md: "size-8", lg: "size-12" } as const;

export function Sprites({
  archetype, size = "md",
}: { archetype?: Archetype | null; size?: keyof typeof SPRITE_SIZES }) {
  if (!archetype) {
    return <span className="grid size-6 flex-none place-items-center rounded-full bg-surface-3 text-[10px]">?</span>;
  }
  const list = [archetype.main, archetype.secondary].filter(Boolean);
  if (!list.length) {
    return (
      <span
        className="grid size-6 flex-none place-items-center rounded-full text-[10px] font-bold text-[#141414]"
        style={{ background: typeOf(archetype.type).color }}
      >
        {archetype.name.slice(0, 1)}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-none items-center">
      {list.map((slug, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slug}
          src={spriteUrl(slug)}
          alt={prettyPokemon(slug)}
          title={prettyPokemon(slug)}
          loading="lazy"
          className={`${SPRITE_SIZES[size]} flex-none object-contain ${i > 0 ? "-ml-2.5" : ""}`}
        />
      ))}
    </span>
  );
}

export function ArchTag({
  archetype, size = "sm", className = "",
}: { archetype?: Archetype | null; size?: keyof typeof SPRITE_SIZES; className?: string }) {
  if (!archetype) return <span className="text-sm text-muted">Sin mazo</span>;
  return (
    <Link
      href={`/estadisticas?arch=${archetype.id}`}
      className={`inline-flex min-w-0 items-center gap-1.5 hover:text-info ${className}`}
      title={archetype.name}
    >
      <Sprites archetype={archetype} size={size} />
      <span className="truncate text-sm">{archetype.name}</span>
    </Link>
  );
}

/* ----------------------------------------------------------- resultado -- */

/** Los juegos de la serie, como puntos. Se lee de un vistazo. */
export function Pips({ match, from }: { match: MatchFull; from: Side }) {
  return (
    <span className="inline-flex items-center gap-1" title="Juego a juego">
      {Array.from({ length: match.bestOf || 1 }, (_, i) => {
        const g = match.games[i];
        const cls = !g
          ? "border-muted/50 bg-transparent"
          : g.winner === "tie" ? "border-tie bg-tie"
          : g.winner === from ? "border-win bg-win"
          : "border-loss bg-loss";
        return <i key={i} className={`size-2 rounded-full border-2 ${cls}`} />;
      })}
    </span>
  );
}

/**
 * Un récord, en el orden en que se dice: **victorias – derrotas – empates**.
 *
 * Ojo con esto, que es la fuente de confusión número uno: aquí se escribía
 * V–E–D, y en Pokémon —y en cualquier torneo— se dice y se escribe V–D–E.
 * Un «3–1» siempre quiere decir tres victorias y una derrota. Los nombres de
 * los parámetros siguen siendo `w`, `d` (draws) y `l` para no tocar las seis
 * pantallas que lo usan; lo que cambia es el orden en que se pintan.
 *
 * El empate solo aparece si lo hay: un «3–1–0» es ruido.
 */
export function Record({ w, d, l }: { w: number; d: number; l: number }) {
  return (
    <span className="font-mono text-[13px] font-medium whitespace-nowrap" title="Victorias–derrotas–empates">
      <b className="text-win">{w}</b>
      –<span className="text-loss">{l}</span>
      {d > 0 && <>–<span className="text-tie">{d}</span></>}
    </span>
  );
}

export function StreakChip({ kind, n }: { kind: string; n: number }) {
  if (!n) return <span className="chip">—</span>;
  const cls = kind === "w" ? "chip-win" : kind === "l" ? "chip-loss" : "chip-tie";
  const label = kind === "w" ? "V" : kind === "l" ? "D" : "E";
  return <span className={`chip ${cls}`}>{label}{n}</span>;
}

/* ----------------------------------------------------------- estructura -- */

/**
 * La cabecera de una pantalla.
 *
 * `back` solo se pinta en móvil, y a propósito: en escritorio está la barra
 * lateral con la sección marcada, así que un "volver" ahí sobra. En el móvil
 * no hay barra lateral y la pantalla de detalle —una partida, un mazo, un
 * torneo— es un callejón sin salida si no la pones.
 */
export function PageHead({
  title, sub, actions, back, gradient,
}: {
  title: string;
  sub?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  /** Degradado de tinta a marca en el título. Solo para la portada: si lo
      lleva cada pantalla deja de significar nada. */
  gradient?: boolean;
}) {
  return (
    <div className="mb-5">
      {back && (
        <Link
          href={back.href}
          className="mb-2 -ml-1 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink md:hidden"
        >
          <Icon name="back" className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className={`text-3xl font-extrabold leading-none sm:text-4xl ${gradient ? "title-grad" : ""}`}>
            {title}
          </h1>
          {sub && <p className="mt-2 max-w-prose text-sm text-muted">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Empty({
  title, children, action, icon,
}: { title: string; children?: ReactNode; action?: ReactNode; icon?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      {icon && (
        <span className="grid size-12 place-items-center rounded-2xl border border-line-soft bg-surface-2 text-muted">
          <Icon name={icon} className="size-6" />
        </span>
      )}
      <h3 className="font-display text-xl font-bold text-ink-2">{title}</h3>
      {children && <p className="max-w-[46ch] text-sm text-muted">{children}</p>}
      {action}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-xl font-bold">{children}</h2>
      {aside && <div className="text-xs text-muted">{aside}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ gráficos -- */

export type BarRow = { label: ReactNode; value: number; right: string; color?: string };

export function Bars({ rows, max }: { rows: BarRow[]; max?: number }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2.5 text-[13px] sm:grid-cols-[minmax(0,12rem)_1fr_auto]">
          <div className="truncate">{r.label}</div>
          <div className="h-2 rounded-full bg-surface-3">
            <div
              className="h-full rounded-full"
              style={{ width: `${clamp((r.value / top) * 100, 0, 100).toFixed(1)}%`, background: r.color ?? "var(--series-1)" }}
            />
          </div>
          <div className="font-mono text-xs tabular text-ink-2">{r.right}</div>
        </div>
      ))}
    </div>
  );
}

export function Sparkline({
  values, width = 260, height = 46,
}: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <p className="text-sm text-muted">Sin datos suficientes</p>;
  const mn = Math.min(...values), mx = Math.max(...values);
  const pad = 4, span = mx - mn || 1;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (values.length - 1);
  const y = (v: number) => height - pad - ((v - mn) / span) * (height - pad * 2);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `M${x(0).toFixed(1)},${height - pad} L${pts.split(" ").join(" L")} L${x(values.length - 1).toFixed(1)},${height - pad} Z`;
  const last = values[values.length - 1];
  const color = last >= values[0] ? "var(--win)" : "var(--loss)";
  return (
    <svg className="block h-auto w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Evolución">
      <path d={area} fill={color} opacity="0.14" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx={x(values.length - 1).toFixed(1)} cy={y(last).toFixed(1)} r="2.8" fill={color} />
    </svg>
  );
}

export function SplitBar({ ratio }: { ratio: number }) {
  const w = clamp(ratio * 100, 0, 100);
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-surface-3">
      <i className="block h-full" style={{ width: `${w.toFixed(0)}%`, background: "var(--win)" }} />
      <i className="block h-full" style={{ width: `${(100 - w).toFixed(0)}%`, background: "var(--loss)" }} />
    </div>
  );
}

/* -------------------------------------------------------------- partida -- */

type MatchRowProps = {
  match: MatchFull;
  playerA?: PublicPlayer;
  playerB?: PublicPlayer;
  archA?: Archetype;
  archB?: Archetype;
  context?: string;
};

/** Ficha de partida. Es lo que se ve en móvil, y también dentro de la tabla. */
export function MatchCard({ match, playerA, playerB, archA, archB, context }: MatchRowProps) {
  const o = outcome(match);
  const wA = o.winner === "a", wB = o.winner === "b";
  return (
    <Link
      href={`/partidas/${match.id}`}
      className="block border-b border-line-soft px-4 py-3 last:border-b-0 hover:bg-surface-2 active:bg-surface-2"
    >
      <div className="mb-2 flex items-center gap-2 text-[11px] text-muted">
        <span className="font-mono">{match.date}</span>
        {context && <><span aria-hidden="true">·</span><span className="truncate">{context}</span></>}
        <span className="flex-1" />
        {match.tournamentId && match.round > 0 && <span className="chip">R{match.round}</span>}
        <span className="chip">Bo{match.bestOf}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Avatar player={playerA} size="sm" />
          <span className="min-w-0">
            <span className={`block truncate text-sm ${wA ? "font-bold" : "font-medium"}`}>{playerA?.name ?? "—"}</span>
            {/* El mazo con su sprite y no solo el nombre: en una lista larga se
                reconoce antes el dibujo que el texto. Lo pedía Alex. */}
            {archA && (
              <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted">
                <Sprites archetype={archA} size="sm" />
                <span className="truncate">{archA.name}</span>
              </span>
            )}
          </span>
        </div>

        <div className="flex-none text-center">
          <div className={`font-display text-lg font-extrabold tabular leading-none
            ${wA ? "text-win" : wB ? "text-loss" : "text-tie"}`}>
            {/* Sin desglose de juegos no hay marcador que enseñar: un «0–0»
                sería mentira, así que va la letra del resultado. */}
            {o.declared
              ? (wA ? "V" : wB ? "D" : "E")
              : <>{o.ga}–{o.gb}{o.ties ? `–${o.ties}` : ""}</>}
          </div>
          {!o.declared && <div className="mt-1 flex justify-center"><Pips match={match} from="a" /></div>}
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
          <span className="min-w-0">
            <span className={`block truncate text-sm ${wB ? "font-bold" : "font-medium"}`}>
              {playerB?.name ?? match.opponentName ?? "—"}
            </span>
            {archB && (
              <span className="flex min-w-0 items-center justify-end gap-1 text-[11px] text-muted">
                <span className="truncate">{archB.name}</span>
                <Sprites archetype={archB} size="sm" />
              </span>
            )}
          </span>
          {playerB
            ? <Avatar player={playerB} size="sm" />
            : <span className="grid size-7 flex-none place-items-center rounded-full border border-dashed border-line text-[11px] text-muted">
                {(match.opponentName ?? "?").slice(0, 1).toUpperCase()}
              </span>}
        </div>
      </div>
    </Link>
  );
}

/** Lista de partidas: tarjetas siempre, que en móvil es lo único que funciona. */
export function MatchList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-line-soft">{children}</div>;
}

export function pctText(v: number | null | undefined, digits = 0) {
  return pct(v, digits);
}
