/* =========================================================================
   v0.110 — Lo reciente pesa más en el recomendador.

   Sin imports, para probarlo.

   Antes, un Regional de hace cuatro meses contaba lo mismo que el del fin de
   semana pasado. Pero el metagame se mueve con cada expansión: lo último que
   se ha jugado ya lleva las cartas nuevas y las respuestas a lo que dominaba.
   Así que cada evento pesa según su antigüedad, con una VIDA MEDIA: a los
   `vidaMedia` días cuenta la mitad; al doble, un cuarto.

       peso(días) = 0,5 ^ (días / vidaMedia)

   Con 30 días: el de hoy 1 · el de hace un mes 0,5 · dos meses 0,25 ·
   cuatro meses (el límite de la ventana) 0,06.

   LOS PESOS SE NORMALIZAN, y no es un detalle. El recomendador usa el número
   de listas y de partidas como tamaño de muestra (encoge hacia el 50 % lo que
   tiene pocos datos). Si los pesos solo restaran, el total bajaría y todo
   parecería menos fiable de lo que es. Normalizados, el total de listas se
   conserva y lo único que cambia es el REPARTO: los eventos recientes se
   llevan más parte de él. Un evento suelto, o varios del mismo día, quedan
   exactamente igual que antes.
   ========================================================================= */

/** Días de vida media por defecto: a los 30 días un evento cuenta la mitad. */
export const VIDA_MEDIA_DIAS = 30;

const DIA = 86_400_000;

/** Días enteros entre dos fechas ISO (aaaa-mm-dd). Negativo si `fecha` es posterior a `hoy`. */
export function diasEntre(fecha: string, hoy: string): number {
  const a = Date.parse(`${fecha.slice(0, 10)}T12:00:00Z`);
  const b = Date.parse(`${hoy.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / DIA);
}

/**
 * El peso de un evento de `fecha` visto desde `hoy`.
 * Un evento con fecha futura (o sin fecha legible) pesa 1, como uno de hoy.
 */
export function pesoRecencia(fecha: string, hoy: string, vidaMedia = VIDA_MEDIA_DIAS): number {
  const d = Math.max(0, diasEntre(fecha, hoy));
  if (!(vidaMedia > 0)) return 1;
  return Math.pow(0.5, d / vidaMedia);
}

/**
 * Pesos por evento, normalizados para que el total ponderado de listas sea el
 * mismo que sin ponderar: Σ peso·tamaño = Σ tamaño.
 *
 * `tam` es lo que aporta cada evento (listas, partidas). Un evento con tamaño
 * 0 recibe su peso relativo igualmente, por si aporta otra cosa.
 */
export function pesosNormalizados(
  eventos: Array<{ id: string; fecha: string; tam: number }>,
  hoy: string,
  vidaMedia = VIDA_MEDIA_DIAS,
): Map<string, number> {
  const out = new Map<string, number>();
  if (!eventos.length) return out;
  const crudos = eventos.map((e) => ({ ...e, p: pesoRecencia(e.fecha, hoy, vidaMedia) }));
  const total = crudos.reduce((s, e) => s + Math.max(0, e.tam), 0);
  const ponderado = crudos.reduce((s, e) => s + Math.max(0, e.tam) * e.p, 0);
  // Sin tamaños: se normaliza sobre el número de eventos (media de pesos = 1).
  const factor = total > 0 && ponderado > 0
    ? total / ponderado
    : crudos.length / crudos.reduce((s, e) => s + e.p, 0);
  for (const e of crudos) out.set(e.id, e.p * factor);
  return out;
}

/** Cuánto pesa el evento más reciente frente al más antiguo (para explicarlo en pantalla). */
export function ventajaReciente(fechas: string[], hoy: string, vidaMedia = VIDA_MEDIA_DIAS): number | null {
  if (fechas.length < 2) return null;
  const ps = fechas.map((f) => pesoRecencia(f, hoy, vidaMedia));
  const min = Math.min(...ps);
  return min > 0 ? Math.max(...ps) / min : null;
}
