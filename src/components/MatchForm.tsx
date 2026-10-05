"use client";

import { useMemo, useState } from "react";
import { deleteMatch, saveMatch } from "@/actions";
import type { Archetype, Competition, Deck, MatchFull, PublicPlayer, Tournament } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { Avatar } from "./ui";

type Props = {
  match?: MatchFull;
  players: PublicPlayer[];
  decks: Deck[];
  archetypes: Archetype[];
  competitions: Competition[];
  tournaments: Tournament[];
  meId?: string;
  /** Los organizadores pueden registrar partidas de otros; los demás, no. */
  canPickPlayer?: boolean;
};

/**
 * Registro de partida, pensado para el móvil durante el torneo.
 *
 * El orden de los campos sigue el orden en que se conocen los datos: primero
 * contra quién, luego qué llevabais, y solo entonces el resultado. Lo demás
 * (competición, fecha, notas) está plegado, porque casi nunca hay que tocarlo.
 */
export function MatchForm({
  match, players, decks, archetypes, competitions, tournaments, meId, canPickPlayer = false,
}: Props) {
  const active = players.filter((p) => p.active || match);
  const [aId, setAId] = useState(match?.playerAId ?? meId ?? active[0]?.id ?? "");
  const [external, setExternal] = useState(Boolean(match && !match.playerBId));
  const [bId, setBId] = useState(match?.playerBId ?? active.find((p) => p.id !== (meId ?? active[0]?.id))?.id ?? "");
  const [aDeckId, setADeckId] = useState(
    match?.deckAId ?? (match?.archetypeAId ? `arch:${match.archetypeAId}` : ""));
  const [bDeckId, setBDeckId] = useState(
    match?.deckBId ?? (match?.playerBId && match.opponentArchetypeId ? `arch:${match.opponentArchetypeId}` : ""));
  const [oppArch, setOppArch] = useState(match?.opponentArchetypeId ?? "");
  const [bestOf, setBestOf] = useState(match?.bestOf ?? 3);
  const [games, setGames] = useState<Array<{ winner: string; first: string }>>(() => {
    const base = Array.from({ length: 5 }, () => ({ winner: "", first: "" }));
    match?.games.forEach((g, i) => { if (i < 5) base[i] = { winner: g.winner, first: g.first }; });
    return base;
  });

  const need = Math.ceil(bestOf / 2);
  const A = players.find((p) => p.id === aId);
  const B = external ? undefined : players.find((p) => p.id === bId);
  const bLabel = external ? "Rival" : B?.name ?? "B";

  const score = useMemo(() => {
    let a = 0, b = 0;
    games.slice(0, bestOf).forEach((g) => { if (g.winner === "a") a++; else if (g.winner === "b") b++; });
    return { a, b };
  }, [games, bestOf]);

  /** Juegos que ya tienen resultado, empates incluidos. */
  const played = games.slice(0, bestOf).filter((g) => g.winner).length;
  // Una serie vale cuando alguien llega a la mayoría, o cuando se han jugado
  // todos los juegos: un Bo3 que acaba 1-1 con el tercero empatado por tiempo
  // es un resultado normal y tiene que poder guardarse.
  const decided = score.a >= need || score.b >= need || played === bestOf;
  const sameTwice = !external && aId === bId;
  const canSave = !sameTwice && aId && decided;

  const setGame = (i: number, patch: Partial<{ winner: string; first: string }>) =>
    setGames((g) => g.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  /** Un juego se apaga cuando la serie ya estaba decidida antes de llegar a él. */
  const isOver = (i: number) => {
    let a = 0, b = 0;
    for (let k = 0; k < i; k++) {
      if (games[k].winner === "a") a++;
      else if (games[k].winner === "b") b++;
    }
    return a >= need || b >= need;
  };

  return (
    <form action={saveMatch} className="flex flex-col gap-4">
      {match && <input type="hidden" name="id" value={match.id} />}
      <input type="hidden" name="bestOf" value={bestOf} />
      <input type="hidden" name="playerAId" value={aId} />

      {/* ------------------------------ quién ------------------------------ */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Quién juega</h2>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox" className="size-4" checked={external}
              onChange={(e) => setExternal(e.target.checked)}
            />
            Rival de fuera
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            {canPickPlayer ? (<>
              <label className="label" htmlFor="pa">Jugador</label>
              <select className="input" id="pa" value={aId} onChange={(e) => { setAId(e.target.value); setADeckId(""); }}>
                {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </>) : (<>
              {/* Sin permisos de organizador la partida es tuya: fijar el lado A
                  evita ofrecer algo que el servidor va a rechazar. */}
              <span className="label">Jugador</span>
              <div className="input justify-start gap-2 bg-surface-2">
                <Avatar player={A} size="sm" />
                <span className="truncate font-semibold">{A?.name ?? "Tú"}</span>
              </div>
            </>)}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="deckAId">Su mazo</label>
            <select className="input" id="deckAId" name="deckAId" value={aDeckId} onChange={(e) => setADeckId(e.target.value)}>
              <option value="">— sin asignar —</option>
              <DeckOptions decks={decks} playerId={aId} archetypes={archetypes} />
            </select>
          </div>

          <hr className="border-line-soft" />

          {external ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="opponentName">Rival</label>
                <input
                  className="input" id="opponentName" name="opponentName" required maxLength={60}
                  defaultValue={match?.opponentName ?? ""} placeholder="Nombre o apodo"
                />
                <p className="text-xs text-muted">
                  No cuenta para el ranking ni para el Elo, pero sí para tus estadísticas de arquetipo
                  y para la matriz de emparejamientos.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="opponentArchetypeId">Qué llevaba</label>
                <select
                  className="input" id="opponentArchetypeId" name="opponentArchetypeId"
                  value={oppArch} onChange={(e) => setOppArch(e.target.value)}
                >
                  <option value="">— no lo sé —</option>
                  {archetypes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="pb">Rival</label>
                <select className="input" id="pb" name="playerBId" value={bId} onChange={(e) => { setBId(e.target.value); setBDeckId(""); }}>
                  {active.filter((p) => canPickPlayer || p.id !== aId)
                    .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="deckBId">Su mazo</label>
                <select className="input" id="deckBId" name="deckBId" value={bDeckId} onChange={(e) => setBDeckId(e.target.value)}>
                  <option value="">— sin asignar —</option>
                  <DeckOptions decks={decks} playerId={bId} archetypes={archetypes} />
                </select>
              </div>
            </>
          )}

          {sameTwice && <p className="text-sm font-medium text-loss">Elige dos jugadores distintos.</p>}
        </div>
      </section>

      {/* ----------------------------- resultado ----------------------------- */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Resultado</h2>
          <div className="seg seg-brand">
            {[1, 3, 5].map((n) => (
              <button key={n} type="button" data-on={bestOf === n} onClick={() => setBestOf(n)}>Bo{n}</button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-center gap-4 rounded-xl bg-ground py-3">
          <div className="flex flex-col items-center gap-1">
            <Avatar player={A} size="sm" />
            <span className="max-w-20 truncate text-xs text-muted">{A?.name}</span>
          </div>
          <span className={`font-display text-4xl font-extrabold tabular leading-none
            ${score.a > score.b ? "text-win" : score.b > score.a ? "text-loss" : "text-tie"}`}>
            {score.a}–{score.b}
          </span>
          <div className="flex flex-col items-center gap-1">
            <Avatar player={B} size="sm" />
            <span className="max-w-20 truncate text-xs text-muted">{bLabel}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {Array.from({ length: bestOf }, (_, i) => {
            const over = isOver(i);
            return (
              <div key={i} className={`rounded-xl border border-line-soft p-3 ${over ? "opacity-40" : ""}`}>
                <div className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-muted">
                  Juego {i + 1}
                </div>

                {/* Botones grandes: en el móvil esto se pulsa con el pulgar. */}
                <div className="seg w-full" role="group" aria-label={`Ganador del juego ${i + 1}`}>
                  {[
                    { v: "a", l: A?.name ?? "A" },
                    { v: "tie", l: "Empate" },
                    { v: "b", l: bLabel },
                  ].map((o) => (
                    <button
                      key={o.v} type="button" disabled={over}
                      data-on={games[i].winner === o.v}
                      onClick={() => setGame(i, { winner: games[i].winner === o.v ? "" : o.v })}
                      className="truncate"
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
                <input type="hidden" name={`g${i}_winner`} value={games[i].winner} />

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted">Empezó</span>
                  <div className="seg flex-1" role="group" aria-label={`Quién empezó el juego ${i + 1}`}>
                    {[
                      { v: "", l: "—" },
                      { v: "a", l: A?.name ?? "A" },
                      { v: "b", l: bLabel },
                    ].map((o) => (
                      <button
                        key={o.v || "none"} type="button" disabled={over}
                        data-on={games[i].first === o.v}
                        onClick={() => setGame(i, { first: o.v })}
                        className="truncate text-xs"
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <input type="hidden" name={`g${i}_first`} value={games[i].first} />
              </div>
            );
          })}
        </div>

        {!decided && (
          <p className="mt-3 text-sm text-muted">
            Faltan juegos: nadie llega a {need}.
          </p>
        )}
      </section>

      {/* ------------------------------ contexto ------------------------------ */}
      <details className="card p-4" open={Boolean(match?.competitionId || match?.tournamentId || match?.note)}>
        <summary className="cursor-pointer text-lg font-bold">Contexto y notas</summary>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="competitionId">Competición</label>
            <select className="input" id="competitionId" name="competitionId" defaultValue={match?.competitionId ?? ""}>
              {/* v0.19 — una sola categoría «Amistoso»: sin competición. Las
                  competiciones de tipo «Amistosos» ya no se ofrecen (la
                  migración 0012 las funde aquí). */}
              <option value="">Amistoso</option>
              {competitions.filter((c) => c.kind !== "casual").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="tournamentId">¿Fue en un torneo?</label>
            <select className="input" id="tournamentId" name="tournamentId" defaultValue={match?.tournamentId ?? ""}>
              <option value="">No</option>
              {tournaments.slice(0, 30).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="date">Fecha</label>
              <input className="input" id="date" name="date" type="date" defaultValue={match?.date ?? todayISO()} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="round">Jornada</label>
              <input className="input" id="round" name="round" type="number" min={0} inputMode="numeric" defaultValue={match?.round ?? 0} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="note">Notas</label>
            <textarea className="input" id="note" name="note" rows={2} defaultValue={match?.note ?? ""}
              placeholder="Mulligans, la jugada que lo decidió, algo que cambiar de la lista…" />
          </div>
        </div>
      </details>

      <div className="sticky bottom-nav z-20 flex gap-2 md:static">
        <button className="btn btn-brand flex-1 text-base" type="submit" disabled={!canSave}>
          {match ? "Guardar cambios" : "Guardar partida"}
        </button>
        {match && (
          <button className="btn btn-danger" type="submit" formAction={deleteMatch} name="id" value={match.id}>
            Borrar
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * Los mazos que se le pueden asignar a un jugador.
 *
 * Los suyos primero y, en un grupo aparte, los de la biblioteca compartida
 * —los de `playerId` nulo—. Estos últimos no son de nadie y existen justo
 * para esto: poder decir qué llevaba alguien sin tener que apropiarse el mazo
 * ni inventarle una cuenta al rival.
 */
function DeckOptions({ decks, playerId, archetypes = [] }: { decks: Deck[]; playerId: string; archetypes?: Archetype[] }) {
  const own = decks.filter((d) => d.playerId === playerId && !d.retired);
  const shared = decks.filter((d) => d.playerId == null && !d.retired);
  return (
    <>
      {own.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      {shared.length > 0 && (
        <optgroup label="De la liga">
          {shared.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </optgroup>
      )}
      {/* v0.24: cualquier arquetipo, sin tener el mazo registrado. */}
      {archetypes.length > 0 && (
        <optgroup label="Solo el arquetipo">
          {[...archetypes].sort((x, y) => x.name.localeCompare(y.name, "es")).map((a) => (
            <option key={a.id} value={`arch:${a.id}`}>{a.name}</option>
          ))}
        </optgroup>
      )}
    </>
  );
}
