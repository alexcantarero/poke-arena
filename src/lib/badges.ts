/* =========================================================================
   Medallas de gimnasio.

   La idea es la de los juegos: una vitrina con ocho huecos que se van
   llenando. Aquí no las da nadie — **se calculan de lo que ya hay**, así que
   no hay tabla nueva, no hay que acordarse de conceder nada, y el día que
   alguien corrija una partida vieja las medallas se ajustan solas.

   TRES REGLAS QUE HACEN QUE ESTO NO SEA RUIDO
   -------------------------------------------
   1. **Cada medalla mide una cosa distinta.** Nada de «10 partidas», «20
      partidas», «30 partidas»: eso son tres veces la misma medalla. Si hay
      escalones, son escalones de la misma medalla (bronce/plata/oro), no
      medallas separadas.
   2. **Todas se ven siempre**, ganadas o no, con lo que falta para
      conseguirlas. Una vitrina con huecos es la mitad de la gracia; una
      vitrina que además dice «te faltan 2 victorias» es lo que hace que
      alguien registre la partida.
   3. **Nada depende de otra persona.** No hay medallas por ser el primero
      del ranking: en un grupo de cinco eso es una medalla para uno y cuatro
      frustraciones. Se mide contra uno mismo.

   Sin `import` de nada, para que las pruebas lo carguen directo.
   ========================================================================= */

export type BadgeInput = {
  /** Partidas jugadas —de liga, torneo o amistosas— con resultado. */
  played: number;
  wins: number;
  /** Racha de victorias más larga que ha tenido nunca. */
  bestStreak: number;
  /** Arquetipos distintos con los que ha jugado. */
  archetypes: number;
  /** Mazos suyos con la lista de 60 cartas pegada. */
  decksWithList: number;
  /** Torneos de fuera a los que ha ido con puesto apuntado. */
  tournaments: number;
  /** Veces que ha entrado en un top cut. */
  cuts: number;
  /** Torneos ganados. */
  tournamentWins: number;
  /** Mejor puesto conseguido, o null. */
  bestPlacement: number | null;
  /** Championship Points de la temporada en curso. */
  cp: number;
  /** Rondas de torneo apuntadas con el turno inicial anotado. */
  roundsWithTurn: number;
};

export type BadgeTier = "none" | "bronze" | "silver" | "gold";

export type Badge = {
  id: string;
  name: string;
  /** Qué mide, en una línea. */
  about: string;
  icon: string;
  /** Color de la medalla, de la paleta del sistema. */
  color: string;
  tier: BadgeTier;
  /** Lo conseguido y lo que hace falta para el siguiente escalón. */
  value: number;
  next: number | null;
  /** Texto de lo que falta, ya redactado. */
  hint: string;
};

type Def = {
  id: string;
  name: string;
  about: string;
  icon: string;
  color: string;
  /** Los tres escalones, de menor a mayor. */
  steps: [number, number, number];
  value: (i: BadgeInput) => number;
  /** Cómo se dice lo que falta. */
  unit: (n: number) => string;
};

const DEFS: Def[] = [
  {
    id: "partidas",
    name: "Medalla Constancia",
    about: "Partidas registradas",
    icon: "results",
    color: "var(--series-1)",
    steps: [10, 50, 150],
    value: (i) => i.played,
    unit: (n) => `${n} partida${n === 1 ? "" : "s"}`,
  },
  {
    id: "victorias",
    name: "Medalla Victoria",
    about: "Partidas ganadas",
    icon: "trophy",
    color: "var(--win)",
    steps: [5, 25, 75],
    value: (i) => i.wins,
    unit: (n) => `${n} victoria${n === 1 ? "" : "s"}`,
  },
  {
    id: "racha",
    name: "Medalla Racha",
    about: "Victorias seguidas",
    icon: "star",
    color: "var(--series-2)",
    steps: [3, 5, 8],
    value: (i) => i.bestStreak,
    unit: (n) => `${n} seguida${n === 1 ? "" : "s"}`,
  },
  {
    id: "variedad",
    name: "Medalla Versatilidad",
    about: "Arquetipos distintos jugados",
    icon: "deck",
    color: "var(--series-7)",
    steps: [3, 6, 10],
    value: (i) => i.archetypes,
    unit: (n) => `${n} arquetipo${n === 1 ? "" : "s"}`,
  },
  {
    id: "listas",
    name: "Medalla Archivo",
    about: "Mazos con las 60 cartas guardadas",
    icon: "card",
    color: "var(--series-5)",
    steps: [1, 3, 8],
    value: (i) => i.decksWithList,
    unit: (n) => `${n} lista${n === 1 ? "" : "s"}`,
  },
  {
    id: "torneos",
    name: "Medalla Viajera",
    about: "Torneos de fuera disputados",
    icon: "globe",
    color: "var(--series-3)",
    steps: [1, 5, 15],
    value: (i) => i.tournaments,
    unit: (n) => `${n} torneo${n === 1 ? "" : "s"}`,
  },
  {
    id: "cortes",
    name: "Medalla Top Cut",
    about: "Veces que has entrado en el corte",
    icon: "compare",
    color: "var(--series-4)",
    steps: [1, 3, 8],
    value: (i) => i.cuts,
    unit: (n) => `${n} corte${n === 1 ? "" : "s"}`,
  },
  {
    id: "cp",
    name: "Medalla Championship",
    about: "Championship Points de la temporada",
    icon: "cup",
    color: "var(--brand)",
    steps: [50, 200, 500],
    value: (i) => i.cp,
    unit: (n) => `${n} CP`,
  },
  {
    id: "anotador",
    name: "Medalla Cronista",
    about: "Rondas apuntadas con quién empezaba",
    icon: "edit",
    color: "var(--series-6)",
    steps: [5, 20, 50],
    value: (i) => i.roundsWithTurn,
    unit: (n) => `${n} ronda${n === 1 ? "" : "s"}`,
  },
];

const TIERS: BadgeTier[] = ["bronze", "silver", "gold"];

/** En qué escalón está un valor, y qué falta para el siguiente. */
function evaluar(def: Def, value: number): Pick<Badge, "tier" | "next" | "hint"> {
  let alcanzado = -1;
  for (let i = 0; i < def.steps.length; i++) {
    if (value >= def.steps[i]) alcanzado = i;
  }
  const tier: BadgeTier = alcanzado < 0 ? "none" : TIERS[alcanzado];
  const next = alcanzado + 1 < def.steps.length ? def.steps[alcanzado + 1] : null;

  if (next == null) return { tier, next, hint: "Completa" };
  const faltan = next - value;
  return {
    tier,
    next,
    hint: tier === "none"
      ? `Te faltan ${def.unit(faltan)}`
      : `${def.unit(faltan)} para la siguiente`,
  };
}

/** La vitrina entera de una persona. */
export function badgesOf(input: BadgeInput): Badge[] {
  return DEFS.map((def) => {
    const value = def.value(input);
    return {
      id: def.id,
      name: def.name,
      about: def.about,
      icon: def.icon,
      color: def.color,
      value,
      ...evaluar(def, value),
    };
  });
}

/** Cuántas lleva ganadas, para poder decir «5 de 9». */
export const earnedCount = (badges: Badge[]): number =>
  badges.filter((b) => b.tier !== "none").length;

export const BADGE_TOTAL = DEFS.length;

/* La racha más larga NO se calcula aquí a propósito: ya existe
   `longestWinStreak` en `src/lib/stats.ts`, y tiene un matiz que conviene no
   duplicar con otro criterio — allí un **empate no corta** la racha, porque
   en Pokémon un empate no es una derrota. Dos funciones con el mismo nombre y
   distinta regla es de las cosas que se pagan caras seis meses después. */
