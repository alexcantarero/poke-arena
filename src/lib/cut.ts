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
