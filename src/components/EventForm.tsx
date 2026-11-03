"use client";

import { saveEvent } from "@/actions";
import { useLang } from "@/components/LangProvider";
import { CALENDAR_KINDS, CALENDAR_OWN } from "@/lib/calendar";
import { todayISO } from "@/lib/format";
import { tr } from "@/lib/i18n";
import type { Competition, Tournament } from "@/lib/types";

export function EventForm({
  competitions,
  tournaments,
}: {
  competitions: Competition[];
  tournaments: Tournament[];
}) {
  const lng = useLang();

  return (
    <form action={saveEvent} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="label">{tr(lng, "cal.event.title")}</span>
        <input className="input" name="title" required maxLength={120} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="label">{tr(lng, "cal.event.date")}</span>
          <input className="input" name="date" type="date" required defaultValue={todayISO()} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">{tr(lng, "cal.event.endDate")}</span>
          <input className="input" name="endDate" type="date" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="label">{tr(lng, "cal.event.kind")}</span>
        <select className="input" name="kind" defaultValue="round">
          {Object.entries(CALENDAR_OWN).map(([value, kind]) => (
            <option key={value} value={value}>{kind.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">{tr(lng, "cal.event.tournamentKind")}</span>
        <select className="input" name="tournamentKind" defaultValue="">
          <option value="">{tr(lng, "cal.event.none")}</option>
          {Object.entries(CALENDAR_KINDS).map(([value, kind]) => (
            <option key={value} value={value}>{kind.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">{tr(lng, "cal.event.location")}</span>
        <input className="input" name="location" maxLength={120} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">{tr(lng, "cal.event.url")}</span>
        <input className="input" name="url" type="url" />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">{tr(lng, "cal.event.competition")}</span>
        <select className="input" name="competitionId" defaultValue="">
          <option value="">{tr(lng, "cal.event.none")}</option>
          {competitions.map((competition) => (
            <option key={competition.id} value={competition.id}>{competition.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">{tr(lng, "cal.event.tournament")}</span>
        <select className="input" name="tournamentId" defaultValue="">
          <option value="">{tr(lng, "cal.event.none")}</option>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">{tr(lng, "cal.event.note")}</span>
        <textarea className="input min-h-20" name="note" maxLength={500} />
      </label>

      <button className="btn btn-brand" type="submit">{tr(lng, "cal.event.add")}</button>
    </form>
  );
}
