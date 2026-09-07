import { saveEvent } from "@/actions";
import { todayISO } from "@/lib/format";
import type { Competition } from "@/lib/types";

export function EventForm({ competitions }: { competitions: Competition[] }) {
  return (
    <form action={saveEvent} className="formgrid">
      <div className="field">
        <label htmlFor="ev-title">Título</label>
        <input className="inp" id="ev-title" name="title" required placeholder="Jornada 7 · Liga Regular" />
      </div>
      <div className="field">
        <label htmlFor="ev-date">Fecha</label>
        <input className="inp" id="ev-date" name="date" type="date" defaultValue={todayISO()} />
      </div>
      <div className="field">
        <label htmlFor="ev-kind">Tipo</label>
        <select className="inp" id="ev-kind" name="kind" defaultValue="round">
          <option value="round">Jornada</option>
          <option value="tourney">Torneo</option>
          <option value="deadline">Fecha límite</option>
          <option value="other">Otro</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="ev-comp">Competición</label>
        <select className="inp" id="ev-comp" name="competitionId" defaultValue="">
          <option value="">—</option>
          {competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="ev-note">Nota</label>
        <input className="inp" id="ev-note" name="note" placeholder="Casa de Javi, 18:00" />
      </div>
      <button className="btn btn-gold" type="submit">Añadir al calendario</button>
    </form>
  );
}
