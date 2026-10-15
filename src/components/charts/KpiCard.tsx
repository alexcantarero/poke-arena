import type { ReactNode } from "react";

export type KpiColor = "green" | "yellow" | "red" | "blue" | "purple";

const BORDER_COLORS: Record<KpiColor, string> = {
  green: "var(--win)",
  yellow: "var(--brand-line, #d3a642)",
  red: "var(--loss)",
  blue: "var(--info)",
  purple: "var(--tier-maestro, #7d3fc0)",
};

interface KpiCardProps {
  label: string;
  value: ReactNode;
  sub: string;
  color?: KpiColor;
  className?: string;
}

/**
 * Tarjeta KPI con borde superior de color al estilo Argo CD.
 * Acepta tema claro/oscuro automáticamente mediante variables CSS.
 */
export function KpiCard({
  label,
  value,
  sub,
  color = "blue",
  className = "",
}: KpiCardProps) {
  return (
    <div
      className={`card flex flex-col justify-between p-4 border-t-4 transition-all ${className}`}
      style={{ borderTopColor: BORDER_COLORS[color] }}
    >
      <span className="min-w-0 w-full text-xs font-semibold uppercase tracking-wider text-muted leading-tight break-words">
        {label}
      </span>
      <div className="my-2 font-display text-3xl font-extrabold tabular text-ink sm:text-4xl">
        {value}
      </div>
      <p className="text-xs text-muted leading-tight">{sub}</p>
    </div>
  );
}

