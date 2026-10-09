"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

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
  puntos: Array<{ t: number; elo: number | null; matchId?: string | null; delta?: number | null }>;
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
  const alternar = (id: string) =>
    setElegidos((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const visibles = series.filter((s) => elegidos.has(s.id));
  // Eje por orden de partida: la etiqueta es la fecha de esa partida.
  const fechaDe = useMemo(() => new Map(fechas ?? []), [fechas]);
  const porOrden = Boolean(fechas);
  const etiquetaX = (t: number) => {
    if (!porOrden) return fecha(t);
    const iso = fechaDe.get(Math.round(t));
    return iso ? fecha(new Date(`${iso}T12:00:00Z`).getTime()) : `#${Math.round(t)}`;
  };
  const todos = visibles.flatMap((s) => s.puntos);
  const tiempos = todos.map((p) => p.t);
  const elos = todos.map((p) => p.elo).filter((v): v is number => v != null);

  if (!series.length) {
    return <p className="px-4 py-6 text-center text-sm text-muted">Todavía no hay cambios de rango que dibujar.</p>;
  }

  const tMin = tiempos.length ? Math.min(...tiempos) : Date.now();
  const tMax = tiempos.length ? Math.max(...tiempos, tMin + 86_400_000) : Date.now();
  const yMin = elos.length ? Math.max(0, Math.floor((Math.min(...elos) - 30) / 50) * 50) : 0;
  const yMax = elos.length ? Math.ceil((Math.max(...elos) + 30) / 50) * 50 : 2100;

  return (
    <div className="px-3 pb-3 pt-2 xs:px-4">
      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Jugadores en la gráfica">
        {series.map((s) => {
          const on = elegidos.has(s.id);
          return (
            <button key={s.id} type="button" onClick={() => alternar(s.id)} aria-pressed={on}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-opacity
                ${on ? "border-line bg-surface-2" : "border-line-soft opacity-50"}`}>
              <span className="size-2.5 flex-none rounded-full" style={{ background: s.color }} />
              {s.name}
            </button>
          );
        })}
        <button type="button" className="text-xs font-semibold text-info hover:underline"
          onClick={() => setElegidos(new Set(series.map((s) => s.id)))}>Todos</button>
        <button type="button" className="text-xs font-semibold text-muted hover:underline"
          onClick={() => setElegidos(new Set())}>Ninguno</button>
      </div>

      {visibles.length === 0 ? (
        <p className="grid h-48 place-items-center text-sm text-muted">Elige a alguien para ver su evolución.</p>
      ) : (
        <div className="h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
              <XAxis
                dataKey="t" type="number" scale={porOrden ? "linear" : "time"}
                domain={porOrden ? ["dataMin", "dataMax"] : [tMin, tMax]}
                tickFormatter={etiquetaX} tick={EJE} minTickGap={28} allowDuplicatedCategory={false}
              />
              <YAxis dataKey="elo" domain={[yMin, yMax]} tick={EJE} width={48} allowDecimals={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const t = Number(label);
                    const title = porOrden ? `Partida ${Math.round(t)} · ${etiquetaX(t)}` : fecha(t);
                    return (
                      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 10, fontSize: 12 }}>
                        <p style={{ margin: 0, fontWeight: "bold", marginBottom: 4 }}>{title}</p>
                        {payload.map((p: any, i: number) => (
                          <div key={i} style={{ color: p.color }}>
                            {p.name}: {p.value}
                            {p.payload.delta != null && (
                              <span className={p.payload.delta > 0 ? "text-win" : p.payload.delta < 0 ? "text-loss" : "text-muted"}>
                                {" "}{p.payload.delta > 0 ? `+${p.payload.delta}` : p.payload.delta}
                              </span>
                            )}
                            {p.payload.matchId && <div className="mt-0.5 opacity-60 font-mono text-[9px]">ID: {p.payload.matchId}</div>}
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
              {visibles.map((s) => (
                <Line key={s.id} data={s.puntos} dataKey="elo" name={s.name} type={porOrden ? "linear" : "monotone"}
                  stroke={s.color} strokeWidth={2.25} dot={{ r: 3 }} activeDot={{ r: 5 }}
                  connectNulls={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-1 text-[11px] text-muted">
        {pie ?? "Un punto por cada vez que alguien actualiza su rango."}{" "}
        <span className="font-semibold text-loss">Rojo</span>: reset de temporada.
      </p>
    </div>
  );
}




