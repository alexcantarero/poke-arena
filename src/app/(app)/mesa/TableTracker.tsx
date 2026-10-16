"use client";

import { useEffect, useState, useMemo } from "react";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

type Turn = { player: "p1" | "p2"; start: number; end?: number };
type Game = { turns: Turn[]; winner?: "p1" | "p2" | "tie" };
type TrackerState = {
  status: "setup" | "playing" | "paused" | "game_over" | "match_over";
  p1Id: string; p2Id: string;
  p1Name: string; p2Name: string;
  bestOf: number;
  games: Game[];
};

export function TableTracker({ players, meId }: { players: any[]; meId?: string }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const [state, setState] = useState<TrackerState>({
    status: "setup", p1Id: meId ?? "", p2Id: "", p1Name: "", p2Name: "",
    bestOf: 3, games: [],
  });
  const [now, setNow] = useState(Date.now());

  // Restore from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pokearena-mesa");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.status) setState(parsed);
      } catch (e) {}
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("pokearena-mesa", JSON.stringify(state));
  }, [state]);

  // Timer loop
  useEffect(() => {
    if (state.status !== "playing") return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [state.status]);

  const p1 = players.find(p => p.id === state.p1Id) || { name: state.p1Name || tr(lng, "x.93ecf7d6") };
  const p2 = players.find(p => p.id === state.p2Id) || { name: state.p2Name || tr(lng, "x.09bf4a66") };

  const startGame = (first: "p1" | "p2") => {
    setState(s => ({
      ...s, status: "playing",
      games: [...s.games, { turns: [{ player: first, start: Date.now() }] }]
    }));
  };

  const passTurn = () => {
    setState(s => {
      const gs = [...s.games];
      const g = gs[gs.length - 1];
      const t = g.turns[g.turns.length - 1];
      t.end = Date.now();
      g.turns.push({ player: t.player === "p1" ? "p2" : "p1", start: Date.now() });
      return { ...s, games: gs };
    });
  };

  const togglePause = () => {
    setState(s => {
      if (s.status === "paused") {
        // Resume: offset the last turn's start time by the duration of the pause
        const gs = [...s.games];
        const g = gs[gs.length - 1];
        const t = g.turns[g.turns.length - 1];
        if (t.end) { // it was paused
          const pauseDuration = Date.now() - t.end;
          t.start += pauseDuration;
          t.end = undefined;
        }
        return { ...s, status: "playing", games: gs };
      } else if (s.status === "playing") {
        // Pause: set end time on current turn, but don't add a new one
        const gs = [...s.games];
        const g = gs[gs.length - 1];
        const t = g.turns[g.turns.length - 1];
        t.end = Date.now();
        return { ...s, status: "paused", games: gs };
      }
      return s;
    });
  };

  const winGame = (winner: "p1" | "p2" | "tie") => {
    setState(s => {
      const gs = [...s.games];
      const g = gs[gs.length - 1];
      if (g.turns.length > 0) {
        const t = g.turns[g.turns.length - 1];
        if (!t.end) t.end = Date.now();
      }
      g.winner = winner;
      
      const p1Wins = gs.filter(x => x.winner === "p1").length;
      const p2Wins = gs.filter(x => x.winner === "p2").length;
      const needed = Math.ceil(s.bestOf / 2);
      
      if (p1Wins >= needed || p2Wins >= needed || gs.length >= s.bestOf) {
        return { ...s, status: "match_over", games: gs };
      }
      return { ...s, status: "game_over", games: gs };
    });
  };

  const reset = () => {
    if (confirm(tr(lng, "x.b1d5ffd7"))) {
      setState({ status: "setup", p1Id: meId ?? "", p2Id: "", p1Name: "", p2Name: "", bestOf: 3, games: [] });
    }
  };

  if (state.status === "setup") {
    return (
      <div className="mx-auto max-w-md p-4">
        <h1 className="font-display text-2xl font-extrabold mb-6">{tr(lng, "x.0239d9fa")}</h1>
        <div className="card flex flex-col gap-4 p-5 mb-6">
          <div className="flex flex-col gap-1.5">
            <label className="label">{tr(lng, "x.2c415568")}</label>
            <select className="input" value={state.p1Id} onChange={e => setState({...state, p1Id: e.target.value})}>
              <option value="">{tr(lng, "x.9d20112f")}</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {!state.p1Id && (
              <input className="input mt-1" placeholder={tr(lng, "x.0ca6ddc8")} value={state.p1Name} onChange={e => setState({...state, p1Name: e.target.value})} />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label">{tr(lng, "x.6d9c8077")}</label>
            <select className="input" value={state.p2Id} onChange={e => setState({...state, p2Id: e.target.value})}>
              <option value="">{tr(lng, "x.9d20112f")}</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {!state.p2Id && (
              <input className="input mt-1" placeholder={tr(lng, "x.0ca6ddc8")} value={state.p2Name} onChange={e => setState({...state, p2Name: e.target.value})} />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label">{tr(lng, "x.c25b742e")}</label>
            <select className="input" value={state.bestOf} onChange={e => setState({...state, bestOf: Number(e.target.value)})}>
              <option value={1}>{tr(lng, "x.c2fe34bd")}</option>
              <option value={3}>{tr(lng, "x.a7627f5d")}</option>
              <option value={5}>{tr(lng, "x.b55c97ca")}</option>
            </select>
          </div>
          <button className="btn btn-brand w-full py-3 text-lg mt-2" onClick={() => startGame("p1")}>
            {tr(lng, "x.bea615d4")}
          </button>
        </div>
      </div>
    );
  }

  // Active game logic
  const game = state.games[state.games.length - 1];
  const activeTurn = (state.status === "playing" && game && game.turns.length > 0) ? game.turns[game.turns.length - 1] : null;
  const activePlayer = activeTurn && !activeTurn.end ? activeTurn.player : null;

  // Compute times
  const stats = useMemo(() => {
    let p1Ms = 0, p2Ms = 0;
    let p1T = 0, p2T = 0;
    for (const g of state.games) {
      for (const t of g.turns) {
        if (t.player === "p1") {
          p1T++;
          p1Ms += (t.end || now) - t.start;
        } else {
          p2T++;
          p2Ms += (t.end || now) - t.start;
        }
      }
    }
    return { p1Ms, p2Ms, p1T, p2T };
  }, [state.games, now]);

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const p1Wins = state.games.filter(g => g.winner === "p1").length;
  const p2Wins = state.games.filter(g => g.winner === "p2").length;

  if (state.status === "match_over") {
    return (
      <div className="mx-auto max-w-md p-4 text-center">
        <h2 className="font-display text-3xl font-extrabold mb-2">{tr(lng, "x.1109bccf")}</h2>
        <div className="flex items-center justify-center gap-4 text-2xl font-bold mb-8">
          <span>{p1.name} {p1Wins}</span>
          <span className="text-muted">-</span>
          <span>{p2Wins} {p2.name}</span>
        </div>

        <div className="card p-4 text-left mb-6 space-y-4">
          <h3 className="font-bold border-b border-line-soft pb-2">{tr(lng, "x.64d6d377")}</h3>
          <div className="flex justify-between">
            <div>
              <p className="font-bold">{p1.name}</p>
              <p className="text-sm text-muted">Tiempo total: {fmt(stats.p1Ms)}</p>
              <p className="text-sm text-muted">Media por turno: {stats.p1T ? fmt(stats.p1Ms / stats.p1T) : "0:00"}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{p2.name}</p>
              <p className="text-sm text-muted">Tiempo total: {fmt(stats.p2Ms)}</p>
              <p className="text-sm text-muted">Media por turno: {stats.p2T ? fmt(stats.p2Ms / stats.p2T) : "0:00"}</p>
            </div>
          </div>
          <p className="text-center text-muted text-sm pt-2">Duración total: {fmt(stats.p1Ms + stats.p2Ms)}</p>
        </div>

        <button className="btn btn-brand w-full py-3 mb-3" onClick={() => {
           // We can pre-fill /partidas/nueva
           let url = `/partidas/nueva?p1=${state.p1Id}&p2=${state.p2Id}&p1n=${encodeURIComponent(state.p1Name)}&p2n=${encodeURIComponent(state.p2Name)}&w1=${p1Wins}&w2=${p2Wins}`;
           window.location.href = url;
        }}>{tr(lng, "x.621366eb")}</button>
        <button className="btn btn-ghost w-full" onClick={reset}>{tr(lng, "x.21c435e8")}</button>
      </div>
    );
  }

  if (state.status === "game_over") {
    return (
      <div className="mx-auto max-w-md p-4 text-center">
        <h2 className="font-display text-2xl font-extrabold mb-4">Juego {state.games.length} terminado</h2>
        <div className="flex items-center justify-center gap-4 text-xl font-bold mb-8">
          <span>{p1.name} {p1Wins}</span>
          <span className="text-muted">-</span>
          <span>{p2Wins} {p2.name}</span>
        </div>
        <p className="mb-6">¿Quién empieza el siguiente juego?</p>
        <div className="flex gap-3">
          <button className="btn flex-1 py-4" onClick={() => startGame("p1")}>{p1.name}</button>
          <button className="btn flex-1 py-4" onClick={() => startGame("p2")}>{p2.name}</button>
        </div>
      </div>
    );
  }

  // PLAYING / PAUSED
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-md mx-auto relative overflow-hidden bg-ground">
      {/* HEADER */}
      <div className="flex items-center justify-between p-3 border-b border-line-soft bg-surface">
        <div className="flex items-center gap-3">
          <button onClick={reset} className="text-muted hover:text-ink"><Icon name="x" className="size-5" /></button>
          <span className="font-bold">Bo{state.bestOf}</span>
        </div>
        <div className="font-mono font-bold text-lg">
          {p1Wins} - {p2Wins}
        </div>
        <button onClick={togglePause} className="btn btn-sm">
          {state.status === "paused" ? <Icon name="play" className="size-4" /> : <Icon name="pause" className="size-4" />}
        </button>
      </div>

      {/* PLAYER 2 (TOP) */}
      <div className={`flex-1 flex flex-col items-center justify-center transition-colors ${activePlayer === "p2" ? "bg-surface-2" : "opacity-50"}`}>
        <h2 className="font-display text-2xl font-bold mb-2">{p2.name}</h2>
        <div className="font-mono text-5xl font-light tabular-nums tracking-tighter mb-2">
          {fmt(stats.p2Ms)}
        </div>
        <div className="text-sm text-muted">
          {stats.p2T} turnos • {stats.p2T ? fmt(stats.p2Ms / stats.p2T) : "0:00"} media
        </div>
      </div>

      {/* DIVIDER with WIN BUTTONS */}
      <div className="h-14 flex items-center justify-center gap-2 bg-surface-3 z-10 border-y border-line">
        {state.status === "paused" ? (
          <span className="font-bold tracking-widest uppercase text-muted">{tr(lng, "x.103d7558")}</span>
        ) : (
          <>
            <button className="btn btn-sm btn-ghost text-xs" onClick={() => winGame("p2")}>Gana {p2.name}</button>
            <button className="btn btn-sm btn-ghost text-xs" onClick={() => winGame("tie")}>{tr(lng, "x.09d03513")}</button>
            <button className="btn btn-sm btn-ghost text-xs" onClick={() => winGame("p1")}>Gana {p1.name}</button>
          </>
        )}
      </div>

      {/* PLAYER 1 (BOTTOM) */}
      <div className={`flex-1 flex flex-col items-center justify-center transition-colors ${activePlayer === "p1" ? "bg-brand/20" : "opacity-50"}`}>
        <h2 className="font-display text-2xl font-bold mb-2">{p1.name}</h2>
        <div className="font-mono text-5xl font-light tabular-nums tracking-tighter mb-2">
          {fmt(stats.p1Ms)}
        </div>
        <div className="text-sm text-muted">
          {stats.p1T} turnos • {stats.p1T ? fmt(stats.p1Ms / stats.p1T) : "0:00"} media
        </div>
      </div>

      {/* BIG PASS TURN BUTTON */}
      {state.status === "playing" && (
        <button 
          onClick={passTurn}
          className="absolute bottom-4 left-4 right-4 bg-brand text-brand-fg font-extrabold text-2xl py-6 rounded-2xl shadow-xl active:scale-95 transition-transform"
        >
          {tr(lng, "x.80ed3b9f")}
        </button>
      )}
    </div>
  );
}
