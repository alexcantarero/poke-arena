"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";
import { coloresDistintos } from "@/lib/coloresSeries";
import { CALENDAR_KINDS } from "@/lib/calendar";

/* v0.108 — los torneos que se marcan en la línea del Elo (los que mueven el
   ranking de verdad). Las rondas de tienda u online no se marcan: serían
   puntos por todas partes. */
const TIPOS_MARCADOS = ["worlds", "international", "regional", "special", "league_cup", "league_challenge"];

/* =========================================================================
   v0.19 — Evolución del ladder: una línea por jugador, un punto por cada vez
   que alguien actualiza su rango, en tiempo real (el eje X son fechas, no
   «cambio 1, cambio 2»). Las líneas rojas verticales son los resets de
   temporada: ahí la línea se corta (ver `lib/ladderSeries.ts`).

   Encima, chips para elegir a quién se ve. Por defecto, los cinco con más
   rango ahora mismo: con quince líneas a la vez no se lee nada.
   ========================================================================= */

export type SerieLadder = {
  id: string;
  name: string;
  color: string;
  /** Rango actual (null si no tiene: p. ej. tras un reset). */
  actual: number | null;
  /** `hoy` (v0.126): el último punto del Elo, la Forma de hoy; la línea llega hasta él aunque haya un hueco largo. */
  puntos: Array<{ t: number; elo: number | null; matchId?: string | null; delta?: number | null; torneo?: string; tipo?: string; hoy?: boolean }>;
};

const EJE = { fontSize: 11, fill: "var(--muted)" } as const;
const fecha = (t: number) =>
  new Date(t).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });

export function LadderChart({
  series, resets, inicial = 5, destacados = [], pie, etiquetaReset = "Reset", fechas,
}: {
  /** v0.24: si viene, el eje X es el Nº DE PARTIDA y esto da su fecha. */
  fechas?: Array<[number, string]>;
  series: SerieLadder[]; resets: number[]; inicial?: number;
  /** v0.22: ids que salen marcados sí o sí (p. ej. el dueño del perfil). */
  destacados?: string[];
  /** v0.22: texto bajo la gráfica (la del Elo no habla de «rango»). */
  pie?: string;
  etiquetaReset?: string;
}) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const porDefecto = useMemo(
    () => new Set([
      ...destacados.filter((d) => series.some((s) => s.id === d)),
      ...[...series]
        .sort((a, b) => (b.actual ?? -1) - (a.actual ?? -1) || b.puntos.length - a.puntos.length)
        .slice(0, Math.max(0, inicial - destacados.length))
        .map((s) => s.id),
    ]),
    [series, inicial, destacados],
  );
  const [elegidos, setElegidos] = useState<Set<string>>(porDefecto);
  /* v0.120 — el selector de personas, más claro: atajos (destacados, top 5,
     todos, ninguno), cada chip con su puesto y su cifra actual, y a partir de
     ocho personas el resto plegado bajo «+N más» (los elegidos siempre a la vista). */
  const [verTodos, setVerTodos] = useState(false);
  const ranking = useMemo(
    () => [...series].sort((a, b) => (b.actual ?? -1) - (a.actual ?? -1) || a.name.localeCompare(b.name)),
    [series],
  );
  const puestoDe = useMemo(() => new Map(ranking.map((s, i) => [s.id, i + 1])), [ranking]);
  const MAX_CHIPS = 8;
  /* v0.56 — el periodo: con meses de datos, los puntos se amontonaban. Por
     defecto, los últimos tres meses; «Todo» sigue a un toque. */
  const [periodo, setPeriodo] = useState<30 | 90 | 0>(90);
  const alternar = (id: string) =>
    setElegidos((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const seriesOrdenadas = [...series].sort((a, b) =>
    Number(elegidos.has(b.id)) - Number(elegidos.has(a.id))
    || (b.actual ?? -1) - (a.actual ?? -1)
    || a.name.localeCompare(b.name, lng === "en" ? "en" : "es"),
  );
  const visiblesBase = series.filter((s) => elegidos.has(s.id));
  /* v0.107 — colores que no se confunden ENTRE LAS LÍNEAS VISIBLES (ver
     `lib/coloresSeries.ts`): Rol y Niccolo salían los dos en rosa. Los chips
     apagados conservan el color de su perfil. */
  const colores = useMemo(
    () => coloresDistintos(seriesOrdenadas.filter((s) => elegidos.has(s.id)).map((s) => ({ id: s.id, color: s.color }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, elegidos],
  );
  const colorDe = (s: SerieLadder) => colores.get(s.id) ?? s.color;
  /* v0.107 — foco: al pasar por un chip o una línea, las demás se apagan. */
  const [foco, setFoco] = useState<string | null>(null);
  /* v0.108 — marcas de torneo en la línea (rombo del color del tipo). */
  const [marcarTorneos, setMarcarTorneos] = useState(true);
  const opacidad = (id: string) => (foco && foco !== id ? 0.15 : 1);
  // Eje por orden de partida: la etiqueta es la fecha de esa partida.
  const fechaDe = useMemo(() => new Map(fechas ?? []), [fechas]);
  const porOrden = Boolean(fechas);

  /* v0.56 — la fecha de un punto: en la vista por partida, la de esa partida; en
     la de tiempo, la del propio eje. */
  const fechaPunto = (t: number): string | null =>
    porOrden ? fechaDe.get(Math.round(t)) ?? null : new Date(t).toISOString().slice(0, 10);
  // El periodo se cuenta desde el ÚLTIMO dato, no desde hoy: si la liga lleva
  // unas semanas parada, la gráfica no se queda vacía.
  const ultimoDato = visiblesBase.flatMap((s) => s.puntos.map((p) => fechaPunto(p.t) ?? "")).sort().at(-1) || null;
  const corte = periodo && ultimoDato
    ? new Date(Date.parse(`${ultimoDato}T00:00:00Z`) - periodo * 86400000).toISOString().slice(0, 10)
    : null;
  /** Días sin jugar a partir de los cuales la línea se corta en vez de unir los puntos. */
  const HUECO_DIAS = 10; // v0.107: 14 → 10, menos rayas largas entre partidas sueltas
  const visibles = visiblesBase.map((s) => {
    const pts = s.puntos.filter((p) => !corte || (fechaPunto(p.t) ?? "") >= corte);
    if (!porOrden) return { ...s, puntos: pts };
    /* En la vista por partida, si alguien pasa más de dos semanas sin jugar, la
       línea se CORTA: unir esos puntos dibujaba una raya larga que parecía una
       evolución y no lo era. En la de Ladder no: ahí un hueco es que el rango se
       mantuvo. */
    const out: typeof pts = [];
    pts.forEach((p, i) => {
      if (i > 0) {
        const a = fechaPunto(pts[i - 1].t), b = fechaPunto(p.t);
        // v0.126 — hasta el punto de HOY no se corta: esa bajada es justo lo que hay que ver.
        if (!p.hoy && a && b && (Date.parse(b) - Date.parse(a)) / 86400000 > HUECO_DIAS) {
          out.push({ t: (pts[i - 1].t + p.t) / 2, elo: null });
        }
      }
      out.push(p);
    });
    return { ...s, puntos: out };
  });
  const etiquetaX = (t: number) => {
    if (!porOrden) return fecha(t);
    const iso = fechaDe.get(Math.round(t));
    return iso ? fecha(new Date(`${iso}T12:00:00Z`).getTime()) : `#${Math.round(t)}`;
  };
  const todos = visibles.flatMap((s) => s.puntos);
  const tiempos = todos.map((p) => p.t);
  const elos = todos.map((p) => p.elo).filter((v): v is number => v != null);

  /* v0.51 — en el modo «por partida» (el Elo), el eje es el número de partida y
     varias partidas del mismo día comparten fecha: Recharts repartía las marcas
     por posición y salían «26 sept, 26 sept». Ahora se marca solo la PRIMERA
     partida de cada día, y como mucho cinco, repartidas. Sin hooks a propósito:
     es un cálculo, y así no hay orden de hooks que romper. */
  let ticksOrden: number[] | undefined;
  if (porOrden) {
    const vistos = new Set<string>();
    const primeros: number[] = [];
    for (const t of [...new Set(tiempos)].sort((a, b) => a - b)) {
      const f = fechaDe.get(Math.round(t));
      if (f && !vistos.has(f)) { vistos.add(f); primeros.push(t); }
    }
    const MAX = 5;
    ticksOrden = primeros.length <= MAX
      ? primeros
      : Array.from({ length: MAX }, (_, i) => primeros[Math.round((i * (primeros.length - 1)) / (MAX - 1))]);
  }

  if (!series.length) {
    return <p className="px-4 py-6 text-center text-sm text-muted">{tr(lng, "x.a09d71cd")}</p>;
  }

  const tMin = tiempos.length ? Math.min(...tiempos) : Date.now();
  const tMax = tiempos.length ? Math.max(...tiempos, tMin + 86_400_000) : Date.now();
  const yMin = elos.length ? Math.max(0, Math.floor((Math.min(...elos) - 30) / 50) * 50) : 0;
  const yMax = elos.length ? Math.ceil((Math.max(...elos) + 30) / 50) * 50 : 2100;

  return (
    <div className="px-3 pb-3 pt-2 xs:px-4">
      <div className="mb-2 flex flex-wrap items-center gap-1.5" role="group" aria-label={tr(lng, "x.1467d2cd")}>
        {/* v0.120 — atajos */}
        <div className="mb-1 flex w-full flex-wrap items-center gap-1.5">
          {destacados.some((d) => series.some((x) => x.id === d)) && (
            <button type="button" className="chip" onClick={() => setElegidos(new Set(destacados.filter((d) => series.some((x) => x.id === d))))}>
              {tr(lng, "v120.selYo")}
            </button>
          )}
          <button type="button" className="chip" onClick={() => setElegidos(new Set(ranking.slice(0, 5).map((x) => x.id)))}>{tr(lng, "v120.selTop5")}</button>
          <button type="button" className="chip" onClick={() => setElegidos(new Set(series.map((x) => x.id)))}>{tr(lng, "x.a4114a83")}</button>
          <button type="button" className="chip" onClick={() => setElegidos(new Set())}>{tr(lng, "x.f3c24118")}</button>
          <span className="ml-auto text-[11px] text-muted tabular">
            {trf(lng, "elo.seleccionadas", { n: visiblesBase.length, total: series.length })}
          </span>
        </div>
        {seriesOrdenadas.filter((s, i) => verTodos || elegidos.has(s.id) || i < MAX_CHIPS).map((s) => {
          const on = elegidos.has(s.id);
          return (
            <button key={s.id} type="button" onClick={() => alternar(s.id)} aria-pressed={on}
              onMouseEnter={() => on && setFoco(s.id)} onMouseLeave={() => setFoco(null)}
              onFocus={() => on && setFoco(s.id)} onBlur={() => setFoco(null)}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-opacity
                ${on ? "bg-surface-2 text-ink shadow-xs" : "border-line-soft text-muted opacity-60"}`}
              style={on ? { borderColor: colorDe(s) } : undefined}>
              <span className="font-mono text-[10px] text-muted tabular">{puestoDe.get(s.id)}.</span>
              <span className="size-2.5 flex-none rounded-full" style={{ background: on ? colorDe(s) : s.color }} />
              {s.name}
              {s.actual != null && <span className="font-mono text-[10px] text-muted tabular">{Math.round(s.actual)}</span>}
            </button>
          );
        })}
        {!verTodos && seriesOrdenadas.filter((s, i) => !elegidos.has(s.id) && i >= MAX_CHIPS).length > 0 && (
          <button type="button" className="chip text-info" onClick={() => setVerTodos(true)}>
            {trf(lng, "v120.selMas", { n: seriesOrdenadas.filter((s, i) => !elegidos.has(s.id) && i >= MAX_CHIPS).length })}
          </button>
        )}
        {verTodos && series.length > MAX_CHIPS && (
          <button type="button" className="chip" onClick={() => setVerTodos(false)}>{tr(lng, "v120.selMenos")}</button>
        )}
      </div>

      {/* v0.56 — periodo: menos puntos, menos amontonados. */}
      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label={tr(lng, "elo.periodo")}>
        {([[30, "elo.mes"], [90, "elo.tresMeses"], [0, "elo.todo"]] as const).map(([d, k]) => (
          <button key={d} type="button" aria-pressed={periodo === d} onClick={() => setPeriodo(d)}
            className={`chip ${periodo === d ? "chip-brand" : ""}`}>{tr(lng, k)}</button>
        ))}
      </div>
      {/* v0.108 — leyenda de las marcas de torneo, con interruptor. */}
      {porOrden && (
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          <button type="button" aria-pressed={marcarTorneos} onClick={() => setMarcarTorneos((v) => !v)}
            className={`chip ${marcarTorneos ? "chip-brand" : ""}`}>◆ {tr(lng, "elo.marcarTorneos")}</button>
          {marcarTorneos && TIPOS_MARCADOS.filter((k) => visibles.some((s) => s.puntos.some((p) => p.tipo === k))).map((k) => (
            <span key={k} className="inline-flex items-center gap-1">
              <i className="inline-block size-2.5 rotate-45" style={{ background: CALENDAR_KINDS[k].color }} aria-hidden="true" />
              {CALENDAR_KINDS[k].label}
            </span>
          ))}
        </div>
      )}
      {visibles.length === 0 ? (
        <p className="grid h-48 place-items-center text-sm text-muted">{tr(lng, "x.923fbcf6")}</p>
      ) : (
        <div className="h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 8, right: 64, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
              <XAxis
                dataKey="t" type="number" scale={porOrden ? "linear" : "time"}
                domain={porOrden ? ["dataMin", "dataMax"] : [tMin, tMax]}
                tickFormatter={etiquetaX} tick={EJE} minTickGap={porOrden ? 4 : 28} allowDuplicatedCategory={false}
                ticks={ticksOrden}
              />
              <YAxis dataKey="elo" domain={[yMin, yMax]} tick={EJE} width={48} allowDecimals={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const t = Number(label);
                    const title = etiquetaX(t);
                    return (
                      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 10, fontSize: 12 }}>
                        <p style={{ margin: 0, fontWeight: "bold", marginBottom: 4 }}>{title}</p>
                        {[...payload].sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0)).map((p: any, i: number) => (
                          <div key={i} style={{ color: p.color }}>
                            {p.name}: {p.value}
                            {p.payload.torneo && (
                              <span className="ml-1 text-[11px] text-muted">· {p.payload.torneo}</span>
                            )}
                            {p.payload.delta != null && (
                              <span className={p.payload.delta > 0 ? "text-win" : p.payload.delta < 0 ? "text-loss" : "text-muted"}>
                                {" "}{p.payload.delta > 0 ? `+${p.payload.delta}` : p.payload.delta}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {resets.filter((r) => r >= tMin && r <= tMax).map((r) => (
                <ReferenceLine key={r} x={r} stroke="var(--loss)" strokeWidth={2}
                  label={{ value: etiquetaReset, position: "insideTopRight", fill: "var(--loss)", fontSize: 10 }} />
              ))}
              {visibles.map((s) => {
                /* v0.107 — al final de cada línea, su nombre y su Elo de ahora:
                   sin ir a la leyenda a buscar de quién es cada color. */
                let ultimo = -1;
                s.puntos.forEach((p, i) => { if (p.elo != null) ultimo = i; });
                const c = colorDe(s);
                return (
                  <Line key={s.id} data={s.puntos} dataKey="elo" name={s.name} type={porOrden ? "linear" : "stepAfter"} /* v0.51: un rango se mantiene hasta que se cambia; la curva suavizada se inventaba una caída gradual */
                    stroke={c} strokeWidth={foco === s.id ? 3.5 : 2.5} strokeOpacity={opacidad(s.id)}
                    dot={(d: { cx?: number; cy?: number; index?: number; payload?: { tipo?: string; elo?: number | null } }) => {
                      const k = `${s.id}-${d.index}`;
                      if (d.cx == null || d.cy == null || d.payload?.elo == null) return <g key={k} />;
                      const tipo = d.payload.tipo;
                      if (marcarTorneos && tipo && TIPOS_MARCADOS.includes(tipo)) {
                        const r = tipo === "regional" || tipo === "international" || tipo === "worlds" || tipo === "special" ? 6 : 4.5;
                        return (
                          <path key={k} d={`M${d.cx},${d.cy - r} L${d.cx + r},${d.cy} L${d.cx},${d.cy + r} L${d.cx - r},${d.cy} Z`}
                            fill={CALENDAR_KINDS[tipo]?.color ?? c} stroke="var(--surface)" strokeWidth={1.5} opacity={opacidad(s.id)} />
                        );
                      }
                      return visibles.length <= 6
                        ? <circle key={k} cx={d.cx} cy={d.cy} r={1.6} fill={c} fillOpacity={opacidad(s.id)} />
                        : <g key={k} />;
                    }}
                    activeDot={{ r: 4.5 }}
                    onMouseEnter={() => setFoco(s.id)} onMouseLeave={() => setFoco(null)}
                    label={(p: { index?: number; x?: number | string; y?: number | string; value?: unknown }) =>
                      p.index === ultimo && visibles.length <= 8 && p.x != null && p.y != null ? (
                        <text x={Number(p.x) + 5} y={Number(p.y) + 3.5} fontSize={10} fontWeight={700} fill={c} opacity={opacidad(s.id)}>
                          {`${s.name.split(" ")[0]} ${p.value}`}
                        </text>
                      ) : <g />}
                    connectNulls={false} isAnimationActive animationDuration={700} />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-1 text-[11px] text-muted">
        {pie ?? tr(lng, "x.0f902f4c")}{" "}
        <span className="font-semibold text-loss">{tr(lng, "x.696f8123")}</span>: reset de temporada.
      </p>
    </div>
  );
}
