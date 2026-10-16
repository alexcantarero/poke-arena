"use client";

import { useState } from "react";
import { saveTournamentResult } from "@/actions";
import { tierFor, awardsCp, cpKindOf } from "@/lib/cp";
import type { DeckOption, Tournament, TournamentResult } from "@/lib/types";
import { archetypeValue } from "@/lib/types";
import { DeckPicker } from "./DeckPicker";
import { Icon } from "./icons";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

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
  /** v0.21: lo abre un organizador para otra persona → «Corregir el arquetipo». */
  organizador?: boolean;
  /** Récord contado de las rondas ya apuntadas, si las hay. */
  roundRecord?: { wins: number; losses: number; ties: number; label: string } | null;
  /** De quién es este resultado. Solo se pasa cuando un organizador edita el de otro. */
  playerId?: string;
};

export function TournamentResultForm({
  season, tournament, result, deckOptions, archetypeOptions, roundRecord, playerId, organizador = false,
}: Props) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const hasRounds = Boolean(roundRecord && roundRecord.wins + roundRecord.losses + roundRecord.ties > 0);

  const [recordMode, setRecordMode] = useState<"rounds" | "manual">(hasRounds ? "rounds" : "manual");
  const [placement, setPlacement] = useState<string>(
    result?.placement != null ? String(result.placement) : "",
  );
  const [cpManual, setCpManual] = useState(result?.cpManual ?? false);
  const [cpEarned, setCpEarned] = useState<string>(result?.cpEarned ? String(result.cpEarned) : "");

  // El tipo a efectos de CP: online no reparte puntos (v0.15).
  const cpKind = cpKindOf(tournament);
  const givesCp = awardsCp(season, cpKind);
  const tier = givesCp
    ? tierFor(season, cpKind, placement ? Number(placement) : null, tournament.playerCount)
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
          <label className="label" htmlFor="placement">{tr(lng, "x.7f57e400")}</label>
          <input
            className="input text-center font-display text-xl font-extrabold tabular"
            id="placement" name="placement" type="number" min={1} inputMode="numeric"
            value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="9"
          />
          {tournament.playerCount ? (
            <p className="text-xs text-muted">de {tournament.playerCount} participantes</p>
          ) : (
            <p className="text-xs text-muted">{tr(lng, "x.d76d6080")}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="label">{tr(lng, "x.ae88bb6d")}</label>
          {hasRounds && (
            <div className="seg w-full text-[13px]">
              <button type="button" data-on={recordMode === "rounds"} onClick={() => setRecordMode("rounds")}>
                {tr(lng, "x.f2f4d948")}
              </button>
              <button type="button" data-on={recordMode === "manual"} onClick={() => setRecordMode("manual")}>
                {tr(lng, "x.616b585f")}
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
                  aria-label={["Victorias", tr(lng, "x.a80f28ed"), tr(lng, "x.4975fb9f")][i]}
                  placeholder={["V", "D", "E"][i]}
                  defaultValue={result ? result[f] : ""}
                />
              ))}
            </div>
          )}
          <p className="text-xs text-muted">
            {recordMode === "rounds" && hasRounds
              ? tr(lng, "x.a0733085")
              : hasRounds
                ? tr(lng, "x.1e661e1e")
                : tr(lng, "x.4a3d7329")}
          </p>
        </div>
      </div>

      {/* -------------------------------- mazo -------------------------------- */}
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="deckId">{tr(lng, "x.3593f10e")}</label>
        <DeckPicker
          id="deckId" name="deckId"
          options={deckOptions}
          defaultValue={result?.deckId ?? ""}
          emptyLabel={tr(lng, "x.2d5769ca")}
          placeholder={tr(lng, "x.ccec50e5")}
        />
        <p className="text-xs text-muted">
          {tr(lng, "x.5c6b83ea")}
        </p>
      </div>

      {/* v0.21 — para un organizador que corrige el resultado de otro, esto es
          «Corregir arquetipo» y sale abierto: el arquetipo elegido aquí manda
          sobre el del mazo en las estadísticas (p. ej. «Grookey / Applin» →
          «Festival Lead»). */}
      <details className="rounded-lg border border-line-soft" open={organizador || undefined}>
        <summary className="tap cursor-pointer justify-start px-3 text-sm font-semibold text-muted">
          {organizador
            ? tr(lng, "x.5a3bbc62")
            : tr(lng, "x.d3ca770b")}
        </summary>
        <div className="border-t border-line-soft p-3">
          <DeckPicker
            name="archetypeId"
            options={archetypeOptions}
            defaultValue={archetypeValue(result?.archetypeId)}
            emptyLabel={tr(lng, "x.8a4e4db7")}
            placeholder={tr(lng, "x.ea31e365")}
          />
        </div>
      </details>

      {/* ------------------------- Championship Points ------------------------ */}
      <div className="rounded-lg border border-line-soft bg-ground p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="label">{tr(lng, "x.a6f9ffb9")}</span>
          {givesCp && (
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox" name="cpManual" className="size-4"
                checked={cpManual} onChange={(e) => setCpManual(e.target.checked)}
              />
              {tr(lng, "x.616b585f")}
            </label>
          )}
        </div>

        {!givesCp ? (
          <p className="mt-2 text-sm text-muted">
            {tournament.scope === "online"
              ? tr(lng, "x.0ef847ef")
              : tr(lng, "x.8afaf81d")}
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
                {tr(lng, "x.794f291e")}
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
              <p className="mt-1.5 text-xs text-muted">{tr(lng, "x.688ec0a9")}</p>
            )}
          </>
        )}
      </div>

      {/* ------------------------------ premios ------------------------------- */}
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="prizes">{tr(lng, "x.83d224e9")}</label>
        <input
          className="input" id="prizes" name="prizes" maxLength={300}
          defaultValue={result?.prizes ?? ""}
          placeholder={tr(lng, "x.6df39916")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="resultNotes">{tr(lng, "x.054de504")}</label>
        <textarea
          className="input" id="resultNotes" name="resultNotes" rows={3} maxLength={1000}
          defaultValue={result?.notes ?? ""}
          placeholder={tr(lng, "x.59c6d8cf")}
        />
      </div>

      {/* v0.15.1 — el drop se apunta desde la ronda («DROP · me retiro») y se
          deshace desde el aviso de la ficha. Aquí solo viaja el valor que ya
          había, para que guardar el resultado no lo borre. */}
      <input type="hidden" name="dropped" value={result?.dropped ? "on" : ""} />
      {result?.dropped && (
        <p className="flex items-center gap-2 text-xs text-muted">
          <span className="chip chip-drop">{tr(lng, "x.39514a7a")}</span> {tr(lng, "x.837500bb")}
        </p>
      )}

      <button className="btn btn-brand w-full" type="submit">
        <Icon name="check" className="size-4" />
        {result ? "Guardar el resultado" : tr(lng, "x.16e685ff")}
      </button>
    </form>
  );
}
