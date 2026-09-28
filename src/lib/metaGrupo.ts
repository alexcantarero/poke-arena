/* =========================================================================
   Los resultados del grupo, con la misma forma que los del mundo.

   POR QUÉ EXISTE ESTE FICHERO
   ---------------------------
   El inicio tiene que enseñar el mismo panel con dos fuentes: el Regional
   entero, que viene de fuera, y «lo vuestro», que sale de los torneos que
   habéis apuntado en Arena. La tentación es escribir dos paneles. La forma
   barata es escribir **un panel y dos adaptadores**: los dos lados se
   convierten a `FilaMeta` y el componente no se entera de dónde vienen los
   datos. Cambiar de pestaña pasa a ser cambiar un array.

   Este es el adaptador del lado de casa.

   LO QUE APORTA Y NO ES EVIDENTE
   ------------------------------
   Vuestros resultados no traen apuntado si alguien pasó a Día 2: traen el
   récord. Pero con la asistencia del torneo se sabe su estructura, y con la
   estructura se sabe el umbral de puntos de la fase dos. Así que **el «pasó a
   Día 2» se deduce**, en vez de pediros que lo marquéis a mano en cada
   resultado. Es la misma cuenta que hace la pantalla del camino al corte, y
   sale de `estructura.ts`.

   Cuando no se puede deducir —un torneo sin asistencia apuntada, o de una
   sola fase— se devuelve nulo y no cero. Un nulo se pinta como «—» y se
   entiende; un cero se lee como «no pasó nadie» y es mentira.

   EL TAMAÑO DE LA MUESTRA VIAJA CON LOS DATOS
   -------------------------------------------
   Con seis resultados, un 50% de conversión no es un dato: son tres personas.
   Por eso `resumenGrupo` devuelve `resultados` y `torneos`, para que la
   pantalla pueda ponerlo al lado del título en vez de enseñar un porcentaje
   desnudo que invita a sacar conclusiones.

   POR QUÉ EL UMBRAL ENTRA POR PARÁMETRO Y NO SE CALCULA AQUÍ
   ----------------------------------------------------------
   Lo natural sería importar `umbralesDe` de `estructura.ts` y calcularlo
   dentro. No se hace, y la razón es de compilación: los tests cargan estos
   ficheros con `node --experimental-strip-types`, que exige la extensión en
   el import (`"./estructura.ts"`), y el build de Next la rechaza salvo que se
   active `allowImportingTsExtensions`. O sea: el import que hace pasar los
   tests es el que rompe `npm run build`.

   La salida es la de siempre en este proyecto: **estos módulos no importan
   nada**. Quien llama ya tiene el torneo delante y calcula el umbral en una
   línea con `umbralesDe(playerCount, kind)`. A cambio, el fichero se puede
   probar directo y funciona igual en el navegador.
   ========================================================================= */

/** La forma de una fila de metagame. Igual que la de `metaBadges.ts`. */
type FilaMeta = {
  key: string;
  name: string;
  field: number;
  day2: number | null;
  cut: number;
  bestFinish: number | null;
  onlineShare: number | null;
  main?: string;
  secondary?: string;
};

/** El campo del evento. Igual que el de `metaBadges.ts`. */
type CampoMeta = {
  decks: number;
  day2: number | null;
  topCut: number;
};

/** Un resultado de alguien del grupo en un torneo de fuera. */
export type ResultadoGrupo = {
  /** Para no contar dos veces a la misma persona en el mismo torneo. */
  playerId: string;
  tournamentId: string;
  /**
   * Match points para pasar a la fase dos, **nulo si el torneo no la tiene**.
   *
   * Lo calcula quien llama, con `umbralesDe(playerCount, kind)?.diaDos?.puntos`.
   * Ojo con el `kind`: el TCG tiene tres tablas de rondas distintas y una
   * League Cup de 24 personas no se lee con la tabla de Regionales.
   *
   * Nulo no es cero: significa «no se puede saber», y por eso la conversión
   * de esa fila sale nula en vez de salir a cero.
   */
  umbralDiaDos: number | null;
  /** Tamaño del corte, si se sabe. */
  topCut: number | null;
  archetypeId: string | null;
  archetypeName: string;
  main: string;
  secondary: string;
  placement: number | null;
  wins: number;
  losses: number;
  ties: number;
};

export type ResumenGrupo = {
  filas: FilaMeta[];
  campo: CampoMeta;
  /** Cuántos resultados hay detrás. La pantalla tiene que enseñarlo. */
  resultados: number;
  /** En cuántos torneos distintos. */
  torneos: number;
  /** De cuántos se pudo deducir el Día 2. Si es bajo, la conversión vale poco. */
  conDiaDos: number;
};

const PTS_VICTORIA = 3;
const PTS_EMPATE = 1;

/** Los match points de un récord. */
export function puntos(r: { wins: number; ties: number }): number {
  return r.wins * PTS_VICTORIA + r.ties * PTS_EMPATE;
}

/**
 * ¿Pasó este resultado a la fase dos?
 *
 * Nulo cuando no se puede saber: sin asistencia no hay estructura, y un
 * torneo de una sola fase no tiene Día 2 al que pasar. Nulo no es «no».
 */
export function pasoDiaDos(r: ResultadoGrupo): boolean | null {
  if (r.umbralDiaDos == null) return null;
  return puntos(r) >= r.umbralDiaDos;
}

/**
 * Agrupa los resultados del grupo por arquetipo.
 *
 * La clave es el `archetypeId` cuando lo hay y el nombre normalizado cuando
 * no, igual que en el metagame importado: así un mazo apuntado a mano en un
 * torneo y casado con el catálogo en otro no sale partido en dos filas.
 */
export function resumenGrupo(resultados: ResultadoGrupo[]): ResumenGrupo {
  const norm = (s: string) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

  const acc = new Map<string, FilaMeta & { _day2: number; _sabemos: number }>();
  const torneos = new Set<string>();
  const vistos = new Set<string>();
  let conDiaDos = 0;
  let day2Total = 0;
  let sabemosTotal = 0;
  let cutTotal = 0;

  for (const r of resultados) {
    // Un resultado por persona y torneo. Si llegan duplicados —dos filas del
    // mismo jugador en el mismo evento— se queda el primero, que es lo que no
    // infla la cuota de su mazo.
    const huella = `${r.tournamentId}|${r.playerId}`;
    if (vistos.has(huella)) continue;
    vistos.add(huella);
    torneos.add(r.tournamentId);

    const nombre = r.archetypeName || "Sin mazo";
    const key = r.archetypeId ?? `n:${norm(nombre)}`;

    let fila = acc.get(key);
    if (!fila) {
      fila = {
        key, name: nombre, field: 0, day2: null, cut: 0,
        bestFinish: null, onlineShare: null,
        main: "", secondary: "",
        _day2: 0, _sabemos: 0,
      };
      acc.set(key, fila);
    }

    fila.field += 1;
    if (!fila.main && r.main) { fila.main = r.main; fila.secondary = r.secondary; }

    const paso = pasoDiaDos(r);
    if (paso != null) {
      fila._sabemos += 1;
      sabemosTotal += 1;
      conDiaDos += 1;
      if (paso) { fila._day2 += 1; day2Total += 1; }
    }

    const corte = r.topCut ?? 0;
    if (r.placement != null && corte > 0 && r.placement <= corte) {
      fila.cut += 1;
      cutTotal += 1;
    }
    if (r.placement != null && (fila.bestFinish == null || r.placement < fila.bestFinish)) {
      fila.bestFinish = r.placement;
    }
  }

  const filas: FilaMeta[] = [...acc.values()].map(({ _day2, _sabemos, ...f }) => ({
    ...f,
    // Solo hay conversión si de alguno se pudo deducir. Si no, nulo.
    day2: _sabemos > 0 ? _day2 : null,
  }));

  return {
    filas,
    campo: {
      decks: vistos.size,
      day2: sabemosTotal > 0 ? day2Total : null,
      topCut: cutTotal,
    },
    resultados: vistos.size,
    torneos: torneos.size,
    conDiaDos,
  };
}

/**
 * Trae la cuota online a las filas del grupo, casando por nombre.
 *
 * Sirve para que la insignia de «sobrejugado» también funcione en la vista
 * del grupo: «lleváis Dragapult bastante más de lo que se juega». Se casa por
 * nombre normalizado porque los ids de una fuente y de otra no tienen por qué
 * coincidir, y lo que no case se queda sin comparación en vez de inventarse
 * una.
 */
export function conCuotaOnline(
  filas: FilaMeta[], online: Array<{ name: string; share: number }>,
): FilaMeta[] {
  const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const porNombre = new Map(online.map((o) => [norm(o.name), o.share]));
  return filas.map((f) => ({ ...f, onlineShare: porNombre.get(norm(f.name)) ?? null }));
}
