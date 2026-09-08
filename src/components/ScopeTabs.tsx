import Link from "next/link";
import { shortName } from "@/lib/format";

/**
 * Pestañas de ámbito (global / una competición). Son enlaces y no un select
 * para que se puedan compartir y para que funcionen sin JavaScript.
 */
export function ScopeTabs({
  basePath, param, current, options, allLabel = "Global",
}: {
  basePath: string;
  param: string;
  current: string;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
}) {
  if (!options.length) return null;
  return (
    <div className="scroll-x flex gap-2 pb-1">
      <Link
        href={basePath}
        aria-current={current === "all" ? "page" : undefined}
        className={`chip flex-none ${current === "all" ? "chip-brand" : ""}`}
      >
        {allLabel}
      </Link>
      {options.map((o) => (
        <Link
          key={o.value}
          href={`${basePath}?${param}=${encodeURIComponent(o.value)}`}
          aria-current={current === o.value ? "page" : undefined}
          className={`chip flex-none ${current === o.value ? "chip-brand" : ""}`}
        >
          {shortName(o.label, 22)}
        </Link>
      ))}
    </div>
  );
}
