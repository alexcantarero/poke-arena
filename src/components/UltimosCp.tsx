import Link from "next/link";
import { fechaCorta, puestoTexto, type ResultadoConCp } from "@/lib/ultimosCp";

/* =========================================================================
   Los últimos resultados que dieron CP.

   v0.38 — sustituye a la gráfica de Elo de la portada. Esa gráfica tenía
   trece líneas de colores en las que no se distingue una de otra ni en un
   monitor grande, y contestaba una pregunta que el Ranking ya contesta
   mejor y con números. Lo que de verdad se mira de un vistazo es qué ha
   pasado en el circuito: quién fue, a qué, cuándo y cuántos puntos sacó.

   **Props-only, sin estado y sin imports de datos**, para que se pueda
   enchufar donde haga falta sin arrastrar nada: lo que entra ya viene
   calculado por `lib/cp.ts`, que es quien sabe de CP.
   ========================================================================= */

export function UltimosCp({
  filas,
  /** Dónde lleva «Ver todo». Por defecto, la lista de torneos. */
  verTodoHref = "/torneos",
}: {
  filas: ResultadoConCp[];
  verTodoHref?: string;
}) {
  if (!filas.length) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted">
          Todavía no hay resultados con Championship Points. Aparecerán aquí en cuanto alguien
          puntúe en un torneo sancionado.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-line-soft">
        {filas.map((f) => (
          <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
            {/* La fecha primero y de ancho fijo: es por lo que se recorre la
                lista con la vista, y si baila no se puede escanear. */}
            <span className="w-14 flex-none text-[11px] tabular text-muted">
              {fechaCorta(f.fecha)}
            </span>

            <span className="flex min-w-0 flex-1 flex-col">
              <Link href={`/torneos/${f.torneoId}`} className="truncate text-[13px] font-semibold hover:underline">
                {f.torneo}
              </Link>
              <span className="truncate text-[11px] text-muted">
                {f.tipo} · {puestoTexto(f.puesto)}
              </span>
            </span>

            <Link
              href={`/perfil/${f.jugadorId}`}
              className="hidden max-w-28 flex-none truncate text-[13px] hover:underline xs:block"
            >
              {f.jugador}
            </Link>

            <span className="w-14 flex-none text-right font-display text-base font-extrabold tabular text-brand">
              +{f.cp}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-t border-line-soft p-3">
        <Link href={verTodoHref} className="text-xs text-muted hover:underline">
          Ver todos los torneos →
        </Link>
      </div>
    </>
  );
}
