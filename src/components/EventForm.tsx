import { saveEvent } from "@/actions";
import { todayISO } from "@/lib/format";
import type { Competition, Tournament } from "@/lib/types";

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
          <label className="label" htmlFor="ev-kind">Tipo</label>
          <select className="input" id="ev-kind" name="kind" defaultValue="round">
            <option value="round">Jornada</option>
            <option value="tourney">Torneo</option>
            <option value="deadline">Fecha límite</option>
            <option value="other">Otro</option>
          </select>
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
