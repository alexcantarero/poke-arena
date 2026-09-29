/* =========================================================================
   Lectura de las páginas públicas de limitlesstcg.com — solo mazos.

   POR QUÉ SE PUEDE, Y CON QUÉ CONDICIONES
   ---------------------------------------
   Comprobado el 28/09/2026:
   · `limitlesstcg.com/robots.txt` es `User-agent: * / Disallow:`, o sea,
     permite todo.
   · La web no publica condiciones de uso: solo aviso legal y privacidad. Las
     condiciones que existen son las de su plataforma online
     (play.limitlesstcg.com), que ya se usa por su API oficial.
   · Lo que se lee son las páginas de **estadísticas** (recuento de mazos ya
     agregado por Limitless) y la cabecera de resultados (puesto + mazo).

   No es RK9 ni pokemon.com: esos dos prohíben la extracción automatizada y
   siguen fuera. Tampoco es Labs, que republica standings de RK9.

   Y las condiciones que nos ponemos: identificarse con un User-Agent propio,
   una sola lectura por torneo terminado (se guarda para siempre), un tope de
   torneos por sincronización y pausa entre peticiones, y citar la fuente en
   pantalla. Si Limitless pide que no, se apaga y se vuelve a pegar a mano.

   NINGÚN NOMBRE DE PERSONA
   ------------------------
   Estas funciones **no leen** la columna del jugador ni el atributo
   `data-name`. No es que lo descarten después: la expresión regular ni lo
   captura. `meta_entries` no tiene columna de nombre, y aquí no se abre la
   puerta por la que podría colarse uno.

   Sin imports, como el resto de módulos probados, para que los tests lo
   carguen directo con `node --experimental-strip-types`.
   ========================================================================= */

export const LIMITLESS_WEB = "https://limitlesstcg.com";

/** Deshace las entidades que usa Limitless en nombres de mazo. */
export function decodeHtml(s: string): string {
  return s
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .trim();
}

/** Los slugs de sprite (alt de `img.pokemon`) de un trozo de HTML, en orden. */
export function spritesDe(html: string): string[] {
  const out: string[] = [];
  const re = /<img[^>]*class="pokemon"[^>]*alt="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

/** «Toxtricity Munkidori» a partir de los slugs, cuando no hay nombre. */
export function nombreDeSprites(slugs: string[]): string {
  return slugs
    .map((s) => s.split("-").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" "))
    .join(" ") || "Otros";
}

const attr = (tag: string, name: string): string | null => {
  const m = new RegExp(`${name}="([^"]*)"`).exec(tag);
  return m ? decodeHtml(m[1]) : null;
};

/* ------------------------------------------------ lista de torneos -- */

export type TorneoLimitless = {
  id: string;
  date: string;
  name: string;
  country: string;
  format: string;
  players: number | null;
};

/**
 * `/tournaments`: la lista de torneos grandes (Regionales, Internacionales,
 * ligas nacionales…). Se leen los atributos `data-*` de cada fila, que es lo
 * estable, y el id del enlace. `data-winner` NO se lee.
 */
export function parseListaTorneos(html: string): TorneoLimitless[] {
  const out: TorneoLimitless[] = [];
  const re = /<tr\s+data-date="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const abre = html.slice(m.index, html.indexOf(">", m.index + 4) + 1);
    const id = /href="\/tournaments\/(\d+)"/.exec(m[2])?.[1];
    const name = attr(abre, "data-name");
    if (!id || !name) continue;
    const players = Number(attr(abre, "data-players"));
    out.push({
      id,
      date: m[1],
      name,
      country: attr(abre, "data-country") ?? "",
      format: attr(abre, "data-format") ?? "",
      players: Number.isFinite(players) && players > 0 ? players : null,
    });
  }
  return out;
}

/** Qué tipo de evento de Arena es, por el nombre. Nulo = no nos interesa. */
export function tipoDeTorneo(name: string): "regional" | "special" | "international" | "worlds" | null {
  const n = name.toLowerCase();
  if (/world championship|worlds/.test(n)) return "worlds";
  if (/international|\bic\b|euic|naic|laic|ocic/.test(n)) return "international";
  if (/special/.test(n)) return "special";
  if (/regional/.test(n)) return "regional";
  return null;
}

/* --------------------------------------------- estadísticas de mazos -- */

export type FilaEstadistica = {
  name: string;
  main: string;
  secondary: string;
  count: number;
};

/**
 * `/tournaments/{id}/statistics`: «Most successful decks».
 *
 * OJO con lo que cubre: en un torneo de dos fases, Limitless dice en la propia
 * página que es **la fase 2** (Día 2). En Baltimore suman 559 listas de 3.122
 * jugadores. Por eso se guarda como tal y la pantalla lo dice.
 */
export function parseEstadisticas(html: string): FilaEstadistica[] {
  const out: FilaEstadistica[] = [];
  const re = /<tr\s+data-count="(\d+)"[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const name = /<a href="\/decks\/[^"]*">([^<]+)<\/a>/.exec(m[2])?.[1];
    const s = spritesDe(m[2]);
    const count = Number(m[1]);
    if (!count) continue;
    out.push({
      name: name ? decodeHtml(name) : nombreDeSprites(s),
      main: s[0] ?? "",
      secondary: s[1] ?? "",
      count,
    });
  }
  return out;
}

/* ------------------------------------------------ cabeza de resultados -- */

export type PuestoMazo = { placement: number; name: string; main: string; secondary: string };

/**
 * `/tournaments/{id}`: puesto y mazo de las primeras `hasta` filas.
 *
 * Se leen `data-rank` y `data-deck`, y los sprites de la celda del mazo. La
 * fila trae también `data-name` y el enlace al jugador: **no se capturan**.
 */
export function parseCabezaResultados(html: string, hasta = 16): PuestoMazo[] {
  const out: PuestoMazo[] = [];
  const re = /<tr\s+data-rank="(\d+)"[^>]*data-deck="([^"]*)"[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const placement = Number(m[1]);
    if (!placement || placement > hasta) {
      if (placement > hasta) break;
      continue;
    }
    // Solo la celda del mazo: la que enlaza a /decks/.
    const celda = /<a href="\/decks\/[^"]*">([\s\S]*?)<\/a>/.exec(m[3])?.[1] ?? "";
    const s = spritesDe(celda);
    out.push({
      placement,
      name: decodeHtml(m[2]) || nombreDeSprites(s),
      main: s[0] ?? "",
      secondary: s[1] ?? "",
    });
  }
  return out;
}

/* ----------------------------------------------------- City Leagues -- */

export type CityLeague = { id: string; date: string; prefecture: string };

/** `/tournaments/jp`: la lista de City Leagues de Japón. `data-winner` y la tienda no se guardan. */
export function parseListaCityLeagues(html: string): CityLeague[] {
  const out: CityLeague[] = [];
  const re = /<tr\s+data-date="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const abre = html.slice(m.index, html.indexOf(">", m.index + 4) + 1);
    const id = /\/tournaments\/jp\/(\d+)/.exec(m[2])?.[1];
    if (!id) continue;
    out.push({ id, date: m[1], prefecture: attr(abre, "data-city") ?? "" });
  }
  return out;
}

/**
 * `/tournaments/jp/{id}`: puesto y sprites. La columna del jugador (un nick en
 * japonés con enlace) se salta: solo se mira la celda que enlaza a la lista.
 */
export function parseCityLeague(html: string): PuestoMazo[] {
  const out: PuestoMazo[] = [];
  const tabla = html.slice(html.indexOf("<table"), html.indexOf("</table>") + 8);
  const re = /<tr>\s*<td>(\d+)<\/td>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tabla))) {
    const celda = /<a href="[^"]*\/decks\/list\/jp\/[^"]*"><span>([\s\S]*?)<\/span><\/a>/.exec(m[2])?.[1] ?? "";
    const s = spritesDe(celda);
    if (!s.length) continue;
    out.push({ placement: Number(m[1]), name: nombreDeSprites(s), main: s[0], secondary: s[1] ?? "" });
  }
  return out;
}

/* ---------------------------------------------- de estadística a filas -- */

/**
 * Junta la estadística (recuento) y la cabeza (puestos) sin contar dos veces.
 *
 * Las listas del top cut ya están dentro del recuento de la estadística. Para
 * que `meta_entries` sume bien, cada puesto va como fila con `placement` y a
 * la fila de resumen de su mazo se le resta una.
 */
export function filasParaGuardar(
  stats: FilaEstadistica[], cabeza: PuestoMazo[],
): Array<{ placement: number | null; copies: number; name: string; main: string; secondary: string }> {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const restantes = new Map(stats.map((f) => [norm(f.name), { ...f }]));
  const out: Array<{ placement: number | null; copies: number; name: string; main: string; secondary: string }> = [];
  for (const c of cabeza) {
    const r = restantes.get(norm(c.name));
    if (r && r.count > 0) r.count -= 1;
    out.push({ placement: c.placement, copies: 1, name: c.name, main: c.main, secondary: c.secondary });
  }
  for (const r of restantes.values()) {
    if (r.count > 0) out.push({ placement: null, copies: r.count, name: r.name, main: r.main, secondary: r.secondary });
  }
  return out;
}
