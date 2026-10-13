/* =========================================================================
   Medallas de gimnasio.

   Las medallas se calculan a partir de la actividad registrada; no hay tabla
   nueva ni concesiones manuales. Cada escalón combina varios requisitos para
   que completar una medalla represente algo más que acumular una cifra.

   Sin `import` de nada, para que las pruebas lo carguen directamente.
   ========================================================================= */

export type BadgeInput = {
  played: number;
  wins: number;
  winRate: number;
  bestStreak: number;
  archetypes: number;
  tournaments: number;
  cuts: number;
  bestPlacement: number | null;
  cp: number;
  roundsWithTurn: number;
};

export type BadgeTier = "none" | "bronze" | "silver" | "gold";

export type BadgeRequirement = {
  label: string;
  current: number | null;
  target: number;
  unit: string;
  mode: "atLeast" | "atMost";
  met: boolean;
};

export type Badge = {
  id: string;
  name: string;
  about: string;
  color: string;
  tier: BadgeTier;
  nextTier: Exclude<BadgeTier, "none"> | null;
  requirements: BadgeRequirement[];
  hint: string;
};

type Metric = keyof BadgeInput;
type RequirementSpec = {
  metric: Metric;
  label: string;
  target: number;
  unit: string;
  mode?: "atLeast" | "atMost";
};
type TierSpec = RequirementSpec[];
type Def = {
  id: string;
  name: string;
  about: string;
  color: string;
  steps: [TierSpec, TierSpec, TierSpec];
};

const min = (metric: Metric, label: string, target: number, unit: string): RequirementSpec =>
  ({ metric, label, target, unit });
const max = (metric: Metric, label: string, target: number, unit: string): RequirementSpec =>
  ({ metric, label, target, unit, mode: "atMost" });

const DEFS: Def[] = [
  {
    id: "partidas",
    name: "Medalla Constancia",
    about: "Volumen de partidas y victorias",
    color: "var(--series-1)",
    steps: [
      [min("played", "Partidas", 20, ""), min("wins", "Victorias", 10, "")],
      [min("played", "Partidas", 75, ""), min("wins", "Victorias", 35, "")],
      [min("played", "Partidas", 200, ""), min("wins", "Victorias", 100, "")],
    ],
  },
  {
    id: "victorias",
    name: "Medalla Victoria",
    about: "Victorias y porcentaje de victorias",
    color: "var(--win)",
    steps: [
      [min("wins", "Victorias", 10, ""), min("winRate", "Porcentaje", 55, "%")],
      [min("wins", "Victorias", 40, ""), min("winRate", "Porcentaje", 60, "%")],
      [min("wins", "Victorias", 100, ""), min("winRate", "Porcentaje", 65, "%")],
    ],
  },
  {
    id: "racha",
    name: "Medalla Racha",
    about: "Racha de victorias y partidas jugadas",
    color: "var(--series-2)",
    steps: [
      [min("bestStreak", "Victorias seguidas", 3, ""), min("played", "Partidas", 20, "")],
      [min("bestStreak", "Victorias seguidas", 5, ""), min("played", "Partidas", 60, "")],
      [min("bestStreak", "Victorias seguidas", 8, ""), min("played", "Partidas", 150, "")],
    ],
  },
  {
    id: "variedad",
    name: "Medalla Versatilidad",
    about: "Arquetipos distintos y victorias",
    color: "var(--series-7)",
    steps: [
      [min("archetypes", "Arquetipos", 3, ""), min("wins", "Victorias", 15, "")],
      [min("archetypes", "Arquetipos", 6, ""), min("wins", "Victorias", 40, "")],
      [min("archetypes", "Arquetipos", 10, ""), min("wins", "Victorias", 80, "")],
    ],
  },
  {
    id: "torneos",
    name: "Medalla Viajera",
    about: "Torneos disputados y mejor puesto",
    color: "var(--series-3)",
    steps: [
      [min("tournaments", "Torneos", 2, ""), max("bestPlacement", "Mejor puesto", 16, "")],
      [min("tournaments", "Torneos", 6, ""), max("bestPlacement", "Mejor puesto", 8, "")],
      [min("tournaments", "Torneos", 15, ""), max("bestPlacement", "Mejor puesto", 4, "")],
    ],
  },
  {
    id: "cortes",
    name: "Medalla Top Cut",
    about: "Cortes alcanzados y torneos disputados",
    color: "var(--series-4)",
    steps: [
      [min("cuts", "Top cuts", 1, ""), min("tournaments", "Torneos", 2, "")],
      [min("cuts", "Top cuts", 4, ""), min("tournaments", "Torneos", 8, "")],
      [min("cuts", "Top cuts", 10, ""), min("tournaments", "Torneos", 15, "")],
    ],
  },
  {
    id: "cp",
    name: "Medalla Championship",
    about: "Championship Points y top cuts",
    color: "var(--brand)",
    steps: [
      [min("cp", "CP", 100, ""), min("cuts", "Top cuts", 1, "")],
      [min("cp", "CP", 300, ""), min("cuts", "Top cuts", 4, "")],
      [min("cp", "CP", 800, ""), min("cuts", "Top cuts", 10, "")],
    ],
  },
  {
    id: "anotador",
    name: "Medalla Cronista",
    about: "Rondas anotadas y torneos disputados",
    color: "var(--series-6)",
    steps: [
      [min("roundsWithTurn", "Rondas anotadas", 10, ""), min("tournaments", "Torneos", 2, "")],
      [min("roundsWithTurn", "Rondas anotadas", 40, ""), min("tournaments", "Torneos", 6, "")],
      [min("roundsWithTurn", "Rondas anotadas", 100, ""), min("tournaments", "Torneos", 15, "")],
    ],
  },
];

const TIERS: Exclude<BadgeTier, "none">[] = ["bronze", "silver", "gold"];
const TIER_NAMES: Record<Exclude<BadgeTier, "none">, string> = {
  bronze: "Bronce",
  silver: "Plata",
  gold: "Oro",
};

function requirementOf(spec: RequirementSpec, input: BadgeInput): BadgeRequirement {
  const current = input[spec.metric];
  const mode = spec.mode ?? "atLeast";
  const met = current != null && (mode === "atMost" ? current <= spec.target : current >= spec.target);
  return { label: spec.label, current, target: spec.target, unit: spec.unit, mode, met };
}

/** La vitrina entera de una persona. */
export function badgesOf(input: BadgeInput): Badge[] {
  return DEFS.map((def) => {
    let earned = -1;
    for (let i = 0; i < def.steps.length; i++) {
      if (def.steps[i].every((spec) => requirementOf(spec, input).met)) earned = i;
    }

    const nextTier = TIERS[earned + 1] ?? null;
    const requirements = nextTier
      ? def.steps[earned + 1].map((spec) => requirementOf(spec, input))
      : [];
    return {
      id: def.id,
      name: def.name,
      about: def.about,
      color: def.color,
      tier: earned < 0 ? "none" : TIERS[earned],
      nextTier,
      requirements,
      hint: nextTier ? `Para ${TIER_NAMES[nextTier]}` : "¡Completada!",
    };
  });
}

/** Cuántas lleva ganadas, para poder decir «5 de 8». */
export const earnedCount = (badges: Badge[]): number =>
  badges.filter((b) => b.tier !== "none").length;

export const BADGE_TOTAL = DEFS.length;
