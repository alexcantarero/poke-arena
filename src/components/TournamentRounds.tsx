"use client";

import { useState } from "react";
import { saveTournamentRound, deleteTournamentRound } from "@/actions";
import type { Archetype, DeckOption, Side } from "@/lib/types";
import { archetypeValue } from "@/lib/types";
import type { RoundView, RoundRecord } from "@/lib/stats";
import { roundStage } from "@/lib/stats";
import { DeckPicker } from "./DeckPicker";
import { Sprites } from "./ui";
import { Icon } from "./icons";

/* =========================================================================
   Ir apuntando el torneo ronda a ronda.

   Pensado para rellenarse de pie, con una mano, entre rondas: el caso real es
   que acabas la ronda 3 y tienes dos minutos antes de que salgan los
   emparejamientos siguientes. Por eso lo primero que se ve es el modo rápido
   —rival, su mazo, salí 1.º o 2.º, gané o perdí— y el desglose juego a juego
   está detrás de un botón, para cuando hay tiempo.

   Tres cosas que cambiaron y conviene que sigan así:

   · **El mazo del torneo no se pregunta cada ronda.** En un suizo juegas el
     mismo mazo de la primera a la última, así que se elige una vez —en tu
     resultado— y las rondas lo heredan. Preguntarlo siete veces era invitar a
     que la tercera te equivocaras y ensuciar tus propias estadísticas.
   · **Quién sale primero se marca en cada juego.** Antes se deducía («pierde
     un juego, empieza el siguiente») y casi siempre acertaba, pero en la mesa
     pasan concesiones, penalizaciones y reinicios. El dato bueno es el que
     viste, no el que se deduce.
   · **Un torneo cerrado no acepta rondas.** Si no, «cerrado» sería un adorno.

   Todo son formularios normales: se envían a una Server Action y funcionan
   sin JavaScript. El estado de React solo sirve para lo que de verdad es
   interactivo.
   ========================================================================= */

type Props = {
  tournamentId: string;
  playerId: string;
  playerName: string;
  bestOf: number;
  rounds: RoundView[];
  record: RoundRecord;
  /** Mazos que puede haber llevado el rival: todo lo que haya. */
  rivalDecks: DeckOption[];
  /** Arquetipos sueltos, para el rival del que solo sabes qué llevaba. */
  archetypeOptions: DeckOption[];
  /** Tus mazos, para fijar el del torneo si aún no está. */
  myDecks: DeckOption[];
  /** El mazo ya fijado para este torneo, si lo hay. */
  lockedDeckId: string | null;
  /** Su nombre, resuelto en el servidor: puede estar retirado y no salir en las listas. */
  lockedDeckName?: string | null;
  /** Si estas rondas son de quien está mirando. Decide el título, nada más. */
  isMine: boolean;
  /** Rondas anunciadas por la organización, si se saben. */
  totalRounds: number | null;
  /** Tamaño del top cut, si se sabe. Junto con totalRounds da el nombre de cada fase. */
  topCut: number | null;
  playerCount?: number | null;
  archById: Map<string, Archetype>;
  /** El torneo está cerrado: se puede mirar, no escribir. */
  closed: boolean;
  canEdit: boolean;
};

export function TournamentRounds({
  tournamentId, playerId, playerName, bestOf, rounds, record,
  rivalDecks, archetypeOptions, myDecks, lockedDeckId, lockedDeckName, isMine,
  totalRounds, topCut, playerCount, archById, closed, canEdit,
}: Props) {
  const [editing, setEditing] = useState<number | null>(null);
  const nextRound = rounds.length ? Math.max(...rounds.map((r) => r.round)) + 1 : 1;
  const finished = totalRounds != null && totalRounds > 0 && nextRound > totalRounds;
  const writable = canEdit && !closed;

  const archOfRound = (r: RoundView) =>
    r.match.opponentArchetypeId ? archById.get(r.match.opponentArchetypeId) : undefined;

  /* El nombre del mazo fijado viene resuelto del servidor: buscarlo en las
     listas fallaba cuando el mazo estaba retirado, porque los selectores no los
     ofrecen y el aviso desaparecía aunque el mazo siguiera fijado. */
  const lockedLabel = lockedDeckId
    ? lockedDeckName
      ?? myDecks.find((d) => d.id === lockedDeckId)?.name
      ?? rivalDecks.find((d) => d.id === lockedDeckId)?.name
      ?? archetypeOptions.find((d) => d.id === lockedDeckId)?.name
      ?? null
    : null;

  return (
    <section className="card">
      <div className="card-head">
        <div className="min-w-0">
          {/* Por identidad, no por permiso: un organizador tiene canEdit sobre
              las rondas de todos, y el título decía «Tus rondas» en las de los
              demás — que encima era lo único que identificaba de quién eran. */}
          <h2 className="text-lg font-bold">
            {isMine ? "Tus rondas" : `Rondas de ${playerName}`}
          </h2>
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

      {lockedLabel && (
        <p className="flex items-center gap-2 border-b border-line-soft px-4 py-2 text-xs text-muted">
          <Icon name="lock" className="size-3.5 flex-none" />
          {isMine ? "Jugando" : "Jugó"} <b className="font-semibold text-ink-2">{lockedLabel}</b> todo el torneo.
        </p>
      )}

      {rounds.length > 0 && (
        <ol className="divide-y divide-line-soft">
          {rounds.map((r) => {
            const arch = archOfRound(r);
            const open = editing === r.round;
            return (
              <li key={r.match.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex flex-none flex-col items-center gap-0.5">
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
                    {/* Solo se etiqueta el top cut o el Día 2 */}
                    {(() => {
                      const stage = roundStage(r.round, totalRounds, topCut, playerCount);
                      if (stage.kind === "cut") {
                        return (
                          <span className="text-[9px] font-semibold uppercase leading-none tracking-wide text-brand">
                            {stage.label}
                          </span>
                        );
                      }
                      if (stage.day === 2) {
                        return (
                          <span className="text-[9px] font-semibold uppercase leading-none tracking-wide text-info">
                            Día 2
                          </span>
                        );
                      }
                      return null;
                    })()}
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

                  {writable && (
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

                {open && writable && (
                  <div className="mt-3 flex flex-col gap-2">
                    <RoundForm
                      tournamentId={tournamentId}
                      playerId={playerId}
                      round={r.round}
                      bestOf={bestOf}
                      rivalDecks={rivalDecks}
                      archetypeOptions={archetypeOptions}
                      myDecks={myDecks}
                      lockedDeckId={lockedDeckId}
                      existing={r}
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

      {closed ? (
        rounds.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            Torneo cerrado sin rondas apuntadas.
          </p>
        ) : null
      ) : canEdit ? (
        finished ? (
          <p className="px-4 py-5 text-center text-sm text-muted">
            Tienes las {totalRounds} rondas apuntadas. Si hubo top cut, sigue añadiendo con el
            número de ronda que quieras.
          </p>
        ) : (
          <div className="border-t border-line-soft p-4">
            <h3 className="mb-3 flex flex-wrap items-center gap-1.5 font-display text-base font-bold">
              Apuntar la ronda {nextRound}
              {totalRounds ? <span className="text-sm font-normal text-muted">de {totalRounds}</span> : null}
              {(() => {
                const stage = roundStage(nextRound, totalRounds, topCut, playerCount);
                if (stage.kind === "cut") {
                  return <span className="chip chip-brand text-[10px]">{stage.label}</span>;
                }
                if (stage.day === 2) {
                  return <span className="chip chip-info text-[10px]">Día 2</span>;
                }
                return null;
              })()}
            </h3>
            <RoundForm
              tournamentId={tournamentId}
              playerId={playerId}
              round={nextRound}
              bestOf={bestOf}
              rivalDecks={rivalDecks}
              archetypeOptions={archetypeOptions}
              myDecks={myDecks}
              lockedDeckId={lockedDeckId}
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

export function RoundForm({
  tournamentId, playerId, round, bestOf, rivalDecks, archetypeOptions, myDecks,
  lockedDeckId, existing, onCancel, maxRound, rivalPlayers = [],
}: {
  tournamentId: string;
  playerId: string;
  round: number;
  bestOf: number;
  rivalDecks: DeckOption[];
  archetypeOptions: DeckOption[];
  myDecks: DeckOption[];
  lockedDeckId: string | null;
  existing?: RoundView;
  onCancel?: () => void;
  /** Última ronda que admite el torneo (v0.13). Nulo = sin tope conocido. */
  maxRound?: number | null;
  /** v0.15 — gente del grupo que puede ser tu rival (todos menos tú). */
  rivalPlayers?: Array<{ id: string; name: string }>;
}) {
  const m = existing?.match;
  /* v0.15 — el rival puede ser alguien del grupo o un nombre cualquiera. Si
     tocas un nombre del grupo, se rellena el campo y la ronda queda enlazada
     a su perfil (mapa de enfrentamientos). Si escribes otra cosa, el enlace
     se suelta solo: no puede quedar «Pepe» enlazado a la cuenta de Alex. */
  const [rivalName, setRivalName] = useState<string>(m?.opponentName ?? "");
  const [rivalId, setRivalId] = useState<string>(m?.opponentPlayerId ?? "");
  const pickRival = (p: { id: string; name: string }) => {
    if (rivalId === p.id) { setRivalId(""); return; }
    setRivalId(p.id);
    setRivalName(p.name);
  };
  const hasGames = (m?.games.length ?? 0) > 0;

  /* Los mazos registrados primero y los arquetipos después: si tu rival llevaba
     algo que alguien ya tiene apuntado carta por carta, es mejor eso que el
     arquetipo a secas. */
  const rivalOptions = [...rivalDecks, ...archetypeOptions];
  /* Lo mismo para tu propio mazo: si todavía no tienes la lista de 60 cartas
     registrada, puedes fijar el torneo solo con el arquetipo. */
  const ownOptions = [...myDecks, ...archetypeOptions];

  const [mode, setMode] = useState<"quick" | "games">(hasGames ? "games" : "quick");
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
  /* Quién salió primero, juego a juego. El primero sale de la moneda; los
     siguientes vienen rellenados con «empieza quien perdió el anterior», que
     es la regla, pero se pueden cambiar porque en la mesa no siempre pasa. */
  const [firsts, setFirsts] = useState<Array<Side | "">>(() => {
    const base = Array.from({ length: bestOf }, () => "" as Side | "");
    m?.games.forEach((g) => {
      if (g.number - 1 < bestOf) base[g.number - 1] = (g.first as Side | "") || "";
    });
    if (!base[0] && m?.firstTurn) base[0] = m.firstTurn as Side;
    return base;
  });
  const [timeCalled, setTimeCalled] = useState(false);

  const need = Math.floor(bestOf / 2) + 1;
  const won = gameWinners.filter((w) => w === "a").length;
  const lost = gameWinners.filter((w) => w === "b").length;
  const settled = won >= need || lost >= need;

  // Cuántos juegos tiene sentido enseñar: se acaba en cuanto hay mayoría, o en
  // cuanto un juego se marca como empate —viene del reloj, y del reloj no se
  // juega uno más—.
  const visibleGames = (() => {
    let shown = 0, a = 0, b = 0;
    for (let i = 0; i < bestOf; i++) {
      shown++;
      const w = gameWinners[i];
      if (w === "a") a++;
      else if (w === "b") b++;
      if (w === "tie" || a >= need || b >= need) break;
    }
    return shown;
  })();

  /** ¿Ya hay un juego empatado entre los que se enseñan? Decide la ronda él solo. */
  const decidedByTie = gameWinners.slice(0, visibleGames).includes("tie");

  const setGameWinner = (i: number, v: string) => {
    setGameWinners((prev) => {
      const next = prev.map((w, k) => (k === i ? (w === v ? "" : v) : w));
      // Al marcar un juego, proponemos quién empieza el siguiente: el que lo
      // acaba de perder. Solo si aún no se había tocado a mano.
      setFirsts((f) => {
        const out = [...f];
        const winner = next[i];
        if (winner && i + 1 < bestOf && !out[i + 1]) {
          out[i + 1] = winner === "a" ? "b" : winner === "b" ? "a" : "";
        }
        return out;
      });
      return next;
    });
  };

  const setFirst = (i: number, v: Side | "") =>
    setFirsts((prev) => prev.map((x, k) => (k === i ? (x === v ? "" : v) : x)));

  return (
    <form action={saveTournamentRound} className="flex flex-col gap-3.5 rounded-xl border border-line-soft bg-ground p-3.5">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="playerId" value={playerId} />
      <input type="hidden" name="mode" value={mode} />
      {/* Al editar se manda el id de la fila. Sin él, cambiar el número de
          ronda insertaba una ronda nueva y dejaba la vieja donde estaba. */}
      {m && <input type="hidden" name="matchId" value={m.id} />}

      <div className="grid grid-cols-[5.5rem_1fr] gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor={`round-${round}`}>Ronda</label>
          <input
            className="input px-2 text-center tabular" id={`round-${round}`} name="round"
            type="number" min={1} max={maxRound ?? 50} inputMode="numeric" defaultValue={round}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor={`opp-${round}`}>Rival</label>
          <input
            className="input" id={`opp-${round}`} name="opponentName" required maxLength={60}
            autoComplete="off" value={rivalName} placeholder="Como salga en el emparejamiento"
            onChange={(e) => {
              setRivalName(e.target.value);
              const elegido = rivalPlayers.find((p) => p.id === rivalId);
              if (elegido && e.target.value.trim() !== elegido.name) setRivalId("");
            }}
          />
          <input type="hidden" name="opponentPlayerId" value={rivalId} />
        </div>
      </div>

      {rivalPlayers.length > 0 && (
        <div className="-mt-1.5 flex flex-col gap-1.5">
          <span className="text-[11px] text-muted">
            ¿Es alguien del grupo? Tócalo y queda enlazado a su perfil. Si no, escribe el nombre.
          </span>
          <div className="flex flex-wrap gap-1.5">
            {rivalPlayers.map((p) => (
              <button
                key={p.id} type="button" onClick={() => pickRival(p)}
                aria-pressed={rivalId === p.id}
                className={`chip ${rivalId === p.id ? "chip-brand" : ""}`}
              >
                {rivalId === p.id ? "✓ " : ""}{p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contra qué jugó. En la misma lista van los mazos de la biblioteca
          —con su lista de 60 cartas, si alguien la apuntó— y los arquetipos
          sueltos. Es justo para lo que existen los mazos sin dueño: apuntar lo
          que llevaba el rival sin inventarle una cuenta. */}
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor={`arch-${round}`}>Contra qué mazo</label>
        <DeckPicker
          id={`arch-${round}`} name="opponentDeck"
          options={rivalOptions}
          defaultValue={
            m?.deckBId ?? (m?.opponentArchetypeId ? archetypeValue(m.opponentArchetypeId) : "")
          }
          emptyLabel="— sin anotar —"
          placeholder="Buscar el mazo del rival"
        />
      </div>

      {/* El mazo del torneo: se elige una vez y se queda. También se puede
          fijar solo el arquetipo, si todavía no tienes la lista registrada:
          el selector ofrece las dos cosas en la misma lista. */}
      {lockedDeckId ? (
        <input type="hidden" name="deckAId" value={lockedDeckId} />
      ) : ownOptions.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor={`deck-${round}`}>Con qué mazo juegas el torneo</label>
          <DeckPicker
            id={`deck-${round}`} name="deckAId"
            options={ownOptions}
            defaultValue={m?.deckAId ?? (m?.archetypeAId ? archetypeValue(m.archetypeAId) : "")}
            emptyLabel="— sin anotar —"
            placeholder="Elegir tu mazo, o solo el arquetipo"
          />
          <p className="text-xs text-muted">
            Se guarda para todo el torneo: en las rondas siguientes ya no te lo pregunto. Puedes
            elegir un mazo con lista o solo el arquetipo si todavía no lo tienes registrado.
          </p>
        </div>
      ) : null}

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
            {/* En modo rápido solo se apunta quién empezó el primer juego, que
                es el que se recuerda: lo decidió la moneda. */}
            <input type="hidden" name="g0_first" value={firsts[0] ?? ""} />
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

            <div className="flex flex-col gap-1.5">
              <span className="label">Salí</span>
              <div className="seg w-full">
                {([["a", "1.º"], ["b", "2.º"], ["", "No me acuerdo"]] as const).map(([v, label]) => (
                  <button
                    key={v || "none"} type="button"
                    data-on={(firsts[0] ?? "") === v}
                    onClick={() => setFirsts((f) => f.map((x, k) => (k === 0 ? v : x)))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {!result && (
              <p className="text-xs text-muted">
                Sin marcar nada la ronda se guarda abierta, y el resultado lo pones al acabar.
                Útil para apuntar el emparejamiento antes de jugar.
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3">
            {Array.from({ length: visibleGames }, (_, i) => (
              <div key={i} className="rounded-lg border border-line-soft bg-surface p-2.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="w-14 flex-none font-display text-sm font-bold text-muted">
                    Juego {i + 1}
                  </span>
                  <div className="seg min-w-0 flex-1">
                    {RESULTS.map((r) => (
                      <button
                        key={r.v} type="button" className={r.cls}
                        data-on={gameWinners[i] === r.v}
                        onClick={() => setGameWinner(i, r.v)}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quién salió primero, en este juego. */}
                <div className="flex items-center gap-2">
                  <span className="w-14 flex-none text-[11px] font-semibold text-muted">Salí</span>
                  <div className="seg min-w-0 flex-1 text-[13px]">
                    {([["a", "1.º"], ["b", "2.º"], ["", "—"]] as const).map(([v, label]) => (
                      <button
                        key={v || "none"} type="button"
                        data-on={(firsts[i] ?? "") === v}
                        onClick={() => setFirst(i, v)}
                        aria-label={`Juego ${i + 1}: salí ${label}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <input type="hidden" name={`g${i}_winner`} value={gameWinners[i]} />
                <input type="hidden" name={`g${i}_first`} value={firsts[i] ?? ""} />
              </div>
            ))}

            {!settled && !decidedByTie && gameWinners.some(Boolean) && (
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
                : decidedByTie
                  ? `Un juego empatado corta la ronda aquí: queda ${won > lost ? "ganada" : lost > won ? "perdida" : "en empate"} ${won}–${lost}.`
                  : gameWinners.some(Boolean)
                    ? `${won}–${lost} y todavía sin decidir. Marca «se acabó el tiempo» si la ronda terminó así.`
                    : "Marca cada juego. En cuanto haya mayoría o un empate, el resto desaparece."}
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
