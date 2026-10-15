import type { ReactNode } from "react";
import { Icon } from "./icons";
import { num } from "@/lib/format";

/* =========================================================================
   Piezas sueltas sin dependencias.

   Lo único que importan es el icono. Eso es lo que las hace utilizables
   desde un componente de cliente sin arrastrar `lib/stats`, `lib/pokemon` ni
   el resto de `ui.tsx` al paquete del navegador.

   Se reexportan desde `ui.tsx`, así que una pantalla puede seguir pidiéndolas
   allí; un componente de cliente las pide aquí.
   ========================================================================= */

/**
 * Un número grande con su etiqueta.
 *
 * `tone` tiñe el borde y la cifra según de dónde sale el dato —vuestro,
 * mundial, la diferencia entre los dos— o según si es bueno o malo. Es el
 * mismo código de color que la pantalla de estadísticas usa en las gráficas,
 * así que el ojo no tiene que aprender dos leyendas.
 *
 * `delta` es la diferencia contra otra cosa, en puntos. Lleva flecha y color
 * propios; en gris cuando es cero, porque "igual" también es una respuesta.
 */
type Tone = "neutral" | "brand" | "win" | "loss" | "local" | "global" | "diff";

const TONES: Record<Tone, { border: string; text: string; bg?: string }> = {
  neutral: { border: "var(--line)", text: "inherit" },
  brand: { border: "var(--brand-line)", text: "var(--brand)", bg: "var(--brand-soft)" },
  win: { border: "var(--win)", text: "var(--win)", bg: "var(--win-soft)" },
  loss: { border: "var(--loss)", text: "var(--loss)", bg: "var(--loss-soft)" },
  local: { border: "var(--source-local)", text: "var(--source-local)", bg: "var(--source-local-soft)" },
  global: { border: "var(--source-global)", text: "var(--source-global)", bg: "var(--source-global-soft)" },
  diff: { border: "var(--source-diff)", text: "var(--source-diff)", bg: "var(--source-diff-soft)" },
};

export function Kpi({
  label, value, note, highlight, tone, delta, icon,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  /** Atajo histórico de `tone="brand"`. Se mantiene para no tocar diez pantallas. */
  highlight?: boolean;
  tone?: Tone;
  /** Diferencia en puntos porcentuales contra la otra fuente. */
  delta?: number | null;
  icon?: string;
}) {
  const t = TONES[tone ?? (highlight ? "brand" : "neutral")];
  const long = typeof value === "string" && value.length > 11;
  const strong = t !== TONES.neutral;

  return (
    <div
      className="relative overflow-hidden rounded-xl border p-3 sm:p-4"
      style={{
        borderColor: strong ? `color-mix(in oklab, ${t.border} 45%, transparent)` : "var(--line)",
        background: strong && t.bg
          ? `linear-gradient(140deg, color-mix(in oklab, ${t.bg} 70%, var(--surface)), var(--surface) 70%)`
          : "var(--surface)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div className="flex items-center gap-1.5">
        {icon && <Icon name={icon} className="size-3.5 flex-none" style={{ color: strong ? t.text : "var(--muted)" }} />}
        {/* v0.34 — antes `truncate`: «Liga regular interna» salía como
            «LIGA REGULAR IN…». Dos líneas caben y se lee entero; el alto de
            la tarjeta ya lo iguala la rejilla. */}
        <span className="text-balance text-[10px] font-bold uppercase leading-tight tracking-[0.12em] text-muted">{label}</span>
      </div>

      <div
        className={`font-display font-extrabold tabular leading-none ${long ? "mt-1.5 text-lg" : "mt-1 text-3xl"}`}
        style={strong ? { color: t.text } : undefined}
      >
        {value}
      </div>

      {delta != null && Number.isFinite(delta) && (
        <div
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold tabular"
          style={{ color: delta > 0 ? "var(--win)" : delta < 0 ? "var(--loss)" : "var(--muted)" }}
        >
          <span aria-hidden="true">{delta > 0 ? "\u25b2" : delta < 0 ? "\u25bc" : "\u2013"}</span>
          {delta > 0 ? "+" : ""}{num(delta, 1)} pts
        </div>
      )}

      {note && <div className="mt-1 truncate text-xs text-muted">{note}</div>}
    </div>
  );
}

/* -------------------------------------------------------- esqueletos -- */

/* Lo que se ve mientras la base de datos contesta.
   
   La diferencia entre esto y un "cargando…" no es estética: en Vercel y Neon
   gratis la primera consulta después de un rato despierta la base de datos y
   tarda uno o dos segundos. Con una pantalla en blanco eso se lee como que la
   app está rota; con la forma del contenido ya dibujada se lee como que está
   llegando. Y como los huecos miden lo mismo que el contenido real, cuando
   llega no salta nada de sitio.
   
   Son componentes de servidor: no llevan estado ni "use client". */

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <span className={`skeleton block ${className}`} aria-hidden="true" />;
}

/** Varias líneas de texto, la última más corta, como un párrafo de verdad. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <span className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </span>
  );
}

/** El hueco de una tarjeta con cabecera y cuerpo. */
export function SkeletonCard({ height = "h-40" }: { height?: string }) {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="card-head">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="p-4">
        <Skeleton className={`w-full ${height}`} />
      </div>
    </div>
  );
}

/** Filas de una lista: avatar, dos líneas y una cifra a la derecha. */
export function SkeletonRows({ n = 5 }: { n?: number }) {
  return (
    <div className="divide-y divide-line-soft" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-9 flex-none rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-6 w-12 flex-none" />
        </div>
      ))}
    </div>
  );
}

/**
 * La pantalla entera mientras carga.
 *
 * Lleva `role="status"` y un texto solo para lectores: quien no ve la
 * animación tiene que enterarse igual de que hay algo en marcha, y un montón
 * de rectángulos grises no dice nada por sí solo.
 */
export function PageSkeleton({
  kpis = 4, cards = 2, rows = 0,
}: { kpis?: number; cards?: number; rows?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Cargando…</span>

      <div className="mb-5">
        <Skeleton className="h-9 w-56 sm:h-10" />
        <Skeleton className="mt-2.5 h-3.5 w-72 max-w-full" />
      </div>

      {kpis > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {Array.from({ length: kpis }, (_, i) => (
            <div key={i} className="card p-3 sm:p-4">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="mt-2 h-7 w-20" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      )}

      {cards > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: cards }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {rows > 0 && (
        <div className="card mt-4 overflow-hidden">
          <SkeletonRows n={rows} />
        </div>
      )}
    </div>
  );
}
