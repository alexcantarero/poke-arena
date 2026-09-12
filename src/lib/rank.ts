/* =========================================================================
   Ladder manual.

   El rango que cada uno se pone a mano en su perfil, para picarse entre
   vosotros. Va de 1500 (Bronce IV) a 2000 (Challenger).

   No tiene nada que ver con el Elo de la liga: ese lo calcula `stats.ts`
   sobre las partidas reales, empieza en 1000 y no se puede editar. Son dos
   números distintos y en la interfaz se enseñan distintos a propósito, porque
   confundirlos sería lo primero que pasaría.

   Funciones puras: entra un número, sale un rango. Se usan igual desde un
   Server Component y desde el cliente.
   ========================================================================= */

export const LADDER_MIN = 1500;
export const LADDER_MAX = 2000;

export type TierId =
  | "bronce" | "plata" | "oro" | "platino" | "diamante"
  | "maestro" | "granmaestro" | "challenger";

export type Tier = {
  id: TierId;
  label: string;
  /** Elo mínimo, inclusive, para estar en este tier. */
  floor: number;
  /** Divisiones internas: 4 = IV, III, II, I. 1 = sin divisiones. */
  divisions: number;
};

/**
 * Ocho tiers. Los cinco de abajo ocupan 80 puntos y se parten en cuatro
 * divisiones de 20; los tres de arriba son más estrechos y sin divisiones,
 * igual que en el juego. 1500 es el suelo y 2000 es Challenger, tal cual.
 *
 * Los colores viven en `globals.css` como `--tier-*`, no aquí: están medidos
 * a 4,5:1 sobre los dos fondos reales de Arena y quien los toque tiene que
 * volver a medirlos.
 */
export const TIERS: Tier[] = [
  { id: "bronce",      label: "Bronce",       floor: 1500, divisions: 4 },
  { id: "plata",       label: "Plata",        floor: 1580, divisions: 4 },
  { id: "oro",         label: "Oro",          floor: 1660, divisions: 4 },
  { id: "platino",     label: "Platino",      floor: 1740, divisions: 4 },
  { id: "diamante",    label: "Diamante",     floor: 1820, divisions: 4 },
  { id: "maestro",     label: "Maestro",      floor: 1900, divisions: 1 },
  { id: "granmaestro", label: "Gran Maestro", floor: 1950, divisions: 1 },
  { id: "challenger",  label: "Challenger",   floor: 2000, divisions: 1 },
];

const ROMAN = ["IV", "III", "II", "I"];

export type Rank = {
  tier: Tier;
  /** 1 = la división más baja del tier. null si el tier no tiene divisiones. */
  division: number | null;
  divisionLabel: string | null;
  /** "Oro II" o "Challenger". */
  label: string;
  /** El valor ya acotado a [1500, 2000]. */
  elo: number;
  /** 0..1 dentro del tier. Challenger siempre 1: no hay siguiente. */
  progress: number;
  /** Puntos hasta el siguiente tier, o null en Challenger. */
  toNext: number | null;
  nextLabel: string | null;
};

/** Acota al rango del ladder. Acepta basura y devuelve el suelo. */
export function clampElo(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return LADDER_MIN;
  return Math.min(LADDER_MAX, Math.max(LADDER_MIN, Math.round(n)));
}

export function rankOf(value: unknown): Rank {
  const elo = clampElo(value);

  let i = 0;
  for (let k = TIERS.length - 1; k >= 0; k--) {
    if (elo >= TIERS[k].floor) { i = k; break; }
  }
  const tier = TIERS[i];
  const next = TIERS[i + 1] ?? null;
  const span = (next ? next.floor : LADDER_MAX + 1) - tier.floor;

  let division: number | null = null;
  let divisionLabel: string | null = null;
  if (tier.divisions > 1) {
    const width = span / tier.divisions;
    division = Math.min(tier.divisions, Math.floor((elo - tier.floor) / width) + 1);
    divisionLabel = ROMAN[ROMAN.length - tier.divisions + (division - 1)] ?? null;
  }

  return {
    tier,
    division,
    divisionLabel,
    label: divisionLabel ? `${tier.label} ${divisionLabel}` : tier.label,
    elo,
    progress: !next || span <= 0 ? 1 : Math.min(1, (elo - tier.floor) / span),
    toNext: next ? next.floor - elo : null,
    nextLabel: next ? next.label : null,
  };
}

/**
 * Clasificación del ladder. Los empates comparten puesto (1, 2, 2, 4) y quien
 * no ha puesto rango se queda fuera de la lista.
 */
export function ladderStandings<T extends { id: string; ladderElo: number | null }>(
  people: T[],
): Array<{ player: T; rank: Rank; position: number }> {
  const ranked = people
    .filter((p) => p.ladderElo != null)
    .map((p) => ({ player: p, rank: rankOf(p.ladderElo) }))
    .sort((a, b) => b.rank.elo - a.rank.elo || a.player.id.localeCompare(b.player.id));

  let position = 0;
  let previous: number | null = null;
  return ranked.map((row, i) => {
    if (previous === null || row.rank.elo !== previous) position = i + 1;
    previous = row.rank.elo;
    return { ...row, position };
  });
}
