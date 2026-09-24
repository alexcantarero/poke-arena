"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { spriteUrl } from "@/lib/pokemon";

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
  /** Slugs del Pokémon principal y secundario, para pintar los sprites. */
  main?: string;
  secondary?: string;
  /** % de victorias de la liga, 0–1. */
  local?: number | null;
  /** % de victorias del metagame online de Limitless, 0–1. */
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
function Caja({ active, payload, label, names }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string;
  /** Los ejes van por id para poder buscar el sprite; aquí se traduce a nombre. */
  names?: Map<string, string>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-2.5 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{(label && names?.get(label)) || label}</p>
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

/* =========================================================================
   Ejes con sprites en vez de nombres.

   Petición del 16/09, y la razón es de espacio: "Marnie's Grimmsnarl ex"
   recortado a doce caracteres no identifica nada, y girado 35 grados se come
   56 píxeles de alto para seguir sin leerse. El dibujo del Pokémon se
   reconoce de un vistazo y ocupa 22 píxeles. Es la misma decisión que ya se
   tomó en la matriz de emparejamientos.

   El nombre no se pierde: va en el `<title>` del sprite —el globito del
   navegador— y en el recuadro que sale al pasar por encima de la barra.

   Cómo funciona por dentro: los ejes pasan a ir por **id** en vez de por
   nombre, porque el id es único y el nombre no tiene por qué serlo. Como
   entonces la etiqueta que le llega al tooltip es un id, se le pasa el
   diccionario `names` para que enseñe el nombre de verdad.

   Recharts clona el elemento que se le da en `tick` añadiéndole `x`, `y` y
   `payload`; el resto de props —aquí el diccionario de arquetipos— se
   conservan. Por eso esto es un elemento y no una función.
   ========================================================================= */

type TickRow = { name: string; main?: string; secondary?: string };

type TickProps = {
  x?: number | string;
  y?: number | string;
  payload?: { value?: any };
  /** id → arquetipo. Lo pone quien usa el eje. */
  rows?: Map<string, TickRow>;
};

/** Eje horizontal: el sprite debajo de cada barra. */
function TickSpriteX({ x = 0, y = 0, payload, rows }: TickProps) {
  const row = rows?.get(String(payload?.value ?? ""));
  // Un `<g/>` vacío y no `null`: el contrato de Recharts para `tick` pide un
  // elemento SVG, y devolver null lo rompe con el tipado estricto.
  if (!row) return <g />;
  const lista = esOtros(row.name) ? [] : ([row.main, row.secondary].filter(Boolean) as string[]);

  const nx = Number(x);
  const ny = Number(y);

  // «Other» y los arquetipos sin Pokémon comparten marcador: tres cartas
  // apiladas. Ver la explicación en `OtherMark` (ui.tsx) de por qué no es el
  // Substitute de Limitless.
  if (!lista.length) {
    return (
      <g transform={`translate(${nx - 9}, ${ny + 5})`}>
        <title>{row.name}</title>
        <MarcaOtros />
      </g>
    );
  }

  const ancho = lista.length > 1 ? 32 : 22;
  return (
    <g transform={`translate(${nx - ancho / 2}, ${ny + 4})`}>
      <title>{row.name}</title>
      {lista.map((slug, i) => (
        <image
          key={slug + i}
          href={spriteUrl(slug)}
          x={i === 0 ? 0 : 14}
          y={i === 0 ? 0 : 4}
          width={i === 0 ? 22 : 18}
          height={i === 0 ? 22 : 18}
          preserveAspectRatio="xMidYMid meet"
        />
      ))}
    </g>
  );
}

/** Eje vertical: el sprite y el nombre, que ahí sí cabe. */
function TickSpriteY({ x = 0, y = 0, payload, rows }: TickProps) {
  const row = rows?.get(String(payload?.value ?? ""));
  if (!row) return <g />;
  const otros = esOtros(row.name);
  const main = otros ? "" : row.main;
  const nx = Number(x);
  const ny = Number(y);
  return (
    <g transform={`translate(${nx - 90}, ${ny - 10})`}>
      <title>{row.name}</title>
      {main
        ? <image href={spriteUrl(main)} x={0} y={0} width={20} height={20}
            preserveAspectRatio="xMidYMid meet" />
        : <g transform="translate(1, 1)"><MarcaOtros /></g>}
      <text x={24} y={14} fontSize={11} fill="var(--muted)">
        {corto(row.name, 11)}
      </text>
    </g>
  );
}

/** El cajón de sastre de Limitless. Mismo criterio que `isOtherArchetype`. */
const esOtros = (name: string) => /^(other|others|otro|otros)$/i.test(name.trim());

/**
 * El marcador de «otros», en SVG para poder meterlo dentro de un eje.
 *
 * Es el mismo dibujo que `OtherMark` de `ui.tsx` —tres cartas apiladas—,
 * repetido aquí porque un eje de Recharts solo admite SVG y aquel es HTML.
 * Si se cambia uno, hay que cambiar el otro.
 */
function MarcaOtros() {
  return (
    <g fill="none" stroke="var(--muted)" strokeWidth="1.6" strokeLinejoin="round">
      <circle cx="9" cy="9" r="8.6" strokeDasharray="2.6 2.6" opacity="0.7" />
      <rect x="3.6" y="6.2" width="6.4" height="8.6" rx="1" />
      <path d="M6.7 4.7h4.9a1 1 0 0 1 1 1v7.1" />
      <path d="M9.6 3.3h4.4a1 1 0 0 1 1 1v6.6" />
    </g>
  );
}

/** id → nombre y sprites, que es lo que necesitan los ejes y el tooltip. */
function indexar(rows: ChartRow[]) {
  return {
    porId: new Map(rows.map((r) => [r.id, { name: r.name, main: r.main, secondary: r.secondary }])),
    nombres: new Map(rows.map((r) => [r.id, r.name])),
  };
}

/**
 * Porcentaje de victorias por arquetipo.
 * En modo comparación salen dos barras: la tuya y la del mundo.
 */
export function ArchetypeChart({
  rows, mode, limit = 8,
}: { rows: ChartRow[]; mode: "local" | "global" | "both"; limit?: number }) {
  const data = rows.slice(0, limit);
  const fuera = Math.max(0, rows.length - data.length);
  const { porId, nombres } = indexar(data);

  if (!data.length) return <Vacio />;

  return (
    <>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" vertical={false} />
            <XAxis
              dataKey="id" interval={0} height={34} tickLine={false}
              /* La forma de función y no `tick={<Elemento/>}`: Recharts
                 declara el prop como «elemento SVG o función que devuelve
                 uno», y un elemento con props propias no siempre encaja en
                 esa declaración. Con la función, lo que se comprueba es el
                 valor devuelto, que sí es un `<g>`. */
              tick={(props) => <TickSpriteX {...props} rows={porId} />}
            />
            <YAxis
              tick={EJE} domain={[0, 1]}
              tickFormatter={(v: number) => `${Math.round(v * 100)}`}
            />
            <Tooltip content={<Caja names={nombres} />} cursor={{ fill: "var(--surface-2)" }} />
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
    color: `var(--series-${(i % 7) + 1})`,
  }));
  const { porId, nombres } = indexar(data);
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
          <YAxis
            type="category" dataKey="id" width={96} tickLine={false}
            tick={(props) => <TickSpriteY {...props} rows={porId} />}
          />
          <Tooltip content={<Caja names={nombres} />} cursor={{ fill: "var(--surface-2)" }} />
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
