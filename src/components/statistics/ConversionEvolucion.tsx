"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

/* =========================================================================
   v0.24 — Conversión mes a mes, por GRUPO, por JUGADOR o por MAZO.

   Una sola gráfica de líneas con tres vistas y tres métricas:
     · Vista: Grupo (todo junto) · Jugadores · Mazos (los 6 con más torneos).
     · Métrica: Top cut · Top 8 · 1.º puesto.
   Los meses sin torneos de alguien quedan como hueco (no como cero): la
   línea se corta en vez de inventar una caída. Encima, chips para quitar y
   poner líneas.
   ========================================================================= */

export type SerieConv = {
  id: string;
  name: string;
  color: string;
  /** Por mes ("2026-09"): tasas 0–1 y nº de resultados. */
  puntos: Array<{ key: string; entries: number; cutRate: number | null; top8Rate: number | null; winRate: number | null }>;
};

type Metrica = "cutRate" | "top8Rate" | "winRate";
const METRICAS: Array<{ v: Metrica; label: string }> = [
  { v: "cutRate", label: "Top cut" },
  { v: "top8Rate", label: "Top 8" },
  { v: "winRate", label: "1.º puesto" },
];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const etiqueta = (key: string) => `${MESES[Number(key.slice(5, 7)) - 1] ?? key.slice(5)} ${key.slice(2, 4)}`;
const EJE = { fontSize: 11, fill: "var(--muted)" } as const;

export function ConversionEvolucion({
  grupo, jugadores, mazos,
}: { grupo: SerieConv[]; jugadores: SerieConv[]; mazos: SerieConv[] }) {
  const [vista, setVista] = useState<"grupo" | "jugadores" | "mazos">("grupo");
  const [metrica, setMetrica] = useState<Metrica>("cutRate");
  const series = vista === "grupo" ? grupo : vista === "jugadores" ? jugadores : mazos;
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());

  // Filas por mes con una columna por serie: el formato que quiere Recharts.
  const datos = useMemo(() => {
    const meses = [...new Set(series.flatMap((s) => s.puntos.map((p) => p.key)))].sort();
    return meses.map((key) => {
      const fila: Record<string, number | string | null> = { key };
      for (const s of series) {
        const p = s.puntos.find((x) => x.key === key);
        fila[s.id] = p ? (p as Record<Metrica, number | null>)[metrica] : null;
        fila[`${s.id}__n`] = p?.entries ?? 0;
      }
      return fila;
    });
  }, [series, metrica]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="seg text-xs" role="tablist" aria-label="Ver por">
          {(["grupo", "jugadores", "mazos"] as const).map((v) => (
            <button key={v} type="button" data-on={vista === v} onClick={() => { setVista(v); setOcultos(new Set()); }}>
              {v === "grupo" ? "Grupo" : v === "jugadores" ? "Jugadores" : "Mazos"}
            </button>
          ))}
        </div>
        <div className="seg text-xs" role="tablist" aria-label="Métrica">
          {METRICAS.map((m) => (
            <button key={m.v} type="button" data-on={metrica === m.v} onClick={() => setMetrica(m.v)}>{m.label}</button>
          ))}
        </div>
      </div>

      {vista !== "grupo" && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {series.map((s) => {
            const on = !ocultos.has(s.id);
            return (
              <button key={s.id} type="button" aria-pressed={on}
                onClick={() => setOcultos((o) => { const n = new Set(o); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${on ? "border-line bg-surface-2" : "border-line-soft opacity-50"}`}>
                <span className="size-2.5 rounded-full" style={{ background: s.color }} />{s.name}
              </button>
            );
          })}
        </div>
      )}

      {datos.length < 2 ? (
        <p className="grid h-48 place-items-center text-sm text-muted">Hace falta más de un mes con torneos para ver la evolución.</p>
      ) : (
        <div className="h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datos} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
              <XAxis dataKey="key" tickFormatter={etiqueta} tick={EJE} minTickGap={16} />
              <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={EJE} width={44} />
              <Tooltip
                labelFormatter={(k) => etiqueta(String(k))}
                formatter={(v, name, item) => {
                  const n = (item?.payload as Record<string, number> | undefined)?.[`${String(item?.dataKey)}__n`] ?? 0;
                  return [v == null ? "sin dato" : `${Math.round(Number(v) * 100)}% · ${n} res.`, name as string];
                }}
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
              />
              {vista === "grupo" && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {series.filter((s) => !ocultos.has(s.id)).map((s) => (
                <Line key={s.id} dataKey={s.id} name={s.name} type="monotone" stroke={s.color} strokeWidth={2.25}
                  dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-1 text-[11px] text-muted">
        Cada punto es un mes; pasa el dedo para ver cuántos resultados hay detrás. Un hueco es un mes sin torneos, no un 0%.
      </p>
    </div>
  );
}
