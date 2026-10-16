"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  Cell,
} from "recharts";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

export interface RankingItem {
  id: string;
  label: string;
  value: number;
  color?: string;
  sub?: string;
}

interface RankingBarsProps {
  items: RankingItem[];
  title?: string;
  subtitle?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
}

export function RankingBars({
  items,
  title = "Ranking",
  subtitle,
  height,
  valueFormatter = (v) => String(v),
}: RankingBarsProps) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  // Ajuste automático de altura según cantidad de barras si no se pasa explícita
  const chartHeight = height ?? Math.max(200, items.length * 36 + 40);

  return (
    <div className="card p-4">
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <h3 className="text-base font-bold text-ink">{title}</h3>}
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      )}

      <div style={{ width: "100%", height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={items}
            margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tick={{ fontSize: 12, fill: "var(--ink-2)", fontWeight: 500 }}
              stroke="none"
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as RankingItem;
                return (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
                    <p className="font-bold text-ink">{item.label}</p>
                    {item.sub && <p className="text-muted text-[11px] mb-1">{item.sub}</p>}
                    <p className="font-mono text-ink-2 font-semibold">
                      {tr(lng, "x.0d1aa244")} <b className="text-brand tabular">{valueFormatter(item.value)}</b>
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              barSize={18}
            >
              {items.map((entry, idx) => (
                <Cell
                  key={`cell-${entry.id}-${idx}`}
                  fill={entry.color || "var(--series-1)"}
                />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(val) => (typeof val === "number" ? valueFormatter(val) : String(val))}
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 600,
                  fill: "var(--muted)",
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

