/* =========================================================================
   Importar de Limitless los torneos online que habéis jugado.

   Sin imports, como el resto de módulos que se prueban: lo que necesita
   (las clasificaciones ya descargadas, los jugadores de la liga) entra por
   parámetro.

   LA IDEA
   -------
   Hasta ahora, para apuntar un torneo online había que crearlo a mano y
   rellenar el resultado. Pero esos datos ya están publicados: la API de
   Limitless da la clasificación de cada torneo de su plataforma, con puesto,
   récord y mazo ya identificado. Si cada uno guarda su nick, la app puede
   buscaros en esas clasificaciones y crear el torneo con vuestro resultado
   dentro.

   LA REGLA DE PRIVACIDAD, QUE MANDA SOBRE TODO
   --------------------------------------------
   De una clasificación de 300 personas **solo se queda lo de los vuestros**.
   El resto de filas se descartan al leerlas, antes de llegar a ninguna
   tabla. Es la misma norma de la v0.12 con el metagame presencial, y por la
   misma razón: son personas con nombre y apellidos que no se han dado de
   alta en vuestra liga.

   Lo que sí se agrega del resto —cuántos jugaron, qué mazos— ya lo recoge
   `fetchMetaSnapshot` sin nombres, y eso no cambia.
   ========================================================================= */

/** Un jugador de la liga con su nick de Limitless, si lo ha puesto. */
export type JugadorConNick = {
  id: string;
  name: string;
  limitlessHandle: string | null;
};

/** Una fila de clasificación, tal como la devuelve la API. */
export type FilaClasificacion = {
  /** El nick con el que juega en la plataforma. */
  player?: string;
  /** El nombre visible, que puede ser otro. */
  name?: string;
  placing?: number;
  deck?: { id: string; name: string } | null;
  record?: { wins: number; losses: number; ties: number };
};

/** Un torneo de la API. */
export type TorneoRemoto = {
  id: string;
  name: string;
  date: string;
  format: string;
  players: number;
};

/** Lo que hay que crear para una persona en un torneo. */
export type ResultadoImportado = {
  playerId: string;
  placement: number | null;
  wins: number;
  losses: number;
  ties: number;
  /** Slug del arquetipo en Limitless, para casarlo con el catálogo. */
  deckSlug: string | null;
  deckName: string | null;
};

export type TorneoImportado = {
  /** Id estable, para que reimportar no duplique. */
  id: string;
  remoteId: string;
  name: string;
  date: string;
  format: string;
  playerCount: number;
  resultados: ResultadoImportado[];
};

/**
 * Normaliza un nick para compararlo.
 *
 * Limitless no distingue mayúsculas en los nicks y la gente los escribe como
 * le sale al teclearlos en su perfil. Comparar en crudo haría que «IbaiM» y
 * «ibaim» fueran dos personas distintas, y el síntoma sería el peor posible:
 * un torneo importado con el resultado de nadie, sin error ni aviso.
 */
export function nickNormal(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * El id con el que se guarda un torneo importado.
 *
 * Lleva el id remoto dentro para que reimportar el mismo torneo caiga sobre
 * la misma fila en vez de crear una copia. El prefijo distingue de un vistazo
 * lo importado de lo que se creó a mano.
 */
export function idDeTorneo(remoteId: string): string {
  return `ltl-${remoteId}`;
}

/**
 * Busca a los vuestros en la clasificación de un torneo.
 *
 * Devuelve `null` si no hay nadie: ese torneo no se importa. No tiene sentido
 * crear un torneo vacío que además el cron de limpieza borraría a los tres
 * días.
 *
 * **Las filas de los demás no salen de esta función.** Ni el nombre, ni el
 * nick, ni el puesto. Lo único que cruza es el número total de participantes,
 * que es un recuento y no identifica a nadie.
 */
export function vuestrosEnElTorneo(
  torneo: TorneoRemoto,
  clasificacion: FilaClasificacion[],
  jugadores: JugadorConNick[],
): TorneoImportado | null {
  const porNick = new Map<string, JugadorConNick>();
  for (const j of jugadores) {
    const n = nickNormal(j.limitlessHandle);
    if (n) porNick.set(n, j);
  }
  if (!porNick.size) return null;

  const resultados: ResultadoImportado[] = [];
  const yaPuestos = new Set<string>();

  for (const fila of clasificacion) {
    // Se prueban los dos campos: unas respuestas traen el nick en `player`
    // y otras solo el nombre visible en `name`.
    const j = porNick.get(nickNormal(fila.player)) ?? porNick.get(nickNormal(fila.name));
    if (!j || yaPuestos.has(j.id)) continue;
    yaPuestos.add(j.id);

    resultados.push({
      playerId: j.id,
      placement: typeof fila.placing === "number" && fila.placing > 0 ? fila.placing : null,
      wins: fila.record?.wins ?? 0,
      losses: fila.record?.losses ?? 0,
      ties: fila.record?.ties ?? 0,
      deckSlug: fila.deck?.id ?? null,
      deckName: fila.deck?.name ?? null,
    });
  }

  if (!resultados.length) return null;

  return {
    id: idDeTorneo(torneo.id),
    remoteId: torneo.id,
    name: torneo.name,
    date: torneo.date.slice(0, 10),
    format: torneo.format,
    playerCount: torneo.players,
    resultados,
  };
}

export type ResumenImportacion = {
  torneos: TorneoImportado[];
  /** Torneos mirados en los que no jugó nadie del grupo. */
  sinNadie: number;
  /** Jugadores de la liga sin nick puesto: no se les puede buscar. */
  sinNick: string[];
};

/**
 * Recorre varios torneos y se queda con los que os incluyen.
 *
 * `sinNick` se devuelve para que la pantalla pueda decir «a Alex no se le ha
 * buscado porque no tiene nick», que es la diferencia entre «no jugó» y «no
 * lo sabemos». Son cosas distintas y la pantalla no debe mezclarlas.
 */
export function importarTorneos(
  entradas: Array<{ torneo: TorneoRemoto; clasificacion: FilaClasificacion[] }>,
  jugadores: JugadorConNick[],
): ResumenImportacion {
  const torneos: TorneoImportado[] = [];
  let sinNadie = 0;

  for (const { torneo, clasificacion } of entradas) {
    const r = vuestrosEnElTorneo(torneo, clasificacion, jugadores);
    if (r) torneos.push(r);
    else sinNadie++;
  }

  return {
    torneos,
    sinNadie,
    sinNick: jugadores.filter((j) => !nickNormal(j.limitlessHandle)).map((j) => j.name),
  };
}
