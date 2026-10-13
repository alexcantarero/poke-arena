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
  ReferenceArea,
} from "recharts";

export interface HourlyPoint {
  hour: number; // 0 a 23
  seriesA: number; // p. ej. Liga
  seriesB: number; // p. ej. Torneos
}

interface HourlyChartProps {
  data: HourlyPoint[];
  seriesALabel?: string;
  seriesBLabel?: string;
  seriesAColor?: string;
  seriesBColor?: string;
  title?: string;
  subtitle?: string;
  peakHourStart?: number;
  peakHourEnd?: number;
  peakLabel?: string;
  height?: number;
}

export function HourlyChart({
  data,
  seriesALabel = "Liga",
  seriesBLabel = "Torneos",
  seriesAColor = "var(--info)",
  seriesBColor = "var(--brand, #8a5c0a)",
  title = "Distribución horaria",
  subtitle = "Partidas por hora del día (Europe/Madrid)",
  peakHourStart,
  peakHourEnd,
  peakLabel = "Hora pico",
  height = 280,
}: HourlyChartProps) {
  // Si no se especifica franja pico, la deducimos de la suma máxima de ambas series
  const detectedPeak = useMemo(() => {
    if (peakHourStart !== undefined && peakHourEnd !== undefined) {
      return { start: peakHourStart, end: peakHourEnd };
    }
    if (!data.length) return null;
    let maxTotal = -1;
    let peakH = 18;
    for (const d of data) {
      const tot = d.seriesA + d.seriesB;
      if (tot > maxTotal) {
        maxTotal = tot;
        peakH = d.hour;
      }
    }
    if (maxTotal <= 0) return null;
    return { start: Math.max(0, peakH - 1), end: Math.min(23, peakH + 1) };
  }, [data, peakHourStart, peakHourEnd]);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div>
          <h3 className="text-base font-bold text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: seriesAColor }} />
            <span className="text-muted">{seriesALabel}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: seriesBColor }} />
            <span className="text-muted">{seriesBLabel}</span>
          </span>
        </div>
      </div>

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" vertical={false} />
            <XAxis
              dataKey="hour"
              tickFormatter={(h: number) => `${h}:00`}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              stroke="var(--line)"
              ticks={[0, 4, 8, 12, 16, 20, 23]}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              stroke="var(--line)"
            />

            {detectedPeak && (
              <ReferenceArea
                x1={detectedPeak.start}
                x2={detectedPeak.end}
                fill="var(--series-1)"
                fillOpacity={0.12}
                stroke="var(--series-1)"
                strokeOpacity={0.25}
                strokeDasharray="2 2"
                label={{
                  value: peakLabel,
                  position: "top",
                  fontSize: 10,
                  fill: "var(--muted)",
                  fontWeight: 600,
                }}
              />
            )}

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const h = Number(label);
                return (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
                    <p className="font-bold text-ink mb-1">
                      {h.toString().padStart(2, "0")}:00 – {(h + 1).toString().padStart(2, "0")}:00
                    </p>
                    <div className="space-y-1 text-ink-2">
                      {payload.map((p, idx) => (
                        <p key={String(p.dataKey ?? idx)} className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ background: p.color }} />
                          <span>{p.name}:</span>
                          <b className="tabular font-mono ml-auto">{p.value}</b>
                        </p>
                      ))}
                    </div>
                  </div>
                );
              }}
            />

            <Line
              type="monotone"
              dataKey="seriesA"
              name={seriesALabel}
              stroke={seriesAColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="seriesB"
              name={seriesBLabel}
              stroke={seriesBColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
