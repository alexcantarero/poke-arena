import Link from "next/link";
import { shortName } from "@/lib/format";

/**
 * Pestañas de ámbito (global / una competición). Son enlaces y no un select
 * para que se puedan compartir y para que funcionen sin JavaScript.
 *
 * `keep` son los demás parámetros de la URL que la pantalla quiere conservar
 * al cambiar de pestaña. Existe porque en Mazos conviven las pestañas con un
 * buscador: sin esto, tocar una pestaña borraba el texto escrito, que es justo
 * lo que no quieres cuando estás buscando algo entre sesenta mazos.
 */
export function ScopeTabs({
  basePath, param, current, options, allLabel = "Global", keep,
}: {
  basePath: string;
  param: string;
  current: string;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
  keep?: Record<string, string | null | undefined>;
}) {
  if (!options.length) return null;

  const href = (value?: string) => {
    const sp = new URLSearchParams();
    if (value) sp.set(param, value);
    for (const [k, v] of Object.entries(keep ?? {})) if (v) sp.set(k, v);
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="scroll-x flex gap-2 pb-1">
      <Link
        href={href()}
        aria-current={current === "all" ? "page" : undefined}
        className={`chip flex-none ${current === "all" ? "chip-brand" : ""}`}
      >
        {allLabel}
      </Link>
      {options.map((o) => (
        <Link
          key={o.value}
          href={href(o.value)}
          aria-current={current === o.value ? "page" : undefined}
          className={`chip flex-none ${current === o.value ? "chip-brand" : ""}`}
        >
          {shortName(o.label, 22)}
        </Link>
      ))}
    </div>
  );
}
