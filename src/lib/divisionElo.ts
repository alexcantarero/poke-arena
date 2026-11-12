/* =========================================================================
   v0.115 — Las divisiones del Elo.
   v0.122 — con la MISMA escalera de minerales que los CP (`lib/rangos.ts` y
   las clases `cp-rank-*`): Hierro, Bronce, Plata, Oro, Platino, Esmeralda,
   Diamante, Master, GrandMaster y Challenger. Antes usaba los tiers del
   ladder, que no tienen Esmeralda y llaman Maestro a Master.

   Sin imports, para probarlo. Mismos tiers que el ladder (`rank.ts`) y las
   mismas variables de color (`--tier-*`, `[data-tier]` en globals.css), pero
   con su propia escala, porque el Elo calculado y el ladder manual son
   números distintos y no se mezclan.

       Novato        menos de 10 partidas (Elo provisional)
       Hierro        menos de 1000
       Bronce        1000–1099   ┐
       Plata         1100–1199   │
       Oro           1200–1299   │ con divisiones IV, III, II, I
       Platino       1300–1399   │ de 25 puntos cada una
       Esmeralda     1400–1499   │
       Diamante      1500–1599   ┘
       Master        1600–1699
       GrandMaster   1700 o más
       Challenger    quien tiene el Cinturón Elo

   Se calcula sobre la FORMA (`forma.ts`): quien deja de jugar, baja.
   ========================================================================= */

export type DivisionEloId =
  | "novato" | "hierro" | "bronce" | "plata" | "oro" | "platino" | "esmeralda" | "diamante"
  | "master" | "grandmaster" | "challenger";

export const MIN_PARTIDAS_DIVISION = 10;

export const DIVISIONES_ELO: Array<{ id: DivisionEloId; desde: number; subdivisiones: boolean }> = [
  { id: "hierro", desde: -Infinity, subdivisiones: false },
  { id: "bronce", desde: 1000, subdivisiones: true },
  { id: "plata", desde: 1100, subdivisiones: true },
  { id: "oro", desde: 1200, subdivisiones: true },
  { id: "platino", desde: 1300, subdivisiones: true },
  { id: "esmeralda", desde: 1400, subdivisiones: true },
  { id: "diamante", desde: 1500, subdivisiones: true },
  { id: "master", desde: 1600, subdivisiones: false },
  { id: "grandmaster", desde: 1700, subdivisiones: false },
];

const ROMANOS = ["IV", "III", "II", "I"];

export type DivisionElo = {
  id: DivisionEloId;
  /** «II» dentro de Bronce–Diamante; null en el resto. */
  sub: string | null;
  /** Puntos hasta la siguiente división (null en Challenger y Gran Maestro). */
  faltan: number | null;
  siguiente: DivisionEloId | null;
};

export function divisionDeElo(valor: number, o: { challenger?: boolean; partidas?: number } = {}): DivisionElo {
  if (o.challenger) return { id: "challenger", sub: null, faltan: null, siguiente: null };
  if ((o.partidas ?? MIN_PARTIDAS_DIVISION) < MIN_PARTIDAS_DIVISION) {
    return { id: "novato", sub: null, faltan: null, siguiente: "hierro" };
  }
  let i = 0;
  for (let k = 0; k < DIVISIONES_ELO.length; k++) if (valor >= DIVISIONES_ELO[k].desde) i = k;
  const d = DIVISIONES_ELO[i];
  const sig = DIVISIONES_ELO[i + 1] ?? null;
  const sub = d.subdivisiones ? ROMANOS[Math.min(3, Math.floor((valor - d.desde) / 25))] : null;
  return { id: d.id, sub, faltan: sig ? Math.max(0, sig.desde - valor) : null, siguiente: sig?.id ?? null };
}

/** Para ordenar y comparar divisiones (Novato la más baja, Challenger la más alta). */
export const ORDEN_DIVISION: Record<DivisionEloId, number> = {
  novato: 0, hierro: 1, bronce: 2, plata: 3, oro: 4, platino: 5, esmeralda: 6, diamante: 7, master: 8, grandmaster: 9, challenger: 10,
};

/**
 * v0.117 — Para celebrar al SUBIR de división: todas las alcanzadas hasta la
 * actual (de Hierro a ella). Al bajar desaparecen las de arriba, que no son
 * «nuevas», así que no se celebra; al volver a subir, sí. Novato no cuenta.
 */
export function divisionesAlcanzadas(actual: DivisionEloId): DivisionEloId[] {
  if (actual === "novato") return [];
  const orden: DivisionEloId[] = ["hierro", "bronce", "plata", "oro", "platino", "esmeralda", "diamante", "master", "grandmaster", "challenger"];
  return orden.slice(0, orden.indexOf(actual) + 1);
}

/** v0.122 — La clase CSS de la escalera de minerales (la misma que los CP). */
export const CLASE_DIVISION: Record<DivisionEloId, string> = {
  novato: "cp-rank-steel", hierro: "cp-rank-iron", bronce: "cp-rank-bronze", plata: "cp-rank-silver",
  oro: "cp-rank-gold", platino: "cp-rank-platinum", esmeralda: "cp-rank-emerald", diamante: "cp-rank-diamond",
  master: "cp-rank-master", grandmaster: "cp-rank-grandmaster", challenger: "cp-rank-challenger",
};
