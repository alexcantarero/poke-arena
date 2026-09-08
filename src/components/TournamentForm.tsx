"use client";

import { useMemo, useState } from "react";
import { saveTournament, saveTournamentResult } from "@/actions";
import { cpForPlacement, eventKinds, awardsCp } from "@/lib/cp";
import { TOURNAMENT_FORMATS, TOURNAMENT_KIND_GROUPS, DIVISIONS } from "@/lib/types";
import type { Archetype, Deck, Tournament, TournamentResult } from "@/lib/types";
import { todayISO } from "@/lib/format";

type Props = {
  season: number;
  decks: Deck[];
  archetypes: Archetype[];
  tournament?: Tournament;
  result?: TournamentResult;
  /** true = alta de torneo con mi resultado en el mismo formulario. */
  withResult?: boolean;
  /** Solo se pasa cuando se edita el resultado de un torneo que ya existe. */
  resultOnly?: boolean;
};

export function TournamentForm({
  season, decks, archetypes, tournament, result, withResult = true, resultOnly = false,
}: Props) {
  const kinds = useMemo(() => eventKinds(season), [season]);
  const labelOf = (k: string) => kinds.find((x) => x.value === k)?.label ?? k;

  const [kind, setKind] = useState(tournament?.kind ?? "store");
  const [scope, setScope] = useState(tournament?.scope ?? "onsite");
  const [bestOf, setBestOf] = useState(tournament?.bestOf ?? 3);
  const [playerCount, setPlayerCount] = useState<string>(
    tournament?.playerCount != null ? String(tournament.playerCount) : "",
  );
  const [placement, setPlacement] = useState<string>(
    result?.placement != null ? String(result.placement) : "",
  );
  const [cpManual, setCpManual] = useState(result?.cpManual ?? false);
  const [cpEarned, setCpEarned] = useState<string>(result?.cpEarned ? String(result.cpEarned) : "");

  const givesCp = awardsCp(season, kind);
  const autoCp = givesCp
    ? cpForPlacement(season, kind, placement ? Number(placement) : null, playerCount ? Number(playerCount) : null)
    : null;

  const action = resultOnly ? saveTournamentResult : saveTournament;

  return (
    <form action={action} className="flex flex-col gap-4">
      {tournament && <input type="hidden" name={resultOnly ? "tournamentId" : "id"} value={tournament.id} />}
      {result && resultOnly && <input type="hidden" name="playerId" value={result.playerId} />}
      {!resultOnly && withResult && <input type="hidden" name="withResult" value="1" />}
      <input type="hidden" name="season" value={season} />

      {/* --------------------------- el torneo --------------------------- */}
      {!resultOnly && (
        <section className="card p-4">
          <h2 className="mb-4 text-lg font-bold">El torneo</h2>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="name">Nombre</label>
              <input
                className="input" id="name" name="name" required maxLength={120}
                defaultValue={tournament?.name ?? ""}
                placeholder="League Cup Tienda Kanto — septiembre"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="kind">Tipo</label>
              <select
                className="input" id="kind" name="kind" value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                {TOURNAMENT_KIND_GROUPS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.kinds.map((k) => <option key={k} value={k}>{labelOf(k)}</option>)}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-muted">
                {givesCp
                  ? "Este tipo reparte Championship Points: se calculan solos con el puesto y la asistencia."
                  : "Este tipo no da Championship Points, pero cuenta igual para tus estadísticas."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="label">Dónde</label>
                <div className="seg w-full">
                  {(["onsite", "online"] as const).map((s) => (
                    <button
                      key={s} type="button" data-on={scope === s} onClick={() => setScope(s)}
                    >
                      {s === "onsite" ? "Presencial" : "Online"}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="scope" value={scope} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="format">Formato</label>
                <select className="input" id="format" name="format" defaultValue={tournament?.format ?? "standard"}>
                  {Object.entries(TOURNAMENT_FORMATS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="label">Serie</label>
              <div className="seg seg-brand w-full">
                {[1, 3, 5].map((n) => (
                  <button key={n} type="button" data-on={bestOf === n} onClick={() => setBestOf(n)}>
                    Bo{n}
                  </button>
                ))}
              </div>
              <input type="hidden" name="bestOf" value={bestOf} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="date">Fecha</label>
                <input className="input" id="date" name="date" type="date" defaultValue={tournament?.date ?? todayISO()} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="playerCount">Cuánta gente</label>
                <input
                  className="input" id="playerCount" name="playerCount" type="number" min={1} inputMode="numeric"
                  value={playerCount} onChange={(e) => setPlayerCount(e.target.value)}
                  placeholder="32"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="venue">{scope === "online" ? "Plataforma" : "Tienda o sede"}</label>
                <input
                  className="input" id="venue" name="venue" defaultValue={tournament?.venue ?? ""}
                  placeholder={scope === "online" ? "PTCG Live" : "Tienda Kanto"}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="city">Ciudad</label>
                <input className="input" id="city" name="city" defaultValue={tournament?.city ?? ""} placeholder="Bilbao" />
              </div>
            </div>

            <details className="rounded-lg border border-line-soft">
              <summary className="tap cursor-pointer justify-start px-3 text-sm font-semibold text-muted">
                Más detalles
              </summary>
              <div className="flex flex-col gap-4 border-t border-line-soft p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="label" htmlFor="rounds">Rondas</label>
                    <input className="input" id="rounds" name="rounds" type="number" min={0} inputMode="numeric"
                      defaultValue={tournament?.rounds ?? ""} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="label" htmlFor="topCut">Top cut</label>
                    <input className="input" id="topCut" name="topCut" type="number" min={0} inputMode="numeric"
                      defaultValue={tournament?.topCut ?? ""} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="label" htmlFor="division">División</label>
                    <select className="input" id="division" name="division" defaultValue={tournament?.division ?? "masters"}>
                      {Object.entries(DIVISIONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="label" htmlFor="organizer">Organiza</label>
                    <input className="input" id="organizer" name="organizer" defaultValue={tournament?.organizer ?? ""} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="url">Enlace</label>
                  <input className="input" id="url" name="url" type="url" inputMode="url"
                    defaultValue={tournament?.url ?? ""} placeholder="https://rk9.gg/…" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="notes">Notas del torneo</label>
                  <textarea className="input" id="notes" name="notes" rows={2} defaultValue={tournament?.notes ?? ""} />
                </div>
              </div>
            </details>
          </div>
        </section>
      )}

      {/* --------------------------- mi resultado --------------------------- */}
      {(withResult || resultOnly) && (
        <section className="card p-4">
          <h2 className="mb-1 text-lg font-bold">Tu resultado</h2>
          <p className="mb-4 text-sm text-muted">
            Si aún no lo sabes, déjalo en blanco y lo rellenas luego.
          </p>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="placement">Puesto</label>
                <input
                  className="input" id="placement" name="placement" type="number" min={1} inputMode="numeric"
                  value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="9"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label">Récord</label>
                <div className="flex gap-1.5">
                  {(["wins", "losses", "ties"] as const).map((f, i) => (
                    <input
                      key={f} className="input px-2 text-center" name={f} type="number" min={0} inputMode="numeric"
                      aria-label={["Victorias", "Derrotas", "Empates"][i]}
                      placeholder={["V", "D", "E"][i]}
                      defaultValue={result ? result[f] : ""}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="deckId">Mazo que llevaste</label>
              <select className="input" id="deckId" name="deckId" defaultValue={result?.deckId ?? ""}>
                <option value="">— elegir —</option>
                {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <p className="text-xs text-muted">
                ¿No está en la lista? Elige el arquetipo aquí abajo y ya lo registrarás como mazo cuando quieras.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="archetypeId">…o solo el arquetipo</label>
              <select className="input" id="archetypeId" name="archetypeId" defaultValue={result?.archetypeId ?? ""}>
                <option value="">— ninguno —</option>
                {archetypes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            {/* --- Championship Points --- */}
            <div className="rounded-lg border border-line-soft bg-ground p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="label">Championship Points</span>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox" name="cpManual" className="size-4"
                    checked={cpManual} onChange={(e) => setCpManual(e.target.checked)}
                  />
                  A mano
                </label>
              </div>

              {cpManual ? (
                <input
                  className="input mt-2" name="cpEarned" type="number" min={0} inputMode="numeric"
                  value={cpEarned} onChange={(e) => setCpEarned(e.target.value)} placeholder="0"
                />
              ) : (
                <p className="mt-2 font-display text-2xl font-extrabold tabular">
                  {givesCp
                    ? (autoCp == null ? "—" : `${autoCp} CP`)
                    : <span className="text-base font-semibold text-muted">Este tipo no da CP</span>}
                </p>
              )}

              {!cpManual && givesCp && autoCp === 0 && placement && (
                <p className="mt-1 text-xs text-muted">
                  Ese puesto no cobra: el tramo necesita más asistencia de la que has puesto.
                </p>
              )}
              {!cpManual && givesCp && !placement && (
                <p className="mt-1 text-xs text-muted">Pon el puesto y se calculan solos.</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="prizes">Premios</label>
              <input
                className="input" id="prizes" name="prizes" defaultValue={result?.prizes ?? ""}
                placeholder="3 sobres y un playmat"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="resultNotes">Comentarios</label>
              <textarea
                className="input" id="resultNotes" name="resultNotes" rows={3}
                defaultValue={result?.notes ?? ""}
                placeholder="Qué tal fue, qué cambiarías de la lista, contra qué te cruzaste…"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="dropped" className="size-4" defaultChecked={result?.dropped ?? false} />
              Me retiré antes de terminar
            </label>
          </div>
        </section>
      )}

      <button className="btn btn-brand w-full" type="submit">
        {tournament ? "Guardar cambios" : "Guardar torneo"}
      </button>
    </form>
  );
}
