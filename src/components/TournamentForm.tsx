"use client";

import { useMemo, useState } from "react";
import { saveTournament } from "@/actions";
import { eventKinds, awardsCp } from "@/lib/cp";
import { TOURNAMENT_FORMATS, TOURNAMENT_KIND_GROUPS, DIVISIONS, TOURNAMENT_STATUS } from "@/lib/types";
import type { Tournament } from "@/lib/types";
// v0.47 — de su módulo y no de `lib/stats`, para no llevarse stats entero al navegador.
import { suggestedRounds, suggestedTopCut } from "@/lib/sugerencias";
import { isRegionalTournament, regionalStructure } from "@/lib/cut";
import { familiaDe } from "@/lib/estructura";
import { todayISO } from "@/lib/format";
import { Icon } from "./icons";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

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
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const kinds = useMemo(() => eventKinds(season), [season]);
  const labelOf = (k: string) => kinds.find((x) => x.value === k)?.label ?? k;

  const [kind, setKind] = useState(tournament?.kind ?? "store");
  const [scope, setScope] = useState(tournament?.scope ?? "onsite");
  const [bestOf, setBestOf] = useState(
    tournament?.bestOf
      ?? (tournament?.kind === "league_challenge" || tournament?.kind === "pokemon_challenge" ? 1 : 3),
  );
  const [status, setStatus] = useState(tournament?.status ?? "open");

  const [playerCount, setPlayerCount] = useState<string>(
    tournament?.playerCount != null ? String(tournament.playerCount) : "",
  );
  /* v0.45 — la estructura, en tres piezas: rondas de la fase 1, una segunda
     fase suiza opcional y el tamaño del corte. `rounds` en la base sigue
     siendo el TOTAL de rondas suizas (fase 1 + fase 2), así que al editar se
     reparte de vuelta. */
  const f2Guardada = tournament?.roundsPhase2 ?? null;
  const [conFase2, setConFase2] = useState<boolean>(f2Guardada != null && f2Guardada > 0);
  const [rondasF2, setRondasF2] = useState<number>(f2Guardada && f2Guardada > 0 ? f2Guardada : 3);
  const [rounds, setRounds] = useState<string>(
    tournament?.rounds != null
      ? String(Math.max(1, tournament.rounds - (f2Guardada && f2Guardada < tournament.rounds ? f2Guardada : 0)))
      : "",
  );
  const [corte, setCorte] = useState<number>(tournament?.topCut ?? 0);
  const [corteOtro, setCorteOtro] = useState<boolean>(
    tournament?.topCut != null && tournament.topCut > 0 && ![4, 8, 16, 32].includes(tournament.topCut),
  );

  // v0.15: los torneos online no reparten CP aunque se llamen Challenge.
  const givesCp = scope !== "online" && awardsCp(season, kind);
  const people = Number(playerCount) || 0;
  const isRegional = isRegionalTournament(kind, people > 0 ? people : null);
  const maxRounds = people > 1 ? suggestedRounds(people, kind) : null;
  const recTopCut = people > 1 ? suggestedTopCut(people, kind) : (isRegional ? 8 : null);
  const regStruct = isRegional && people > 0 ? regionalStructure(people) : null;
  const roundsN = Number(rounds) || 0;
  const roundsOff = maxRounds != null && roundsN > 0 && roundsN !== maxRounds && !conFase2;
  /* La segunda fase propia es para lo que NO tiene tabla oficial de dos
     fases (online, tienda, eventos propios). En un Regional las fases las
     pone el reglamento y la app ya las sabe. */
  const oficialDosFases = familiaDe(kind) === "dosFases";
  const f2 = conFase2 && !oficialDosFases ? rondasF2 : 0;
  const totalSuizo = roundsN + f2;
  const resumen = [
    roundsN ? (f2 ? `${roundsN} + ${f2} rondas suizas` : `${roundsN} rondas suizas`) : tr(lng, "x.8ca8405d"),
    corte > 0 ? `top ${corte}` : tr(lng, "x.ebc2ebf2"),
  ].join(" · ");

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
            <label className="label" htmlFor="name">{tr(lng, "x.e68491e9")}</label>
            <input
              className="input" id="name" name="name" required maxLength={120}
              defaultValue={tournament?.name ?? ""}
              placeholder={tr(lng, "x.02760be0")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="kind">{tr(lng, "x.6cc6198d")}</label>
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
                ? tr(lng, "x.7c581570")
                : scope === "online" && awardsCp(season, kind)
                  ? tr(lng, "x.a50d2f3d")
                  : tr(lng, "x.5685bdd2")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="label">{tr(lng, "x.7c72f46c")}</label>
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
              <label className="label" htmlFor="format">{tr(lng, "x.c25b742e")}</label>
              <select className="input" id="format" name="format" defaultValue={tournament?.format ?? "standard"}>
                {Object.entries(TOURNAMENT_FORMATS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label">{tr(lng, "x.9868120d")}</label>
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
              <label className="label" htmlFor="date">{tr(lng, "x.bcc47609")}</label>
              <input className="input" id="date" name="date" type="date" defaultValue={tournament?.date ?? todayISO()} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="startTime">{tr(lng, "x.2c247b90")}</label>
              <input
                className="input" id="startTime" name="startTime" type="time"
                defaultValue={tournament?.startTime ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="playerCount">{tr(lng, "x.3eb39e63")}</label>
              <input
                className="input" id="playerCount" name="playerCount" type="number" min={1} inputMode="numeric"
                value={playerCount} onChange={(e) => setPlayerCount(e.target.value)}
                placeholder="32"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="entryFee">{tr(lng, "x.e92c5a00")}</label>
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

          {/* v0.45 — ESTRUCTURA, a la vista y sin teclear.

              Antes eran un número de rondas suelto aquí y el tamaño del corte
              escondido dentro de «Más detalles», y no había forma de decir que
              un torneo tenía una segunda fase suiza. Ahora son tres piezas
              juntas, con botones de más y menos y chips, y un resumen arriba
              que dice cómo queda: «8 + 3 rondas suizas · top 8». */}
          <fieldset className="flex flex-col gap-3 rounded-lg border border-line-soft p-3">
            <legend className="sr-only">{tr(lng, "x.299de872")}</legend>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="label">{tr(lng, "x.de5df3ac")}</span>
              <span className="chip chip-brand tabular">{resumen}</span>
            </div>

            <Paso
              id="rounds" etiqueta={f2 ? "Fase 1 · rondas suizas" : tr(lng, "x.9db42d2a")}
              valor={roundsN} min={1} max={30}
              alCambiar={(n) => setRounds(String(n))}
            />
            {maxRounds != null && (
              <button
                type="button"
                className="-mt-1 w-fit text-xs font-semibold text-info underline underline-offset-2"
                onClick={() => setRounds(String(maxRounds))}
              >
                {regStruct && regStruct.hasDay2
                  ? `Con ${people} personas: ${maxRounds} rondas (${regStruct.day1Rounds} Día 1 + ${regStruct.day2Rounds} Día 2)`
                  : `Con ${people} personas tocan ${maxRounds}`}
              </button>
            )}
            {roundsOff && (
              <p className="text-xs text-muted">
                {regStruct && regStruct.hasDay2
                  ? `El reglamento pide ${maxRounds} rondas para ${people} participantes (${regStruct.day1Rounds} en Día 1 y ${regStruct.day2Rounds} en Día 2). Si el torneo usó ${roundsN}, puedes dejarlo.`
                  : `Un suizo de ${people} suele ser de ${maxRounds} rondas. Si el vuestro fue de ${roundsN}, adelante: hay torneos que recortan por horario.`}
              </p>
            )}

            {oficialDosFases ? (
              <p className="text-xs text-muted">
                {tr(lng, "x.19427820")}
              </p>
            ) : (
              <>
                <button
                  type="button" aria-pressed={conFase2}
                  onClick={() => setConFase2((v) => !v)}
                  className={`chip w-fit ${conFase2 ? "chip-brand" : ""}`}
                >
                  {conFase2 ? "✓ Con segunda fase suiza" : "+ Segunda fase suiza"}
                </button>
                {conFase2 && (
                  <>
                    <Paso
                      id="roundsPhase2" etiqueta={tr(lng, "x.0f653cde")}
                      valor={rondasF2} min={1} max={20} alCambiar={setRondasF2}
                      ayuda={tr(lng, "x.e49cfb66")}
                    />
                    {/* v0.47 — cómo se pasa: con los puntos O el top N, lo que dé
                        más gente. Es la regla de los online como Moujii's Dojo, y
                        sin ella el camino al corte no puede decirte qué te falta. */}
                    <div className="flex flex-col gap-1.5">
                      <span className="label">{tr(lng, "x.1e4be5ba")}</span>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <input className="input w-20 text-center tabular" type="number" inputMode="numeric"
                          name="phase2Points" min={1} max={150} aria-label={tr(lng, "x.963956af")}
                          defaultValue={tournament?.phase2Points ?? ""} placeholder="16" />
                        <span className="text-muted">{tr(lng, "x.ca55bc5b")}</span>
                        <input className="input w-20 text-center tabular" type="number" inputMode="numeric"
                          name="phase2Top" min={2} max={512} aria-label={tr(lng, "x.7d78bca4")}
                          defaultValue={tournament?.phase2Top ?? ""} placeholder="8" />
                      </div>
                      <p className="text-xs text-muted">{tr(lng, "x.193e6013")}</p>
                    </div>
                    {corte > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="label">{tr(lng, "x.2bed25f6")}</span>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <input className="input w-20 text-center tabular" type="number" inputMode="numeric"
                            name="cutPoints" min={1} max={150} aria-label={tr(lng, "x.1d9afab1")}
                            defaultValue={tournament?.cutPoints ?? ""} placeholder="24" />
                          <span className="text-muted">puntos, o el top {corte}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Top cut: chips de un toque con los tamaños de siempre, y «otro»
                para lo raro. El recomendado por asistencia sale marcado. */}
            <div className="flex flex-col gap-1.5">
              <span className="label">{tr(lng, "x.2ec4eeea")}</span>
              <div className="flex flex-wrap gap-1.5">
                {[0, 4, 8, 16, 32].map((n) => (
                  <button
                    key={n} type="button" aria-pressed={!corteOtro && corte === n}
                    onClick={() => { setCorteOtro(false); setCorte(n); }}
                    className={`chip ${!corteOtro && corte === n ? "chip-brand" : ""}`}
                  >
                    {n === 0 ? "Sin corte" : `Top ${n}`}
                    {n > 0 && recTopCut === n && <span className="ml-1 text-[10px] opacity-70">{tr(lng, "x.cd87e19a")}</span>}
                  </button>
                ))}
                <button
                  type="button" aria-pressed={corteOtro}
                  onClick={() => setCorteOtro(true)}
                  className={`chip ${corteOtro ? "chip-brand" : ""}`}
                >
                  {tr(lng, "x.ada1c1ef")}
                </button>
              </div>
              {corteOtro && (
                <input
                  className="input w-28 text-center tabular" type="number" min={2} max={512} inputMode="numeric"
                  aria-label={tr(lng, "x.d98ba553")} value={corte || ""}
                  onChange={(e) => setCorte(Number(e.target.value) || 0)} placeholder="12"
                />
              )}
              {familiaDe(kind) === "challenge" && !f2 && corte > 0 && (
                <p className="text-xs text-muted">
                  {tr(lng, "x.f55ac70a")}
                </p>
              )}
            </div>

            {/* Lo que viaja al servidor. `rounds` es el TOTAL de rondas suizas,
                como siempre; `roundsPhase2`, cuántas de ellas son de la fase 2. */}
            <input type="hidden" name="rounds" value={totalSuizo || ""} />
            <input type="hidden" name="roundsPhase2" value={f2 || ""} />
            <input type="hidden" name="topCut" value={corte} />

            {!playerCount && (
              <p className="text-xs text-muted">
                {isRegional
                  ? tr(lng, "x.d8fe9001")
                  : tr(lng, "x.2bc870c5")}
              </p>
            )}
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="venue">{scope === "online" ? "Plataforma" : tr(lng, "x.34efdbdc")}</label>
              <input
                className="input" id="venue" name="venue" defaultValue={tournament?.venue ?? ""}
                placeholder={scope === "online" ? "PTCG Live" : tr(lng, "x.79e6fa20")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="city">{tr(lng, "x.c6fbe2dc")}</label>
              <input className="input" id="city" name="city" defaultValue={tournament?.city ?? ""} placeholder={tr(lng, "x.55e20c99")} />
            </div>
          </div>

          {/* El estado solo se elige al crear. Después se mueve con los botones
              del ciclo, en la ficha: cerrar un torneo es una decisión, no un
              desplegable que se cambia sin darse cuenta al editar la sede. */}
          {!tournament && (
            <div className="flex flex-col gap-1.5">
              <label className="label">{tr(lng, "x.87cf2a84")}</label>
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
                  ? tr(lng, "x.b012c08a")
                  : tr(lng, "x.67417b16")}
              </p>
            </div>
          )}

          <details className="rounded-lg border border-line-soft">
            <summary className="tap cursor-pointer justify-start px-3 text-sm font-semibold text-muted">
              {tr(lng, "x.939d2603")}
            </summary>
            <div className="flex flex-col gap-4 border-t border-line-soft p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="division">{tr(lng, "x.e65ae57c")}</label>
                  <select className="input" id="division" name="division" defaultValue={tournament?.division ?? "masters"}>
                    {Object.entries(DIVISIONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="organizer">{tr(lng, "x.d6bf2c62")}</label>
                  <input className="input" id="organizer" name="organizer" defaultValue={tournament?.organizer ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="endDate">{tr(lng, "x.8b739d03")}</label>
                  <input className="input" id="endDate" name="endDate" type="date" defaultValue={tournament?.endDate ?? ""} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="url">{tr(lng, "x.4b0eaf1e")}</label>
                <input className="input" id="url" name="url" type="url" inputMode="url"
                  defaultValue={tournament?.url ?? ""} placeholder={tr(lng, "x.1f01350b")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="notes">{tr(lng, "x.aa399cbf")}</label>
                <textarea className="input" id="notes" name="notes" rows={2} defaultValue={tournament?.notes ?? ""} />
              </div>
            </div>
          </details>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-brand min-w-44 flex-1" type="submit">
          <Icon name="check" className="size-4" />
          {tournament ? "Guardar cambios" : tr(lng, "x.e02ad96f")}
        </button>
        <a className="btn btn-ghost" href={back}>{tr(lng, "x.c111e0ab")}</a>
      </div>

      {!tournament && (
        <p className="text-center text-xs text-muted">
          {tr(lng, "x.f512caa2")}
        </p>
      )}
    </form>
  );
}

/**
 * Un número con botones de más y menos.
 *
 * v0.45 — para las rondas: desde el móvil, tocar «+» tres veces es más rápido
 * y más difícil de equivocar que abrir el teclado numérico, borrar y escribir.
 * Los botones tienen 44 px. El número sigue siendo editable a mano para quien
 * prefiera teclear.
 */
function Paso({
  id, etiqueta, valor, min, max, alCambiar, ayuda,
}: {
  id: string; etiqueta: string; valor: number; min: number; max: number;
  alCambiar: (n: number) => void; ayuda?: string;
}) {
  const fija = (n: number) => alCambiar(Math.min(max, Math.max(min, Math.round(n) || min)));
  return (
    <div className="flex flex-col gap-1">
      <label className="label" htmlFor={`paso-${id}`}>{etiqueta}</label>
      <div className="flex items-center gap-2">
        <button type="button" className="btn size-11 flex-none p-0 text-lg"
          aria-label={`Una ronda menos en ${etiqueta.toLowerCase()}`}
          disabled={valor <= min} onClick={() => fija(valor - 1)}>−</button>
        <input
          id={`paso-${id}`} className="input w-20 text-center text-lg font-bold tabular"
          type="number" inputMode="numeric" min={min} max={max}
          value={valor || ""} onChange={(e) => alCambiar(Number(e.target.value) || 0)}
          onBlur={(e) => fija(Number(e.target.value))}
        />
        <button type="button" className="btn size-11 flex-none p-0 text-lg"
          aria-label={`Una ronda más en ${etiqueta.toLowerCase()}`}
          disabled={valor >= max} onClick={() => fija(valor + 1)}>+</button>
      </div>
      {ayuda && <p className="text-xs text-muted">{ayuda}</p>}
    </div>
  );
}
