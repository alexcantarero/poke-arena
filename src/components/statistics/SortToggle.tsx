import Link from "next/link";
import { Icon } from "@/components/icons";

/* =========================================================================
   Ordenar un gráfico de mayor a menor, o al revés.

   Descendente por defecto, porque lo primero que se busca en una lista de
   arquetipos es lo que más pesa. Ascendente sirve para la pregunta
   contraria, que también se hace: «¿qué es lo que menos se juega?», «¿con
   qué estamos perdiendo?».

   Va por URL como todo lo demás: se comparte el enlace ya ordenado y la
   vuelta atrás funciona. Y como es un enlace, funciona sin JavaScript.
   ========================================================================= */

export type SortDir = "desc" | "asc";

/** Ordena por un campo numérico, dejando los nulos siempre al final. */
export function sortRows<T>(rows: T[], valor: (r: T) => number | null | undefined, dir: SortDir): T[] {
  return [...rows].sort((a, b) => {
    const va = valor(a);
    const vb = valor(b);
    // Un arquetipo sin dato no es «el peor»: es que no hay dato. Al final en
    // los dos sentidos, para que no encabece la lista al ordenar ascendente.
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return dir === "desc" ? vb - va : va - vb;
  });
}

export function SortToggle({ dir, href }: { dir: SortDir; href: (d: SortDir) => string }) {
  return (
    <span className="seg flex-none text-[11px]" role="group" aria-label="Orden">
      {(["desc", "asc"] as const).map((d) => (
        <Link
          key={d}
          href={href(d)}
          data-on={dir === d ? "true" : "false"}
          aria-label={d === "desc" ? "De mayor a menor" : "De menor a mayor"}
          title={d === "desc" ? "De mayor a menor" : "De menor a mayor"}
          className="min-h-8 px-2"
        >
          <Icon name="back" className={`size-3.5 ${d === "desc" ? "-rotate-90" : "rotate-90"}`} />
        </Link>
      ))}
    </span>
  );
}
