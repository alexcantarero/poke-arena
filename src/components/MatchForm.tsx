"use client";

import { useMemo, useState } from "react";
import { deleteMatch, saveMatch } from "@/actions";
import type { Archetype, Competition, Deck, MatchFull, Player } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { Avatar } from "./ui";

export function MatchForm({
  match, players, decks, archetypes, competitions, defaultPlayerId,
}: {
  match?: MatchFull;
  players: Player[];
  decks: Deck[];
  archetypes: Archetype[];
  competitions: Competition[];
  defaultPlayerId?: string;
}) {
  const active = players.filter((p) => p.active || match);
  const [aId, setAId] = useState(match?.playerAId ?? defaultPlayerId ?? active[0]?.id ?? "");
  const [bId, setBId] = useState(
    match?.playerBId ?? active.find((p) => p.id !== (defaultPlayerId ?? active[0]?.id))?.id ?? "",
  );
  const [aDeckId, setADeckId] = useState(match?.deckAId ?? "");
  const [bDeckId, setBDeckId] = useState(match?.deckBId ?? "");
  const [bestOf, setBestOf] = useState(match?.bestOf ?? 3);
  const [games, setGames] = useState<Array<{ winner: string; first: string }>>(() => {
    const base = Array.from({ length: 5 }, () => ({ winner: "", first: "" }));
    match?.games.forEach((g, i) => { if (i < 5) base[i] = { winner: g.winner, first: g.first }; });
    return base;
  });

  const need = Math.ceil(bestOf / 2);
  const A = players.find((p) => p.id === aId);
  const B = players.find((p) => p.id === bId);
  const archName = (id: string) => archetypes.find((a) => a.id === id)?.name ?? "";

  const score = useMemo(() => {
    let a = 0, b = 0;
    games.slice(0, bestOf).forEach((g) => { if (g.winner === "a") a++; else if (g.winner === "b") b++; });
    return { a, b };
  }, [games, bestOf]);

  const decided = score.a >= need || score.b >= need;
  const sameTwice = aId === bId;
  const canSave = !sameTwice && aId && bId && decided;

  function setGame(i: number, patch: Partial<{ winner: string; first: string }>) {
    setGames((g) => g.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }

  /** ¿Está este juego ya fuera de la serie porque alguien llegó antes al límite? */
  function isOver(i: number) {
    let a = 0, b = 0;
    for (let k = 0; k < i; k++) {
      if (games[k].winner === "a") a++;
      else if (games[k].winner === "b") b++;
    }
    return a >= need || b >= need;
  }

  const decksOf = (pid: string) => decks.filter((d) => d.playerId === pid);

  return (
    <form action={saveMatch} className="stack">
      {match && <input type="hidden" name="id" value={match.id} />}

      <div className="card card-pad">
        <div className="grid g-3" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="competitionId">Competición</label>
            <select className="inp" id="competitionId" name="competitionId" defaultValue={match?.competitionId ?? ""}>
              <option value="">Amistoso suelto</option>
              {competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="date">Fecha</label>
            <input className="inp" id="date" name="date" type="date" defaultValue={match?.date ?? todayISO()} />
          </div>
          <div className="field">
            <label htmlFor="round">Jornada</label>
            <input className="inp" id="round" name="round" type="number" min={0} defaultValue={match?.round ?? 0} />
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="eyebrow" style={{ marginBottom: 7 }}>Formato de la serie</div>
        <div className="seg gold">
          {[1, 3, 5].map((n) => (
            <button key={n} type="button" className={bestOf === n ? "on" : ""} onClick={() => setBestOf(n)}>
              Bo{n}
            </button>
          ))}
        </div>
        <input type="hidden" name="bestOf" value={bestOf} />
        <div className="hint" style={{ marginTop: 5 }}>
          Bo{bestOf}: gana quien llegue a {need} juego{need > 1 ? "s" : ""}.
        </div>
      </div>

      <div className="card card-pad">
        <div className="grid g-2" style={{ gap: 12 }}>
          <div className="stack" style={{ gap: 8 }}>
            <div className="field">
              <label htmlFor="playerAId">Jugador A</label>
              <select className="inp" id="playerAId" name="playerAId" value={aId} onChange={(e) => { setAId(e.target.value); setADeckId(""); }}>
                {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="deckAId">Mazo de A</label>
              <select className="inp" id="deckAId" name="deckAId" value={aDeckId} onChange={(e) => setADeckId(e.target.value)}>
                <option value="">— sin asignar —</option>
                {decksOf(aId).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}{archName(d.archetypeId) ? ` · ${archName(d.archetypeId)}` : ""}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="field">
              <label htmlFor="playerBId">Jugador B</label>
              <select className="inp" id="playerBId" name="playerBId" value={bId} onChange={(e) => { setBId(e.target.value); setBDeckId(""); }}>
                {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="deckBId">Mazo de B</label>
              <select className="inp" id="deckBId" name="deckBId" value={bDeckId} onChange={(e) => setBDeckId(e.target.value)}>
                <option value="">— sin asignar —</option>
                {decksOf(bId).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}{archName(d.archetypeId) ? ` · ${archName(d.archetypeId)}` : ""}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {sameTwice && <div className="err" style={{ marginTop: 8 }}>Elige dos jugadores distintos.</div>}
      </div>

      <div className="card card-pad">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div className="eyebrow">Resultado juego a juego</div>
          <div className="row" style={{ gap: 10 }}>
            <Avatar player={A} size="sm" />
            <span className="score" style={{ color: score.a > score.b ? "var(--win)" : score.b > score.a ? "var(--loss)" : "var(--tie)" }}>
              {score.a}–{score.b}
            </span>
            <Avatar player={B} size="sm" />
          </div>
        </div>

        <div className="stack" style={{ gap: 8 }}>
          {Array.from({ length: bestOf }, (_, i) => {
            const over = isOver(i);
            return (
              <div className="gamerow" key={i} style={over ? { opacity: 0.45 } : undefined}>
                <div className="gl">Juego {i + 1}</div>
                <div className="field">
                  <label htmlFor={`g${i}_winner`}>Ganador</label>
                  <select
                    className="inp" id={`g${i}_winner`} name={`g${i}_winner`}
                    value={games[i].winner} disabled={over}
                    onChange={(e) => setGame(i, { winner: e.target.value })}
                  >
                    <option value="">—</option>
                    <option value="a">{A?.name ?? "A"}</option>
                    <option value="b">{B?.name ?? "B"}</option>
                    <option value="tie">Empate / tiempo</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`g${i}_first`}>Empezó</label>
                  <select
                    className="inp" id={`g${i}_first`} name={`g${i}_first`}
                    value={games[i].first} disabled={over}
                    onChange={(e) => setGame(i, { first: e.target.value })}
                  >
                    <option value="">no anotado</option>
                    <option value="a">{A?.name ?? "A"}</option>
                    <option value="b">{B?.name ?? "B"}</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
        <div className="hint" style={{ marginTop: 8 }}>
          Anotar quién empezó es opcional, pero es lo que alimenta la estadística de ventaja del primer turno.
        </div>
      </div>

      <div className="card card-pad">
        <div className="field">
          <label htmlFor="note">Notas</label>
          <input className="inp" id="note" name="note" defaultValue={match?.note ?? ""} placeholder="Punto clave de la partida, mulligans, cambios de lista…" />
        </div>
      </div>

      <div className="row">
        <button className="btn btn-gold" type="submit" disabled={!canSave}>
          {match ? "Guardar cambios" : "Guardar partida"}
        </button>
        {!decided && <span className="hint">Faltan juegos: nadie llega a {need}.</span>}
        {match && (
          <button className="btn btn-danger" type="submit" formAction={deleteMatch} name="id" value={match.id}>
            Borrar partida
          </button>
        )}
      </div>
    </form>
  );
}
