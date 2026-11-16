/* =========================================================================
   v0.115 — La FORMA: el Elo con la actividad dentro.

   Sin imports, para probarlo.

   El Elo dice tu nivel; la Forma dice si ese nivel está vigente. Es la cifra
   principal de los rankings, la que da la división (`divisionElo.ts`) y la
   que decide quién puede retar por el Cinturón Elo.

       Forma = Elo − pocas partidas − inactividad

   · POCAS PARTIDAS: se cuentan las de los últimos 90 días. Con 30 o más no
     resta nada; con menos, hasta 100 en proporción (0 partidas = −100).
   · INACTIVIDAD: −15 por cada 3 días completos sin jugar, hasta 150 (v0.126).

   No toca el Elo: en cuanto vuelves a jugar, la Forma se recupera sola.
   ========================================================================= */

export const FORMA_VENTANA_DIAS = 90;
export const FORMA_PARTIDAS_PLENAS = 30;
export const FORMA_MAX_POCAS = 100;
/* v0.126 — la inactividad se nota y es fácil de contar: −15 por cada 3 días
   completos sin jugar, hasta −150 (un mes). Pedido por Ibai: con la regla de
   la v0.120 (una semana de gracia y luego −1, −2 y −4 por día), a los 12 días
   sin jugar solo restaba 5 puntos y «no quitaba nada».

       días 0–2: 0 · 3–5: −15 · 6–8: −30 · 9–11: −45 · … · 30 o más: −150

   Sigue sin tocar el Elo: al volver a jugar, lo de la inactividad se recupera
   entero ese mismo día. */
export const FORMA_CADA_DIAS = 3;
export const FORMA_POR_TRAMO = 15;
export const FORMA_MAX_INACTIVIDAD = 150;

/** Lo que resta la inactividad tras `dias` sin jugar. */
export function penalizacionInactividad(dias: number): number {
  if (!(dias > 0)) return 0;
  return Math.min(FORMA_MAX_INACTIVIDAD, Math.floor(dias / FORMA_CADA_DIAS) * FORMA_POR_TRAMO);
}

const DIA = 86_400_000;
const t = (iso: string) => Date.parse(`${iso.slice(0, 10)}T12:00:00Z`);

export type Forma = {
  forma: number;
  elo: number;
  /** Partidas de los últimos 90 días. */
  recientes: number;
  /** Días desde la última partida (null si nunca ha jugado). */
  diasSinJugar: number | null;
  penPocas: number;
  penInactividad: number;
  /** v0.131 — lo que suma el rango del ladder (0 si no llega a la primera etapa). */
  bonusLadder: number;
};

/* v0.131 — EL LADDER SUMA. Quien sube en el ladder del juego ha estado
   entrenando en competitivo, y eso es actividad aunque no sean partidas de la
   liga. Pedido por Ibai con estas cifras: al llegar a cada etapa, la Forma
   lleva este bonus (el de la etapa más alta alcanzada, no la suma de todas).
   Sale del rango que cada uno tiene puesto AHORA: si baja de la etapa o llega
   un reset del ladder (que deja a todos sin rango), el bonus se va con él.
   No toca el Elo. */
export const FORMA_LADDER: ReadonlyArray<readonly [rango: number, bonus: number]> = [
  [1500, 10], [1600, 25], [1700, 40], [1800, 70], [1900, 100], [2000, 150],
];

/** El bonus de Forma que da un rango del ladder (0 por debajo de la primera etapa o sin rango). */
export function bonusLadder(rango: number | null | undefined): number {
  if (rango == null || !Number.isFinite(rango)) return 0;
  let bonus = 0;
  for (const [etapa, b] of FORMA_LADDER) if (rango >= etapa) bonus = b;
  return bonus;
}

/** La Forma de un jugador con su Elo y las fechas de sus partidas que contaron (y, v0.131, su rango del ladder). */
export function formaDe(elo: number, fechas: string[], hoy: string, rangoLadder?: number | null): Forma {
  const th = t(hoy);
  const validas = fechas.filter((f) => f && !Number.isNaN(t(f)) && t(f) <= th);
  const recientes = validas.filter((f) => th - t(f) < FORMA_VENTANA_DIAS * DIA).length;
  const ultima = validas.length ? Math.max(...validas.map(t)) : null;
  const diasSinJugar = ultima == null ? null : Math.round((th - ultima) / DIA);
  const penPocas = Math.round(FORMA_MAX_POCAS * Math.max(0, 1 - recientes / FORMA_PARTIDAS_PLENAS));
  const penInactividad = diasSinJugar == null
    ? FORMA_MAX_INACTIVIDAD
    : penalizacionInactividad(diasSinJugar);
  const bonus = bonusLadder(rangoLadder);
  return { forma: Math.round(elo - penPocas - penInactividad + bonus), elo, recientes, diasSinJugar, penPocas, penInactividad, bonusLadder: bonus };
}
