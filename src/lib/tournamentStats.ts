/* =========================================================================
   Conversión: cuántas veces que vas a un torneo, llegas.

   El ranking de la liga dice quién gana más partidas. Esto dice otra cosa
   distinta y, para quien va a torneos, más importante: **de cada diez veces
   que te apuntas, cuántas entras en el corte**. Hay gente que gana muchas
   rondas y se queda en la burbuja, y gente con un porcentaje discreto que
   cierra torneos. Un solo número no los distingue.

   LAS CUATRO CIFRAS, Y SOBRE QUÉ SE CALCULAN
   ------------------------------------------
   Esta es la parte que hay que leer, porque el denominador no es el mismo
   para las cuatro y si no se dice, los números engañan:

   · **Top 4**, **Top 8** y **ganados** se calculan sobre los resultados que
     tienen puesto apuntado. Si no hay puesto, no hay nada que contar.
   · **Conversión al corte** se calcula solo sobre los torneos que **tienen
     top cut configurado**. Un Challenge de 12 personas sin corte no puede
     contar como «no convertido»: es que no había nada a lo que convertir.
     Por eso `cutEligible` va aparte de `entries`.

   Una tasa con un denominador de cero devuelve `null`, no cero. «Todavía no
   hay dato» y «cero por ciento» no son lo mismo y la pantalla los pinta
   distinto.

   Sin `import` de nada: así las pruebas lo cargan directo.
   ========================================================================= */

/** Un resultado de torneo, con lo poco que hace falta saber del torneo. */
export type PlacementRow = {
  playerId: string;
  /** El arquetipo con el que se jugó, si está apuntado. */
  archetypeId: string | null;
  placement: number | null;
  /** ISO del torneo. */
  date: string;
  /** Tipo de evento: league_cup, regional… */
  kind: string;
  playerCount: number | null;
  /** 0 o null = el torneo no tuvo corte. */
  topCut: number | null;
};

export type ConvStats = {
  /** Resultados con puesto apuntado. Es el denominador de top 4, top 8 y 1.º. */
  entries: number;
  /** De esos, los que fueron a un torneo CON top cut. Denominador de `cut`. */
  cutEligible: number;
  cut: number;
  top8: number;
  top4: number;
  wins: number;
  cutRate: number | null;
  top8Rate: number | null;
  top4Rate: number | null;
  winRate: number | null;
};

const EMPTY: ConvStats = {
  entries: 0, cutEligible: 0, cut: 0, top8: 0, top4: 0, wins: 0,
  cutRate: null, top8Rate: null, top4Rate: null, winRate: null,
};

const rate = (n: number, of: number): number | null => (of > 0 ? n / of : null);

/** ¿Este torneo tenía corte? */
export const hasCut = (r: Pick<PlacementRow, "topCut">): boolean => (r.topCut ?? 0) > 0;

/** Las cuatro cifras de un puñado de resultados. */
export function convStats(rows: PlacementRow[]): ConvStats {
  const con = rows.filter((r) => r.placement != null && r.placement > 0);
  if (!con.length) return { ...EMPTY };

  const conCorte = con.filter(hasCut);
  const out: ConvStats = {
    ...EMPTY,
    entries: con.length,
    cutEligible: conCorte.length,
    cut: conCorte.filter((r) => (r.placement as number) <= (r.topCut as number)).length,
    top8: con.filter((r) => (r.placement as number) <= 8).length,
    top4: con.filter((r) => (r.placement as number) <= 4).length,
    wins: con.filter((r) => r.placement === 1).length,
  };
  out.cutRate = rate(out.cut, out.cutEligible);
  out.top8Rate = rate(out.top8, out.entries);
  out.top4Rate = rate(out.top4, out.entries);
  out.winRate = rate(out.wins, out.entries);
  return out;
}

/** Agrupa por lo que diga `clave`, saltándose las filas sin clave. */
export function groupStats<K extends string>(
  rows: PlacementRow[],
  clave: (r: PlacementRow) => K | null | undefined,
): Map<K, ConvStats> {
  const buckets = new Map<K, PlacementRow[]>();
  for (const r of rows) {
    const k = clave(r);
    if (!k) continue;
    const list = buckets.get(k);
    if (list) list.push(r);
    else buckets.set(k, [r]);
  }
  const out = new Map<K, ConvStats>();
  for (const [k, list] of buckets) out.set(k, convStats(list));
  return out;
}

export const byPlayer = (rows: PlacementRow[]) => groupStats(rows, (r) => r.playerId);
export const byArchetype = (rows: PlacementRow[]) => groupStats(rows, (r) => r.archetypeId);

/**
 * La evolución mes a mes.
 *
 * Se agrupa por mes y no por torneo porque con un torneo por punto la línea
 * es un electrocardiograma: cada resultado es un 0% o un 100% y no se ve
 * ninguna tendencia. Por mes ya hay algo que mirar.
 *
 * Solo salen los meses que tienen algo. Rellenar los vacíos con ceros
 * dibujaría caídas que no han pasado.
 */
export type TimePoint = ConvStats & { key: string };

export function overTime(rows: PlacementRow[]): TimePoint[] {
  const porMes = groupStats(rows, (r) => (r.date || "").slice(0, 7) || null);
  return [...porMes.entries()]
    .map(([key, stats]) => ({ key, ...stats }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Lo mejor que has hecho, para la vitrina del perfil.
 *
 * Ordena por puesto y, a igualdad de puesto, por torneo más grande: un top 8
 * de 300 personas no es un top 8 de 20, y el que más mérito tiene va delante.
 * Los resultados sin puesto no entran, porque no son un resultado todavía.
 */
export function bestFinishes(rows: PlacementRow[], limit = 4): PlacementRow[] {
  return rows
    .filter((r) => r.placement != null && r.placement > 0)
    .sort((a, b) =>
      (a.placement as number) - (b.placement as number)
      || (b.playerCount ?? 0) - (a.playerCount ?? 0)
      || b.date.localeCompare(a.date))
    .slice(0, limit);
}
