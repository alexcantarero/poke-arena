import Link from "next/link";
import { setTournamentStatus } from "@/actions";
import { TOURNAMENT_STATUS, type TournamentStatus } from "@/lib/types";
import { fmtDateLong, isoInLeagueTz } from "@/lib/format";
import { Icon } from "./icons";

/* =========================================================================
   En qué punto está el torneo, y qué toca hacer ahora.

   Un torneo pasa por tres estados y cada uno tiene una sola acción evidente:

     Borrador  → abrirlo el día del evento
     En curso  → ir apuntando rondas, y cerrarlo cuando salga la clasificación
     Cerrado   → nada; si acaso, reabrirlo para corregir algo

   La barra existe porque sin ella no se sabía qué faltaba. Un torneo sin
   puesto podía ser «todavía no ha terminado» o «se me olvidó rellenarlo», y
   son cosas distintas: una no requiere nada y la otra sí.

   Los pasos de abajo no son decorativos — marcan lo que de verdad falta
   mirando los datos, así que un torneo al que le falte la asistencia lo dice
   aunque esté cerrado.
   ========================================================================= */

type Step = { label: string; done: boolean; hint?: string; href?: string };

export function TournamentLifecycle({
  id, status, closedAt, canManage, steps, roundsDone, totalRounds,
}: {
  id: string;
  status: TournamentStatus;
  closedAt: Date | null;
  /** Solo quien lo creó y los organizadores mueven el estado. */
  canManage: boolean;
  steps: Step[];
  roundsDone: number;
  totalRounds: number | null;
}) {
  const meta = TOURNAMENT_STATUS[status];
  const pending = steps.filter((s) => !s.done);

  return (
    <section className="card mb-5">
      <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-4 py-3">
        <span className={`chip ${meta.chip}`}>{meta.label}</span>
        <span className="min-w-0 flex-1 text-xs text-muted">
          {status === "closed" && closedAt
            ? `Cerrado el ${fmtDateLong(isoInLeagueTz(closedAt))}`
            : meta.hint}
          {status === "open" && totalRounds
            ? ` · ${roundsDone} de ${totalRounds} rondas`
            : status === "open" && roundsDone
              ? ` · ${roundsDone} ronda${roundsDone === 1 ? "" : "s"}`
              : ""}
        </span>

        {canManage && (
          <div className="flex flex-none flex-wrap gap-2">
            {status === "draft" && (
              <StatusButton id={id} to="open" className="btn btn-brand btn-sm">
                <Icon name="check" className="size-4" /> Empezar el torneo
              </StatusButton>
            )}
            {status === "open" && (
              <StatusButton id={id} to="closed" className="btn btn-sm">
                Cerrar torneo
              </StatusButton>
            )}
            {status === "closed" && (
              <StatusButton id={id} to="open" className="btn btn-ghost btn-sm">
                Reabrir
              </StatusButton>
            )}
            <Link className="btn btn-ghost btn-sm" href={`/torneos/${id}/editar`}>
              <Icon name="edit" className="size-4" /> Editar
            </Link>
          </div>
        )}
      </div>

      {/* Lo que falta. Cuando no falta nada, no se dice nada: una lista de
          cuatro checks verdes es ruido. */}
      {pending.length > 0 && (
        <ul className="divide-y divide-line-soft">
          {pending.map((s) => (
            <li key={s.label} className="flex items-center gap-3 px-4 py-2.5">
              <span className="size-2 flex-none rounded-full bg-brand" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{s.label}</span>
                {s.hint && <span className="block text-xs text-muted">{s.hint}</span>}
              </span>
              {s.href && (
                <Link className="btn btn-ghost btn-sm flex-none" href={s.href}>Ir</Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {status === "closed" && (
        <p className="border-t border-line-soft px-4 py-2.5 text-xs text-muted">
          Cerrado: no se pueden apuntar rondas nuevas. Reábrelo si hay que corregir algo.
        </p>
      )}
    </section>
  );
}

/**
 * Un botón de cambio de estado es un formulario de una línea.
 *
 * Podría ser un enlace, pero cambiar el estado escribe en la base de datos y
 * eso no se hace con un GET: un prefetch del navegador o un rastreador te
 * cerrarían el torneo sin que nadie tocara nada.
 */
function StatusButton({
  id, to, className, children,
}: { id: string; to: TournamentStatus; className: string; children: React.ReactNode }) {
  return (
    <form action={setTournamentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={to} />
      <button className={className} type="submit">{children}</button>
    </form>
  );
}
