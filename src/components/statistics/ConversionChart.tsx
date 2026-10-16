"use client";

import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   Cómo evoluciona la conversión mes a mes.

   Por mes y no por torneo, a propósito: con un punto por torneo cada valor
   es un 0% o un 100% —o entras en el corte o no— y la línea es un
   electrocardiograma que no enseña ninguna tendencia. Agrupando por mes ya
   hay algo que mirar.

   Los meses sin torneos **no salen**. Rellenarlos con ceros dibujaría caídas
   que no han pasado, que es la forma más fácil de mentir con una gráfica de
   líneas.

   `connectNulls` está puesto porque la conversión al corte puede faltar un
   mes entero —si ese mes ningún torneo tuvo top cut— y cortar la línea ahí
   daría a entender que se dejó de jugar.
   ========================================================================= */

export type ConversionPoint = {
  key: string;
  entries: number;
  cutRate: number | null;
  top8Rate: number | null;
  top4Rate: number | null;
  winRate: number | null;
};

const SERIES = [
  { key: "cutRate", name: "Top cut", color: "var(--series-1)" },
  { key: "top8Rate", name: "Top 8", color: "var(--series-3)" },
  { key: "top4Rate", name: "Top 4", color: "var(--series-2)" },
  { key: "winRate", name: "Ganados", color: "var(--brand)" },
] as const;

/** "2026-09" → "sep 26", que es lo que cabe en un eje de móvil. */
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const etiqueta = (key: string) => {
  const [y, m] = key.split("-");
  const i = Number(m) - 1;
  return `${MESES[i] ?? m} ${y.slice(2)}`;
};

function Caja({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | null; color?: string; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-2.5 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{label ? etiqueta(label) : ""}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-ink-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
          {p.name}: <b className="tabular">
            {p.value == null ? "sin dato" : `${Math.round(p.value * 100)}%`}
          </b>
        </p>
      ))}
    </div>
  );
}

export function ConversionChart({ points }: { points: ConversionPoint[] }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  if (points.length < 2) {
    return (
      <p className="grid h-40 place-items-center text-center text-sm text-muted">
        {tr(lng, "x.021abebc")}
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 8, left: -24, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" vertical={false} />
          <XAxis
            dataKey="key" tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickFormatter={etiqueta} interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted)" }} domain={[0, 1]}
            tickFormatter={(v: number) => `${Math.round(v * 100)}`}
          />
          <Tooltip content={<Caja />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 2.5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
