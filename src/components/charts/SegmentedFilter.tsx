"use client";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

export type FilterScope = "all" | "league" | "tournament";

interface SegmentedFilterProps {
  value: FilterScope;
  onChange: (value: FilterScope) => void;
  options?: Array<{ key: FilterScope; label: string }>;
  className?: string;
}

const DEFAULT_OPTIONS: Array<{ key: FilterScope; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "league", label: "Liga" },
  { key: "tournament", label: "Torneos" },
];

/**
 * Selector segmentado para filtrar colecciones de datos en gráficos.
 * Utiliza los estilos existentes `.seg` del sistema de diseño.
 */
export function SegmentedFilter({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  className = "",
}: SegmentedFilterProps) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  return (
    <nav
      className={`seg seg-brand inline-flex text-xs ${className}`}
      aria-label={tr(lng, "x.447234f8")}
    >
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          data-on={value === opt.key}
          aria-current={value === opt.key ? "page" : undefined}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </nav>
  );
}

