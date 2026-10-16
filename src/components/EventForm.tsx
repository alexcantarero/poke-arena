import { saveEvent } from "@/actions";
import { CALENDAR_KINDS } from "@/lib/calendar";
import { todayISO } from "@/lib/format";
import type { Competition, Tournament } from "@/lib/types";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/**
 * Añadir algo al calendario.
 *
 * `kind` es qué clase de cosa es **para la liga** —una jornada, una fecha
 * límite— y `tournamentKind` qué clase de torneo es **en el circuito**. Son
 * dos preguntas distintas y por eso son dos campos: una jornada de la liga
 * no es ningún tipo de torneo oficial, y un Regional al que no va nadie del
 * grupo no es una jornada. El segundo es el que decide el color.
 */
export async function EventForm({
  competitions, tournaments,
}: { competitions: Competition[]; tournaments: Tournament[] }) {
  const lng = await getLang(); // v0.49

  return (
    <form action={saveEvent} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="ev-title">{tr(lng, "x.98a5efa6")}</label>
        <input className="input" id="ev-title" name="title" required maxLength={80} placeholder={tr(lng, "x.700953ed")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-date">{tr(lng, "x.bcc47609")}</label>
          <input className="input" id="ev-date" name="date" type="date" defaultValue={todayISO()} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-end">{tr(lng, "x.7faa94df")}</label>
          <input className="input" id="ev-end" name="endDate" type="date" />
          <p className="text-[11px] text-muted">{tr(lng, "x.93d2cfc4")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-kind">{tr(lng, "x.25dc6a95")}</label>
          <select className="input" id="ev-kind" name="kind" defaultValue="round">
            <option value="round">{tr(lng, "x.74d2b97e")}</option>
            <option value="tourney">{tr(lng, "x.250eff11")}</option>
            <option value="deadline">{tr(lng, "x.367b14df")}</option>
            <option value="other">{tr(lng, "x.ada1c1ef")}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-tkind">{tr(lng, "x.0b04edde")}</label>
          <select className="input" id="ev-tkind" name="tournamentKind" defaultValue="">
            <option value="">{tr(lng, "x.8a4e4db7")}</option>
            {Object.entries(CALENDAR_KINDS).map(([v, d]) => (
              <option key={v} value={v}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-loc">{tr(lng, "x.7c72f46c")}</label>
          <input className="input" id="ev-loc" name="location" maxLength={120} placeholder={tr(lng, "x.bd2c9492")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-url">{tr(lng, "x.4b0eaf1e")}</label>
          <input className="input" id="ev-url" name="url" type="url" maxLength={400} placeholder={tr(lng, "x.1a66279d")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-comp">{tr(lng, "x.c28ef3fd")}</label>
          <select className="input" id="ev-comp" name="competitionId" defaultValue="">
            <option value="">—</option>
            {competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ev-tour">{tr(lng, "x.250eff11")}</label>
          <select className="input" id="ev-tour" name="tournamentId" defaultValue="">
            <option value="">—</option>
            {tournaments.slice(0, 30).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="ev-note">{tr(lng, "x.1a6b7be7")}</label>
        <input className="input" id="ev-note" name="note" maxLength={120} placeholder={tr(lng, "x.c352077f")} />
      </div>

      <button className="btn btn-brand w-full" type="submit">{tr(lng, "x.41261d09")}</button>
    </form>
  );
}
