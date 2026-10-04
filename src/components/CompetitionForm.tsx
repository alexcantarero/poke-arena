"use client";

import { useState } from "react";
import { deleteCompetition, saveCompetition } from "@/actions";
import { COMPETITION_KINDS, type Competition, type CompetitionKind, type PublicPlayer } from "@/lib/types";
import { suggestedRounds } from "@/lib/stats";
import { todayISO } from "@/lib/format";

export function CompetitionForm({
  competition, players, selectedPlayerIds, canDelete,
}: {
  competition?: Competition;
  players: PublicPlayer[];
  selectedPlayerIds?: string[];
  canDelete?: boolean;
}) {
  const [kind, setKind] = useState<CompetitionKind>((competition?.kind as CompetitionKind) ?? "league");
  const [bestOf, setBestOf] = useState(competition?.bestOf ?? 3);
  const [chosen, setChosen] = useState<string[]>(
    selectedPlayerIds ?? players.filter((p) => p.active).map((p) => p.id),
  );
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <form action={saveCompetition} className="flex flex-col gap-4">
      {competition && <input type="hidden" name="id" value={competition.id} />}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="bestOf" value={bestOf} />

      <section className="card flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="c-name">Nombre</label>
          <input className="input" id="c-name" name="name" required maxLength={80}
            defaultValue={competition?.name ?? ""} placeholder="Liga Regular 2026" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="label">Formato</label>
          <div className="grid grid-cols-2 gap-2">
            {/* v0.19 — «Amistosos» ya no es un tipo de competición: un amistoso es
                una partida sin competición. */}
            {(Object.keys(COMPETITION_KINDS) as CompetitionKind[]).filter((k) => k !== "casual").map((k) => (
              <button
                key={k} type="button" onClick={() => setKind(k)}
                className={`tap flex-col items-start justify-center rounded-lg border px-3 py-2 text-left
                  ${kind === k ? "border-brand-line bg-brand-soft" : "border-line bg-surface"}`}
              >
                <span className="text-sm font-semibold">{COMPETITION_KINDS[k].short}</span>
                <span className="text-[11px] text-muted">{COMPETITION_KINDS[k].hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="label">Serie por defecto</label>
          <div className="seg seg-brand w-full">
            {[1, 3, 5].map((n) => (
              <button key={n} type="button" data-on={bestOf === n} onClick={() => setBestOf(n)}>Bo{n}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="c-start">Inicio</label>
            <input className="input" id="c-start" name="start" type="date" defaultValue={competition?.start ?? todayISO()} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="c-end">Fin</label>
            <input className="input" id="c-end" name="end" type="date" defaultValue={competition?.end ?? ""} />
          </div>
        </div>

        {kind === "swiss" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="c-rounds">Rondas</label>
              <input className="input" id="c-rounds" name="rounds" type="number" min={0} inputMode="numeric"
                defaultValue={competition?.rounds ?? suggestedRounds(chosen.length)} />
              <p className="text-xs text-muted">Con {chosen.length} jugadores, lo normal son {suggestedRounds(chosen.length)}.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="c-cut">Top cut</label>
              <select className="input" id="c-cut" name="topCut" defaultValue={String(competition?.topCut ?? 0)}>
                <option value="0">Sin top cut</option>
                <option value="2">Final</option>
                <option value="4">Top 4</option>
                <option value="8">Top 8</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="c-status">Estado</label>
          <select className="input" id="c-status" name="status" defaultValue={competition?.status ?? "live"}>
            <option value="live">En curso</option>
            <option value="done">Cerrada</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="label">Participantes ({chosen.length})</label>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => {
              const on = chosen.includes(p.id);
              return (
                <button
                  key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={on}
                  className={`chip ${on ? "chip-brand" : ""} min-h-9 px-3`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          {chosen.map((id) => <input key={id} type="hidden" name="playerIds" value={id} />)}
        </div>
      </section>

      <div className="flex gap-2">
        <button className="btn btn-brand flex-1" type="submit">
          {competition ? "Guardar cambios" : "Crear competición"}
        </button>
        {competition && canDelete && (
          <button className="btn btn-danger" type="submit" formAction={deleteCompetition} name="id" value={competition.id}>
            Borrar
          </button>
        )}
      </div>
    </form>
  );
}
