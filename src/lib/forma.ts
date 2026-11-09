/* =========================================================================
   v0.115 — La FORMA: el Elo con la actividad dentro.

   Sin imports, para probarlo.

   El Elo dice tu nivel; la Forma dice si ese nivel está vigente. Es la cifra
   principal de los rankings, la que da la división (`divisionElo.ts`) y la
   que decide quién puede retar por el Cinturón Elo.

       Forma = Elo − pocas partidas − inactividad

   · POCAS PARTIDAS: se cuentan las de los últimos 90 días. Con 30 o más no
     resta nada; con menos, hasta 100 en proporción (0 partidas = −100).
   · INACTIVIDAD: tras 21 días sin jugar, 5 puntos por día, hasta 150.

   No toca el Elo: en cuanto vuelves a jugar, la Forma se recupera sola.
   ========================================================================= */

export const FORMA_VENTANA_DIAS = 90;
export const FORMA_PARTIDAS_PLENAS = 30;
export const FORMA_MAX_POCAS = 100;
export const FORMA_GRACIA_DIAS = 21;
export const FORMA_PUNTOS_DIA = 5;
export const FORMA_MAX_INACTIVIDAD = 150;

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
};

/** La Forma de un jugador con su Elo y las fechas de sus partidas que contaron. */
export function formaDe(elo: number, fechas: string[], hoy: string): Forma {
  const th = t(hoy);
  const validas = fechas.filter((f) => f && !Number.isNaN(t(f)) && t(f) <= th);
  const recientes = validas.filter((f) => th - t(f) < FORMA_VENTANA_DIAS * DIA).length;
  const ultima = validas.length ? Math.max(...validas.map(t)) : null;
  const diasSinJugar = ultima == null ? null : Math.round((th - ultima) / DIA);
  const penPocas = Math.round(FORMA_MAX_POCAS * Math.max(0, 1 - recientes / FORMA_PARTIDAS_PLENAS));
  const penInactividad = diasSinJugar == null
    ? FORMA_MAX_INACTIVIDAD
    : Math.min(FORMA_MAX_INACTIVIDAD, Math.max(0, diasSinJugar - FORMA_GRACIA_DIAS) * FORMA_PUNTOS_DIA);
  return { forma: Math.round(elo - penPocas - penInactividad), elo, recientes, diasSinJugar, penPocas, penInactividad };
}
