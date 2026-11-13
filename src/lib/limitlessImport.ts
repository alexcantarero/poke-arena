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
  /** v0.127 — su identificador en ESTA clasificación, para buscar sus rondas en los emparejamientos. */
  nick: string;
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
      nick: fila.player ?? j.limitlessHandle ?? "",
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

/* =========================================================================
   v0.127 — LAS RONDAS de cada uno en un torneo online, con el mazo rival.

   Hasta ahora del torneo solo se traía el resultado final (puesto, récord y
   mazo). Los emparejamientos también están publicados (`/pairings`: quién
   jugó contra quién en cada ronda y quién ganó), y la clasificación dice qué
   mazo llevaba cada uno. Cruzando las dos cosas sale, para cada jugador del
   grupo, ronda a ronda: el resultado y el mazo de enfrente. Es lo que alimenta
   la matriz de emparejamientos, el %V por arquetipo y el Elo.

   La forma de `/pairings` es la de la documentación oficial
   (docs.limitlesstcg.com/developer/tournaments, leída el 13/11/2026):
     round · phase · table | match · player1 · player2 · winner
     winner = nick del ganador, 0 = empate, −1 = doble derrota
     sin player2 = bye, o derrota automática por no presentarse

   PRIVACIDAD: el nick del rival solo se usa aquí dentro, para buscar su mazo
   y para saber si es alguien del grupo. De esta función NO sale el nick ni el
   nombre de nadie de fuera: sale el mazo.

   EL NÚMERO DE RONDA: en el suizo es el de la API. En un cuadro en directo,
   la API cuenta toda la eliminatoria como UNA ronda y distingue los cruces
   por la etiqueta (`T8-1`, `T4-2`, `T2-1`). Como en la app cada ronda de un
   jugador lleva un número distinto, las de eliminatoria se numeran seguidas
   detrás del suizo, del cruce más grande al más pequeño (T8 → T4 → T2).
   ========================================================================= */

export type FilaEmparejamiento = {
  round?: number | null;
  phase?: number | null;
  table?: number | null;
  match?: string | null;
  player1?: string | null;
  player2?: string | null;
  winner?: string | number | null;
};

export type RondaImportada = {
  /** El número con el que se guarda (seguido, sin repetir). */
  ronda: number;
  /** La fase de la API (1 = suizo, normalmente), para saber el formato (Bo1/Bo3). */
  fase: number;
  /** Desde el lado del jugador del grupo: "a" ganó, "b" perdió, "tie" empató. */
  resultado: "a" | "b" | "tie";
  /** Ronda libre: victoria sin rival. */
  bye: boolean;
  /** Derrota automática sin jugar (no se presentó): cuenta en el récord, no como partida. */
  sinJugar: boolean;
  /** El mazo del rival, para casarlo con el catálogo. Nulo si no se sabe. */
  rivalSlug: string | null;
  rivalMazo: string | null;
  /** Si el rival es alguien del grupo, su id en la app. */
  rivalPlayerId: string | null;
};

/** De «T8-1» saca 8: cuanto más grande, antes se jugó. Sin número, 0. */
function tamanoCruce(etiqueta: string | null | undefined): number {
  const m = /(\d+)/.exec(etiqueta ?? "");
  return m ? Number(m[1]) : 0;
}

export function rondasDeJugador(
  emparejamientos: readonly FilaEmparejamiento[],
  clasificacion: readonly FilaClasificacion[],
  nick: string,
  jugadores: readonly JugadorConNick[] = [],
): RondaImportada[] {
  const yo = nickNormal(nick);
  if (!yo) return [];
  const mazoDe = new Map<string, { id: string; name: string }>();
  for (const f of clasificacion) {
    const n = nickNormal(f.player);
    if (n && f.deck?.id) mazoDe.set(n, f.deck);
  }
  const delGrupo = new Map<string, string>();
  for (const j of jugadores) {
    const n = nickNormal(j.limitlessHandle);
    if (n) delGrupo.set(n, j.id);
  }

  const mias = emparejamientos
    .map((e, i) => ({ e, i, p1: nickNormal(e.player1), p2: nickNormal(e.player2) }))
    .filter((x) => x.p1 === yo || x.p2 === yo)
    .sort((a, b) =>
      (a.e.phase ?? 1) - (b.e.phase ?? 1)
      || (a.e.round ?? 0) - (b.e.round ?? 0)
      || tamanoCruce(b.e.match) - tamanoCruce(a.e.match)
      || a.i - b.i);

  const out: RondaImportada[] = [];
  let ultima = 0;
  for (const { e, p1, p2 } of mias) {
    const rival = p1 === yo ? p2 : p1;
    const w = e.winner;
    const ganador = typeof w === "string" ? nickNormal(w) : "";
    // El número: el de la API mientras avance; si se repite (cuadro), el siguiente.
    const pedida = typeof e.round === "number" && e.round > 0 ? e.round : ultima + 1;
    const ronda = pedida > ultima ? pedida : ultima + 1;
    ultima = ronda;

    let resultado: RondaImportada["resultado"];
    let bye = false, sinJugar = false;
    if (!rival) {
      // Sin rival: bye si gana, derrota automática (no se presentó) si no.
      if (ganador === yo) { resultado = "a"; bye = true; } else { resultado = "b"; sinJugar = true; }
    } else if (w === 0 || w === "0") {
      resultado = "tie";
    } else if (w === -1 || w === "-1") {
      resultado = "b"; // doble derrota: los dos pierden (se jugó, o se acabó el tiempo)
    } else if (ganador === yo) {
      resultado = "a";
    } else if (ganador === rival) {
      resultado = "b";
    } else {
      continue; // sin resultado todavía (torneo en curso) o un dato que no se entiende: no se inventa
    }
    const mazo = rival ? mazoDe.get(rival) ?? null : null;
    out.push({
      ronda, fase: e.phase ?? 1, resultado, bye, sinJugar,
      rivalSlug: mazo?.id ?? null, rivalMazo: mazo?.name ?? null,
      rivalPlayerId: rival ? delGrupo.get(rival) ?? null : null,
    });
  }
  return out;
}
