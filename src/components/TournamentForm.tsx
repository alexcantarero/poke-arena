"use client";

import { useMemo, useState } from "react";
import { saveTournament } from "@/actions";
import { eventKinds, awardsCp } from "@/lib/cp";
import { TOURNAMENT_FORMATS, TOURNAMENT_KIND_GROUPS, DIVISIONS, TOURNAMENT_STATUS } from "@/lib/types";
import type { Tournament } from "@/lib/types";
import { suggestedRounds, suggestedTopCut } from "@/lib/stats";
import { isRegionalTournament, regionalStructure } from "@/lib/cut";
import { todayISO } from "@/lib/format";
import { Icon } from "./icons";

/* =========================================================================
   La cabecera del torneo: qué evento es, cuándo y de qué tamaño.

   Aquí NO se pone el resultado. Antes iban los dos en el mismo formulario y
   parecía práctico, pero el resultado se sabe horas o días después de crear
   el torneo, así que en la práctica siempre se guardaba medio vacío y había
   que volver. Ahora son dos pasos porque de verdad son dos momentos:

     crear la cabecera → apuntar rondas → poner el puesto → cerrar

   El único campo con truco es «rondas»: el número máximo no es libre, sale
   del número de participantes (un suizo de 32 son 5 rondas). Se propone solo
   y se avisa si lo que pones no cuadra, pero no se impide — hay torneos que
   cortan rondas por horario y el dato bueno es el que pasó de verdad.
   ========================================================================= */

type Props = {
  season: number;
  tournament?: Tournament;
  /** A dónde volver si se cancela. */
  back?: string;
};

export function TournamentForm({ season, tournament, back = "/torneos" }: Props) {
  const kinds = useMemo(() => eventKinds(season), [season]);
  const labelOf = (k: string) => kinds.find((x) => x.value === k)?.label ?? k;

  const [kind, setKind] = useState(tournament?.kind ?? "store");
  const [scope, setScope] = useState(tournament?.scope ?? "onsite");
  const [bestOf, setBestOf] = useState(
    tournament?.bestOf
      ?? (tournament?.kind === "league_challenge" || tournament?.kind === "pokemon_challenge" ? 1 : 3),
  );
  const [status, setStatus] = useState(tournament?.status ?? "open");
  // v0.21: ¿hay eliminatoria? Al editar, lo que tenga; nuevo, todos menos los
  // League Challenge (que por reglamento son solo suizo).
  const [hayTopCut, setHayTopCut] = useState<boolean>(
    tournament ? (tournament.topCut ?? 0) > 0 : true,
  );
  const [playerCount, setPlayerCount] = useState<string>(
    tournament?.playerCount != null ? String(tournament.playerCount) : "",
  );
  const [rounds, setRounds] = useState<string>(
    tournament?.rounds != null ? String(tournament.rounds) : "",
  );

  // v0.15: los torneos online no reparten CP aunque se llamen Challenge.
  const givesCp = scope !== "online" && awardsCp(season, kind);
  const people = Number(playerCount) || 0;
  const isRegional = isRegionalTournament(kind, people > 0 ? people : null);
  const maxRounds = people > 1 ? suggestedRounds(people, kind) : null;
  const recTopCut = people > 1 ? suggestedTopCut(people, kind) : (isRegional ? 8 : null);
  const regStruct = isRegional && people > 0 ? regionalStructure(people) : null;
  const roundsN = Number(rounds) || 0;
  const roundsOff = maxRounds != null && roundsN > 0 && roundsN !== maxRounds;

  return (
    <form action={saveTournament} className="flex flex-col gap-4">
      {tournament && <input type="hidden" name="id" value={tournament.id} />}
      {/* Campos que este formulario no pinta pero la acción reescribe: si no
          viajan, editar la sede borraba la temporada y el país. */}
      {tournament?.season != null && (
        <input type="hidden" name="season" value={tournament.season} />
      )}
      {tournament && <input type="hidden" name="country" value={tournament.country} />}

      <section className="card p-4">
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
              onChange={(e) => {
                const k = e.target.value;
                setKind(k);
                // Los League Challenge se juegan al mejor de uno (confirmado por
                // Ibai, v0.14). Se propone al elegir el tipo; se puede cambiar.
                if (k === "league_challenge" || k === "pokemon_challenge") setBestOf(1);
                else if (bestOf === 1 && (kind === "league_challenge" || kind === "pokemon_challenge")) setBestOf(3);
              }}
            >
              {TOURNAMENT_KIND_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.kinds.map((k) => <option key={k} value={k}>{labelOf(k)}</option>)}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-muted">
              {givesCp
                ? "Reparte Championship Points: se calculan solos con el puesto y la asistencia."
                : scope === "online" && awardsCp(season, kind)
                  ? "Online: los torneos online no reparten Championship Points. Cuenta igual para tus estadísticas."
                  : "No da Championship Points, pero cuenta igual para tus estadísticas."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="label">Dónde</label>
              <div className="seg w-full">
                {(["onsite", "online"] as const).map((s) => (
                  <button key={s} type="button" data-on={scope === s} onClick={() => setScope(s)}>
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
              <label className="label" htmlFor="startTime">Hora de inicio</label>
              <input
                className="input" id="startTime" name="startTime" type="time"
                defaultValue={tournament?.startTime ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="playerCount">Cuánta gente</label>
              <input
                className="input" id="playerCount" name="playerCount" type="number" min={1} inputMode="numeric"
                value={playerCount} onChange={(e) => setPlayerCount(e.target.value)}
                placeholder="32"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="entryFee">Precio de entrada</label>
              <div className="input items-center gap-1.5 px-2.5">
                <input
                  className="w-full bg-transparent outline-none" id="entryFee" name="entryFee"
                  type="number" min={0} step="0.01" inputMode="decimal"
                  defaultValue={
                    tournament?.entryFeeCents != null ? (tournament.entryFeeCents / 100).toString() : ""
                  }
                  placeholder="5"
                />
                <span className="flex-none text-sm text-muted">€</span>
              </div>
            </div>
          </div>

          {/* Rondas. Va fuera de «más detalles» a propósito: es lo que decide
              cuántas rondas te deja apuntar y cuándo se da el torneo por
              terminado, así que no es un detalle. */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-end justify-between gap-3">
              <label className="label" htmlFor="rounds">Rondas</label>
              {maxRounds != null && (
                <button
                  type="button"
                  className="text-xs font-semibold text-info underline underline-offset-2"
                  onClick={() => setRounds(String(maxRounds))}
                >
                  {regStruct && regStruct.hasDay2
                    ? `Con ${people} personas: ${maxRounds} rondas (${regStruct.day1Rounds} Día 1 + ${regStruct.day2Rounds} Día 2)`
                    : `Con ${people} personas: ${maxRounds}`}
                </button>
              )}
            </div>
            <input
              className="input" id="rounds" name="rounds" type="number" min={0} max={50} inputMode="numeric"
              value={rounds} onChange={(e) => setRounds(e.target.value)}
              placeholder={maxRounds != null ? String(maxRounds) : "5"}
            />
            {roundsOff && (
              <p className="text-xs text-muted">
                {regStruct && regStruct.hasDay2
                  ? `La estructura oficial para ${people} participantes son ${maxRounds} rondas suizas (${regStruct.day1Rounds} en Día 1 y ${regStruct.day2Rounds} en Día 2) según el reglamento oficial. Si el torneo usó ${roundsN}, puedes dejarlo.`
                  : `Un suizo de ${people} suele ser de ${maxRounds} rondas. Si el vuestro fue de ${roundsN}, adelante: hay torneos que recortan por horario.`}
              </p>
            )}
            {!playerCount && (
              <p className="text-xs text-muted">
                {isRegional
                  ? "Pon cuántos participantes hay para calcular las rondas de Día 1, Día 2 y corte."
                  : "Pon cuánta gente hubo y te digo cuántas rondas tocan. La asistencia también decide qué tramos de CP se cobran."}
              </p>
            )}
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

          {/* El estado solo se elige al crear. Después se mueve con los botones
              del ciclo, en la ficha: cerrar un torneo es una decisión, no un
              desplegable que se cambia sin darse cuenta al editar la sede. */}
          {!tournament && (
            <div className="flex flex-col gap-1.5">
              <label className="label">Estado</label>
              <div className="seg w-full">
                {(["draft", "open"] as const).map((s) => (
                  <button key={s} type="button" data-on={status === s} onClick={() => setStatus(s)}>
                    {TOURNAMENT_STATUS[s].label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="status" value={status} />
              <p className="text-xs text-muted">
                {status === "draft"
                  ? "Queda apuntado en el calendario. Lo abres el día del torneo."
                  : "Listo para ir metiendo rondas según las juegas."}
              </p>
            </div>
          )}

          <details className="rounded-lg border border-line-soft">
            <summary className="tap cursor-pointer justify-start px-3 text-sm font-semibold text-muted">
              Más detalles
            </summary>
            <div className="flex flex-col gap-4 border-t border-line-soft p-3">
              <div className="grid grid-cols-2 gap-3">
                {/* v0.21 — interruptor «¿Hay top cut?». Apagado: se guarda 0 y
                    desaparece la casilla del tamaño; la ficha deja de pedir rondas
                    de eliminatoria. */}
                <div className="flex flex-col gap-1.5">
                  <span className="label">Top cut</span>
                  <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" className="size-5" checked={hayTopCut}
                      onChange={(e) => setHayTopCut(e.target.checked)} />
                    {hayTopCut ? "Hay eliminatoria" : "Sin top cut"}
                  </label>
                  {hayTopCut ? (
                    <input className="input" id="topCut" name="topCut" type="number" min={2} inputMode="numeric"
                      aria-label="Tamaño del top cut"
                      defaultValue={tournament?.topCut || ""} placeholder={recTopCut ? String(recTopCut) : "8"} />
                  ) : (
                    <input type="hidden" name="topCut" value="0" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="division">División</label>
                  <select className="input" id="division" name="division" defaultValue={tournament?.division ?? "masters"}>
                    {Object.entries(DIVISIONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="organizer">Organiza</label>
                  <input className="input" id="organizer" name="organizer" defaultValue={tournament?.organizer ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="endDate">Termina</label>
                  <input className="input" id="endDate" name="endDate" type="date" defaultValue={tournament?.endDate ?? ""} />
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

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-brand min-w-44 flex-1" type="submit">
          <Icon name="check" className="size-4" />
          {tournament ? "Guardar cambios" : "Crear torneo"}
        </button>
        <a className="btn btn-ghost" href={back}>Cancelar</a>
      </div>

      {!tournament && (
        <p className="text-center text-xs text-muted">
          Después podrás ir apuntando las rondas y, al terminar, el puesto y los premios.
        </p>
      )}
    </form>
  );
}
