/* =========================================================================
   v0.108 — Matrices interactivas: tocar una celda enseña las partidas de ese
   cruce (jugador contra jugador en Ranking; arquetipo contra arquetipo en
   Estadísticas).

   Sin imports, para probarlo.

   Va por URL (`?cruce=a~b#cruce`), como el resto de filtros: funciona sin
   JavaScript, se comparte y la flecha de volver atrás cierra el panel. Las
   celdas son enlaces; el panel lo pinta el servidor debajo de la matriz.
   ========================================================================= */

export type Resultado = "w" | "l" | "t" | null;

export type PartidaCruce = {
  id: string;
  fecha: string;
  /** «Liga · Jornada 3», «Regional de Gdansk · R5»… */
  contexto: string;
  /** Desde el lado de la FILA. */
  resultado: Resultado;
  /** «2–1» si hay juegos; vacío si se apuntó solo el resultado. */
  marcador: string;
  /** Detalle opcional: quién jugó, con qué mazo… */
  detalle?: string;
  href?: string;
};

const SEP = "~";
const ID = /^[\w.:-]{1,120}$/;

/** `?cruce=a~b` → [a, b]; cualquier cosa rara → null. */
export function parseCruce(v: unknown): [string, string] | null {
  const s = Array.isArray(v) ? v[0] : v;
  if (typeof s !== "string") return null;
  const [a, b, ...resto] = s.split(SEP);
  if (resto.length || !a || !b || a === b || !ID.test(a) || !ID.test(b)) return null;
  return [a, b];
}

export const valorCruce = (a: string, b: string) => `${a}${SEP}${b}`;

/**
 * La URL de la misma pantalla con un parámetro puesto o quitado, conservando
 * los demás (filtros, pestañas). `ancla` sin «#».
 */
export function hrefConParam(
  ruta: string,
  q: Record<string, string | string[] | undefined>,
  clave: string,
  valor: string | null,
  ancla?: string,
): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (k === clave || v == null) continue;
    for (const x of Array.isArray(v) ? v : [v]) p.append(k, x);
  }
  if (valor != null) p.set(clave, valor);
  const qs = p.toString();
  return `${ruta}${qs ? `?${qs}` : ""}${ancla ? `#${ancla}` : ""}`;
}

/** V–D–E del cruce, desde la fila; los «sin resultado» no cuentan. */
export function resumenCruce(ps: PartidaCruce[]) {
  const r = { w: 0, l: 0, t: 0, total: ps.length };
  for (const p of ps) if (p.resultado) r[p.resultado]++;
  return r;
}

/** Más reciente primero; a igual fecha, por id para que el orden no baile. */
export const ordenarCruce = (ps: PartidaCruce[]) =>
  [...ps].sort((x, y) => y.fecha.localeCompare(x.fecha) || x.id.localeCompare(y.id));
