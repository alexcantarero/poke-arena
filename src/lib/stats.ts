import type {
  Archetype, Deck, MatchFull, Outcome, Player, Settings, Side, StandingRow,
} from "./types";

/* =========================================================================
   Motor de estadísticas. Funciones puras: entran partidas, salen números.
   Nada de esto toca la base de datos, así que es fácil de probar y de
   reutilizar (por ejemplo desde un script o desde un test).
   ========================================================================= */

export const DEFAULT_SETTINGS = {
  ptsWin: 3, ptsTie: 1, ptsLoss: 0, eloStart: 1000, eloK: 24,
};

/** Resultado de una serie a partir de sus juegos. */
export function outcome(m: MatchFull): Outcome {
  let ga = 0, gb = 0, ties = 0;
  for (const g of m.games) {
    if (g.winner === "a") ga++;
    else if (g.winner === "b") gb++;
    else ties++;
  }
  return { ga, gb, ties, winner: ga > gb ? "a" : gb > ga ? "b" : "tie" };
}

export const isPlayed = (m: MatchFull) => m.status === "done" && m.games.length > 0;
export const sideOf = (m: MatchFull, playerId: string): Side | null =>
  m.playerAId === playerId ? "a" : m.playerBId === playerId ? "b" : null;
export const opponentOf = (m: MatchFull, playerId: string) =>
  m.playerAId === playerId ? m.playerBId : m.playerBId === playerId ? m.playerAId : null;
export const deckOfIn = (m: MatchFull, playerId: string) =>
  m.playerAId === playerId ? m.deckAId : m.playerBId === playerId ? m.deckBId : null;

function byDate(a: MatchFull, b: MatchFull) {
  return (a.date || "").localeCompare(b.date || "") || a.id.localeCompare(b.id);
}

/* ---------------------------------------------------------------- Elo ---- */

/**
 * Elo global de la liga, recalculado en orden cronológico sobre TODAS las
 * partidas jugadas. Se puntúa la serie completa, no cada juego: ganar 2-1
 * y ganar 2-0 valen lo mismo, igual que en los rankings oficiales.
 */
export function eloTable(
  allMatches: MatchFull[],
  players: Player[],
  cfg: Pick<Settings, "eloStart" | "eloK"> = DEFAULT_SETTINGS,
) {
  const rating: Record<string, number> = {};
  const history: Record<string, { date: string; value: number }[]> = {};
  const touch = (id: string) => {
    if (rating[id] == null) {
      rating[id] = cfg.eloStart;
      history[id] = [{ date: "", value: cfg.eloStart }];
    }
  };
  for (const p of players) touch(p.id);

  for (const m of allMatches.filter(isPlayed).sort(byDate)) {
    touch(m.playerAId); touch(m.playerBId);
    const o = outcome(m);
    const scoreA = o.winner === "a" ? 1 : o.winner === "b" ? 0 : 0.5;
    const expectedA = 1 / (1 + Math.pow(10, (rating[m.playerBId] - rating[m.playerAId]) / 400));
    const delta = cfg.eloK * (scoreA - expectedA);
    rating[m.playerAId] += delta;
    rating[m.playerBId] -= delta;
    history[m.playerAId].push({ date: m.date, value: rating[m.playerAId] });
    history[m.playerBId].push({ date: m.date, value: rating[m.playerBId] });
  }
  const rounded: Record<string, number> = {};
  for (const k of Object.keys(rating)) rounded[k] = Math.round(rating[k]);
  return { rating: rounded, history };
}

/* -------------------------------------------------------- Clasificación -- */

/**
 * Clasificación sobre un subconjunto de partidas.
 *
 * La resistencia sigue la regla de Play! Pokémon: media del porcentaje de
 * victorias de tus rivales, con un suelo del 25% por rival.
 */
export function standings(
  matches: MatchFull[],
  playerIds: string[],
  elo: Record<string, number> = {},
  cfg: Pick<Settings, "ptsWin" | "ptsTie" | "ptsLoss" | "eloStart"> = { ...DEFAULT_SETTINGS },
): StandingRow[] {
  const played = matches.filter(isPlayed).sort(byDate);
  const table = new Map<string, StandingRow & { opponents: string[]; seq: ("w" | "l" | "d")[] }>();
  for (const id of playerIds) {
    table.set(id, {
      playerId: id, played: 0, wins: 0, ties: 0, losses: 0, gameWins: 0, gameLosses: 0,
      points: 0, winRate: null, gameWinRate: null, diff: 0, resistance: null,
      streak: { kind: "-", n: 0 }, elo: elo[id] ?? cfg.eloStart,
      opponents: [], seq: [],
    });
  }

  for (const m of played) {
    const o = outcome(m);
    const sides: Array<[Side, string, number, number]> = [
      ["a", m.playerAId, o.ga, o.gb],
      ["b", m.playerBId, o.gb, o.ga],
    ];
    for (const [side, pid, gf, ga] of sides) {
      const row = table.get(pid);
      if (!row) continue;
      row.played++;
      row.gameWins += gf;
      row.gameLosses += ga;
      if (o.winner === "tie") { row.ties++; row.seq.push("d"); }
      else if (o.winner === side) { row.wins++; row.seq.push("w"); }
      else { row.losses++; row.seq.push("l"); }
      const opp = opponentOf(m, pid);
      if (opp) row.opponents.push(opp);
    }
  }

  const rows = [...table.values()];
  for (const r of rows) {
    r.points = r.wins * cfg.ptsWin + r.ties * cfg.ptsTie + r.losses * cfg.ptsLoss;
    r.winRate = r.played ? (r.wins + r.ties * 0.5) / r.played : null;
    r.gameWinRate = r.gameWins + r.gameLosses ? r.gameWins / (r.gameWins + r.gameLosses) : null;
    r.diff = r.gameWins - r.gameLosses;
    r.streak = streakOf(r.seq);
  }

  const floorWp = new Map<string, number>();
  for (const r of rows) {
    if (r.played) floorWp.set(r.playerId, Math.max(0.25, (r.wins + r.ties * 0.5) / r.played));
  }
  for (const r of rows) {
    const vals = r.opponents.map((o) => floorWp.get(o)).filter((v): v is number => v != null);
    r.resistance = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  rows.sort(
    (x, y) =>
      y.points - x.points ||
      (y.winRate ?? 0) - (x.winRate ?? 0) ||
      (y.resistance ?? 0) - (x.resistance ?? 0) ||
      y.diff - x.diff ||
      y.elo - x.elo,
  );
  return rows;
}

function streakOf(seq: ("w" | "l" | "d")[]): StandingRow["streak"] {
  if (!seq.length) return { kind: "-", n: 0 };
  const kind = seq[seq.length - 1];
  let n = 0;
  for (let i = seq.length - 1; i >= 0 && seq[i] === kind; i--) n++;
  return { kind, n };
}

export function longestWinStreak(matches: MatchFull[], playerId: string) {
  let best = 0, cur = 0;
  for (const m of matches.filter(isPlayed).sort(byDate)) {
    const side = sideOf(m, playerId);
    if (!side) continue;
    const o = outcome(m);
    if (o.winner === side) { cur++; best = Math.max(best, cur); }
    else if (o.winner !== "tie") cur = 0;
  }
  return best;
}

/* ----------------------------------------------------------- Arquetipos -- */

export type ArchRow = {
  archetypeId: string;
  archetype: Archetype | undefined;
  played: number; wins: number; ties: number; losses: number;
  gameWins: number; gameLosses: number;
  winRate: number | null;
};

/** Índice deckId -> arquetipo, para no buscar en bucle. */
export function deckArchetypeIndex(decks: Deck[], archetypes: Archetype[]) {
  const byArch = new Map(archetypes.map((a) => [a.id, a]));
  const index = new Map<string, Archetype | undefined>();
  for (const d of decks) index.set(d.id, byArch.get(d.archetypeId));
  return index;
}

export function archetypeStats(
  matches: MatchFull[],
  index: Map<string, Archetype | undefined>,
  onlyPlayerId?: string,
): ArchRow[] {
  const table = new Map<string, ArchRow>();
  const touch = (a: Archetype) => {
    let r = table.get(a.id);
    if (!r) {
      r = { archetypeId: a.id, archetype: a, played: 0, wins: 0, ties: 0, losses: 0, gameWins: 0, gameLosses: 0, winRate: null };
      table.set(a.id, r);
    }
    return r;
  };
  for (const m of matches.filter(isPlayed)) {
    const o = outcome(m);
    const sides: Array<[Side, string, string | null, number, number]> = [
      ["a", m.playerAId, m.deckAId, o.ga, o.gb],
      ["b", m.playerBId, m.deckBId, o.gb, o.ga],
    ];
    for (const [side, pid, deckId, gf, ga] of sides) {
      if (onlyPlayerId && pid !== onlyPlayerId) continue;
      const arch = deckId ? index.get(deckId) : undefined;
      if (!arch) continue;
      const r = touch(arch);
      r.played++; r.gameWins += gf; r.gameLosses += ga;
      if (o.winner === "tie") r.ties++;
      else if (o.winner === side) r.wins++;
      else r.losses++;
    }
  }
  const rows = [...table.values()];
  for (const r of rows) r.winRate = r.played ? (r.wins + r.ties * 0.5) / r.played : null;
  return rows.sort((x, y) => y.played - x.played || (y.winRate ?? 0) - (x.winRate ?? 0));
}

/* ------------------------------------------- Matriz de emparejamientos --- */

export type Matrix = {
  ids: string[];
  cell: (rowId: string, colId: string) => { n: number; winRate: number } | null;
};

export function matchupMatrix(
  matches: MatchFull[],
  index: Map<string, Archetype | undefined>,
  minGames = 1,
): Matrix {
  const m = new Map<string, Map<string, { n: number; w: number; d: number }>>();
  const add = (x: string, y: string, r: "w" | "l" | "d") => {
    if (!m.has(x)) m.set(x, new Map());
    const row = m.get(x)!;
    const c = row.get(y) ?? { n: 0, w: 0, d: 0 };
    c.n++;
    if (r === "w") c.w++;
    else if (r === "d") c.d++;
    row.set(y, c);
  };
  for (const match of matches.filter(isPlayed)) {
    const A = match.deckAId ? index.get(match.deckAId) : undefined;
    const B = match.deckBId ? index.get(match.deckBId) : undefined;
    if (!A || !B) continue;
    const o = outcome(match);
    if (o.winner === "tie") { add(A.id, B.id, "d"); add(B.id, A.id, "d"); }
    else if (o.winner === "a") { add(A.id, B.id, "w"); add(B.id, A.id, "l"); }
    else { add(A.id, B.id, "l"); add(B.id, A.id, "w"); }
  }
  const totals = new Map<string, number>();
  for (const [k, row] of m) {
    let n = 0;
    for (const c of row.values()) n += c.n;
    if (n >= minGames) totals.set(k, n);
  }
  const ids = [...totals.keys()].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));
  return {
    ids,
    cell: (x, y) => {
      const c = m.get(x)?.get(y);
      return c && c.n ? { n: c.n, winRate: (c.w + c.d * 0.5) / c.n } : null;
    },
  };
}

/* ------------------------------------------------------ Otros cortes ----- */

/** Ventaja de empezar, a nivel de juego individual. */
export function firstTurnStats(matches: MatchFull[]) {
  let n = 0, wins = 0;
  for (const m of matches.filter(isPlayed)) {
    for (const g of m.games) {
      if (!g.first || !g.winner || g.winner === "tie") continue;
      n++;
      if (g.first === g.winner) wins++;
    }
  }
  return { n, winRate: n ? wins / n : null };
}

/** Cómo terminan las series: Bo3 2–0, Bo3 2–1, Bo5 3–2… */
export function seriesShapes(matches: MatchFull[]) {
  const t = new Map<string, number>();
  for (const m of matches.filter(isPlayed)) {
    if (m.bestOf < 2) continue;
    const o = outcome(m);
    const hi = Math.max(o.ga, o.gb), lo = Math.min(o.ga, o.gb);
    const k = `Bo${m.bestOf} ${hi}–${lo}`;
    t.set(k, (t.get(k) ?? 0) + 1);
  }
  return [...t.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, n]) => ({ key: k, n }));
}

export function activityByMonth(matches: MatchFull[]) {
  const t = new Map<string, number>();
  for (const m of matches.filter(isPlayed)) {
    const k = (m.date || "").slice(0, 7);
    if (k) t.set(k, (t.get(k) ?? 0) + 1);
  }
  return [...t.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, n]) => ({ key: k, n }));
}

export type H2HRow = {
  opponentId: string; played: number; wins: number; ties: number; losses: number;
  gameWins: number; gameLosses: number; winRate: number | null;
};

export function headToHead(matches: MatchFull[], playerId: string): H2HRow[] {
  const t = new Map<string, H2HRow>();
  for (const m of matches.filter(isPlayed)) {
    const side = sideOf(m, playerId);
    if (!side) continue;
    const opp = opponentOf(m, playerId);
    if (!opp) continue;
    const o = outcome(m);
    const r = t.get(opp) ?? {
      opponentId: opp, played: 0, wins: 0, ties: 0, losses: 0, gameWins: 0, gameLosses: 0, winRate: null,
    };
    r.played++;
    r.gameWins += side === "a" ? o.ga : o.gb;
    r.gameLosses += side === "a" ? o.gb : o.ga;
    if (o.winner === "tie") r.ties++;
    else if (o.winner === side) r.wins++;
    else r.losses++;
    t.set(opp, r);
  }
  const rows = [...t.values()];
  for (const r of rows) r.winRate = r.played ? (r.wins + r.ties * 0.5) / r.played : null;
  return rows.sort((a, b) => b.played - a.played);
}

/** Cruces de arquetipo desde el punto de vista de un jugador concreto. */
export function playerMatchups(
  matches: MatchFull[],
  playerId: string,
  index: Map<string, Archetype | undefined>,
  minN = 2,
) {
  const t = new Map<string, { mine: Archetype; theirs: Archetype; n: number; w: number; d: number; winRate: number }>();
  for (const m of matches.filter(isPlayed)) {
    const side = sideOf(m, playerId);
    if (!side) continue;
    const opp = opponentOf(m, playerId);
    if (!opp) continue;
    const myDeck = deckOfIn(m, playerId);
    const theirDeck = deckOfIn(m, opp);
    const mine = myDeck ? index.get(myDeck) : undefined;
    const theirs = theirDeck ? index.get(theirDeck) : undefined;
    if (!mine || !theirs) continue;
    const key = `${mine.id}|${theirs.id}`;
    const o = outcome(m);
    const r = t.get(key) ?? { mine, theirs, n: 0, w: 0, d: 0, winRate: 0 };
    r.n++;
    if (o.winner === "tie") r.d++;
    else if (o.winner === side) r.w++;
    t.set(key, r);
  }
  const rows = [...t.values()].filter((r) => r.n >= minN);
  for (const r of rows) r.winRate = (r.w + r.d * 0.5) / r.n;
  return rows.sort((a, b) => b.winRate - a.winRate || b.n - a.n);
}

/* ------------------------------------------------------ Emparejamientos -- */

/**
 * Genera los cruces de la siguiente ronda.
 * - liga: los enfrentamientos que aún no se han jugado
 * - suizo: se ordena por clasificación y se empareja de arriba abajo,
 *   saltando los cruces repetidos mientras sea posible
 * - eliminatoria: 1º contra último, 2º contra penúltimo
 */
export function pairRound(
  kind: string,
  playerIds: string[],
  playedMatches: MatchFull[],
  elo: Record<string, number> = {},
  cfg = DEFAULT_SETTINGS,
) {
  const seen = new Set<string>();
  for (const m of playedMatches.filter(isPlayed)) {
    seen.add(`${m.playerAId}|${m.playerBId}`);
    seen.add(`${m.playerBId}|${m.playerAId}`);
  }

  let order = [...playerIds];
  if (kind === "swiss" || kind === "bracket") {
    order = standings(playedMatches, playerIds, elo, cfg).map((r) => r.playerId);
  }
  if (kind === "bracket") {
    const seeded = [...order];
    order = [];
    for (let i = 0, j = seeded.length - 1; i < j; i++, j--) order.push(seeded[i], seeded[j]);
    if (seeded.length % 2) order.push(seeded[Math.floor(seeded.length / 2)]);
  }

  const pool = [...order];
  const pairs: Array<[string, string]> = [];
  while (pool.length > 1) {
    const a = pool.shift()!;
    let k = pool.findIndex((b) => !seen.has(`${a}|${b}`));
    if (k < 0) k = 0;
    pairs.push([a, pool[k]]);
    pool.splice(k, 1);
  }
  return { pairs, bye: pool[0] ?? null };
}

/** Rondas recomendadas para un suizo según el número de jugadores. */
export function suggestedRounds(n: number) {
  if (n <= 2) return 1;
  return Math.max(1, Math.ceil(Math.log2(n)));
}
