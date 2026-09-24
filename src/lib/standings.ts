/* =========================================================================
   Leer una clasificación pegada, y tirar los nombres por el camino.

   QUÉ PROBLEMA RESUELVE
   ---------------------
   El metagame presencial —lo que se juega en un Regional— no está en ninguna
   API que se pueda llamar. Limitless dejó los presenciales fuera de la suya a
   propósito, y RK9 prohíbe expresamente la extracción automatizada. Así que
   la única vía correcta es que una persona copie la clasificación que ya está
   viendo en pantalla y la pegue aquí.

   Lo que hace este módulo es convertir ese pegote en filas de metagame. Todo
   lo demás —casar arquetipos, poner sprites, guardar— pasa después.

   LA REGLA QUE MANDA SOBRE TODAS LAS DEMÁS
   ----------------------------------------
   **De aquí no sale ni un nombre de persona.** No es una promesa: es que el
   tipo que devuelve la función no tiene dónde ponerlo. Una fila es puesto,
   mazo y récord, y punto.

   Y cuando no se sabe si algo es un mazo o una persona, se tira. El criterio
   es la repetición: en una clasificación un nombre propio aparece **una vez**
   y un mazo aparece **muchas**. Una cadena que no casa con el catálogo y sale
   una sola vez se descarta sin más; para que se acepte como mazo nuevo tiene
   que repetirse al menos tres veces en puestos distintos. Equivocarse por
   descartar cuesta una fila; equivocarse por guardar cuesta un dato personal
   de alguien que no ha pedido estar aquí.

   POR QUÉ NO IMPORTA NADA
   -----------------------
   Igual que `cut.ts` o `badges.ts`: sin un solo `import`, para que los tests
   puedan cargarlo directamente con `node --experimental-strip-types`. Lo que
   necesita de fuera —el catálogo de arquetipos— entra por parámetro.
   ========================================================================= */

/** Un arquetipo del catálogo, con lo justo para poder casarlo. */
export type KnownArchetype = {
  id: string;
  name: string;
  main?: string;
  secondary?: string;
};

/** Una fila de metagame. Fíjate en lo que NO hay. */
export type ParsedEntry = {
  /** Puesto final. Nulo en el modo resumen. */
  placement: number | null;
  /** Cuántas listas representa. 1 en una clasificación. */
  copies: number;
  /** El nombre del mazo tal y como venía escrito. */
  deck: string;
  /** El arquetipo del catálogo con el que ha casado, si ha casado. */
  archetypeId: string | null;
  wins: number | null;
  losses: number | null;
  ties: number | null;
};

export type ParseResult = {
  entries: ParsedEntry[];
  /** Líneas que parecían una fila pero de las que no se sacó el mazo. */
  skipped: number;
  /** Mazos aceptados por repetición que no están en el catálogo. */
  nuevos: string[];
  /**
   * Cuántas cadenas se han descartado por no repetirse.
   *
   * Es, casi punto por punto, el número de nombres de persona que han entrado
   * por el textarea y no han salido. Se enseña para que se vea que el filtro
   * está trabajando.
   */
  descartadas: number;
};

/* ------------------------------------------------------- normalización -- */

/** Minúsculas, sin acentos, sin nada que no sea letra o número. */
export function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Colapsa espacios y quita separadores de columna. */
function limpia(s: string): string {
  return s.replace(/[\t|·•]+/g, " ").replace(/\s+/g, " ").trim();
}

/* Cabeceras de tabla que se copian junto con los datos. */
const CABECERA = /^(#|place|placing|pos|puesto|player|jugador|name|nombre|deck|mazo|record|r[eé]cord|points|puntos|standings?|clasificaci[oó]n)\b/i;

/** "1", "1.", "1st", "1º", "#1" → 1. */
function puestoDe(token: string): number | null {
  const m = token.match(/^#?(\d{1,4})(?:[.ºo°]|st|nd|rd|th)?$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 9999 ? n : null;
}

/**
 * Cuántos puestos distintos tiene que ocupar una cadena desconocida para que
 * se acepte como mazo. Tres es suficiente para que ningún nombre de persona
 * pase, y bastante poco para que un arquetipo nuevo del top 32 sí lo haga.
 */
const MINIMO_REPETICIONES = 3;

/** "18-2-1" o "6-2" → récord. */
const RECORD = /\b(\d{1,2})\s*[-/]\s*(\d{1,2})(?:\s*[-/]\s*(\d{1,2}))?\b/;

/* ------------------------------------------------- casar con el mazo -- */

/**
 * ¿Con qué arquetipo del catálogo acaba este trozo de línea?
 *
 * Anclado al final a propósito. El orden de columnas de todas las webs que
 * publican clasificaciones es el mismo —puesto, jugador, país, mazo, récord—,
 * así que entre el puesto y el récord el mazo es **lo último**. Buscar el
 * final en vez de "en cualquier parte" es lo que impide que un apellido que
 * contenga un nombre de Pokémon se lleve el premio.
 *
 * Gana el más largo: entre "Gardevoir" y "Gardevoir Munkidori" se queda el
 * segundo, que es el arquetipo de verdad.
 */
export function matchArchetype(
  texto: string, known: KnownArchetype[],
): { archetype: KnownArchetype; matched: string } | null {
  const n = norm(texto);
  if (!n) return null;

  let mejor: KnownArchetype | null = null;
  let largo = 0;
  for (const a of known) {
    const k = norm(a.name);
    if (!k || k.length <= largo) continue;
    if (n === k || n.endsWith(k)) { mejor = a; largo = k.length; }
  }
  return mejor ? { archetype: mejor, matched: mejor.name } : null;
}

/** Las últimas 1..4 palabras de un texto, de la más larga a la más corta. */
function colas(texto: string): string[] {
  const palabras = texto.split(" ").filter(Boolean);
  const out: string[] = [];
  for (let n = Math.min(4, palabras.length); n >= 1; n--) {
    out.push(palabras.slice(palabras.length - n).join(" "));
  }
  return out;
}

/* ------------------------------------------------------- clasificación -- */

type Cruda = {
  placement: number;
  /**
   * Los trozos de la línea donde puede estar el mazo, en orden de confianza.
   *
   * Casi todas las webs ponen el mazo entre el jugador y el récord, pero
   * alguna lo pone después. En vez de decidir por el dominio —que además
   * cambiaría el día que la web se rediseñe— se guardan los dos trozos y se
   * prueba primero el de siempre. Dentro de cada trozo el nombre de la
   * persona sigue estando; lo que lo deja fuera es que el casado va anclado
   * al final.
   */
  trozos: string[];
  wins: number | null;
  losses: number | null;
  ties: number | null;
};

/**
 * Una clasificación pegada tal cual.
 *
 * Dos pasadas: la primera trocea las líneas y la segunda decide qué trozo era
 * el mazo. Tienen que ser dos porque el criterio de la segunda —cuántas veces
 * se repite una cadena— no se puede evaluar línea a línea.
 */
export function parseStandings(texto: string, known: KnownArchetype[] = []): ParseResult {
  const crudas: Cruda[] = [];
  let skipped = 0;

  for (const bruta of (texto || "").split(/\r?\n/)) {
    const linea = limpia(bruta);
    if (!linea) continue;
    if (CABECERA.test(linea)) continue;

    const trozos = linea.split(" ");
    const placement = puestoDe(trozos[0]);
    if (placement == null) { skipped++; continue; }

    const resto = trozos.slice(1).join(" ");

    const rec = resto.match(RECORD);
    let wins: number | null = null, losses: number | null = null, ties: number | null = null;
    let antes = resto, despues = "";
    if (rec) {
      wins = parseInt(rec[1], 10);
      losses = parseInt(rec[2], 10);
      ties = rec[3] != null ? parseInt(rec[3], 10) : 0;
      const i = rec.index ?? resto.length;
      antes = resto.slice(0, i);
      despues = resto.slice(i + rec[0].length);
    }

    const piezas = [antes, despues]
      // Banderas y códigos de país sueltos: "[US]", "(NO)".
      .map((x) => limpia(x.replace(/\[[^\]]*\]/g, " ").replace(/\((?:[A-Z]{2,3})\)/g, " ")))
      // Puntos, resistencia y demás números de cola.
      .map((x) => limpia(x.replace(/(?:\s|^)\d+(?:[.,]\d+)?%?(?=\s|$)/g, " ")))
      .filter(Boolean);

    if (!piezas.length) { skipped++; continue; }
    crudas.push({ placement, trozos: piezas, wins, losses, ties });
  }

  /* Segunda pasada. Lo que no casa con el catálogo solo se acepta si se
     repite: tres puestos distintos. Un nombre propio no cumple eso jamás. */
  const candidatas = new Map<string, { texto: string; puestos: Set<number> }>();
  const sinCasar: Cruda[] = [];
  const resueltas = new Map<Cruda, { deck: string; archetypeId: string | null }>();

  for (const c of crudas) {
    let hit: { archetype: KnownArchetype; matched: string } | null = null;
    for (const t of c.trozos) {
      hit = matchArchetype(t, known);
      if (hit) break;
    }
    if (hit) { resueltas.set(c, { deck: hit.matched, archetypeId: hit.archetype.id }); continue; }

    sinCasar.push(c);
    for (const t of c.trozos) {
      for (const cola of colas(t)) {
        const clave = norm(cola);
        if (!clave) continue;
        const prev = candidatas.get(clave);
        if (prev) prev.puestos.add(c.placement);
        else candidatas.set(clave, { texto: cola, puestos: new Set([c.placement]) });
      }
    }
  }

  const aceptadas = new Map<string, string>();
  for (const [clave, v] of candidatas) {
    if (v.puestos.size >= MINIMO_REPETICIONES) aceptadas.set(clave, v.texto);
  }

  const nuevos = new Set<string>();
  let descartadas = 0;
  for (const c of sinCasar) {
    // De las colas que han pasado el filtro, la más larga: "Raging Bolt
    // Ogerpon" antes que "Ogerpon".
    let elegida = "";
    for (const t of c.trozos) {
      for (const cola of colas(t)) {
        const hit = aceptadas.get(norm(cola));
        if (hit && norm(hit).length > norm(elegida).length) elegida = hit;
      }
    }
    if (!elegida) { descartadas++; skipped++; continue; }
    nuevos.add(elegida);
    resueltas.set(c, { deck: elegida, archetypeId: null });
  }

  const entries: ParsedEntry[] = [];
  const vistos = new Set<number>();
  for (const c of crudas) {
    const r = resueltas.get(c);
    if (!r) continue;
    // Un puesto repetido es un pegado a medias o una tabla con dos divisiones.
    // Se queda el primero: es lo que no rompe el índice único al guardar.
    if (vistos.has(c.placement)) { skipped++; continue; }
    vistos.add(c.placement);
    entries.push({
      placement: c.placement,
      copies: 1,
      deck: r.deck,
      archetypeId: r.archetypeId,
      wins: c.wins, losses: c.losses, ties: c.ties,
    });
  }

  entries.sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0));
  return { entries, skipped, nuevos: [...nuevos].sort(), descartadas };
}

/* ------------------------------------------------------------ resumen -- */

/**
 * El desglose por mazos, sin puestos: "Gardevoir ex — 6".
 *
 * Es la forma de meter un top 32 en diez líneas cuando la clasificación
 * completa no hace falta, y la única en la que no entra un nombre ni por
 * accidente, porque en el texto de origen no los hay.
 *
 * Acepta el número delante o detrás, con guion, dos puntos, tabulador, "x6"
 * o nada. Lo que no acepta es una línea sin número: sin cuántas listas son,
 * la fila no dice nada.
 */
export function parseSummary(texto: string, known: KnownArchetype[] = []): ParseResult {
  const entries: ParsedEntry[] = [];
  const nuevos = new Set<string>();
  let skipped = 0;

  for (const bruta of (texto || "").split(/\r?\n/)) {
    const linea = limpia(bruta);
    if (!linea || CABECERA.test(linea)) continue;

    let nombre = "";
    let copies = 0;

    /* Ojo con la «x» de multiplicar: sin exigir que vaya detrás de un
       separador, «Gardevoir ex 6» se leía como «Gardevoir e» por 6. Por eso
       el separador es obligatorio y la «x» solo puede ir después de él. */
    const delante = linea.match(/^(\d{1,4})\s*[x×]?\s+(.+)$/i);
    const detras = linea.match(/^(.+?)(?:\s*[-–—:=]\s*|\s+)(?:[x×]\s*)?(\d{1,4})$/);

    if (delante) { copies = parseInt(delante[1], 10); nombre = delante[2]; }
    else if (detras) { nombre = detras[1]; copies = parseInt(detras[2], 10); }
    else { skipped++; continue; }

    nombre = limpia(nombre.replace(/[-–—:=]+$/, ""));
    if (!nombre || copies < 1) { skipped++; continue; }

    const m = matchArchetype(nombre, known);
    if (!m) nuevos.add(nombre);
    entries.push({
      placement: null,
      copies,
      deck: m ? m.matched : nombre,
      archetypeId: m ? m.archetype.id : null,
      wins: null, losses: null, ties: null,
    });
  }

  return { entries, skipped, nuevos: [...nuevos].sort(), descartadas: 0 };
}

/* --------------------------------------------------------- qué es esto -- */

export type PasteMode = "standings" | "summary";

/**
 * Adivina qué han pegado, para preseleccionar el modo.
 *
 * Solo es una sugerencia: el formulario deja cambiarlo. Adivinar mal y que la
 * persona lo corrija es barato; obligarla a elegir siempre, no.
 */
export function detectMode(texto: string): PasteMode {
  const lineas = (texto || "").split(/\r?\n/).map(limpia).filter((l) => l && !CABECERA.test(l));
  if (!lineas.length) return "standings";

  // Una clasificación lleva puestos correlativos: 1, 2, 3… Un resumen lleva
  // cantidades, que casi nunca empiezan en 1 ni van seguidas.
  const puestos = lineas.map((l) => puestoDe(l.split(" ")[0])).filter((n): n is number => n != null);
  if (puestos.length >= 3 && puestos[0] === 1 && puestos[1] === 2 && puestos[2] === 3) {
    return "standings";
  }
  const conRecord = lineas.filter((l) => RECORD.test(l)).length;
  return conRecord >= lineas.length / 2 ? "standings" : "summary";
}

/* ------------------------------------------------------------ resumen -- */

/** Qué parte del evento cubre lo pegado: hasta qué puesto llega. */
export function coverageOf(entries: ParsedEntry[]): number | null {
  const conPuesto = entries.map((e) => e.placement).filter((p): p is number => p != null);
  if (!conPuesto.length) return null;
  return Math.max(...conPuesto);
}
