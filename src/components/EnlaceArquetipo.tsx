import Link from "next/link";
import { Sprites } from "@/components/ui";
import { etiquetaDeEnlace, urlDeArquetipo, type ClaveFiltro } from "@/lib/enlacesFiltro";
import type { Archetype } from "@/lib/types";

/* =========================================================================
   El nombre de un arquetipo en una gráfica, que además lleva a sus partidas.

   v0.37. Antes esto era un `<span>`: veías que con Dragapult vas al 61 % y
   para mirar esas partidas tenías que ir a Resultados y rearmar el filtro a
   mano. El filtro ya existía y ya viajaba en la URL; solo faltaba el enlace.

   Es un `<Link>` de verdad y no un `onClick`: se puede abrir en otra
   pestaña, se puede compartir, funciona sin JavaScript y el lector de
   pantalla lo anuncia como lo que es. Un `div` con `onClick` no hace nada de
   eso.
   ========================================================================= */

export function EnlaceArquetipo({
  arquetipo,
  filtroBase = {},
}: {
  arquetipo: Archetype | undefined;
  /** Los filtros que ya estaban puestos, para no sacarte de donde estabas. */
  filtroBase?: Partial<Record<ClaveFiltro, string>>;
}) {
  const contenido = (
    <>
      <Sprites archetype={arquetipo} size="sm" />
      <span className="truncate text-[13px]">{arquetipo?.name ?? "—"}</span>
    </>
  );

  // Sin arquetipo no hay nada que filtrar: se queda como texto.
  if (!arquetipo) {
    return <span className="inline-flex min-w-0 items-center gap-1.5">{contenido}</span>;
  }

  return (
    <Link
      href={urlDeArquetipo(arquetipo.id, filtroBase)}
      aria-label={etiquetaDeEnlace(arquetipo.name)}
      className="inline-flex min-w-0 items-center gap-1.5 rounded hover:underline
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
    >
      {contenido}
    </Link>
  );
}
