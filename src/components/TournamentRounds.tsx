"use client";

import { useState } from "react";
import { saveTournamentRound, deleteTournamentRound } from "@/actions";
import type { Archetype, Deck, Side } from "@/lib/types";
import type { RoundView, RoundRecord } from "@/lib/stats";
import { Sprites } from "./ui";
import { Icon } from "./icons";

/* =========================================================================
   Ir apuntando el torneo ronda a ronda.

   Pensado para rellenarse de pie, con una mano, entre rondas: el caso real es
   que acabas la ronda 3 y tienes dos minutos antes de que salgan los
   emparejamientos siguientes. Por eso lo primero que se ve es el modo rápido
   —rival, su mazo, salí 1.º o 2.º, gané o perdí— y el desglose juego a juego
   está escondido detrás de una pestaña, para cuando hay tiempo.

   Todo son formularios normales: se envían a una Server Action y funcionan
   sin JavaScript. El estado de React solo sirve para lo que de verdad es
   interactivo (elegir con botones en vez de con desplegables).
   ========================================================================= */

type Props = {
  tournamentId: string;
  playerId: string;
  playerName: string;
  bestOf: number;
  rounds: RoundView[];
  record: RoundRecord;
  archetypes: Archetype[];
  decks: Deck[];
  /** Rondas anunciadas por la organización, si se saben. */
  totalRounds: number | null;
  archById: Map<string, Archetype>;
  archIndex: Map<string, Archetype | undefined>;
  canEdit: boolean;
};

export function TournamentRounds({
  tournamentId, playerId, playerName, bestOf, rounds, record,
  archetypes, decks, totalRounds, archById, archIndex, canEdit,
}: Props) {
  const [editing, setEditing] = useState<number | null>(null);
  const nextRound = rounds.length ? Math.max(...rounds.map((r) => r.round)) + 1 : 1;
  const finished = totalRounds != null && totalRounds > 0 && nextRound > totalRounds;

  const archOfRound = (r: RoundView) =>
    r.match.opponentArchetypeId ? archById.get(r.match.opponentArchetypeId) : undefined;

  return (
    <section className="card">
      <div className="card-head">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">Tus rondas</h2>
          <p className="text-xs text-muted">
            {record.label} · {record.points} punto{record.points === 1 ? "" : "s"}
            {record.open > 0 ? ` · ${record.open} sin cerrar` : ""}
            {totalRounds ? ` · ${rounds.length} de ${totalRounds}` : ""}
          </p>
        </div>
        <span className="font-display text-3xl font-extrabold tabular leading-none">
          {record.wins}–{record.losses}{record.ties ? `–${record.ties}` : ""}
        </span>
      </div>

      {rounds.length > 0 && (
        <ol className="divide-y divide-line-soft">
          {rounds.map((r) => {
            const arch = archOfRound(r);
            const open = editing === r.round;
            return (
              <li key={r.match.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-9 flex-none place-items-center rounded-lg font-display text-sm font-extrabold
                      ${r.result === "w" ? "bg-win-soft text-win"
                        : r.result === "l" ? "bg-loss-soft text-loss"
                        : r.result === "d" ? "bg-tie-soft text-tie"
                        : "border border-dashed border-line text-muted"}`}
                    title={
                      r.result === "w" ? "Ganada" : r.result === "l" ? "Perdida"
                      : r.result === "d" ? "Empatada" : "Sin cerrar"
                    }
                  >
                    R{r.round}
                  </span>

                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <Sprites archetype={arch} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {r.match.opponentName || "Rival sin nombre"}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {arch?.name ?? "Mazo sin anotar"}
                      </span>
                    </span>
                  </span>

                  <span className="flex flex-none flex-col items-end gap-1">
                    <span className="text-[13px] font-semibold">
                      {r.result === null
                        ? <span className="text-muted">Abierta</span>
                        : r.declared
                          ? (r.result === "w" ? "Ganada" : r.result === "l" ? "Perdida" : "Empate")
                          : <span className="font-mono tabular">{r.ga}–{r.gb}</span>}
                    </span>
                    {r.firstGameOne !== null && (
                      <span className="text-[10px] text-muted">
                        salí {r.firstGameOne ? "1.º" : "2.º"}
                      </span>
                    )}
                  </span>

                  {canEdit && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm flex-none"
                      aria-expanded={open}
                      onClick={() => setEditing(open ? null : r.round)}
                    >
                      {open ? "Cerrar" : "Editar"}
                    </button>
                  )}
                </div>

                {r.match.note && (
                  <p className="mt-1.5 pl-12 text-xs text-ink-2">{r.match.note}</p>
                )}

                {open && canEdit && (
                  <div className="mt-3 flex flex-col gap-2">
                    <RoundForm
                      tournamentId={tournamentId}
                      playerId={playerId}
                      round={r.round}
                      bestOf={bestOf}
                      archetypes={archetypes}
                      decks={decks}
                      existing={r}
                      archIndex={archIndex}
                      onCancel={() => setEditing(null)}
                    />
                    {/* Hermano del formulario de edición, no hijo: un <form>
                        dentro de otro es HTML inválido y el botón de borrar
                        acabaría enviando el de guardar. */}
                    <form action={deleteTournamentRound}>
                      <input type="hidden" name="id" value={r.match.id} />
                      <input type="hidden" name="tournamentId" value={tournamentId} />
                      <button className="btn btn-ghost btn-sm btn-danger" type="submit">
                        Borrar la ronda {r.round}
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {canEdit ? (
        finished ? (
          <p className="px-4 py-5 text-center text-sm text-muted">
            Tienes las {totalRounds} rondas apuntadas. Si hubo top cut, sigue añadiendo con el
            número de ronda que quieras.
          </p>
        ) : (
          <div className="border-t border-line-soft p-4">
            <h3 className="mb-3 font-display text-base font-bold">
              Apuntar la ronda {nextRound}
            </h3>
            <RoundForm
              tournamentId={tournamentId}
              playerId={playerId}
              round={nextRound}
              bestOf={bestOf}
              archetypes={archetypes}
              decks={decks}
              archIndex={archIndex}
            />
          </div>
        )
      ) : rounds.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">
          {playerName} no ha apuntado rondas de este torneo.
        </p>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------ formulario -- */

const RESULTS = [
  { v: "a", label: "Gané", cls: "data-[on=true]:bg-win data-[on=true]:text-white" },
  { v: "tie", label: "Empate", cls: "data-[on=true]:bg-tie data-[on=true]:text-white" },
  { v: "b", label: "Perdí", cls: "data-[on=true]:bg-loss data-[on=true]:text-white" },
] as const;

function RoundForm({
  tournamentId, playerId, round, bestOf, archetypes, decks, existing, archIndex, onCancel,
}: {
  tournamentId: string;
  playerId: string;
  round: number;
  bestOf: number;
  archetypes: Archetype[];
  decks: Deck[];
  existing?: RoundView;
  archIndex: Map<string, Archetype | undefined>;
  onCancel?: () => void;
}) {
  const m = existing?.match;
  const hasGames = (m?.games.length ?? 0) > 0;

  const [mode, setMode] = useState<"quick" | "games">(hasGames ? "games" : "quick");
  const [first, setFirst] = useState<Side | "">(
    existing?.firstGameOne === true ? "a" : existing?.firstGameOne === false ? "b" : "",
  );
  const [result, setResult] = useState<string>(
    existing && existing.declared && existing.result
      ? (existing.result === "w" ? "a" : existing.result === "l" ? "b" : "tie")
      : "",
  );
  const [gameWinners, setGameWinners] = useState<string[]>(() => {
    const base = Array.from({ length: bestOf }, () => "");
    m?.games.forEach((g) => { if (g.number - 1 < bestOf) base[g.number - 1] = g.winner; });
    return base;
  });
  const [timeCalled, setTimeCalled] = useState(false);
  const [opponentArchetypeId, setOpponentArchetypeId] = useState(m?.opponentArchetypeId ?? "");

  const need = Math.floor(bestOf / 2) + 1;
  const won = gameWinners.filter((w) => w === "a").length;
  const lost = gameWinners.filter((w) => w === "b").length;
  const settled = won >= need || lost >= need;
  // Cuántos juegos tiene sentido enseñar: se acaba en cuanto hay mayoría.
  const visibleGames = (() => {
    let shown = 0, a = 0, b = 0;
    for (let i = 0; i < bestOf; i++) {
      shown++;
      if (gameWinners[i] === "a") a++;
      if (gameWinners[i] === "b") b++;
      if (a >= need || b >= need) break;
    }
    return shown;
  })();

  const oppArch = opponentArchetypeId ? archetypes.find((a) => a.id === opponentArchetypeId) : undefined;

  return (
    <form action={saveTournamentRound} className="flex flex-col gap-3.5 rounded-xl border border-line-soft bg-ground p-3.5">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="playerId" value={playerId} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="first" value={first} />

      <div className="grid grid-cols-[5.5rem_1fr] gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor={`round-${round}`}>Ronda</label>
          <input
            className="input px-2 text-center" id={`round-${round}`} name="round"
            type="number" min={1} max={50} inputMode="numeric" defaultValue={round}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor={`opp-${round}`}>Rival</label>
          <input
            className="input" id={`opp-${round}`} name="opponentName" required maxLength={60}
            autoComplete="off" defaultValue={m?.opponentName ?? ""} placeholder="Como salga en el emparejamiento"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor={`arch-${round}`}>Contra qué mazo</label>
        <div className="flex items-center gap-2">
          <Sprites archetype={oppArch} size="md" />
          <select
            className="input min-w-0 flex-1" id={`arch-${round}`} name="opponentArchetypeId"
            value={opponentArchetypeId}
            onChange={(e) => setOpponentArchetypeId(e.target.value)}
          >
            <option value="">— sin anotar —</option>
            {archetypes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label">Salí</label>
        <div className="seg w-full">
          {([["a", "1.º"], ["b", "2.º"], ["", "No me acuerdo"]] as const).map(([v, label]) => (
            <button key={v || "none"} type="button" data-on={first === v} onClick={() => setFirst(v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {decks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor={`deck-${round}`}>Con qué mazo jugaste</label>
          <select className="input" id={`deck-${round}`} name="deckAId" defaultValue={m?.deckAId ?? (decks[0]?.id ?? "")}>
            <option value="">— sin anotar —</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}{archIndex.get(d.id) ? ` · ${archIndex.get(d.id)!.name}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* --- resultado: rápido o juego a juego --- */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="label">Resultado</span>
          <div className="seg">
            <button type="button" data-on={mode === "quick"} onClick={() => setMode("quick")}>Rápido</button>
            <button type="button" data-on={mode === "games"} onClick={() => setMode("games")}>Juego a juego</button>
          </div>
        </div>

        {mode === "quick" ? (
          <>
            <input type="hidden" name="result" value={result} />
            <div className="seg w-full">
              {RESULTS.map((r) => (
                <button
                  key={r.v} type="button" className={r.cls}
                  data-on={result === r.v}
                  onClick={() => setResult(result === r.v ? "" : r.v)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {!result && (
              <p className="text-xs text-muted">
                Sin marcar nada la ronda se guarda abierta, y el resultado lo pones al acabar.
                Útil para apuntar el emparejamiento antes de jugar.
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {Array.from({ length: visibleGames }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-14 flex-none font-display text-sm font-bold text-muted">
                  Juego {i + 1}
                </span>
                <div className="seg min-w-0 flex-1">
                  {RESULTS.map((r) => (
                    <button
                      key={r.v} type="button" className={r.cls}
                      data-on={gameWinners[i] === r.v}
                      onClick={() =>
                        setGameWinners((prev) =>
                          prev.map((w, k) => (k === i ? (w === r.v ? "" : r.v) : w)),
                        )
                      }
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <input type="hidden" name={`g${i}_winner`} value={gameWinners[i]} />
                {i > 0 && (
                  // Quien pierde un juego empieza el siguiente: se rellena solo
                  // y se puede cambiar si en la mesa pasó otra cosa.
                  <input
                    type="hidden" name={`g${i}_first`}
                    value={gameWinners[i - 1] === "a" ? "b" : gameWinners[i - 1] === "b" ? "a" : ""}
                  />
                )}
              </div>
            ))}

            {!settled && gameWinners.some(Boolean) && (
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox" name="timeCalled" className="size-4"
                  checked={timeCalled} onChange={(e) => setTimeCalled(e.target.checked)}
                />
                Se acabó el tiempo: la ronda queda {won > lost ? "ganada" : lost > won ? "perdida" : "en empate"}
              </label>
            )}
            <p className="text-xs text-muted">
              {settled
                ? `Ronda ${won > lost ? "ganada" : "perdida"} ${won}–${lost}.`
                : gameWinners.some(Boolean)
                  ? `${won}–${lost} y todavía sin decidir. Marca «se acabó el tiempo» si la ronda terminó así.`
                  : "Marca cada juego. En cuanto haya mayoría, el resto desaparece."}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor={`note-${round}`}>Nota</label>
        <input
          className="input" id={`note-${round}`} name="note" maxLength={300}
          defaultValue={m?.note ?? ""} placeholder="Bricheo raro, la decisión de la ronda, lo que sea"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-brand min-w-40 flex-1" type="submit">
          <Icon name="check" className="size-4" />
          {existing ? "Guardar cambios" : `Guardar ronda ${round}`}
        </button>
        {onCancel && (
          <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancelar</button>
        )}
      </div>
    </form>
  );
}

