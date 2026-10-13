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

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div>
          <h3 className="text-base font-bold text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {lastPoint && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-muted tabular">Último:</span>
            <span className="chip chip-brand font-bold tabular">
              {lastPoint.value} {valueLabel.toLowerCase()}
            </span>
            {lastPoint.avg7 !== undefined && (
              <span className="text-[11px] text-muted tabular">
                (media: {lastPoint.avg7})
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pointsWithAvg} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        <b className="tabular font-mono ml-auto">{point.value}</b>
                      </p>
                      {point.avg7 !== undefined && (
                        <p className="flex items-center gap-2 text-muted">
                          <span className="size-2 rounded-full border border-dashed border-[var(--muted)]" />
                          <span>{avgLabel}:</span>
                          <b className="tabular font-mono ml-auto">{point.avg7}</b>
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
              dataKey="value"
              name={valueLabel}
              stroke="var(--info)"
              strokeWidth={2}
              dot={{ r: 2, fill: "var(--info)" }}
              activeDot={{ r: 5 }}
            />
            {/* Línea discontinua de media móvil 7d */}
            <Line
              type="monotone"
              dataKey="avg7"
              name={avgLabel}
              stroke="var(--muted)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

