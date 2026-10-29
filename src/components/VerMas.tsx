import type { ReactNode } from "react";

/* v0.76 — Enseña los primeros `n` y esconde el resto tras «Ver N más», con un
   <details> nativo: funciona sin JavaScript y en el servidor. Para las listas
   largas del perfil (torneos, últimas partidas), que ocupaban media página. */
export function VerMas({ items, n = 3, mas, menos, envolver = (x) => <>{x}</> }: {
  items: ReactNode[];
  n?: number;
  /** «Ver 5 más». */
  mas: (cuantos: number) => string;
  menos: string;
  /** Para meter cada tramo en su contenedor (p. ej. una lista). */
  envolver?: (hijos: ReactNode[]) => ReactNode;
}) {
  const primeros = items.slice(0, n);
  const resto = items.slice(n);
  return (
    <>
      {envolver(primeros)}
      {resto.length > 0 && (
        <details className="ver-mas group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 border-t border-line-soft text-sm font-semibold text-info hover:bg-surface-2">
            <span className="group-open:hidden">{mas(resto.length)}</span>
            <span className="hidden group-open:inline">{menos}</span>
            <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
          </summary>
          {envolver(resto)}
        </details>
      )}
    </>
  );
}
