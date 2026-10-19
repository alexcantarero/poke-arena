/* =========================================================================
   Las mejores listas de un arquetipo, sacadas de la API de Limitless.

   Sin imports, como el resto de módulos que se prueban.

   v0.51. `GET /tournaments/{id}/standings` devuelve el puesto, el récord, el
   mazo y, si el torneo pedía listas, la lista. Comprobado en su
   documentación oficial: el campo existe. Pero su FORMATO viene marcado como
   «específico de cada juego» y no está documentado para Pokémon, así que no
   se supone: `normalizarLista` acepta la forma esperada (secciones con
   cantidad, nombre, set y número) y si llega cualquier otra cosa devuelve
   null, y la pantalla dice «lista no disponible» en vez de romperse.

   PRIVACIDAD, la regla de siempre: la API trae el nombre de cada jugador.
   Aquí NO se lee. Lo que sale de este módulo no tiene ningún campo de nombre.
   ========================================================================= */

export type CartaLista = { count: number; name: string; set: string | null; number: string | null };
export type Lista = { pokemon: CartaLista[]; trainer: CartaLista[]; energy: CartaLista[] };

export type ResultadoConLista = {
  torneoId: string;
  torneo: string;
  fecha: string;
  jugadores: number;
  puesto: number;
  record: { wins: number; losses: number; ties: number } | null;
  lista: Lista | null;
};

const SECCIONES = ["pokemon", "trainer", "energy"] as const;

function carta(x: unknown): CartaLista | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const count = Number(o.count);
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!Number.isFinite(count) || count <= 0 || !name) return null;
  const set = typeof o.set === "string" && o.set ? o.set : null;
  const number = o.number == null || o.number === "" ? null : String(o.number);
  return { count, name, set, number };
}

/** Una lista con la forma esperada, o null si llega cualquier otra cosa. */
export function normalizarLista(d: unknown): Lista | null {
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, unknown>;
  const out: Lista = { pokemon: [], trainer: [], energy: [] };
  let alguna = false;
  for (const sec of SECCIONES) {
    const v = o[sec];
    if (!Array.isArray(v)) continue;
    for (const x of v) {
      const c = carta(x);
      if (c) { out[sec].push(c); alguna = true; }
    }
  }
  return alguna ? out : null;
}

/** Cuántas cartas tiene una lista: 60 si está completa. */
export const totalCartas = (l: Lista) =>
  SECCIONES.reduce((s, sec) => s + l[sec].reduce((a, c) => a + c.count, 0), 0);

type Clasif = { placing?: number | null; record?: { wins: number; losses: number; ties: number } | null; deck?: { id?: string } | null; decklist?: unknown };
type Torneo = { id: string; name: string; date: string; players?: number | null };

/**
 * Las `n` mejores actuaciones de un arquetipo: mejor puesto primero, y a igual
 * puesto, el torneo más grande. Se prefieren las que traen lista; las que no,
 * entran detrás, porque un buen puesto sin lista también dice algo.
 */
export function mejoresListas(
  porTorneo: ReadonlyArray<{ torneo: Torneo; clasificacion: readonly Clasif[] }>,
  deckId: string,
  n = 10,
): ResultadoConLista[] {
  const out: ResultadoConLista[] = [];
  for (const { torneo, clasificacion } of porTorneo) {
    for (const c of clasificacion) {
      if (c.deck?.id !== deckId || !c.placing) continue;
      out.push({
        torneoId: torneo.id, torneo: torneo.name, fecha: torneo.date, jugadores: torneo.players ?? 0,
        puesto: c.placing, record: c.record ?? null, lista: normalizarLista(c.decklist),
      });
    }
  }
  return out
    .sort((a, b) => Number(!a.lista) - Number(!b.lista) || a.puesto - b.puesto || b.jugadores - a.jugadores)
    .slice(0, n);
}

/**
 * La imagen de una carta en el CDN de Limitless (`tpci/<SET>/<SET>_<NNN>_R_EN_SM.png`).
 *
 * Es un patrón de URL de un tercero, no un contrato: se comprobó vivo en la
 * v0.4, pero puede cambiar. Por eso quien la pinta tiene que tener plan B (el
 * texto de la línea) si la imagen no carga. Sin set o sin número, null.
 */
export function urlCartaLimitless(c: Pick<CartaLista, "set" | "number">): string | null {
  if (!c.set || !c.number || !/^[A-Za-z0-9]+$/.test(c.set) || !/^\d+$/.test(c.number)) return null;
  const set = c.set.toUpperCase();
  return `https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/${set}/${set}_${c.number.padStart(3, "0")}_R_EN_SM.png`;
}
