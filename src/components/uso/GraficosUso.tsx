import { spriteRotom, type FormaRotom } from "@/lib/rotom";
import { tr, trf, type Lang } from "@/lib/i18n";
import type { Estado, PuntoDia } from "@/lib/usoLimites";

/* =========================================================================
   v0.95 — Gráficos del panel de uso.

   SVG pintado en el servidor, sin JavaScript en el navegador: la página es de
   consulta, la abren pocos y casi siempre desde el móvil. Cada gráfico lleva
   `role="img"` con un resumen en texto (lo que leería un lector de pantalla) y
   cada barra su <title> (lo que sale al pasar el ratón o mantener pulsado).
   Nada depende solo del color: los estados llevan también su palabra.
   Los colores son variables del tema: claro y oscuro salen solos.
   ========================================================================= */

const COLOR: Record<Estado, string> = { ok: "var(--color-win)", aviso: "var(--color-brand)", riesgo: "var(--color-loss)" };
const fmt = (n: number, d = 0) => n.toLocaleString("es-ES", { maximumFractionDigits: d, minimumFractionDigits: d });

/** Un Rotom decorativo (el texto de al lado ya dice lo que hace falta). */
export function Rotom({ forma, size = 48, flota = 1, className = "" }: { forma: FormaRotom; size?: number; flota?: 0 | 1 | 2; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={spriteRotom(forma)} alt="" aria-hidden="true" loading="lazy" width={size} height={size}
      className={`object-contain ${flota === 1 ? "rotom-flota" : flota === 2 ? "rotom-flota-2" : ""} ${className}`}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}

/** Medidor circular de un límite, con su Rotom dentro. */
export function Medidor({
  pct, estado, etiqueta, usado, limite, real, forma, lng, proyeccion,
}: {
  pct: number; estado: Estado; etiqueta: string; usado: string; limite: string; real: boolean;
  forma: FormaRotom; lng: Lang; proyeccion?: string | null;
}) {
  const r = 42, c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  const porc = `${fmt(pct * 100, pct < 0.1 ? 1 : 0)} %`;
  return (
    <figure className="card flex flex-col items-center gap-1 p-3 text-center">
      <div className="relative size-28">
        <svg viewBox="0 0 100 100" className="size-28 -rotate-90" role="img"
          aria-label={`${etiqueta}: ${usado} / ${limite} (${porc}) · ${tr(lng, `uso.e.${estado}`)}`}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="10" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={COLOR[estado]} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${(c * p).toFixed(2)} ${c.toFixed(2)}`} />
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          <Rotom forma={forma} size={52} flota={0} />
        </span>
      </div>
      <figcaption className="min-w-0">
        <span className="block text-xs font-semibold leading-tight">{etiqueta}</span>
        <span className="block font-display text-xl font-black tabular" style={{ color: COLOR[estado] }}>{porc}</span>
        <span className="block font-mono text-[11px] tabular text-muted">{usado} / {limite}</span>
        <span className="mt-1 inline-flex flex-wrap justify-center gap-1">
          <span className={`chip text-[10px] ${real ? "chip-win" : ""}`}>{tr(lng, real ? "uso.real" : "uso.estimado")}</span>
          <span className="chip text-[10px]">{tr(lng, `uso.e.${estado}`)}</span>
        </span>
        {proyeccion && <span className="mt-1 block text-[11px] text-ink-2">{proyeccion}</span>}
      </figcaption>
    </figure>
  );
}

/** Mini medidor para la tarjeta de Ajustes. */
export function MiniMedidor({ pct, estado, etiqueta }: { pct: number; estado: Estado; etiqueta: string }) {
  const r = 15, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return (
    <span className="flex items-center gap-1.5">
      <svg viewBox="0 0 40 40" className="size-9 flex-none -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="6" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={COLOR[estado]} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${(c * p).toFixed(2)} ${c.toFixed(2)}`} />
      </svg>
      <span className="leading-tight">
        <span className="block text-[11px] text-muted">{etiqueta}</span>
        <span className="block font-display text-sm font-bold tabular">{fmt(pct * 100, pct < 0.1 ? 1 : 0)} %</span>
      </span>
    </span>
  );
}

const diaCorto = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
};

/** Barras por día: partidas apuntadas o corregidas, y la gente distinta como puntos. */
export function BarrasDias({ datos, lng, alto = 140 }: { datos: PuntoDia[]; lng: Lang; alto?: number }) {
  const W = 600, H = alto, pie = 18, arriba = 8;
  const max = Math.max(1, ...datos.map((d) => d.n));
  const ancho = W / Math.max(1, datos.length);
  const y = (v: number) => arriba + (H - pie - arriba) * (1 - v / max);
  const total = datos.reduce((s, d) => s + d.n, 0);
  const pico = datos.reduce((a, b) => (b.n > a.n ? b : a), datos[0] ?? { dia: "", n: 0, personas: 0 });
  const resumen = trf(lng, "uso.g.diasResumen", { n: total, d: datos.length, p: pico?.n ?? 0, f: pico ? diaCorto(pico.dia) : "—" });
  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[480px]" role="img" aria-label={resumen}>
        {[0.5, 1].map((f) => (
          <g key={f}>
            <line x1="0" x2={W} y1={y(max * f)} y2={y(max * f)} stroke="var(--color-line-soft)" strokeDasharray="3 4" />
            <text x={W - 2} y={y(max * f) - 3} textAnchor="end" fontSize="10" fill="var(--color-muted)">{fmt(max * f)}</text>
          </g>
        ))}
        {datos.map((d, i) => (
          <g key={d.dia}>
            <title>{`${diaCorto(d.dia)} · ${trf(lng, "uso.g.barraDia", { n: d.n, p: d.personas })}`}</title>
            <rect x={i * ancho + ancho * 0.15} width={ancho * 0.7} y={y(d.n)} height={Math.max(0, H - pie - y(d.n))}
              rx="2" fill="var(--series-1)" opacity={d.n ? 0.9 : 0.25} />
            {d.personas > 0 && <circle cx={i * ancho + ancho / 2} cy={y(d.n) - 5} r="2.6" fill="var(--color-brand)" />}
            {(i % 5 === 0 || i === datos.length - 1) && (
              <text x={i * ancho + ancho / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--color-muted)">{diaCorto(d.dia)}</text>
            )}
          </g>
        ))}
      </svg>
      <p className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-muted">
        <span><span className="mr-1 inline-block size-2.5 rounded-sm align-middle" style={{ background: "var(--series-1)" }} />{tr(lng, "uso.g.leyPartidas")}</span>
        <span><span className="mr-1 inline-block size-2.5 rounded-full align-middle" style={{ background: "var(--color-brand)" }} />{tr(lng, "uso.g.leyGente")}</span>
      </p>
    </div>
  );
}

/** 24 barras: a qué horas se usa la app (Madrid). */
export function BarrasHoras({ datos, lng }: { datos: number[]; lng: Lang }) {
  const W = 480, H = 120, pie = 16;
  const max = Math.max(1, ...datos);
  const ancho = W / 24;
  const horasConAlgo = datos.filter((n) => n > 0).length;
  const pico = datos.indexOf(Math.max(...datos));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
      aria-label={trf(lng, "uso.g.horasResumen", { n: horasConAlgo, h: pico })}>
      {datos.map((n, h) => {
        const alto = ((H - pie - 4) * n) / max;
        return (
          <g key={h}>
            <title>{`${String(h).padStart(2, "0")}:00 · ${n}`}</title>
            <rect x={h * ancho + 2} width={ancho - 4} y={H - pie - alto} height={alto} rx="2"
              fill={h === pico && n > 0 ? "var(--color-brand)" : "var(--series-3)"} opacity={n ? 0.95 : 0.2} />
            {h % 3 === 0 && <text x={h * ancho + ancho / 2} y={H - 3} textAnchor="middle" fontSize="10" fill="var(--color-muted)">{h}h</text>}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * La curva del periodo: lo gastado día a día (lecturas del cron), la línea del
 * límite y la proyección a fin de periodo en discontinua.
 */
export function CurvaPeriodo({
  serie, limite, proyeccion, unidad, lng, diasPeriodo = 30,
}: {
  serie: Array<{ fecha: string; valor: number }>; limite: number; proyeccion: number | null; unidad: string; lng: Lang; diasPeriodo?: number;
}) {
  const W = 600, H = 170, izq = 6, pie = 18, arriba = 12;
  if (serie.length < 2) {
    return <p className="rounded-lg bg-surface-2 px-3 py-4 text-center text-sm text-muted">{tr(lng, "uso.g.pocasLecturas")}</p>;
  }
  const t0 = new Date(`${serie[0].fecha}T00:00:00Z`).getTime();
  const dia = (f: string) => (new Date(`${f}T00:00:00Z`).getTime() - t0) / 86_400_000;
  const ultimo = serie[serie.length - 1];
  const maxY = Math.max(limite, proyeccion ?? 0, ...serie.map((p) => p.valor)) * 1.05;
  const x = (d: number) => izq + ((W - izq * 2) * d) / diasPeriodo;
  const y = (v: number) => arriba + (H - pie - arriba) * (1 - v / maxY);
  const linea = serie.map((p, i) => `${i ? "L" : "M"}${x(dia(p.fecha)).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const area = `${linea} L${x(dia(ultimo.fecha)).toFixed(1)},${y(0)} L${x(0)},${y(0)} Z`;
  const pasa = proyeccion != null && proyeccion > limite;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
      aria-label={trf(lng, "uso.g.curvaResumen", { v: fmt(ultimo.valor, 1), u: unidad, l: fmt(limite), p: proyeccion != null ? fmt(proyeccion, 1) : "—" })}>
      <line x1={x(0)} x2={x(diasPeriodo)} y1={y(limite)} y2={y(limite)} stroke="var(--color-loss)" strokeDasharray="6 4" />
      <text x={x(diasPeriodo)} y={y(limite) - 4} textAnchor="end" fontSize="11" fill="var(--color-loss)">{trf(lng, "uso.g.limite", { l: fmt(limite), u: unidad })}</text>
      <path d={area} fill="var(--series-1)" opacity="0.15" />
      <path d={linea} fill="none" stroke="var(--series-1)" strokeWidth="2.5" strokeLinejoin="round" />
      {proyeccion != null && (
        <line x1={x(dia(ultimo.fecha))} y1={y(ultimo.valor)} x2={x(diasPeriodo)} y2={y(proyeccion)}
          stroke={pasa ? "var(--color-loss)" : "var(--color-brand)"} strokeWidth="2" strokeDasharray="4 4" />
      )}
      {serie.map((p) => (
        <circle key={p.fecha} cx={x(dia(p.fecha))} cy={y(p.valor)} r="3" fill="var(--series-1)">
          <title>{`${diaCorto(p.fecha)} · ${fmt(p.valor, 2)} ${unidad}`}</title>
        </circle>
      ))}
      <text x={x(0)} y={H - 4} fontSize="10" fill="var(--color-muted)">{diaCorto(serie[0].fecha)}</text>
      <text x={x(diasPeriodo)} y={H - 4} textAnchor="end" fontSize="10" fill="var(--color-muted)">{tr(lng, "uso.g.finPeriodo")}</text>
    </svg>
  );
}

/** Barras horizontales: lo que ocupa cada tabla. */
export function BarrasTablas({ tablas, lng }: { tablas: Array<{ tabla: string; filas: number; bytes: number }>; lng: Lang }) {
  const max = Math.max(1, ...tablas.map((t) => t.bytes));
  const mb = (b: number) => (b >= 1e9 ? `${fmt(b / 1e9, 2)} GB` : b >= 1e6 ? `${fmt(b / 1e6, 1)} MB` : `${fmt(b / 1e3, 0)} kB`);
  return (
    <ul className="flex flex-col gap-1.5">
      {tablas.map((t) => (
        <li key={t.tabla} className="text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-mono">{t.tabla}</span>
            <span className="flex-none font-mono tabular text-muted">{fmt(t.filas)} {tr(lng, "uso.filas")} · {mb(t.bytes)}</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${((100 * t.bytes) / max).toFixed(1)}%`, background: "var(--series-2)" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
