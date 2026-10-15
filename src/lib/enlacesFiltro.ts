/* =========================================================================
   De un dato de una gráfica a la pantalla de Resultados filtrada.

   Sin imports, como el resto de módulos que se prueban.

   POR QUÉ ESTO Y NO «GRÁFICAS MEJORES»
   ------------------------------------
   Una gráfica contesta una pregunta y abre otra. Ves que con Dragapult vas
   al 61 % y lo siguiente que quieres es ver ESAS partidas. Hoy hay que ir a
   Resultados, abrir los filtros y elegir el arquetipo a mano, y para cuando
   llegas ya se te ha ido la pregunta.

   El filtro ya existe (`src/lib/filters.ts`) y ya viaja en la URL. Lo único
   que faltaba era que tocar una barra fuera navegar. Eso no necesita ninguna
   librería nueva: necesita construir bien una cadena de consulta.

   LA REGLA
   --------
   Los nombres de los parámetros los decide `filterToQuery` en `filters.ts`.
   Aquí NO se reinventan: se usan los mismos, y hay una prueba que compara
   las dos listas. Dos sitios que generan la misma URL con nombres distintos
   es una pantalla que se abre sin filtrar y nadie entiende por qué.
   ========================================================================= */

/** Los parámetros de la URL de Resultados, tal como los escribe `filters.ts`. */
export const PARAMS = {
  ambito: "ambito",
  desde: "desde",
  hasta: "hasta",
  tipoTorneo: "tipoTorneo",
  tipoComp: "tipoComp",
  torneo: "torneo",
  comp: "comp",
  arquetipo: "arquetipo",
  jugador: "jugador",
  formato: "formato",
  jornada: "jornada",
} as const;

export type ClaveFiltro = keyof typeof PARAMS;

/**
 * Construye la URL de Resultados con los filtros dados.
 *
 * Los valores vacíos, nulos y los `0` de jornada se dejan fuera: un
 * `?arquetipo=` vacío no filtra nada pero ensucia el enlace y rompe el
 * «¿hay filtros puestos?» de la cabecera.
 */
export function urlResultados(filtros: Partial<Record<ClaveFiltro, string | number | null>>): string {
  const sp = new URLSearchParams();
  for (const clave of Object.keys(PARAMS) as ClaveFiltro[]) {
    const v = filtros[clave];
    if (v == null) continue;
    const s = String(v).trim();
    if (!s || s === "0") continue;
    sp.set(PARAMS[clave], s);
  }
  const q = sp.toString();
  return q ? `/resultados?${q}` : "/resultados";
}

/** El enlace de un arquetipo: «enséñame esas partidas». */
export const urlDeArquetipo = (archetypeId: string, extra: Partial<Record<ClaveFiltro, string>> = {}) =>
  urlResultados({ ...extra, arquetipo: archetypeId });

/** El enlace de una persona. */
export const urlDeJugador = (playerId: string, extra: Partial<Record<ClaveFiltro, string>> = {}) =>
  urlResultados({ ...extra, jugador: playerId });

/**
 * El enlace de un mes, de «2026-10» al rango del mes entero.
 *
 * El último día se calcula con el día 0 del mes siguiente, que en JavaScript
 * es el último del actual. Escribir 30 o 31 a mano falla en febrero y en los
 * bisiestos, y el fallo es de los que no se ven: el mes sale con un día de
 * menos y nadie lo nota.
 */
export function urlDeMes(mesISO: string, extra: Partial<Record<ClaveFiltro, string>> = {}): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(mesISO.trim());
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return null;

  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return urlResultados({
    ...extra,
    desde: `${m[1]}-${m[2]}-01`,
    hasta: `${m[1]}-${m[2]}-${String(ultimo).padStart(2, "0")}`,
  });
}

/**
 * El texto accesible de un enlace de gráfica.
 *
 * Una barra que navega tiene que decir a dónde va: un lector de pantalla no
 * ve la barra, y en el móvil tampoco hay cursor que cambie de forma. Sin
 * esto, la gráfica es un montón de enlaces llamados «61 %».
 */
export const etiquetaDeEnlace = (que: string) => `Ver las partidas de ${que}`;

/**
 * Los filtros que ya están puestos y conviene arrastrar al enlace.
 *
 * Si estás mirando Estadísticas filtrado por la temporada y por liga, y
 * pinchas en Dragapult, lo que quieres son ESAS partidas de Dragapult, no
 * todas las de la historia. Arrastrar el contexto es la diferencia entre un
 * enlace útil y uno que te saca de donde estabas.
 *
 * Entra con los nombres de `MatchFilter` (`scope`, `from`, `tournamentId`…)
 * y sale con los de la URL (`ambito`, `desde`, `torneo`…). La traducción
 * vive aquí y en un solo sitio: es exactamente el punto donde se cometería
 * el error de inventarse un nombre de parámetro.
 *
 * El arquetipo y el jugador NO se arrastran: son lo que el enlace va a
 * fijar, y mantener el anterior daría un filtro imposible.
 */
export function filtroBaseParaEnlaces(f: {
  scope?: string;
  from?: string;
  to?: string;
  tournamentKind?: string;
  competitionKind?: string;
  tournamentId?: string;
  competitionId?: string;
  format?: string;
}): Partial<Record<ClaveFiltro, string>> {
  const pares: Array<[ClaveFiltro, string | undefined]> = [
    ["ambito", f.scope === "all" ? "" : f.scope],
    ["desde", f.from],
    ["hasta", f.to],
    ["tipoTorneo", f.tournamentKind],
    ["tipoComp", f.competitionKind],
    ["torneo", f.tournamentId],
    ["comp", f.competitionId],
    ["formato", f.format],
  ];

  const out: Partial<Record<ClaveFiltro, string>> = {};
  for (const [clave, valor] of pares) {
    const v = (valor ?? "").trim();
    if (v) out[clave] = v;
  }
  return out;
}
