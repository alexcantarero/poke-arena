/* =========================================================================
   v0.115 — La FORMA: el Elo con la actividad dentro.

   Sin imports, para probarlo.

   El Elo dice tu nivel; la Forma dice si ese nivel está vigente. Es la cifra
   principal de los rankings, la que da la división (`divisionElo.ts`) y la
   que decide quién puede retar por el Cinturón Elo.

       Forma = Elo − pocas partidas − inactividad

   · POCAS PARTIDAS: se cuentan las de los últimos 90 días. Con 30 o más no
     resta nada; con menos, hasta 100 en proporción (0 partidas = −100).
   · INACTIVIDAD: desde la semana sin jugar, poco a poco (ver FORMA_TRAMOS), hasta 150.

   No toca el Elo: en cuanto vuelves a jugar, la Forma se recupera sola.
   ========================================================================= */

export const FORMA_VENTANA_DIAS = 90;
export const FORMA_PARTIDAS_PLENAS = 30;
export const FORMA_MAX_POCAS = 100;
/* v0.120 — la inactividad empieza a contar a la SEMANA, poco a poco:
     días 8–14: −1 por día · días 15–21: −2 por día · desde el 22: −4 por día,
   hasta −150. Antes: 21 días de gracia y −5 por día de golpe. */
export const FORMA_GRACIA_DIAS = 7;
export const FORMA_TRAMOS: ReadonlyArray<{ hasta: number; porDia: number }> = [
  { hasta: 14, porDia: 1 },
  { hasta: 21, porDia: 2 },
  { hasta: Infinity, porDia: 4 },
];
export const FORMA_MAX_INACTIVIDAD = 150;

/** Lo que resta la inactividad tras `dias` sin jugar. */
export function penalizacionInactividad(dias: number): number {
  let total = 0, desde = FORMA_GRACIA_DIAS;
  for (const t of FORMA_TRAMOS) {
    if (dias <= desde) break;
    total += (Math.min(dias, t.hasta) - desde) * t.porDia;
    desde = t.hasta;
  }
  return Math.min(FORMA_MAX_INACTIVIDAD, Math.max(0, total));
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
    : penalizacionInactividad(diasSinJugar);
  return { forma: Math.round(elo - penPocas - penInactividad), elo, recientes, diasSinJugar, penPocas, penInactividad };
}
