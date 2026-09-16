"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

/* =========================================================================
   Las gráficas de la pantalla de estadísticas, con Recharts.

   Dos cosas que hay que respetar y que no son obvias:

   · **Los colores salen de variables CSS**, nunca de un hex escrito aquí. Si
     se escribe `#2a78d6` a pelo, el modo oscuro se queda con el color del
     claro y la gráfica es lo único de la pantalla que no cambia. Recharts
     acepta `var(--lo-que-sea)` en `fill` y `stroke` sin problema porque
     acaba en un atributo SVG.
   · **`ResponsiveContainer` necesita que el padre tenga altura**. Si el
     contenedor mide 0, la gráfica mide 0 y no se ve nada — es el error
     clásico. Por eso cada gráfica va dentro de un div con altura fija.

   Y una decisión de móvil: con más de ocho arquetipos las etiquetas del eje
   X no caben de ninguna manera, así que se recorta la lista y se dice
   cuántos se han dejado fuera. Preferible a un amasijo ilegible.
   ========================================================================= */

export type ChartRow = {
  id: string;
  name: string;
  /** % de victorias de la liga, 0–1. */
  local?: number | null;
  /** % de victorias del metagame mundial, 0–1. */
  global?: number | null;
  /** Cuota de uso, 0–1. */
  share?: number;
  played?: number;
};

const LOCAL = "var(--source-local)";
const GLOBAL = "var(--source-global)";

/** Nombre corto: "Marnie's Grimmsnarl ex" no cabe en un eje de móvil. */
const corto = (s: string, n = 12) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const pct = (v: number | null | undefined) =>
  v == null ? "—" : `${Math.round(v * 100)}%`;

/** El recuadro que sale al pasar por encima, con los colores de la app. */
function Caja({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-2.5 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-ink-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
          {p.name}: <b className="tabular">{pct(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

const EJE = { fontSize: 11, fill: "var(--muted)" } as const;

/**
 * Porcentaje de victorias por arquetipo.
 * En modo comparación salen dos barras: la tuya y la del mundo.
 */
export function ArchetypeChart({
  rows, mode, limit = 8,
}: { rows: ChartRow[]; mode: "local" | "global" | "both"; limit?: number }) {
  const data = rows.slice(0, limit).map((r) => ({
    ...r,
    corto: corto(r.name),
  }));
  const fuera = Math.max(0, rows.length - data.length);

  if (!data.length) return <Vacio />;

  return (
    <>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" vertical={false} />
            <XAxis dataKey="corto" tick={EJE} interval={0} angle={-35} textAnchor="end" height={56} />
            <YAxis
              tick={EJE} domain={[0, 1]}
              tickFormatter={(v: number) => `${Math.round(v * 100)}`}
            />
            <Tooltip content={<Caja />} cursor={{ fill: "var(--surface-2)" }} />
            {mode === "both" && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {(mode === "local" || mode === "both") && (
              <Bar dataKey="local" name="Tu liga" fill={LOCAL} radius={[3, 3, 0, 0]} />
            )}
            {(mode === "global" || mode === "both") && (
              <Bar dataKey="global" name="Mundial" fill={GLOBAL} radius={[3, 3, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {fuera > 0 && (
        <p className="mt-1 text-xs text-muted">
          Se enseñan los {limit} más jugados; quedan {fuera} fuera.
        </p>
      )}
    </>
  );
}

/** Cuota de uso: qué parte del metagame es cada mazo. */
export function ShareChart({ rows, limit = 10 }: { rows: ChartRow[]; limit?: number }) {
  const data = rows.slice(0, limit).map((r, i) => ({
    ...r,
    corto: corto(r.name, 16),
    color: `var(--series-${(i % 7) + 1})`,
  }));
  if (!data.length) return <Vacio />;

  return (
    <div className="w-full" style={{ height: Math.max(180, data.length * 26 + 24) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" horizontal={false} />
          <XAxis
            type="number" tick={EJE} domain={[0, "dataMax"]}
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          />
          <YAxis type="category" dataKey="corto" tick={EJE} width={92} />
          <Tooltip content={<Caja />} cursor={{ fill: "var(--surface-2)" }} />
          <Bar dataKey="share" name="Cuota" radius={[0, 3, 3, 0]}>
            {data.map((d) => <Cell key={d.id} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Vacio() {
  return (
    <p className="grid h-40 place-items-center text-center text-sm text-muted">
      Aún no hay datos con estos filtros.
    </p>
  );
}
