/* =========================================================================
   ¿Qué me hace falta para entrar en el corte?

   Es la pregunta que se hace todo el mundo entre ronda y ronda, con el móvil
   en la mano y cinco minutos antes de que salgan los emparejamientos. Hasta
   ahora había que echar la cuenta a mano.

   CÓMO SE ESTIMA LA LÍNEA DE CORTE
   --------------------------------
   No hay una tabla oficial que diga «con 32 personas y 5 rondas entra el
   4-1». Lo que sí hay es aritmética: en un suizo, si se supone que cada
   ronda la gana cualquiera de los dos, después de R rondas el número de
   personas con exactamente k victorias sigue una binomial —C(R,k)/2^R del
   total—. Sumando de arriba hacia abajo sale cuánta gente cabe por encima de
   cada marca, y la línea de corte es la marca más baja en la que todavía
   caben todos dentro del top cut.

   Con 32 personas, 5 rondas y top 8:

     5-0  →  32 · 1/32  =  1 persona     acumulado 1
     4-1  →  32 · 5/32  =  5 personas    acumulado 6   ← caben en el top 8
     3-2  →  32 · 10/32 = 10 personas    acumulado 16  ← ya no caben

   O sea: el 4-1 entra y el 3-2 se juega la resistencia. Que es exactamente
   lo que pasa en la vida real, y por eso vale la pena hacerlo así en vez de
   copiar una tabla de memoria.

   LO QUE ESTE MÓDULO NO SABE, Y LO DICE
   -------------------------------------
   · **La resistencia.** Quién entra en la burbuja lo decide el desempate, y
     eso depende de contra quién te haya tocado jugar. Aquí sale «depende»,
     no un sí o un no.
   · **Los emparejamientos reales.** La binomial supone que cada ronda es una
     moneda al aire. En un torneo de verdad el suizo empareja por puntos, hay
     byes y hay gente que se va: el reparto se aplana un poco. La estimación
     se queda corta antes que larga, que es el error menos malo — decirte que
     estás dentro cuando no lo estás sería peor.
   · **Los intencionales.** Un empate pactado en la última ronda cambia la
     cuenta y aquí no hay forma de preverlo.

   Sin `import` de nada a propósito: así las pruebas lo cargan directamente
   con `node --experimental-strip-types`, sin resolver rutas.
   ========================================================================= */

export type Record3 = { wins: number; losses: number; ties: number };

/** Puntos de torneo: 3 por victoria, 1 por empate, 0 por derrota. */
export const matchPoints = (r: Record3): number => r.wins * 3 + r.ties;

export const recordLabel = (r: Record3): string =>
  r.ties > 0 ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`;

/**
 * C(n, k), multiplicando y dividiendo en la misma vuelta.
 *
 * Con 9 rondas los números son pequeños, pero se hace así por costumbre:
 * calcular n! aparte desborda mucho antes de lo que uno espera.
 */
export function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const m = Math.min(k, n - k);
  let out = 1;
  for (let i = 0; i < m; i++) out = (out * (n - i)) / (i + 1);
  return Math.round(out);
}

/**
 * Cuánta gente se espera que acabe con al menos `wins` victorias.
 *
 * El modelo es la binomial de la cabecera. Devuelve un número con decimales
 * a propósito: es una estimación, y redondearla a personas enteras le daría
 * una precisión que no tiene.
 */
export function expectedWithAtLeast(players: number, rounds: number, wins: number): number {
  if (players <= 0 || rounds <= 0) return 0;
  if (wins <= 0) return players;
  let acc = 0;
  for (let k = wins; k <= rounds; k++) acc += binomial(rounds, k);
  return (players * acc) / 2 ** rounds;
}

export type CutLine = {
  /** Victorias con las que se entra sin depender del desempate. */
  safeWins: number;
  /** El escalón de debajo: se entra o no según la resistencia. `null` si no lo hay. */
  bubbleWins: number | null;
  /** Gente que se espera por encima de cada marca, para poder enseñarlo. */
  expectedSafe: number;
  expectedBubble: number | null;
};

/**
 * La marca a partir de la cual se entra en el top cut.
 *
 * Devuelve `null` cuando no hay corte que calcular: sin top cut, o cuando el
 * corte es tan grande que entra todo el mundo.
 */
export function cutLine(players: number, rounds: number, topCut: number): CutLine | null {
  if (!topCut || topCut <= 0 || rounds <= 0) return null;
  if (players > 0 && topCut >= players) return null;

  // De arriba hacia abajo: la marca más baja en la que todavía se cabe.
  let safeWins = rounds;
  for (let w = rounds; w >= 0; w--) {
    if (expectedWithAtLeast(players, rounds, w) <= topCut) safeWins = w;
    else break;
  }

  const bubbleWins = safeWins > 0 ? safeWins - 1 : null;
  return {
    safeWins,
    bubbleWins,
    expectedSafe: expectedWithAtLeast(players, rounds, safeWins),
    expectedBubble: bubbleWins != null ? expectedWithAtLeast(players, rounds, bubbleWins) : null,
  };
}

export type Verdict = "in" | "bubble" | "out" | "unknown";

export type Scenario = {
  /** Lo que habría que hacer en las rondas que quedan. */
  need: Record3;
  /** Cómo quedaría el récord al acabar el suizo. */
  final: Record3;
  points: number;
  verdict: Verdict;
};

/**
 * Todos los finales posibles desde donde estás, uno por cada reparto de
 * victorias y empates en las rondas que quedan.
 *
 * Se recorren los empates además de las victorias porque un 3-1-1 y un 4-1
 * no son lo mismo: 10 puntos contra 12, y esa diferencia es justo la que
 * decide muchos cortes.
 */
export function scenarios(current: Record3, remaining: number, line: CutLine | null): Scenario[] {
  const out: Scenario[] = [];
  for (let w = remaining; w >= 0; w--) {
    for (let t = remaining - w; t >= 0; t--) {
      const need = { wins: w, ties: t, losses: remaining - w - t };
      const final = {
        wins: current.wins + w,
        losses: current.losses + need.losses,
        ties: current.ties + t,
      };
      out.push({ need, final, points: matchPoints(final), verdict: verdictFor(final, line) });
    }
  }
  // De mejor a peor, que es como se mira.
  return out.sort((a, b) => b.points - a.points);
}

/** ¿Ese récord entra, se la juega, o se queda fuera? */
export function verdictFor(final: Record3, line: CutLine | null): Verdict {
  if (!line) return "unknown";
  const pts = matchPoints(final);
  if (pts >= line.safeWins * 3) return "in";
  if (line.bubbleWins != null && pts >= line.bubbleWins * 3) return "bubble";
  return "out";
}

/**
 * Los escenarios, con los perdidos resumidos en uno.
 *
 * La lista completa de finales puede tener quince filas, y diez de ellas
 * dicen lo mismo: «así no entras». Leerlas una a una no aporta nada y
 * entierra las dos que sí importan. Así que de todos los que se quedan fuera
 * se enseña **solo el mejor** —el que más puntos saca— y se dice cuántos
 * había detrás.
 *
 * Los que entran y los de la burbuja se enseñan todos: ahí cada fila es una
 * decisión distinta.
 */
export function collapseOut(list: Scenario[]): {
  shown: Scenario[];
  hiddenOut: number;
} {
  const fuera = list.filter((s) => s.verdict === "out");
  const resto = list.filter((s) => s.verdict !== "out");
  if (fuera.length <= 1) return { shown: list, hiddenOut: 0 };

  // Ya vienen ordenados de mejor a peor, así que el primero es el mejor.
  return { shown: [...resto, fuera[0]], hiddenOut: fuera.length - 1 };
}

export type Outlook = {
  /** Rondas de suizo que quedan por jugar. */
  remaining: number;
  line: CutLine | null;
  scenarios: Scenario[];
  /** El escenario más barato que todavía entra seguro. `null` si ya no da. */
  cheapestIn: Scenario | null;
  /** Ya no se puede entrar ni ganándolo todo. */
  eliminated: boolean;
  /** Ya se está dentro pase lo que pase en lo que queda. */
  clinched: boolean;
};

/**
 * La foto completa: dónde estás, qué te queda y qué te hace falta.
 *
 * `swissRounds` son solo las del suizo. El top cut no entra en esta cuenta:
 * es eliminatoria directa y allí no hay récord que sumar.
 */
export function cutOutlook(input: {
  players: number;
  swissRounds: number;
  topCut: number;
  current: Record3;
}): Outlook {
  const { players, swissRounds, topCut, current } = input;
  const jugadas = current.wins + current.losses + current.ties;
  const remaining = Math.max(0, swissRounds - jugadas);
  const line = cutLine(players, swissRounds, topCut);
  const list = scenarios(current, remaining, line);

  const dentro = list.filter((s) => s.verdict === "in");
  // El más barato de los que entran es el que menos victorias pide; a igual
  // número de victorias, el que menos empates necesita.
  const cheapestIn = dentro.length
    ? dentro.reduce((best, s) =>
        s.need.wins < best.need.wins ||
        (s.need.wins === best.need.wins && s.need.ties < best.need.ties) ? s : best)
    : null;

  return {
    remaining,
    line,
    scenarios: list,
    cheapestIn,
    eliminated: Boolean(line) && list.every((s) => s.verdict === "out"),
    clinched: Boolean(line) && list.every((s) => s.verdict === "in"),
  };
}

/* =========================================================================
   ESTRUCTURA Y CORTE AL DÍA 2 - POKÉMON TCG REGIONALES
   ========================================================================= */

export type RegionalStructure = {
  day1Rounds: number;
  day2Rounds: number;
  totalSwissRounds: number;
  pointsThreshold: number;
  minDay2Players: number;
  topCut: number;
  topCutRounds: number;
  hasDay2: boolean;
};

/**
 * Estructura oficial de torneos de dos fases según el Play! Pokémon Tournament Rules Handbook
 * (Variant #5: Two Phase 2026 Championship Format):
 *
 * Participantes   | Suizo Total | Fase 1 (Día 1) | Umbral Fase 2 | Fase 2 (Día 2) | Top Cut
 * 4–8             | 3           | 3              | N/A           | 0              | N/A
 * 9–16            | 4           | 4              | N/A           | 0              | Top 2
 * 17–32           | 6           | 6              | N/A           | 0              | Top 4
 * 33–64           | 7           | 7              | N/A           | 0              | Top 6
 * --- [Requiere segunda fase de suizo / Día 2] ---
 * 65–128          | 9           | 7              | 13 pts        | 2              | Top 8
 * 129–256         | 10          | 8              | 16 pts        | 2              | Top 8
 * 257–512         | 11          | 8              | 16 pts        | 3              | Top 8
 * 513–1,024       | 12          | 8              | 16 pts        | 4              | Top 8
 * 1,025–2,048     | 13          | 8              | 16 pts        | 5              | Top 8
 * 2,049–4,096     | 14          | 8              | 16 pts        | 6              | Top 8
 * 4,097–8,192     | 15          | 9              | 19 pts        | 6              | Top 8
 *
 * Condicionante General de Aprobación:
 * Un jugador avanza si cumple el umbral de puntos requerido según el tamaño del evento,
 * o si termina dentro del Top 32 global, garantizando que siempre haya un mínimo de
 * 32 jugadores compitiendo en el Día 2 (en eventos con Día 2).
 */
export function regionalStructure(participants: number): RegionalStructure {
  if (participants <= 8) {
    return {
      day1Rounds: 3,
      day2Rounds: 0,
      totalSwissRounds: 3,
      pointsThreshold: 0,
      minDay2Players: 0,
      topCut: 0,
      topCutRounds: 0,
      hasDay2: false,
    };
  }
  if (participants <= 16) {
    return {
      day1Rounds: 4,
      day2Rounds: 0,
      totalSwissRounds: 4,
      pointsThreshold: 0,
      minDay2Players: 0,
      topCut: 2,
      topCutRounds: 1,
      hasDay2: false,
    };
  }
  if (participants <= 32) {
    return {
      day1Rounds: 6,
      day2Rounds: 0,
      totalSwissRounds: 6,
      pointsThreshold: 0,
      minDay2Players: 0,
      topCut: 4,
      topCutRounds: 2,
      hasDay2: false,
    };
  }
  if (participants <= 64) {
    return {
      day1Rounds: 7,
      day2Rounds: 0,
      totalSwissRounds: 7,
      pointsThreshold: 0,
      minDay2Players: 0,
      topCut: 6,
      topCutRounds: 3,
      hasDay2: false,
    };
  }

  // A partir de 65 participantes hay Día 2 (Variant #5)
  let day1Rounds = 8;
  let day2Rounds = 2;
  let pointsThreshold = 16;

  if (participants <= 128) {
    day1Rounds = 7;
    day2Rounds = 2;
    pointsThreshold = 13;
  } else if (participants <= 256) {
    day1Rounds = 8;
    day2Rounds = 2;
    pointsThreshold = 16;
  } else if (participants <= 512) {
    day1Rounds = 8;
    day2Rounds = 3;
    pointsThreshold = 16;
  } else if (participants <= 1024) {
    day1Rounds = 8;
    day2Rounds = 4;
    pointsThreshold = 16;
  } else if (participants <= 2048) {
    day1Rounds = 8;
    day2Rounds = 5;
    pointsThreshold = 16;
  } else if (participants <= 4096) {
    day1Rounds = 8;
    day2Rounds = 6;
    pointsThreshold = 16;
  } else {
    // 4097 a 8192
    day1Rounds = 9;
    day2Rounds = 6;
    pointsThreshold = 19;
  }

  return {
    day1Rounds,
    day2Rounds,
    totalSwissRounds: day1Rounds + day2Rounds,
    pointsThreshold,
    minDay2Players: 32,
    topCut: 8,
    topCutRounds: 3,
    hasDay2: true,
  };
}

export type Day2Qualification = {
  qualifies: boolean;
  byPoints: boolean;
  byTop32: boolean;
  points: number;
  threshold: number;
  minDay2Players: number;
};

/**
 * Evalúa si un jugador avanza al Día 2 tras concluir la última ronda del Día 1.
 *
 * Condicionante General de Aprobación:
 * Un jugador avanza si cumple el umbral de puntos requerido según el tamaño
 * del evento (13, 16 o 19 pts), o si termina dentro del Top 32 global, garantizando
 * que siempre haya un mínimo de 32 jugadores compitiendo en el Día 2.
 */
export function qualifiesForDay2(input: {
  participants: number;
  record?: Record3;
  points?: number;
  placement?: number | null;
}): Day2Qualification {
  const structure = regionalStructure(input.participants);
  const points = input.points ?? (input.record ? matchPoints(input.record) : 0);
  const byPoints = structure.pointsThreshold > 0 && points >= structure.pointsThreshold;
  const byTop32 =
    structure.hasDay2 &&
    typeof input.placement === "number" &&
    input.placement > 0 &&
    input.placement <= structure.minDay2Players;

  return {
    qualifies: byPoints || byTop32,
    byPoints,
    byTop32,
    points,
    threshold: structure.pointsThreshold,
    minDay2Players: structure.minDay2Players,
  };
}

/** Determina si un evento sigue la estructura de torneo Regional de dos días. */
export function isRegionalTournament(
  kind?: string | null,
  participants?: number | null,
): boolean {
  if (kind === "regional" || kind === "special" || kind === "international") return true;
  if (participants != null && participants >= 65 && kind !== "league_challenge" && kind !== "league_cup") return true;
  return false;
}

export type Day1Outlook = {
  stage: "day1";
  day1Rounds: number;
  day2Rounds: number;
  totalSwissRounds: number;
  remaining: number;
  threshold: number;
  currentPoints: number;
  scenarios: Scenario[];
  cheapestIn: Scenario | null;
  eliminated: boolean;
  clinched: boolean;
  qualifies: boolean;
};

/**
 * Escenarios para las rondas restantes del Día 1 hacia el corte de Día 2.
 */
export function day1Scenarios(
  current: Record3,
  remainingDay1: number,
  threshold: number,
): Scenario[] {
  const out: Scenario[] = [];
  for (let w = remainingDay1; w >= 0; w--) {
    for (let t = remainingDay1 - w; t >= 0; t--) {
      const need = { wins: w, ties: t, losses: remainingDay1 - w - t };
      const final = {
        wins: current.wins + w,
        losses: current.losses + need.losses,
        ties: current.ties + t,
      };
      const pts = matchPoints(final);
      let verdict: Verdict = "out";
      if (pts >= threshold) {
        verdict = "in";
      } else if (pts >= threshold - 2) {
        verdict = "bubble";
      }
      out.push({ need, final, points: pts, verdict });
    }
  }
  return out.sort((a, b) => b.points - a.points);
}

/**
 * Pronóstico y combinaciones para pasar el corte al Día 2 durante el Día 1.
 */
export function day1Outlook(input: {
  players: number;
  current: Record3;
  placement?: number | null;
}): Day1Outlook {
  const { players, current, placement } = input;
  const structure = regionalStructure(players);
  const jugadas = current.wins + current.losses + current.ties;
  const remaining = Math.max(0, structure.day1Rounds - jugadas);
  const currentPoints = matchPoints(current);
  const list = day1Scenarios(current, remaining, structure.pointsThreshold);

  const dentro = list.filter((s) => s.verdict === "in");
  const cheapestIn = dentro.length
    ? dentro.reduce((best, s) =>
        s.need.wins < best.need.wins ||
        (s.need.wins === best.need.wins && s.need.ties < best.need.ties) ? s : best)
    : null;

  const qualification = qualifiesForDay2({
    participants: players,
    record: current,
    placement,
  });

  return {
    stage: "day1",
    day1Rounds: structure.day1Rounds,
    day2Rounds: structure.day2Rounds,
    totalSwissRounds: structure.totalSwissRounds,
    remaining,
    threshold: structure.pointsThreshold,
    currentPoints,
    scenarios: list,
    cheapestIn,
    eliminated: currentPoints + remaining * 3 < structure.pointsThreshold,
    clinched: currentPoints >= structure.pointsThreshold,
    qualifies: qualification.qualifies,
  };
}

/**
 * Filtra una lista de jugadores/entradas para obtener los clasificados al Día 2.
 */
export function filterDay2Qualifiers<T extends {
  wins?: number | null;
  losses?: number | null;
  ties?: number | null;
  placement?: number | null;
}>(entries: T[], totalParticipants?: number): T[] {
  const n = totalParticipants ?? entries.length;
  const structure = regionalStructure(n);
  return entries.filter((e) => {
    const pts = (e.wins ?? 0) * 3 + (e.ties ?? 0);
    const byPoints = pts >= structure.pointsThreshold;
    const byTop32 =
      typeof e.placement === "number" &&
      e.placement > 0 &&
      e.placement <= structure.minDay2Players;
    return byPoints || byTop32;
  });
}
