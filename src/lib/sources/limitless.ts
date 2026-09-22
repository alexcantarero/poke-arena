/* =========================================================================
   Limitless TCG — de dónde salen los mazos del metagame.

   Es la única fuente que hace falta para el catálogo de arquetipos, y la
   única que está viva, es gratis y no prohíbe el uso programático.

   EL PROBLEMA Y CÓMO SE RESUELVE
   ------------------------------
   El endpoint bonito —`/api/games/PTCG/decks`, que devuelve el catálogo
   maestro con las reglas de clasificación— **pide clave**, y las claves solo
   se conceden a proyectos públicos. Una liga privada no lo es, así que dar por
   hecho que algún día llegará es tener el catálogo roto para siempre. Eso es
   exactamente lo que pasaba: por eso faltaba Grimmsnarl.

   La vuelta: `/api/tournaments` y `/api/tournaments/{id}/standings` responden
   **sin clave**, y cada fila de una clasificación trae el arquetipo ya
   identificado por ellos —`deck.id`, `deck.name` y `deck.icons`—. Recorriendo
   los torneos recientes y agrupando sale el catálogo, y además con el número
   de apariciones, que es el share real del metagame. Se mantiene solo.

   Si algún día hay clave, `fetchDeckCatalog` usa el endpoint oficial y se
   acabó; la función existe y se intenta primero.

   LO QUE NO SE HACE
   -----------------
   No se raspa RK9.gg. Sus condiciones prohíben expresamente la extracción
   automatizada «con o sin fines comerciales», así que no hay excusa de
   proyecto personal que valga. No está ni como respaldo.

   Este módulo es solo de servidor. No lo importes desde un componente
   cliente: las llamadas irían con CORS de por medio y sin caché.
   ========================================================================= */

import "server-only";

const API = "https://play.limitlesstcg.com/api";

/** Cuánto se guarda una respuesta. El metagame no cambia en una hora. */
const CACHE_SECONDS = 60 * 60 * 6;

export type LimitlessTournament = {
  id: string;
  name: string;
  date: string;
  format: string;
  players: number;
  organizerId?: number;
};

export type LimitlessDeckRef = {
  id: string;
  name: string;
  icons?: string[];
};

export type LimitlessStanding = {
  player?: string;
  name?: string;
  placing?: number;
  deck?: LimitlessDeckRef | null;
  record?: { wins: number; losses: number; ties: number };
};

/** Un arquetipo deducido del metagame, listo para meter en `archetypes`. */
export type MetaArchetype = {
  /** Slug de Limitless: "dragapult-blaziken". */
  identifier: string;
  name: string;
  main: string;
  secondary: string;
  /** En cuántas listas ha aparecido en la ventana mirada. */
  count: number;
};

export type SyncOptions = {
  /** Cuántos torneos recientes mirar. Más torneos, más cola del metagame. */
  tournaments?: number;
  /** Ignorar torneos con menos gente que esto: quita el ruido de los de 4. */
  minPlayers?: number;
  format?: string;
  /** Clave de Limitless, si algún día la hay. */
  apiKey?: string;
  /** Para ir contando por pantalla desde el script. */
  onProgress?: (done: number, total: number) => void;
};

class LimitlessError extends Error {
  constructor(public status: number, public url: string) {
    super(`Limitless respondió ${status} a ${url}`);
    this.name = "LimitlessError";
  }
}

/** Un servidor lento no puede colgar la petición entera. */
const TIMEOUT_MS = 8000;

async function get<T>(path: string, apiKey?: string): Promise<T> {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      ...(apiKey ? { "X-Access-Key": apiKey } : {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    // `next.revalidate` lo entiende Next; en el script suelto se ignora sin más.
    next: { revalidate: CACHE_SECONDS },
  } as RequestInit);
  if (!res.ok) throw new LimitlessError(res.status, url);
  return (await res.json()) as T;
}

/** Torneos recientes, del más nuevo al más viejo. */
export async function fetchTournaments(
  { limit = 25, format = "STANDARD", apiKey }: { limit?: number; format?: string; apiKey?: string } = {},
): Promise<LimitlessTournament[]> {
  const rows = await get<LimitlessTournament[]>(
    `/tournaments?game=PTCG&format=${encodeURIComponent(format)}&limit=${limit}`,
    apiKey,
  );
  return Array.isArray(rows) ? rows : [];
}

/** Clasificación de un torneo, con el mazo de cada jugador ya identificado. */
export async function fetchStandings(id: string, apiKey?: string): Promise<LimitlessStanding[]> {
  const rows = await get<LimitlessStanding[]>(`/tournaments/${encodeURIComponent(id)}/standings`, apiKey);
  return Array.isArray(rows) ? rows : [];
}

/**
 * El catálogo oficial de arquetipos. Solo funciona con clave.
 * Devuelve null si no la hay o si la rechazan, para poder caer al plan B.
 */
export async function fetchDeckCatalog(apiKey?: string): Promise<MetaArchetype[] | null> {
  if (!apiKey) return null;
  try {
    const rows = await get<Array<{ identifier: string; name: string; icons?: string[]; generation?: number }>>(
      "/games/PTCG/decks", apiKey,
    );
    return rows
      .filter((d) => (d.generation ?? 9) >= 9)
      .map((d) => ({
        identifier: d.identifier,
        name: d.name,
        main: d.icons?.[0] ?? "",
        secondary: d.icons?.[1] ?? "",
        count: 0,
      }))
      .filter((d) => d.main);
  } catch {
    return null;
  }
}

/**
 * El catálogo deducido de los torneos recientes.
 *
 * Un arquetipo aparece tantas veces como listas lo hayan jugado, así que
 * `count` sirve para ordenar por relevancia y para saber qué es meta de verdad
 * y qué es una rareza que alguien llevó un martes.
 *
 * Los fallos de un torneo suelto no tumban la sincronización: si una
 * clasificación no responde, se salta y se sigue. Con veinticinco torneos,
 * perder uno no cambia el resultado.
 */
export async function buildMetaCatalog(opts: SyncOptions = {}): Promise<MetaArchetype[]> {
  const { tournaments = 25, minPlayers = 16, format = "STANDARD", apiKey, onProgress } = opts;

  const list = (await fetchTournaments({ limit: tournaments, format, apiKey }))
    .filter((t) => (t.players ?? 0) >= minPlayers);

  const found = new Map<string, MetaArchetype>();

  /* De cuatro en cuatro. En serie, cuarenta torneos son cuarenta viajes
     encadenados y esto corre dentro de una función serverless con límite de
     tiempo; de golpe, es martillear a un servicio gratuito que además no
     publica sus límites. `allSettled` porque el fallo de un torneo suelto no
     debe tumbar la sincronización: con veinte, perder uno no cambia nada. */
  const BATCH = 4;
  let done = 0;

  for (let i = 0; i < list.length; i += BATCH) {
    const chunk = list.slice(i, i + BATCH);
    const settled = await Promise.allSettled(chunk.map((t) => fetchStandings(t.id, apiKey)));
    done += chunk.length;
    onProgress?.(Math.min(done, list.length), list.length);

    const standings = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

    for (const row of standings) {
      const deck = row.deck;
      if (!deck?.id || !deck.name) continue;
      const icons = Array.isArray(deck.icons) ? deck.icons : [];
      const main = icons[0] ?? "";
      if (!main) continue;

      const prev = found.get(deck.id);
      if (prev) prev.count++;
      else {
        found.set(deck.id, {
          identifier: deck.id,
          name: deck.name,
          main,
          secondary: icons[1] ?? "",
          count: 1,
        });
      }
    }
  }

  return [...found.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * El catálogo, por el mejor camino disponible.
 * Con clave usa el endpoint oficial; sin ella, deduce del metagame.
 */
export async function fetchArchetypeCatalog(opts: SyncOptions = {}): Promise<{
  source: "catalog" | "meta";
  archetypes: MetaArchetype[];
}> {
  const official = await fetchDeckCatalog(opts.apiKey);
  if (official?.length) return { source: "catalog", archetypes: official };
  return { source: "meta", archetypes: await buildMetaCatalog(opts) };
}

/* =========================================================================
   El metagame mundial, para poder comparar.

   Hasta ahora de Limitless solo se sacaba el catálogo de nombres. Esto saca
   además **cómo le va a cada mazo**: cuánto se juega y cuánto gana. Es lo que
   permite poner al lado «en tu liga Dragapult gana el 61%» y «en el mundo,
   el 54%», que es la comparación que de verdad dice algo — si tu porcentaje
   con un mazo se despega mucho del global, o lo estás jugando muy bien, o te
   estás cruzando con rivales que no saben la matchup.

   Un aviso sobre lo que NO se puede hacer: **la API no filtra por país.** El
   documento del que salió esto daba por hecho un `?country=ES`; está
   comprobado que ese parámetro se ignora en silencio y devuelve el listado
   mundial igual. Así que esto es meta mundial y la interfaz lo dice; fingir
   un filtro que no filtra sería peor que no tenerlo.
   ========================================================================= */

/** Cómo le va a un arquetipo en el metagame mundial. */
export type MetaRow = {
  identifier: string;
  name: string;
  main: string;
  secondary: string;
  /** Listas contadas. */
  entries: number;
  /** Cuota: qué parte de todas las listas es este mazo (0–1). */
  share: number;
  wins: number;
  losses: number;
  ties: number;
  /** % de victorias, contando el empate como media victoria. 0–1. */
  winRate: number | null;
  /** Puesto medio, para distinguir «se juega mucho» de «se gana mucho». */
  avgPlacement: number | null;

  /* --- añadido en la v0.8.0, para la pantalla de Top Decks ---
     Salen del mismo recorrido que lo de arriba, sin una llamada más: la
     clasificación ya trae el puesto de cada lista, así que contarlos es
     gratis. La cuota dice cuánto se juega un mazo y el %V cuánto gana de
     media; esto dice si además **cierra** torneos, que no es lo mismo. */

  /** Listas que acabaron entre las cuatro primeras. */
  top4: number;
  /** Listas que acabaron entre las ocho primeras. */
  top8: number;
  /** Veces que ganó el torneo. */
  firsts: number;
  /** El mejor resultado de la ventana mirada. */
  best: { tournament: string; date: string; placing: number } | null;
};

/** Qué parte de las listas de ese mazo llegó al top 4. 0–1, o null sin datos. */
export const top4Rate = (r: Pick<MetaRow, "entries" | "top4">): number | null =>
  r.entries ? r.top4 / r.entries : null;

export type MetaSnapshot = {
  rows: MetaRow[];
  /** Torneos de los que sale. */
  tournaments: number;
  /** Listas contadas en total. */
  entries: number;
  /** Ventana mirada, en días. */
  days: number;
  format: string;
  /** Cuándo se calculó, para poder decir «hace 2 h». */
  fetchedAt: string;
  /** Lo que no ha respondido. Si es alto, la foto está coja y hay que decirlo. */
  failed: number;
};

export type MetaOptions = {
  /** Ventana en días hacia atrás. */
  days?: number;
  /** Cuántos torneos mirar como mucho. */
  limit?: number;
  minPlayers?: number;
  format?: string;
  apiKey?: string;
};

/**
 * Foto del metagame mundial de los últimos días.
 *
 * Se recorre en tandas por lo mismo de siempre: en serie son demasiados
 * viajes encadenados para una función serverless, y de golpe es martillear a
 * un servicio gratuito. Los torneos que no responden se cuentan en `failed`
 * en vez de tumbar la llamada — con veinte torneos, perder uno no cambia la
 * foto, pero perder quince sí, y por eso el número se enseña.
 */
export async function fetchMetaSnapshot(opts: MetaOptions = {}): Promise<MetaSnapshot> {
  const { days = 30, limit = 20, minPlayers = 16, format = "STANDARD", apiKey } = opts;

  const desde = Date.now() - days * 86400000;
  const list = (await fetchTournaments({ limit, format, apiKey }))
    .filter((t) => (t.players ?? 0) >= minPlayers)
    .filter((t) => {
      const d = Date.parse(t.date);
      return Number.isFinite(d) ? d >= desde : true;
    });

  const acc = new Map<string, MetaRow & { placements: number[] }>();
  /** Nombre y fecha de cada torneo, para poder decir de dónde sale el mejor puesto. */
  const porId = new Map(list.map((t) => [t.id, t]));
  let entries = 0;
  let failed = 0;

  const BATCH = 4;
  for (let i = 0; i < list.length; i += BATCH) {
    const chunk = list.slice(i, i + BATCH);
    const settled = await Promise.allSettled(chunk.map((t) => fetchStandings(t.id, apiKey)));
    failed += settled.filter((r) => r.status === "rejected").length;

    // `allSettled` conserva el orden, así que el índice empareja cada
    // resultado con su torneo. Hace falta para saber de qué evento sale un
    // puesto sin pedir nada más.
    settled.forEach((res, k) => {
      if (res.status !== "fulfilled") return;
      const torneo = porId.get(chunk[k].id);
      for (const row of res.value) {
        const deck = row.deck;
        if (!deck?.id || !deck.name) continue;
        const icons = Array.isArray(deck.icons) ? deck.icons : [];
        const main = icons[0] ?? "";
        if (!main) continue;

        entries++;
        let cur = acc.get(deck.id);
        if (!cur) {
          cur = {
            identifier: deck.id, name: deck.name, main, secondary: icons[1] ?? "",
            entries: 0, share: 0, wins: 0, losses: 0, ties: 0,
            winRate: null, avgPlacement: null, placements: [],
            top4: 0, top8: 0, firsts: 0, best: null,
          };
          acc.set(deck.id, cur);
        }
        cur.entries++;
        cur.wins += row.record?.wins ?? 0;
        cur.losses += row.record?.losses ?? 0;
        cur.ties += row.record?.ties ?? 0;
        const puesto = row.placing;
        if (typeof puesto === "number" && puesto > 0) {
          cur.placements.push(puesto);
          if (puesto <= 8) cur.top8++;
          if (puesto <= 4) cur.top4++;
          if (puesto === 1) cur.firsts++;
          if (torneo && (!cur.best || puesto < cur.best.placing)) {
            cur.best = { tournament: torneo.name, date: torneo.date, placing: puesto };
          }
        }
      }
    });
  }

  const rows: MetaRow[] = [...acc.values()].map((r) => {
    const jugadas = r.wins + r.losses + r.ties;
    const { placements, ...rest } = r;
    return {
      ...rest,
      share: entries ? r.entries / entries : 0,
      // El empate cuenta media victoria, igual que en el ranking de la liga.
      winRate: jugadas ? (r.wins + r.ties / 2) / jugadas : null,
      avgPlacement: placements.length
        ? placements.reduce((a, b) => a + b, 0) / placements.length
        : null,
    };
  });

  rows.sort((a, b) => b.share - a.share || a.name.localeCompare(b.name));

  return {
    rows,
    tournaments: list.length,
    entries,
    days,
    format,
    fetchedAt: new Date().toISOString(),
    failed,
  };
}
