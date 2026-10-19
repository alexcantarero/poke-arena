"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";
import { CLAVE_TIPO, COLOR_TIPO, TIPOS_PARTIDA, type TipoPartida } from "@/lib/tiposPartida";

/* =========================================================================
   Partidas por hora del día, por tipo.

   v0.50 — rehecha:
     · BARRAS APILADAS en vez de una curva suavizada. Son recuentos por hora:
       una curva se inventa valores entre una hora y la siguiente, y en la
       versión anterior se veían «montañas» donde no había partidas.
     · CUATRO tipos con su color —liga azul, presencial marrón, online verde,
       amistosos gris— en vez de dos. Antes «Torneos» incluía los amistosos.
     · Los tipos sin ninguna partida no salen en la leyenda: menos ruido.
   ========================================================================= */

export type HourlyPoint = { hour: number } & Record<TipoPartida, number>;

export function HourlyChart({ data }: { data: HourlyPoint[] }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const presentes = useMemo(
    () => TIPOS_PARTIDA.filter((t) => data.some((d) => d[t] > 0)),
    [data],
  );
  const pico = useMemo(() => {
    let mejor = -1, max = 0;
    for (const d of data) {
      const tot = TIPOS_PARTIDA.reduce((s, t) => s + d[t], 0);
      if (tot > max) { max = tot; mejor = d.hour; }
    }
    return mejor >= 0 ? { hora: mejor, total: max } : null;
  }, [data]);

  return (
    <div className="card min-w-0 overflow-hidden p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold">{tr(lng, "hora.titulo")}</h3>
          <p className="text-xs text-muted">{tr(lng, "hora.sub")}</p>
        </div>
        {pico && (
          <span className="chip text-[11px] tabular">
            {trf(lng, "hora.pico", { h: `${pico.hora}:00`, n: pico.total })}
          </span>
        )}
      </div>

      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {presentes.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: COLOR_TIPO[t] }} aria-hidden="true" />
            <span className="text-muted">{tr(lng, CLAVE_TIPO[t])}</span>
          </span>
        ))}
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 4, left: -24, bottom: 0 }} barCategoryGap={1}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line-soft)" />
            <XAxis
              dataKey="hour" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false}
              interval={0} tickFormatter={(h: number) => (h % 4 === 0 ? `${h}h` : "")}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as HourlyPoint;
                const total = TIPOS_PARTIDA.reduce((s, t) => s + p[t], 0);
                return (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[var(--shadow-2)]">
                    <div className="mb-1 font-bold tabular">{`${label}:00 – ${label}:59`} · {total}</div>
                    {TIPOS_PARTIDA.filter((t) => p[t] > 0).map((t) => (
                      <div key={t} className="flex items-center gap-2">
                        <span className="size-2 rounded-sm" style={{ background: COLOR_TIPO[t] }} />
                        <span className="text-muted">{tr(lng, CLAVE_TIPO[t])}</span>
                        <b className="ml-auto tabular">{p[t]}</b>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            {presentes.map((t, i) => (
              <Bar
                key={t} dataKey={t} stackId="h" fill={COLOR_TIPO[t]} isAnimationActive={false}
                radius={i === presentes.length - 1 ? [3, 3, 0, 0] : 0}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
