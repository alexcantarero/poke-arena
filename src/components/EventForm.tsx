import { saveEvent } from "@/actions";
import { CALENDAR_KINDS } from "@/lib/calendar";
import { todayISO } from "@/lib/format";
import type { Competition, Tournament } from "@/lib/types";

/**
 * Añadir algo al calendario.
 *
 * `kind` es qué clase de cosa es **para la liga** —una jornada, una fecha
 * límite— y `tournamentKind` qué clase de torneo es **en el circuito**. Son
 * dos preguntas distintas y por eso son dos campos: una jornada de la liga
 * no es ningún tipo de torneo oficial, y un Regional al que no va nadie del
 * grupo no es una jornada. El segundo es el que decide el color.
 */
export function EventForm({
  competitions, tournaments,
}: { competitions: Competition[]; tournaments: Tournament[] }) {
  return (
    <form action={saveEvent} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="ev-title">Título</label>
        <input className="input" id="ev-title" name="title" required maxLength={80} placeholder="Jornada 7 · Liga Regular" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-date">Fecha</label>
          <input className="input" id="ev-date" name="date" type="date" defaultValue={todayISO()} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-end">Hasta (opcional)</label>
          <input className="input" id="ev-end" name="endDate" type="date" />
          <p className="text-[11px] text-muted">Para los de dos días, como un Regional.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-kind">Qué es</label>
          <select className="input" id="ev-kind" name="kind" defaultValue="round">
            <option value="round">Jornada</option>
            <option value="tourney">Torneo</option>
            <option value="deadline">Fecha límite</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-tkind">Tipo de torneo (color)</label>
          <select className="input" id="ev-tkind" name="tournamentKind" defaultValue="">
            <option value="">— ninguno —</option>
            {Object.entries(CALENDAR_KINDS).map(([v, d]) => (
              <option key={v} value={v}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-loc">Dónde</label>
          <input className="input" id="ev-loc" name="location" maxLength={120} placeholder="Frankfurt, Alemania" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-url">Enlace</label>
          <input className="input" id="ev-url" name="url" type="url" maxLength={400} placeholder="https://…" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-comp">Competición</label>
          <select className="input" id="ev-comp" name="competitionId" defaultValue="">
            <option value="">—</option>
            {competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-tour">Torneo</label>
          <select className="input" id="ev-tour" name="tournamentId" defaultValue="">
            <option value="">—</option>
            {tournaments.slice(0, 30).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="ev-note">Nota</label>
        <input className="input" id="ev-note" name="note" maxLength={120} placeholder="Casa de Javi, 18:00" />
      </div>

      <button className="btn btn-brand w-full" type="submit">Añadir</button>
    </form>
  );
}
