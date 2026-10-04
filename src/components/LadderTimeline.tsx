import { TIERS, rankOf } from "@/lib/rank";

/* =========================================================================
   v0.18 — Evolución del rango del líder del ladder, como serie temporal.

   SVG pintado en el servidor, sin librería: son una decena de puntos y no
   merece la pena mandar Recharts al móvil para esto. El eje X es el TIEMPO
   de verdad (no un punto por cambio), así que un mes sin tocar el rango se
   ve como un tramo plano largo, que es lo que pasó.

   Las líneas horizontales son los suelos de los tiers que caen dentro del
   rango pintado, con su color: se ve de un vistazo cuándo subió de Oro a
   Platino.
   ========================================================================= */

export type PuntoLadder = { elo: number; at: Date };

const W = 640;
const H = 200;
const M = { top: 12, right: 12, bottom: 24, left: 40 };

const fecha = (d: Date) =>
  d.toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });

export function LadderTimeline({ puntos }: { puntos: PuntoLadder[] }) {
  if (puntos.length < 2) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted">
        Todavía no hay suficientes cambios de rango esta temporada para dibujar la evolución.
      </p>
    );
  }

  const t0 = puntos[0].at.getTime();
  const t1 = Math.max(puntos[puntos.length - 1].at.getTime(), t0 + 1);
  const elos = puntos.map((p) => p.elo);
  const lo = Math.max(1, Math.min(...elos) - 25);
  const hi = Math.max(...elos) + 25;

  const x = (t: number) => M.left + ((t - t0) / (t1 - t0)) * (W - M.left - M.right);
  const y = (v: number) => M.top + (1 - (v - lo) / (hi - lo)) * (H - M.top - M.bottom);

  // Escalón: el rango se mantiene hasta el siguiente cambio.
  let d = `M${x(t0).toFixed(1)},${y(puntos[0].elo).toFixed(1)}`;
  for (let i = 1; i < puntos.length; i++) {
    const px = x(puntos[i].at.getTime()).toFixed(1);
    d += ` H${px} V${y(puntos[i].elo).toFixed(1)}`;
  }

  const suelos = TIERS.filter((t) => t.floor > lo && t.floor < hi);
  const ultimo = puntos[puntos.length - 1];
  const rank = rankOf(ultimo.elo);

  return (
    <figure className="px-2 pb-3 pt-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
        aria-label={`Evolución del rango: de ${puntos[0].elo} a ${ultimo.elo}`}>
        {suelos.map((t) => (
          <g key={t.id} data-tier={t.id}>
            <line x1={M.left} x2={W - M.right} y1={y(t.floor)} y2={y(t.floor)}
              stroke="var(--tier)" strokeDasharray="4 4" strokeOpacity="0.6" />
            <text x={W - M.right - 2} y={y(t.floor) - 3} textAnchor="end" fontSize="10" fill="var(--tier)">
              {t.label}
            </text>
          </g>
        ))}
        {[lo, hi].map((v) => (
          <text key={v} x={M.left - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--muted)"
            className="tabular">{Math.round(v)}</text>
        ))}
        <g data-tier={rank.tier.id}>
          <path d={d} fill="none" stroke="var(--tier)" strokeWidth="2.5" strokeLinejoin="round" />
          {puntos.map((p, i) => (
            <circle key={i} cx={x(p.at.getTime())} cy={y(p.elo)} r={i === puntos.length - 1 ? 4.5 : 3}
              fill={i === puntos.length - 1 ? "var(--tier)" : "var(--surface)"} stroke="var(--tier)" strokeWidth="2">
              <title>{`${fecha(p.at)} · ${p.elo}`}</title>
            </circle>
          ))}
        </g>
        <text x={M.left} y={H - 6} fontSize="10" fill="var(--muted)">{fecha(puntos[0].at)}</text>
        <text x={W - M.right} y={H - 6} fontSize="10" fill="var(--muted)" textAnchor="end">{fecha(ultimo.at)}</text>
      </svg>
    </figure>
  );
}
