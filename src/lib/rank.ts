/* =========================================================================
   Ladder manual.

   El rango que cada uno se pone a mano en su perfil, para picarse entre
   vosotros. Desde la v0.18: de 1 a 550 (Novato) y de 1350 (Hierro) a 2100
   (Challenger), con el «salto Arceus» de 550 a 1500 en medio.

   No tiene nada que ver con el Elo de la liga: ese lo calcula `stats.ts`
   sobre las partidas reales, empieza en 1000 y no se puede editar. Son dos
   números distintos y en la interfaz se enseñan distintos a propósito, porque
   confundirlos sería lo primero que pasaría.

   Funciones puras: entra un número, sale un rango. Se usan igual desde un
   Server Component y desde el cliente.
   ========================================================================= */

/* -------------------------------------------------------------------------
   v0.18 — Escala nueva.

     1 – 550      Novato. Fuera de la Liga Arceus.
     551 – 1349   No existe como valor guardado: pasar de 550 es el «salto
                  Arceus» y se guarda 1500. Desde ahí se puede volver a bajar.
     1350 – 1449  Hierro, el escalón de entrada de la Liga Arceus.
     1450 – 2100  El sistema de siempre (Bronce → Challenger), estirado para
                  que Challenger sea 2100.

   Valores que se pueden escribir a mano: 1–550 y 1350–2100. Uno entre 551 y
   1349 no se rechaza: es exactamente el caso de «he pasado de Novato», así
   que se convierte en 1500.
   ------------------------------------------------------------------------- */

export const LADDER_MIN = 1;
export const LADDER_MAX = 2100;
/** Techo de Novato. Pasar de aquí es el salto a la Liga Arceus. */
export const NOVATO_MAX = 550;
/** Suelo de la Liga Arceus (Hierro). */
export const ARCEUS_MIN = 1350;
/** A dónde se salta al superar `NOVATO_MAX`. */
export const ARCEUS_JUMP = 1500;

export type TierId =
  | "novato" | "hierro"
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
 * Diez tiers. Novato va aparte (1–550). De Hierro a Diamante, cuatro
 * divisiones; los tres de arriba sin divisiones, como en el juego.
 *
 * Bronce–Diamante conservan su anchura de siempre (80 puntos, divisiones de
 * 20); Maestro y Gran Maestro se ensanchan para que Challenger caiga en 2100.
 * Si se quiere otro reparto, es esta tabla y nada más (y los tests).
 *
 * Los colores viven en `globals.css` como `--tier-*`.
 */
export const TIERS: Tier[] = [
  { id: "novato",      label: "Novato",       floor: 1,    divisions: 1 },
  { id: "hierro",      label: "Hierro",       floor: 1350, divisions: 4 },
  { id: "bronce",      label: "Bronce",       floor: 1450, divisions: 4 },
  { id: "plata",       label: "Plata",        floor: 1530, divisions: 4 },
  { id: "oro",         label: "Oro",          floor: 1610, divisions: 4 },
  { id: "platino",     label: "Platino",      floor: 1690, divisions: 4 },
  { id: "diamante",    label: "Diamante",     floor: 1770, divisions: 4 },
  { id: "maestro",     label: "Maestro",      floor: 1850, divisions: 1 },
  { id: "granmaestro", label: "Gran Maestro", floor: 1975, divisions: 1 },
  { id: "challenger",  label: "Challenger",   floor: 2100, divisions: 1 },
];

const ROMAN = ["IV", "III", "II", "I"];

export type Rank = {
  tier: Tier;
  /** 1 = la división más baja del tier. null si el tier no tiene divisiones. */
  division: number | null;
  divisionLabel: string | null;
  /** "Oro II" o "Challenger". */
  label: string;
  /** El valor ya normalizado a la escala. */
  elo: number;
  /** true de Hierro para arriba. */
  arceus: boolean;
  /** 0..1 dentro del tier. Challenger siempre 1: no hay siguiente. */
  progress: number;
  /** Puntos hasta el siguiente tier (o hasta el salto, en Novato), o null en Challenger. */
  toNext: number | null;
  nextLabel: string | null;
};

/**
 * Lo que se guarda a partir de lo que se escribe. `null` = fuera de rango
 * (menos de 1, más de 2100 o no es un número): la Server Action lo rechaza.
 */
export function normalizeLadderInput(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const v = Math.round(n);
  if (v < LADDER_MIN || v > LADDER_MAX) return null;
  if (v <= NOVATO_MAX) return v;
  if (v < ARCEUS_MIN) return ARCEUS_JUMP; // el salto Arceus
  return v;
}

/** Normaliza para pintar. Acepta basura y devuelve el suelo. */
export function clampElo(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return LADDER_MIN;
  const v = Math.min(LADDER_MAX, Math.max(LADDER_MIN, Math.round(n)));
  return normalizeLadderInput(v) ?? LADDER_MIN;
}

export function rankOf(value: unknown): Rank {
  const elo = clampElo(value);

  let i = 0;
  for (let k = TIERS.length - 1; k >= 0; k--) {
    if (elo >= TIERS[k].floor) { i = k; break; }
  }
  const tier = TIERS[i];
  const novato = tier.id === "novato";
  const next = TIERS[i + 1] ?? null;
  // En Novato, el «siguiente» es el salto: se llega al pasar de 550.
  const ceiling = novato ? NOVATO_MAX + 1 : next ? next.floor : LADDER_MAX + 1;
  const span = ceiling - tier.floor;

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
    arceus: !novato,
    progress: !next || span <= 0 ? 1 : Math.min(1, (elo - tier.floor) / span),
    toNext: novato ? NOVATO_MAX + 1 - elo : next ? next.floor - elo : null,
    nextLabel: novato ? "Liga Arceus" : next ? next.label : null,
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
