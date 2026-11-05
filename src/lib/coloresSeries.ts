/* =========================================================================
   v0.107 — Colores que no se confunden en una gráfica con varias líneas.

   Sin imports, para probarlo.

   Cada jugador tiene SU color (el del perfil) y la regla de la app es que el
   color va pegado a la persona. Pero dos personas pueden haber elegido casi el
   mismo: en la «Evolución del Elo» del 4/11, Rol y Niccolo salían los dos en
   rosa, y Cristina e Ibai los dos en verde azulado. Imposible leerla.

   Regla: se respeta el color de cada uno MIENTRAS no choque con uno ya
   puesto en esa misma gráfica. El que choca toma el primer color libre de la
   paleta de series (la validada para daltonismo) que esté lejos de todos los
   ya usados. Se reparte en el orden que llega, así que quien se elige
   primero conserva el suyo.
   ========================================================================= */

/** Paleta de series de la app (validada en claro y en oscuro). */
export const PALETA_SERIES = ["#3987e5", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#9085e9", "#5c9ea8", "#d4675f", "#8bc34a", "#c98500"];

function rgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Distancia entre dos colores (0 = iguales). RGB con pesos de «redmean», que
 * se acerca a cómo los ve el ojo sin pasar a Lab. Si alguno no es un hex
 * (p. ej. una variable CSS), solo son «iguales» si el texto es el mismo.
 */
export function distanciaColor(a: string, b: string): number {
  const x = rgb(a), y = rgb(b);
  if (!x || !y) return a.trim().toLowerCase() === b.trim().toLowerCase() ? 0 : Infinity;
  const r = (x[0] + y[0]) / 2;
  const dr = x[0] - y[0], dg = x[1] - y[1], db = x[2] - y[2];
  return Math.sqrt((2 + r / 256) * dr * dr + 4 * dg * dg + (2 + (255 - r) / 256) * db * db);
}

/** Por debajo de esto, dos líneas finas se confunden en una pantalla oscura. */
export const UMBRAL_COLOR = 110;

export function coloresDistintos(
  series: Array<{ id: string; color?: string | null }>,
  paleta: readonly string[] = PALETA_SERIES,
  umbral = UMBRAL_COLOR,
): Map<string, string> {
  const out = new Map<string, string>();
  const usados: string[] = [];
  const lejos = (c: string) => usados.every((u) => distanciaColor(u, c) >= umbral);
  for (const s of series) {
    let c = s.color && lejos(s.color) ? s.color : paleta.find((p) => lejos(p));
    // Más series que colores separables: el menos parecido de la paleta.
    if (!c) {
      c = [...paleta].sort((a, b) =>
        Math.min(...usados.map((u) => distanciaColor(u, b))) - Math.min(...usados.map((u) => distanciaColor(u, a))))[0];
    }
    out.set(s.id, c);
    usados.push(c);
  }
  return out;
}
