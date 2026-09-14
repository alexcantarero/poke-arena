"use client";

import { useState } from "react";
import { saveTournamentResult } from "@/actions";
import { tierFor, awardsCp } from "@/lib/cp";
import type { DeckOption, Tournament, TournamentResult } from "@/lib/types";
import { archetypeValue } from "@/lib/types";
import { DeckPicker } from "./DeckPicker";
import { Icon } from "./icons";

/* =========================================================================
   Cerrar el torneo: qué puesto hiciste, con qué, y qué te llevaste.

   Es el último paso del ciclo y se rellena una sola vez, cuando sale la
   clasificación. Lo que antes estaba mezclado con la cabecera vive aquí.

   Dos cosas que merecían pensarse:

   · **El récord, de dos maneras.** Si has ido apuntando las rondas, el
     récord ya está contado y teclearlo otra vez solo puede introducir un
     error; si vuelves de un torneo de hace tres meses, reconstruir siete
     rondas de memoria no lo va a hacer nadie. Así que se elige: «lo cuento
     de tus rondas» o «lo escribo yo». No es una preferencia, son dos
     situaciones distintas.

   · **Los CP se explican, no se enseñan.** Un «0 CP» a secas parece un
     error. Con el tramo delante —cuántos hacían falta y cuántos hubo— se
     entiende, y de paso se aprende cómo funciona el kicker. Y si el puesto
     da invitación directa al Mundial, eso va primero, porque es lo más
     importante que le puede pasar a alguien en una temporada.
   ========================================================================= */

type Props = {
  season: number;
  tournament: Tournament;
  result?: TournamentResult;
  /** Mazos que puede haber jugado: suyos, favoritos y de la biblioteca. */
  deckOptions: DeckOption[];
  /** Arquetipos, para cuando no hay un mazo registrado que elegir. */
  archetypeOptions: DeckOption[];
  /** Récord contado de las rondas ya apuntadas, si las hay. */
  roundRecord?: { wins: number; losses: number; ties: number; label: string } | null;
  /** De quién es este resultado. Solo se pasa cuando un organizador edita el de otro. */
  playerId?: string;
};

export function TournamentResultForm({
  season, tournament, result, deckOptions, archetypeOptions, roundRecord, playerId,
}: Props) {
  const hasRounds = Boolean(roundRecord && roundRecord.wins + roundRecord.losses + roundRecord.ties > 0);

  const [recordMode, setRecordMode] = useState<"rounds" | "manual">(hasRounds ? "rounds" : "manual");
  const [placement, setPlacement] = useState<string>(
    result?.placement != null ? String(result.placement) : "",
  );
  const [cpManual, setCpManual] = useState(result?.cpManual ?? false);
  const [cpEarned, setCpEarned] = useState<string>(result?.cpEarned ? String(result.cpEarned) : "");

  const givesCp = awardsCp(season, tournament.kind);
  const tier = givesCp
    ? tierFor(season, tournament.kind, placement ? Number(placement) : null, tournament.playerCount)
    : null;

  return (
    <form action={saveTournamentResult} className="flex flex-col gap-4">
      <input type="hidden" name="tournamentId" value={tournament.id} />
      {playerId && <input type="hidden" name="playerId" value={playerId} />}
      <input type="hidden" name="season" value={season} />
      <input type="hidden" name="recordMode" value={recordMode} />

      {/* ------------------------------- puesto ------------------------------- */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="placement">Puesto</label>
          <input
            className="input text-center font-display text-xl font-extrabold tabular"
            id="placement" name="placement" type="number" min={1} inputMode="numeric"
            value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="9"
          />
          {tournament.playerCount ? (
            <p className="text-xs text-muted">de {tournament.playerCount} participantes</p>
          ) : (
            <p className="text-xs text-muted">Falta la asistencia: sin ella no hay CP.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="label">Récord</label>
          {hasRounds && (
            <div className="seg w-full text-[13px]">
              <button type="button" data-on={recordMode === "rounds"} onClick={() => setRecordMode("rounds")}>
                De mis rondas
              </button>
              <button type="button" data-on={recordMode === "manual"} onClick={() => setRecordMode("manual")}>
                A mano
              </button>
            </div>
          )}

          {recordMode === "rounds" && hasRounds ? (
            <div className="input justify-start bg-ground font-mono text-base font-bold tabular">
              {roundRecord!.label}
            </div>
          ) : (
            <div className="flex gap-1.5">
              {(["wins", "losses", "ties"] as const).map((f, i) => (
                <input
                  key={f} className="input px-2 text-center tabular" name={f}
                  type="number" min={0} max={50} inputMode="numeric"
                  aria-label={["Victorias", "Derrotas", "Empates"][i]}
                  placeholder={["V", "D", "E"][i]}
                  defaultValue={result ? result[f] : ""}
                />
              ))}
            </div>
          )}
          <p className="text-xs text-muted">
            {recordMode === "rounds" && hasRounds
              ? "Se recalcula solo cada vez que apuntas o corriges una ronda."
              : hasRounds
                ? "Lo que escribas aquí se perderá la próxima vez que toques una ronda."
                : "Victorias, derrotas y empates."}
          </p>
        </div>
      </div>

      {/* -------------------------------- mazo -------------------------------- */}
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="deckId">Mazo que llevaste</label>
        <DeckPicker
          id="deckId" name="deckId"
          options={deckOptions}
          defaultValue={result?.deckId ?? ""}
          emptyLabel="— no lo tengo registrado —"
          placeholder="Elegir mazo"
        />
        <p className="text-xs text-muted">
          Es el mazo de todo el torneo: las rondas que apuntes lo cogen de aquí y no lo
          preguntan otra vez.
        </p>
      </div>

      <details className="rounded-lg border border-line-soft">
        <summary className="tap cursor-pointer justify-start px-3 text-sm font-semibold text-muted">
          ¿No tienes el mazo registrado? Elige solo el arquetipo
        </summary>
        <div className="border-t border-line-soft p-3">
          <DeckPicker
            name="archetypeId"
            options={archetypeOptions}
            defaultValue={archetypeValue(result?.archetypeId)}
            emptyLabel="— ninguno —"
            placeholder="Buscar arquetipo"
          />
        </div>
      </details>

      {/* ------------------------- Championship Points ------------------------ */}
      <div className="rounded-lg border border-line-soft bg-ground p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="label">Championship Points</span>
          {givesCp && (
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox" name="cpManual" className="size-4"
                checked={cpManual} onChange={(e) => setCpManual(e.target.checked)}
              />
              A mano
            </label>
          )}
        </div>

        {!givesCp ? (
          <p className="mt-2 text-sm text-muted">
            Este tipo de torneo no reparte CP. Cuenta igual para tus estadísticas.
          </p>
        ) : cpManual ? (
          <input
            className="input mt-2 tabular" name="cpEarned" type="number" min={0} max={5000} inputMode="numeric"
            value={cpEarned} onChange={(e) => setCpEarned(e.target.value)} placeholder="0"
          />
        ) : (
          <>
            <p className="mt-2 font-display text-3xl font-extrabold tabular leading-none">
              {tier ? `${tier.cp} CP` : "—"}
            </p>

            {tier?.invite && (
              <p className="mt-2 flex items-start gap-2 rounded-lg bg-brand-soft px-3 py-2 text-sm font-semibold text-brand">
                <Icon name="check" className="mt-0.5 size-4 flex-none" />
                Ese puesto da invitación directa al Campeonato Mundial.
              </p>
            )}

            {tier?.blockedByKicker && (
              <p className="mt-1.5 text-xs text-muted">
                El tramo {tier.tier.from}.º–{tier.tier.to}.º vale {tier.tier.cp} CP, pero pide{" "}
                {tier.needed} participantes y hubo {tournament.playerCount ?? 0}. Por eso son 0.
              </p>
            )}
            {tier && !tier.blockedByKicker && tier.cp > 0 && (
              <p className="mt-1.5 text-xs text-muted">
                Tramo {tier.tier.from}.º–{tier.tier.to}.º
                {tier.needed > 0 ? `, que pide ${tier.needed} participantes` : ", sin mínimo de gente"}.
              </p>
            )}
            {!placement && (
              <p className="mt-1.5 text-xs text-muted">Pon el puesto y se calculan solos.</p>
            )}
          </>
        )}
      </div>

      {/* ------------------------------ premios ------------------------------- */}
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="prizes">Premios</label>
        <input
          className="input" id="prizes" name="prizes" maxLength={300}
          defaultValue={result?.prizes ?? ""}
          placeholder="3 sobres y un playmat"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="resultNotes">Comentarios</label>
        <textarea
          className="input" id="resultNotes" name="resultNotes" rows={3} maxLength={1000}
          defaultValue={result?.notes ?? ""}
          placeholder="Qué tal fue, qué cambiarías de la lista, contra qué te cruzaste…"
        />
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="dropped" className="size-4" defaultChecked={result?.dropped ?? false} />
        Me retiré antes de terminar
      </label>

      <button className="btn btn-brand w-full" type="submit">
        <Icon name="check" className="size-4" />
        {result ? "Guardar el resultado" : "Poner mi resultado"}
      </button>
    </form>
  );
}
