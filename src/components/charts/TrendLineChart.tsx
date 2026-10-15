"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { escalaRobusta } from "@/lib/escala";
import { num } from "@/lib/format";

export interface TrendPoint {
  date: string; // ISO YYYY-MM-DD
  value: number;
  avg7?: number;
}

interface TrendLineChartProps {
  data: TrendPoint[];
  title?: string;
  subtitle?: string;
  valueLabel?: string;
  avgLabel?: string;
  height?: number;
}

/** Formatea YYYY-MM-DD a fecha corta legible (ej. "12 oct.") en Europe/Madrid */
function formatShortDate(iso: string) {
  try {
    const parts = iso.split("-");
    if (parts.length === 3) {
      const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
      return new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "short",
        timeZone: "Europe/Madrid",
      }).format(d);
    }
  } catch {
    // fallback
  }
  return iso;
}

export function TrendLineChart({
  data,
  title = "Partidas por día",
  subtitle = "Serie diaria y media móvil de 7 días",
  valueLabel = "Partidas",
  avgLabel = "Media 7 días",
  height = 280,
}: TrendLineChartProps) {
  // Aseguramos el cálculo de la media móvil de 7 días si no viene precalculada
  const pointsWithAvg = useMemo(() => {
    return data.map((pt, i, arr) => {
      if (pt.avg7 !== undefined) return pt;
      const start = Math.max(0, i - 6);
      const window = arr.slice(start, i + 1);
      const sum = window.reduce((acc, curr) => acc + curr.value, 0);
      const avg = Number((sum / window.length).toFixed(1));
      return { ...pt, avg7: avg };
    });
  }, [data]);

  const lastPoint = pointsWithAvg[pointsWithAvg.length - 1];

  /* v0.42 — escala que no deja que un día raro aplaste a los demás. Ver
     `lib/escala.ts`: solo recorta si hay un atípico de verdad, y lo que queda
     fuera se dice debajo en texto. Recortar sin avisar sería mentir. */
  const escala = useMemo(() => escalaRobusta(pointsWithAvg.map((p) => p.value)), [pointsWithAvg]);
  const fueraDeEscala = escala.fuera.map((i) => pointsWithAvg[i]);

  /* v0.44 — se dibuja el valor RECORTADO al techo, no el real.

     En la v0.42 el recorte se hizo con `allowDataOverflow`, que le dice a
     Recharts que pinte la línea aunque se pase del eje: el pico se salía por
     encima de la tarjeta. Ahora la línea llega como mucho al techo, y el
     valor real sigue en el tooltip y en la nota de debajo. La media de 7 días
     también se recorta: cuando el día atípico entra en su ventana, ella
     también pasa del techo, y se salía igual. */
  const datosEje = useMemo(() => {
    const t = escala.techo;
    if (t == null) return pointsWithAvg.map((p) => ({ ...p, valorEje: p.value, mediaEje: p.avg7 }));
    return pointsWithAvg.map((p) => ({
      ...p,
      valorEje: Math.min(p.value, t),
      mediaEje: p.avg7 === undefined ? undefined : Math.min(p.avg7, t),
    }));
  }, [pointsWithAvg, escala.techo]);

  return (
    <div className="card min-w-0 overflow-hidden p-4">
      {/* v0.44 — `min-w-0`: dentro de una rejilla, sin esto la tarjeta no se
          encoge por debajo del ancho de su contenido y el contenedor responsivo
          de Recharts la empujaba fuera del cuadro. */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div>
          <h3 className="text-base font-bold text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {/* v0.42 — la cifra destacada es la MEDIA, no «hoy». El último punto
            de la serie es casi siempre el día en curso, que casi siempre va
            a cero porque no ha terminado: el chip dorado decía «0 partidas»
            y era lo primero que se leía de la gráfica. */}
        {lastPoint && lastPoint.avg7 !== undefined && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">{avgLabel}:</span>
            <span className="chip chip-brand font-bold tabular">{num(lastPoint.avg7, 1)}</span>
            <span className="text-[11px] text-muted tabular">hoy: {num(lastPoint.value)}</span>
          </div>
        )}
      </div>

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datosEje} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              stroke="var(--line)"
              minTickGap={28}
            />
            <YAxis
              allowDecimals={false}
              domain={escala.techo != null ? [0, escala.techo] : [0, "auto"]}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              stroke="var(--line)"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as TrendPoint;
                return (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
                    <p className="font-bold text-ink mb-1">{formatShortDate(point.date)}</p>
                    <div className="space-y-0.5 text-ink-2">
                      <p className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-[var(--info)]" />
                        <span>{valueLabel}:</span>
                        <b className="tabular font-mono ml-auto">{num(point.value)}</b>
                      </p>
                      {point.avg7 !== undefined && (
                        <p className="flex items-center gap-2 text-muted">
                          <span className="size-2 rounded-full border border-dashed border-[var(--muted)]" />
                          <span>{avgLabel}:</span>
                          <b className="tabular font-mono ml-auto">{num(point.avg7, 1)}</b>
                        </p>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            {/* Línea principal diaria */}
            <Line
              type="monotone"
              dataKey="valorEje"
              name={valueLabel}
              stroke="var(--info)"
              strokeWidth={2}
              dot={{ r: 2, fill: "var(--info)" }}
              activeDot={{ r: 5 }}
            />
            {/* Línea discontinua de media móvil 7d */}
            <Line
              type="monotone"
              dataKey="mediaEje"
              name={avgLabel}
              stroke="var(--muted)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {fueraDeEscala.length > 0 && (
        <p className="mt-2 text-[11px] text-muted">
          Fuera de escala, para que se lean los demás días:{" "}
          {fueraDeEscala.map((p, i) => (
            <span key={p.date}>
              {i > 0 && " · "}
              <b className="tabular text-ink-2">{num(p.value)}</b> el {formatShortDate(p.date)}
            </span>
          ))}
          .
        </p>
      )}
    </div>
  );
}

