import type {
  Archetype, Deck, MatchFull, Outcome, PublicPlayer, Settings, Side, StandingRow,
} from "./types";

/* =========================================================================
   Motor de estadísticas. Funciones puras: entran partidas, salen números.
   Nada de esto toca la base de datos, así que es fácil de probar y de
   reutilizar (por ejemplo desde un script o desde un test).
   ========================================================================= */

export const DEFAULT_SETTINGS = {
  ptsWin: 3, ptsTie: 1, ptsLoss: 0, eloStart: 1000, eloK: 24,
};

/**
 * Resultado de una serie.
 *
 * Normalmente se cuenta a partir de los juegos. Si no hay juegos pero sí un
 * `seriesResult` apuntado a mano —el registro rápido de una ronda de torneo—
 * se usa ese, y el resultado sale marcado como `declared` para que la interfaz
 * no invente un marcador que nadie ha registrado.
 *
 * Los juegos siempre mandan sobre lo declarado: si alguien completa el
 * desglose después, el marcador pasa a contarse y `seriesResult` deja de
 * mirarse. Así no hay dos verdades.
 */
export function outcome(m: MatchFull): Outcome {
  if (m.games.length === 0) {
    const r = m.seriesResult;
    if (r === "a" || r === "b") return { ga: 0, gb: 0, ties: 0, winner: r, declared: true };
    if (r === "tie") return { ga: 0, gb: 0, ties: 0, winner: "tie", declared: true };
    return { ga: 0, gb: 0, ties: 0, winner: "tie", declared: false };
  }
  let ga = 0, gb = 0, ties = 0;
  for (const g of m.games) {
    if (g.winner === "a") ga++;
    else if (g.winner === "b") gb++;
    else ties++;
  }
  return { ga, gb, ties, winner: ga > gb ? "a" : gb > ga ? "b" : "tie", declared: false };
}

/**
 * Una partida cuenta cuando está cerrada y se sabe cómo acabó: o por sus
 * juegos, o porque el resultado está declarado.
 */
export const isPlayed = (m: MatchFull) =>
  m.status === "done" && (m.games.length > 0 || m.seriesResult !== null);

/**
 * Una partida es "interna" cuando los dos jugadores están en la liga. Las que
 * se juegan contra alguien de fuera (playerBId nulo) cuentan para las
 * estadísticas de arquetipo y de metagame, pero no para el ranking ni para el
 * Elo: no habría contra quién compensar los puntos.
 */
export const isInternal = (m: MatchFull): boolean => m.playerBId !== null;

export const sideOf = (m: MatchFull, playerId: string): Side | null =>
  m.playerAId === playerId ? "a" : m.playerBId === playerId ? "b" : null;
export const opponentOf = (m: MatchFull, playerId: string): string | null =>
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
  players: PublicPlayer[],
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

  for (const m of allMatches.filter(isPlayed).filter(isInternal).sort(byDate)) {
    if (!m.playerBId) continue;
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
  const played = matches.filter(isPlayed).filter(isInternal).sort(byDate);
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
      ["b", m.playerBId as string, o.gb, o.ga],
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

export type PlayerRecord = {
  played: number; wins: number; ties: number; losses: number;
  gameWins: number; gameLosses: number;
  winRate: number | null;
};

/**
 * El balance personal de alguien sobre las partidas que se le pasen.
 *
 * Existe aparte de `standings` porque responde a otra pregunta. La
 * clasificación es de la liga y deja fuera a los rivales de fuera —no habría
 * contra quién repartir los puntos ni el Elo—, pero cuando lo que miras es tu
 * propio perfil esas partidas son tan tuyas como las demás: las rondas de un
 * Challenge de tienda son media temporada. Así que aquí cuenta todo, y por eso
 * el filtro de ámbito del perfil puede pasarle el subconjunto que quiera.
 *
 * El empate vale media victoria, igual que en la clasificación y que en
 * Play! Pokémon, para que el porcentaje del perfil y el del ranking no digan
 * cosas distintas del mismo jugador.
 */
export function playerRecord(matches: MatchFull[], playerId: string): PlayerRecord {
  let wins = 0, ties = 0, losses = 0, gameWins = 0, gameLosses = 0;
  for (const m of matches.filter(isPlayed)) {
    const side = sideOf(m, playerId);
    if (!side) continue;
    const o = outcome(m);
    gameWins += side === "a" ? o.ga : o.gb;
    gameLosses += side === "a" ? o.gb : o.ga;
    if (o.winner === "tie") ties++;
    else if (o.winner === side) wins++;
    else losses++;
  }
  const played = wins + ties + losses;
  return {
    played, wins, ties, losses, gameWins, gameLosses,
    winRate: played ? (wins + ties * 0.5) / played : null,
  };
}

/* ----------------------------------------------------------- Arquetipos -- */


/**
 * El arquetipo de cada lado de una partida, resolviendo también a los rivales
 * de fuera de la liga —que no tienen mazo registrado, solo un arquetipo
 * anotado a mano. Es lo que permite que las partidas contra gente de fuera
 * alimenten la matriz de emparejamientos, que es justo donde más falta hacen
 * los datos.
 */
export function archetypesOfMatch(
  m: MatchFull,
  index: Map<string, Archetype | undefined>,
  archById?: Map<string, Archetype>,
): { a: Archetype | undefined; b: Archetype | undefined } {
  // El mazo con lista manda; sin él, se cae al arquetipo suelto que se haya
  // anotado. Mismo patrón en los dos lados: `archetypeAId` es al jugador lo
  // que `opponentArchetypeId` ya era al rival de fuera de la liga.
  let a = m.deckAId ? index.get(m.deckAId) : undefined;
  if (!a && m.archetypeAId) a = archById?.get(m.archetypeAId);
  let b = m.deckBId ? index.get(m.deckBId) : undefined;
  if (!b && !m.playerBId && m.opponentArchetypeId) b = archById?.get(m.opponentArchetypeId);
  return { a, b };
}

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
  archById?: Map<string, Archetype>,
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
    const { a: archA, b: archB } = archetypesOfMatch(m, index, archById);
    const sides: Array<[Side, string | null, Archetype | undefined, number, number]> = [
      ["a", m.playerAId, archA, o.ga, o.gb],
      ["b", m.playerBId, archB, o.gb, o.ga],
    ];
    for (const [side, pid, arch, gf, ga] of sides) {
      if (!arch) continue;
      // Al filtrar por jugador, el lado del rival de fuera no cuenta como suyo.
      if (onlyPlayerId && pid !== onlyPlayerId) continue;
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
  archById?: Map<string, Archetype>,
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
    const { a: A, b: B } = archetypesOfMatch(match, index, archById);
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

/**
 * Ventaja de empezar, a nivel de SERIE.
 *
 * La de arriba mira juego a juego, que es lo correcto para medir el turno 1
 * en sí. Esta mira rondas completas: «salí primero en la ronda, ¿la gané?».
 * Es la pregunta que se hace uno en un suizo, y es la única que se puede
 * responder con las rondas apuntadas en modo rápido, que no tienen desglose.
 */
export function firstTurnSeriesStats(matches: MatchFull[]) {
  let n = 0, wins = 0;
  for (const m of matches.filter(isPlayed)) {
    const first = m.games.find((g) => g.number === 1)?.first || m.firstTurn;
    if (first !== "a" && first !== "b") continue;
    const o = outcome(m);
    if (o.winner === "tie") continue;
    n++;
    if (o.winner === first) wins++;
  }
  return { n, winRate: n ? wins / n : null };
}

/** Cómo terminan las series: Bo3 2–0, Bo3 2–1, Bo5 3–2… */
export function seriesShapes(matches: MatchFull[]) {
  const t = new Map<string, number>();
  for (const m of matches.filter(isPlayed)) {
    if (m.bestOf < 2) continue;
    const o = outcome(m);
    // Sin desglose no hay forma de serie que contar: un 2–0 y un 2–1 son lo
    // mismo aquí, y meterlos como «0–0» ensuciaría el reparto.
    if (o.declared) continue;
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
  for (const m of matches.filter(isPlayed).filter(isInternal)) {
    const side = sideOf(m, playerId);
    if (!side) continue;
    const opp = opponentOf(m, playerId);
    if (!opp) continue; // rival de fuera de la liga: no hay enfrentamiento directo que llevar
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
  archById?: Map<string, Archetype>,
) {
  const t = new Map<string, { mine: Archetype; theirs: Archetype; n: number; w: number; d: number; winRate: number }>();
  for (const m of matches.filter(isPlayed)) {
    const side = sideOf(m, playerId);
    if (!side) continue;
    const { a: archA, b: archB } = archetypesOfMatch(m, index, archById);
    const mine = side === "a" ? archA : archB;
    const theirs = side === "a" ? archB : archA;
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

/* ==================================== rondas de torneo ====

   Un Challenge o una Cup son suizos de varias rondas, y lo que interesa es ir
   apuntándolas sobre la marcha: rival, mazo del rival, si has salido primero
   o segundo, y si ganaste, empataste o perdiste.

   Decisión de diseño: **no hay tabla de rondas**. Una ronda es una fila de
   `matches` con `tournamentId` puesto, `round` con el número y `playerBId`
   nulo (el rival es de fuera). Los juegos, si se desglosan, van en `games`
   como en cualquier otra partida.

   El motivo es que así no hay una sola línea de estadística nueva que
   escribir: la matriz de emparejamientos, el %V por arquetipo y la ventaja de
   empezar ya leen de `matches` + `games`, y el ranking y el Elo ya ignoran las
   partidas con `playerBId` nulo. Una tabla aparte habría obligado a duplicar
   los seis cálculos y a mantenerlos sincronizados para siempre.

   Y esto vive aquí, en el motor de estadísticas, y no en un módulo aparte
   porque necesita `outcome()`: un fichero suelto tendría que importarlo, y
   para que las pruebas de `node --experimental-strip-types` lo cargaran haría
   falta escribir la extensión `.ts` en el import. Ningún otro fichero de
   `src/` lo hace, y no quería ser el primero con algo que no puedo compilar
   aquí.
   ========================================================================= */

/** Lo que se ve de una ronda ya registrada. */
export type RoundView = {
  match: MatchFull;
  round: number;
  /** Desde el punto de vista del jugador, que siempre es el lado "a". */
  result: "w" | "l" | "d" | null;
  /** true si el resultado se apuntó sin desglosar los juegos. */
  declared: boolean;
  ga: number;
  gb: number;
  /** ¿Salí yo primero en el primer juego? null si no se apuntó. */
  firstGameOne: boolean | null;
};

/** El resultado de una ronda, mirándolo desde el lado "a". */
export function roundResult(m: MatchFull): "w" | "l" | "d" | null {
  const hasGames = m.games.length > 0;
  if (!hasGames && !m.seriesResult) return null;
  const o = outcome(m);
  if (!hasGames) {
    return o.winner === "a" ? "w" : o.winner === "b" ? "l" : "d";
  }
  // Con juegos, una serie sin mayoría todavía puede estar a medias: un 1–1 en
  // un Bo3 no es un empate hasta que se declara. El registro rápido lo marca
  // guardando `seriesResult`; si no está, la ronda sigue abierta.
  const need = Math.floor(m.bestOf / 2) + 1;
  if (o.ga >= need) return "w";
  if (o.gb >= need) return "l";
  if (m.seriesResult === "a") return "w";
  if (m.seriesResult === "b") return "l";
  if (m.seriesResult === "tie") return "d";
  if (m.games.length >= m.bestOf) {
    return o.ga > o.gb ? "w" : o.gb > o.ga ? "l" : "d";
  }
  return null;
}

export function toRoundView(m: MatchFull): RoundView {
  const o = outcome(m);
  const g1 = m.games.find((g) => g.number === 1);
  return {
    match: m,
    round: m.round,
    result: roundResult(m),
    declared: o.declared,
    ga: o.ga,
    gb: o.gb,
    // Los juegos mandan; `firstTurn` es el respaldo del registro rápido.
    firstGameOne:
      g1?.first === "a" ? true
      : g1?.first === "b" ? false
      : m.firstTurn === "a" ? true
      : m.firstTurn === "b" ? false
      : null,
  };
}

/** Las rondas de un jugador en un torneo, ordenadas. */
export function roundsOf(matches: MatchFull[], tournamentId: string, playerId: string): RoundView[] {
  return matches
    .filter((m) => m.tournamentId === tournamentId && m.playerAId === playerId && m.playerBId === null)
    .sort((a, b) => a.round - b.round || a.id.localeCompare(b.id))
    .map(toRoundView);
}

export type RoundRecord = {
  wins: number;
  losses: number;
  ties: number;
  /** Rondas registradas sin resultado todavía. */
  open: number;
  /** "3-1-1". */
  label: string;
  /** Puntuación de Play! Pokémon: 3 por victoria, 1 por empate. */
  points: number;
};

/** El récord del torneo se deriva de las rondas. Nunca se teclea. */
export function recordOf(rounds: RoundView[]): RoundRecord {
  const wins = rounds.filter((r) => r.result === "w").length;
  const losses = rounds.filter((r) => r.result === "l").length;
  const ties = rounds.filter((r) => r.result === "d").length;
  return {
    wins, losses, ties,
    open: rounds.filter((r) => r.result === null).length,
    label: `${wins}-${losses}-${ties}`,
    points: wins * 3 + ties,
  };
}

/**
 * Quién debería empezar el juego siguiente: el que perdió el anterior. Es la
 * regla real, y sirve para preseleccionar la casilla en el formulario sin
 * obligar a nadie a pensarlo.
 */
export function nextStarter(previousWinner: Side | "tie" | null): Side {
  return previousWinner === "a" ? "b" : "a";
}

/* ============================================== fase de la ronda ====

   En qué momento del torneo cae una ronda: suizo, o cuadro final con su
   nombre de eliminatoria (Cuartos, Semifinal, Final…). Solo mira números —
   cuántas rondas de suizo se anunciaron y de qué tamaño es el top cut—, así
   que no hace falta ninguna tabla nueva ni marcar nada a mano ronda a ronda.

   Lo que NO hace: no distingue day 1 de day 2 en un torneo con corte de
   asistencia a mitad, porque eso depende de cuántos pasan el corte y hoy no
   se guarda. Con eso se puede seguir apuntando rondas sin problema —solo que
   todas aparecen como «Suizo»—; el día que se quiera separar, hace falta un
   campo nuevo (algo como `tournaments.day1_rounds`) y no una cuenta.
   ========================================================================= */

export type RoundStage = {
  kind: "swiss" | "cut";
  /** "Suizo", o el nombre de la ronda eliminatoria: "Cuartos", "Final"… */
  label: string;
};

const CUT_STAGE_NAMES = ["Final", "Semifinal", "Cuartos", "Octavos", "Dieciseisavos"];

/**
 * Fase de una ronda dentro del torneo.
 *
 * Rondas 1..swissRounds son suizo. Las siguientes son el top cut, contadas
 * desde el final: la última jugada es la Final, la anterior la Semifinal, y
 * así hacia atrás. `topCut` decide cuántas rondas de eliminatoria caben
 * (un top 8 son 3: cuartos, semi, final); sin él, o si la ronda cae más allá
 * de las que salen, se llama solo «Top cut» en vez de inventar un nombre.
 */
export function roundStage(
  round: number,
  swissRounds: number | null | undefined,
  topCut: number | null | undefined,
): RoundStage {
  const swiss = swissRounds ?? 0;
  if (!swiss || round <= swiss) return { kind: "swiss", label: "Suizo" };

  const cutRounds = topCut && topCut > 1 ? Math.ceil(Math.log2(topCut)) : 0;
  const posFromEnd = swiss + cutRounds - round; // 0 = la última ronda, la Final
  const label = cutRounds > 0 && posFromEnd >= 0 && posFromEnd < CUT_STAGE_NAMES.length
    ? CUT_STAGE_NAMES[posFromEnd]
    : "Top cut";
  return { kind: "cut", label };
}

/* ==================================================== cuota de metagame ====

   Qué se está jugando, no quién gana con ello — eso ya lo dice
   `archetypeStats`. Cada lado de cada partida cuenta por separado: si dos
   Dragapult se cruzan, suma dos, porque la pregunta es «cuánto se ve este
   mazo en mesa», no «cuántos jugadores distintos lo llevan».
   ========================================================================= */

export type MetaShareRow = {
  archetypeId: string;
  archetype: Archetype;
  n: number;
  /** De 0 a 1. Sobre el total de apariciones contadas, no sobre partidas. */
  share: number;
};

export function metaShare(
  matches: MatchFull[],
  index: Map<string, Archetype | undefined>,
  archById?: Map<string, Archetype>,
  /** Solo partidas desde esta fecha (inclusive), en ISO. Sin ella, todo el histórico. */
  sinceISO?: string,
): MetaShareRow[] {
  const table = new Map<string, { archetype: Archetype; n: number }>();
  let total = 0;
  for (const m of matches.filter(isPlayed)) {
    if (sinceISO && m.date < sinceISO) continue;
    const { a, b } = archetypesOfMatch(m, index, archById);
    for (const arch of [a, b]) {
      if (!arch) continue;
      total++;
      const row = table.get(arch.id);
      if (row) row.n++;
      else table.set(arch.id, { archetype: arch, n: 1 });
    }
  }
  return [...table.entries()]
    .map(([archetypeId, r]) => ({ archetypeId, archetype: r.archetype, n: r.n, share: total ? r.n / total : 0 }))
    .sort((x, y) => y.n - x.n);
}

/* ======================================= rendimiento por número de ronda ====

   ¿Flaqueas en las rondas tardías de un suizo largo, o remontas? Solo mira
   rondas de torneo —las que tienen tournamentId puesto—, porque son las
   únicas donde el número de ronda significa lo mismo entre un torneo y otro;
   la "jornada" de una liga interna es otra cosa.
   ========================================================================= */

export type RoundNumberRow = {
  round: number;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number | null;
};

export function performanceByRoundNumber(matches: MatchFull[], playerId: string): RoundNumberRow[] {
  const table = new Map<number, { wins: number; losses: number; ties: number }>();
  for (const m of matches) {
    if (!m.tournamentId || m.playerAId !== playerId) continue;
    const r = roundResult(m);
    if (r == null) continue;
    const row = table.get(m.round) ?? { wins: 0, losses: 0, ties: 0 };
    if (r === "w") row.wins++;
    else if (r === "l") row.losses++;
    else row.ties++;
    table.set(m.round, row);
  }
  return [...table.entries()]
    .map(([round, r]) => {
      const played = r.wins + r.losses + r.ties;
      return { round, played, ...r, winRate: played ? (r.wins + r.ties * 0.5) / played : null };
    })
    .sort((a, b) => a.round - b.round);
}
