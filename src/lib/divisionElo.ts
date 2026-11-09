/* =========================================================================
   v0.115 — Las divisiones del Elo, con los nombres y colores de la web.

   Sin imports, para probarlo. Mismos tiers que el ladder (`rank.ts`) y las
   mismas variables de color (`--tier-*`, `[data-tier]` en globals.css), pero
   con su propia escala, porque el Elo calculado y el ladder manual son
   números distintos y no se mezclan.

       Novato        menos de 10 partidas (Elo provisional)
       Hierro        menos de 1000
       Bronce        1000–1099   ┐
       Plata         1100–1199   │ con divisiones IV, III, II, I
       Oro           1200–1299   │ de 25 puntos cada una
       Platino       1300–1399   │
       Diamante      1400–1499   ┘
       Maestro       1500–1599
       Gran Maestro  1600 o más
       Challenger    quien tiene el Cinturón Elo

   Se calcula sobre la FORMA (`forma.ts`): quien deja de jugar, baja.
   ========================================================================= */

export type DivisionEloId =
  | "novato" | "hierro" | "bronce" | "plata" | "oro" | "platino" | "diamante"
  | "maestro" | "granmaestro" | "challenger";

export const MIN_PARTIDAS_DIVISION = 10;

export const DIVISIONES_ELO: Array<{ id: DivisionEloId; desde: number; subdivisiones: boolean }> = [
  { id: "hierro", desde: -Infinity, subdivisiones: false },
  { id: "bronce", desde: 1000, subdivisiones: true },
  { id: "plata", desde: 1100, subdivisiones: true },
  { id: "oro", desde: 1200, subdivisiones: true },
  { id: "platino", desde: 1300, subdivisiones: true },
  { id: "diamante", desde: 1400, subdivisiones: true },
  { id: "maestro", desde: 1500, subdivisiones: false },
  { id: "granmaestro", desde: 1600, subdivisiones: false },
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
  novato: 0, hierro: 1, bronce: 2, plata: 3, oro: 4, platino: 5, diamante: 6, maestro: 7, granmaestro: 8, challenger: 9,
};
