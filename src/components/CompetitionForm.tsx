"use client";

import { useState } from "react";
import { deleteCompetition, saveCompetition } from "@/actions";
import { COMPETITION_KINDS, type Competition, type CompetitionKind, type Player } from "@/lib/types";
import { suggestedRounds } from "@/lib/stats";
import { todayISO } from "@/lib/format";

export function CompetitionForm({
  competition, players, selectedPlayerIds,
}: {
  competition?: Competition;
  players: Player[];
  selectedPlayerIds?: string[];
}) {
  const [kind, setKind] = useState<CompetitionKind>((competition?.kind as CompetitionKind) ?? "league");
  const [chosen, setChosen] = useState<string[]>(
    selectedPlayerIds ?? players.filter((p) => p.active).map((p) => p.id),
  );
  const toggle = (id: string) =>
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <form action={saveCompetition} className="stack">
      {competition && <input type="hidden" name="id" value={competition.id} />}

      <div className="card card-pad stack" style={{ gap: 14 }}>
        <div className="field">
          <label htmlFor="name">Nombre</label>
          <input className="inp" id="name" name="name" required defaultValue={competition?.name ?? ""} placeholder="Liga Regular 2026" />
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 7 }}>Formato</div>
          <div className="seg">
            {(Object.keys(COMPETITION_KINDS) as CompetitionKind[]).map((k) => (
              <button key={k} type="button" className={kind === k ? "on" : ""} onClick={() => setKind(k)}>
                {COMPETITION_KINDS[k].short}
              </button>
            ))}
          </div>
          <input type="hidden" name="kind" value={kind} />
          <div className="hint" style={{ marginTop: 5 }}>{COMPETITION_KINDS[kind].hint}</div>
        </div>

        <div className="grid g-4" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="start">Inicio</label>
            <input className="inp" id="start" name="start" type="date" defaultValue={competition?.start ?? todayISO()} />
          </div>
          <div className="field">
            <label htmlFor="end">Fin</label>
            <input className="inp" id="end" name="end" type="date" defaultValue={competition?.end ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="bestOf">Formato de serie</label>
            <select className="inp" id="bestOf" name="bestOf" defaultValue={String(competition?.bestOf ?? 3)}>
              <option value="1">Bo1</option><option value="3">Bo3</option><option value="5">Bo5</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="status">Estado</label>
            <select className="inp" id="status" name="status" defaultValue={competition?.status ?? "live"}>
              <option value="live">En curso</option><option value="done">Cerrada</option>
            </select>
          </div>
        </div>

        {kind === "swiss" && (
          <div className="grid g-2" style={{ gap: 12 }}>
            <div className="field">
              <label htmlFor="rounds">Rondas</label>
              <input className="inp" id="rounds" name="rounds" type="number" min={0} defaultValue={competition?.rounds ?? suggestedRounds(chosen.length)} />
              <div className="hint">Con {chosen.length} jugadores, lo habitual son {suggestedRounds(chosen.length)} rondas.</div>
            </div>
            <div className="field">
              <label htmlFor="topCut">Top cut</label>
              <select className="inp" id="topCut" name="topCut" defaultValue={String(competition?.topCut ?? 0)}>
                <option value="0">Sin top cut</option><option value="2">Final (top 2)</option>
                <option value="4">Top 4</option><option value="8">Top 8</option>
              </select>
            </div>
          </div>
        )}

        <div>
          <div className="eyebrow" style={{ marginBottom: 7 }}>Participantes ({chosen.length})</div>
          <div className="row" style={{ gap: 8 }}>
            {players.map((p) => {
              const on = chosen.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="chip"
                  style={{
                    cursor: "pointer", padding: "6px 11px",
                    borderColor: on ? "var(--gold-line)" : "var(--line)",
                    background: on ? "var(--gold-bg)" : "var(--surface-2)",
                    color: on ? "var(--gold)" : "var(--text-2)",
                  }}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(p.id)} style={{ marginRight: 4 }} />
                  {p.name}
                </label>
              );
            })}
          </div>
          {chosen.map((id) => <input key={id} type="hidden" name="playerIds" value={id} />)}
        </div>
      </div>

      <div className="row">
        <button className="btn btn-gold" type="submit">{competition ? "Guardar cambios" : "Crear competición"}</button>
        {competition && (
          <button className="btn btn-danger" type="submit" formAction={deleteCompetition} name="id" value={competition.id}>
            Borrar competición
          </button>
        )}
      </div>
    </form>
  );
}
