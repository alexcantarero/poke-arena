"use client";

import { useState } from "react";
import { saveEvent } from "@/actions";
import { useLang } from "@/components/LangProvider";
import { CALENDAR_KINDS, CALENDAR_OWN } from "@/lib/calendar";
import { todayISO } from "@/lib/format";
import { tr } from "@/lib/i18n";

/* =========================================================================
   Añadir al calendario.

   v0.114 — de nueve campos a los que tocan:
   · «Tipo de actividad» y «Tipo de torneo» eran dos desplegables para una
     sola pregunta («¿qué es?»), y se podían contradecir (una «Jornada» de
     tipo «Regional»). Ahora es UN desplegable en dos grupos —De la liga /
     Torneo— que rellena los dos campos ocultos que ya leía `saveEvent`. Un
     torneo se guarda con `kind = "tourney"`, igual que los que importa
     «Eventos oficiales de Europa».
   · «Competición asociada» solo sale para cosas de la liga, y «Torneo
     asociado» solo para torneos, y solo con los torneos recientes o por venir
     (antes, la lista entera desde el primer día).
   · Elegir un torneo de la app rellena lo que esté vacío: nombre, fecha,
     fecha de fin y lugar.
   ========================================================================= */

type Comp = { id: string; name: string; status?: string | null };
type Tour = { id: string; name: string; date: string; endDate?: string | null; city?: string | null; kind?: string };

const DE_LIGA = Object.keys(CALENDAR_OWN);

export function EventForm({ competitions, tournaments }: { competitions: Comp[]; tournaments: Tour[] }) {
  const lng = useLang();
  const [tipo, setTipo] = useState<string>("round");
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [fin, setFin] = useState("");
  const [lugar, setLugar] = useState("");
  const [torneo, setTorneo] = useState("");

  const esTorneo = tipo.startsWith("t:");
  const kind = esTorneo ? "tourney" : tipo;
  const tournamentKind = esTorneo ? tipo.slice(2) : "";

  // Torneos de la app desde hace un mes en adelante, del más cercano al más lejano.
  const desde = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const torneosUtiles = tournaments
    .filter((t) => (t.endDate ?? t.date) >= desde)
    .sort((a, b) => a.date.localeCompare(b.date));
  const ligasVivas = competitions.filter((c) => c.status !== "done");

  const elegirTorneo = (id: string) => {
    setTorneo(id);
    const t = tournaments.find((x) => x.id === id);
    if (!t) return;
    if (!titulo.trim()) setTitulo(t.name);
    setFecha(t.date);
    if (t.endDate) setFin(t.endDate);
    if (!lugar.trim() && t.city) setLugar(t.city);
    if (t.kind && CALENDAR_KINDS[t.kind] && !esTorneo) setTipo(`t:${t.kind}`);
  };

  return (
    <form action={saveEvent} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="tournamentKind" value={tournamentKind} />

      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="label">{tr(lng, "v114.cal.que")}</span>
        <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <optgroup label={tr(lng, "v114.cal.deLiga")}>
            {DE_LIGA.map((v) => (
              <option key={v} value={v}>{CALENDAR_OWN[v as keyof typeof CALENDAR_OWN].label}</option>
            ))}
          </optgroup>
          <optgroup label={tr(lng, "v114.cal.torneo")}>
            {Object.entries(CALENDAR_KINDS).map(([v, k]) => (
              <option key={v} value={`t:${v}`}>{k.label}</option>
            ))}
          </optgroup>
        </select>
      </label>

      {esTorneo && torneosUtiles.length > 0 && (
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="label">{tr(lng, "cal.event.tournament")}</span>
          <select className="input" name="tournamentId" value={torneo} onChange={(e) => elegirTorneo(e.target.value)}>
            <option value="">{tr(lng, "cal.event.none")}</option>
            {torneosUtiles.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.date}</option>)}
          </select>
          <span className="text-[11px] text-muted">{tr(lng, "v114.cal.torneoAyuda")}</span>
        </label>
      )}

      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="label">{tr(lng, "cal.event.title")}</span>
        <input className="input" name="title" required maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">{tr(lng, "cal.event.date")}</span>
        <input className="input" name="date" type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="label">{tr(lng, "cal.event.endDate")}</span>
        <input className="input" name="endDate" type="date" min={fecha} value={fin} onChange={(e) => setFin(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">{tr(lng, "cal.event.location")}</span>
        <input className="input" name="location" maxLength={120} value={lugar} onChange={(e) => setLugar(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="label">{tr(lng, "cal.event.url")}</span>
        <input className="input" name="url" type="url" />
      </label>

      {!esTorneo && ligasVivas.length > 0 && (
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="label">{tr(lng, "cal.event.competition")}</span>
          <select className="input" name="competitionId" defaultValue="">
            <option value="">{tr(lng, "cal.event.none")}</option>
            {ligasVivas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}

      <details className="sm:col-span-2">
        <summary className="cursor-pointer text-sm font-semibold text-muted">{tr(lng, "cal.event.note")}</summary>
        <textarea className="input mt-2 min-h-20 w-full" name="note" maxLength={500} />
      </details>

      <button className="btn btn-brand sm:col-span-2" type="submit">{tr(lng, "cal.event.add")}</button>
    </form>
  );
}
