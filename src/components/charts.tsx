"use client";

import { useMemo, useState, type ReactNode } from "react";
import { clamp, pct } from "@/lib/format";

export { KpiCard, type KpiColor } from "./charts/KpiCard";
export { TrendLineChart, type TrendPoint } from "./charts/TrendLineChart";
export { HourlyChart, type HourlyPoint } from "./charts/HourlyChart";
export { RankingBars, type RankingItem } from "./charts/RankingBars";
export { SegmentedFilter, type FilterScope } from "./charts/SegmentedFilter";

/* =========================================================================
   Gráficos interactivos.

   SVG y React a secas: ni Recharts ni D3. No es purismo — el proyecto todavía
   no ha compilado nunca en la máquina de nadie, y meter una dependencia de
   dibujo por unas líneas y unas barras es un `npm install` más que puede
   fallar antes de que el resto llegue a funcionar.

   Los colores salen de las variables `--series-1..7` que ya están en
   `globals.css`, así que el tema claro y oscuro lo resuelve CSS y aquí no hay
   ni una línea de detección de tema.

   Regla de la paleta: **el color va pegado al jugador o al arquetipo, nunca a
   su puesto**. Por eso `seriesColor` hashea el identificador: quien sea es del
   mismo color esté primero o último, y una gráfica no cambia de colores porque
   alguien adelante a otro.
   ========================================================================= */

const SERIES = 7;

/** Hash estable de una cadena → var(--series-N). */
export function seriesColor(key: string, explicit?: string | null): string {
  if (explicit) return explicit;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `var(--series-${(Math.abs(h) % SERIES) + 1})`;
}

/** Marcas de eje redondas dentro de [min, max]. */
function ticksBetween(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min || 0];
  const rough = (max - min) / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step / 1000; v += step) {
    out.push(Math.round(v * 1e6) / 1e6);
  }
  return out.length ? out : [min, max];
}

/* ------------------------------------------------------------- tooltip -- */

type Tip = { x: number; y: number; body: ReactNode } | null;

function TipLayer({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[125%] rounded-lg
                 bg-ink px-2.5 py-1.5 text-[11px] leading-tight text-ground shadow-lg"
      style={{ left: `${tip.x}%`, top: `${tip.y}%` }}
    >
      {tip.body}
    </div>
  );
}

/* ------------------------------------------------- evolución de Elo ----- */

export type EloSeries = {
  id: string;
  label: string;
  color?: string | null;
  points: Array<{ date: string; value: number; matchId?: string | null; delta?: number | null }>;
};

/**
 * Elo de la liga a lo largo del tiempo, una línea por jugador.
 *
 * Interacción: la leyenda enciende y apaga series, y pulsando con Alt (o dos
 * veces) se queda solo una. Con seis jugadores el gráfico se lee; con doce hay
 * que poder aislar, y ese es el motivo de la leyenda pulsable.
 */
export function EloChart({ series, start = 1000 }: { series: EloSeries[]; start?: number }) {
  const [off, setOff] = useState<Set<string>>(new Set());
  const [tip, setTip] = useState<Tip>(null);

  const shown = series.filter((s) => !off.has(s.id) && s.points.length > 0);

  const geom = useMemo(() => {
    const values = shown.flatMap((s) => s.points.map((p) => p.value));
    const lo = values.length ? Math.min(...values, start) : start - 60;
    const hi = values.length ? Math.max(...values, start) : start + 60;
    const pad = Math.max(15, (hi - lo) * 0.12);
    const min = Math.floor((lo - pad) / 10) * 10;
    const max = Math.ceil((hi + pad) / 10) * 10;
    const longest = Math.max(2, ...shown.map((s) => s.points.length));
    return {
      min, max, longest,
      x: (i: number) => (i / (longest - 1)) * 100,
      y: (v: number) => 100 - ((v - min) / Math.max(1, max - min)) * 100,
    };
  }, [shown, start]);

  const toggle = (id: string, isolate: boolean) => {
    setOff((prev) => {
      if (isolate) {
        const onlyThis = prev.size === series.length - 1 && !prev.has(id);
        return onlyThis ? new Set() : new Set(series.filter((s) => s.id !== id).map((s) => s.id));
      }
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!series.length) {
    return <p className="px-4 py-8 text-center text-sm text-muted">Aún no hay partidas que dibujar.</p>;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="relative">
        {/* Las marcas del eje van en HTML y no en el SVG: así el texto no se
            deforma con `preserveAspectRatio="none"`. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {ticksBetween(geom.min, geom.max, 4).slice().reverse().map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span className="w-9 flex-none text-right font-mono text-[10px] tabular text-muted">{t}</span>
              <span className="h-px flex-1 bg-line-soft" />
            </div>
          ))}
        </div>

        <div className="relative ml-11 h-44">
          <svg
            className="block size-full overflow-visible"
            viewBox="0 0 100 100" preserveAspectRatio="none" role="img"
            aria-label={`Evolución del Elo de ${shown.length} jugadores`}
          >
            {/* La línea de salida: de dónde parte todo el mundo. */}
            <line
              x1="0" x2="100" y1={geom.y(start)} y2={geom.y(start)}
              stroke="var(--muted)" strokeWidth="0.4" strokeDasharray="1.5 1.5" opacity="0.5"
              vectorEffect="non-scaling-stroke"
            />
            {shown.map((s) => (
              <polyline
                key={s.id}
                points={s.points.map((p, i) => `${geom.x(i)},${geom.y(p.value)}`).join(" ")}
                fill="none" stroke={seriesColor(s.id, s.color)} strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* Los puntos van en HTML: un círculo dentro de un viewBox estirado
              saldría ovalado, y además así se pueden enfocar con el teclado. */}
          {shown.map((s) =>
            s.points.map((p, i) => (
              <button
                key={`${s.id}-${i}`}
                type="button"
                aria-label={`${s.label}: ${p.value} de Elo${p.date ? ` el ${p.date}` : ""}`}
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-surface
                           transition-transform hover:scale-150 focus-visible:scale-150"
                style={{
                  left: `${geom.x(i)}%`, top: `${geom.y(p.value)}%`,
                  background: seriesColor(s.id, s.color),
                }}
                onMouseEnter={() => setTip({
                  x: clamp(geom.x(i), 6, 94), y: geom.y(p.value),
                  body: (
                    <>
                      <b>{s.label}</b> · {p.value}
                      {p.delta != null && <span className={p.delta > 0 ? "text-win" : p.delta < 0 ? "text-loss" : "text-muted"}> {p.delta > 0 ? `+${p.delta}` : p.delta}</span>}
                      {p.date ? <span className="opacity-70"> · {p.date}</span> : null}
                      {p.matchId && <div className="mt-0.5 opacity-60 font-mono text-[9px]">ID: {p.matchId}</div>}
                    </>
                  ),
                })}
                onFocus={() => setTip({
                  x: clamp(geom.x(i), 6, 94), y: geom.y(p.value),
                  body: (
                    <>
                      <b>{s.label}</b> · {p.value}
                      {p.delta != null && <span className={p.delta > 0 ? "text-win" : p.delta < 0 ? "text-loss" : "text-muted"}> {p.delta > 0 ? `+${p.delta}` : p.delta}</span>}
                    </>
                  ),
                })}
                onMouseLeave={() => setTip(null)}
                onBlur={() => setTip(null)}
              />
            )),
          )}
          <TipLayer tip={tip} />
        </div>
      </div>

      <ul className="flex flex-wrap gap-1.5">
        {series.map((s) => {
          const hidden = off.has(s.id);
          const last = s.points[s.points.length - 1]?.value;
          return (
            <li key={s.id}>
              <button
                type="button"
                className={`chip ${hidden ? "opacity-45" : ""}`}
                aria-pressed={!hidden}
                title="Pulsa para esconder · doble clic para ver solo a esta persona"
                onClick={(e) => toggle(s.id, e.altKey)}
                onDoubleClick={() => toggle(s.id, true)}
              >
                <i
                  aria-hidden="true"
                  className="size-2.5 rounded-sm"
                  style={{ background: hidden ? "var(--muted)" : seriesColor(s.id, s.color) }}
                />
                {s.label}
                {last != null && <span className="font-mono tabular text-muted">{last}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------- reparto del metajuego -- */

export type MetaRow = {
  id: string;
  label: string;
  played: number;
  wins: number;
  ties: number;
  losses: number;
  sprite?: ReactNode;
};

/**
 * Qué se juega y qué funciona, con un interruptor entre las dos preguntas.
 *
 * Son la misma tabla mirada de dos maneras, y verlas por separado es lo que
 * hace evidente cuál es el mazo que todo el mundo juega y pierde.
 */
export function MetaChart({ rows }: { rows: MetaRow[] }) {
  const [mode, setMode] = useState<"share" | "wr">("share");
  const [tip, setTip] = useState<Tip>(null);

  const data = useMemo(() => {
    const total = rows.reduce((a, r) => a + r.played, 0) || 1;
    return rows
      .map((r) => ({
        ...r,
        share: r.played / total,
        wr: r.played ? (r.wins + r.ties * 0.5) / r.played : 0,
      }))
      .sort((a, b) => (mode === "share" ? b.share - a.share : b.wr - a.wr));
  }, [rows, mode]);

  const value = (r: (typeof data)[number]) => (mode === "share" ? r.share : r.wr);
  const top = Math.max(0.0001, ...data.map(value));

  if (!rows.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        Registra alguna partida con el mazo anotado y aquí sale el reparto.
      </p>
    );
  }

  return (
    <div className="relative flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {mode === "share"
            ? "Porcentaje de partidas jugadas con cada arquetipo."
            : "%V = (victorias + medio empate) ÷ partidas."}
        </p>
        <div className="seg flex-none">
          <button type="button" data-on={mode === "share"} onClick={() => setMode("share")}>Uso</button>
          <button type="button" data-on={mode === "wr"} onClick={() => setMode("wr")}>%V</button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {data.map((r, i) => (
          <div
            key={r.id}
            className="grid grid-cols-[minmax(0,9rem)_1fr_3.2rem] items-center gap-2.5 rounded-lg px-1 py-1.5
                       text-[13px] hover:bg-surface-2 sm:grid-cols-[minmax(0,12rem)_1fr_3.2rem]"
            onMouseEnter={() => setTip({
              x: 50, y: (i / Math.max(1, data.length)) * 100,
              body: <>
                <b>{r.label}</b> · {r.wins}–{r.losses}{r.ties ? `–${r.ties}` : ""} en {r.played}{" "}
                partida{r.played === 1 ? "" : "s"}
                <span className="opacity-70"> · {pct(r.share, 0)} del meta · {pct(r.wr, 0)} de victorias</span>
              </>,
            })}
            onMouseLeave={() => setTip(null)}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {r.sprite}
              <span className="truncate">{r.label}</span>
            </span>
            <span className="h-2 rounded-full bg-surface-3">
              <span
                className="block h-full rounded-full transition-[width] duration-300"
                style={{ width: `${((value(r) / top) * 100).toFixed(1)}%`, background: seriesColor(r.id) }}
              />
            </span>
            <span className="text-right font-mono text-xs tabular text-ink-2">
              {mode === "share" ? pct(r.share, 0) : pct(r.wr, 0)}
            </span>
          </div>
        ))}
      </div>
      <TipLayer tip={tip} />
    </div>
  );
}

/* ------------------------------------------------------ CP por contador -- */

export type CpBar = {
  bucket: string;
  label: string;
  total: number;
  /** CP que se han quedado fuera por el Best Finish Limit. */
  dropped: number;
  bfl: number;
  counting: number;
  entries: number;
};

/**
 * Championship Points por contador de Best Finish Limit, con lo descartado
 * en rayado encima.
 *
 * Ver lo que NO cuenta es la mitad del valor: es lo que responde a «¿me
 * merece la pena ir a otra Cup?» sin tener que abrir una hoja de cálculo.
 */
export function CpChart({ bars, season }: { bars: CpBar[]; season: number }) {
  const [showDropped, setShowDropped] = useState(true);
  const [tip, setTip] = useState<Tip>(null);

  const top = Math.max(1, ...bars.map((b) => b.total + (showDropped ? b.dropped : 0)));
  const lost = bars.reduce((a, b) => a + b.dropped, 0);

  if (!bars.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        Apunta un torneo de fuera y aquí verás tus CP de la temporada.
      </p>
    );
  }

  return (
    <div className="relative flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Temporada {season}
          {lost > 0 ? ` · ${lost} CP fuera por el límite` : " · nada descartado"}
        </p>
        {lost > 0 && (
          <label className="inline-flex flex-none items-center gap-2 text-xs">
            <input
              type="checkbox" className="size-4"
              checked={showDropped} onChange={(e) => setShowDropped(e.target.checked)}
            />
            Ver descartados
          </label>
        )}
      </div>

      <div className="flex items-end gap-2" style={{ height: "9rem" }}>
        {bars.map((b) => {
          const hCount = (b.total / top) * 100;
          const hDrop = showDropped ? (b.dropped / top) * 100 : 0;
          return (
            <button
              key={b.bucket}
              type="button"
              className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1 rounded-lg p-1 hover:bg-surface-2"
              onMouseEnter={() => setTip({
                x: 50, y: 0,
                body: <>
                  <b>{b.label}</b> · {b.total} CP
                  <span className="opacity-70">
                    {" · "}
                    {b.bfl > 0 ? `${b.counting} de ${b.bfl} huecos · ${b.entries} resultados` : `${b.entries} resultados, sin límite`}
                    {b.dropped > 0 ? ` · ${b.dropped} CP descartados` : ""}
                  </span>
                </>,
              })}
              onFocus={() => setTip(null)}
              onMouseLeave={() => setTip(null)}
            >
              <span className="text-center font-mono text-[11px] font-semibold tabular">{b.total}</span>
              <span
                className="w-full rounded-t-sm opacity-30"
                style={{ height: `${hDrop}%`, background: seriesColor(b.bucket) }}
                title={`${b.dropped} CP descartados`}
              />
              <span
                className="w-full rounded-b-sm"
                style={{ height: `${hCount}%`, background: seriesColor(b.bucket), minHeight: b.total > 0 ? 3 : 0 }}
              />
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        {bars.map((b) => (
          <span key={b.bucket} className="min-w-0 flex-1 truncate text-center text-[10px] text-muted">
            {b.label}
            {b.bfl > 0 && <span className="block font-mono tabular">{b.counting}/{b.bfl}</span>}
          </span>
        ))}
      </div>
      <TipLayer tip={tip} />
    </div>
  );
}
