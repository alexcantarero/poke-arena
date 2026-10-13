import "server-only";
import { setIdDeCarta, urlDeImagen, consultaLimpia, type Carta } from "@/lib/cartas";

/* =========================================================================
   TCGdex — catálogo de cartas.

   Sustituye a pokemontcg.io, que está deprecada y cuyas claves mueren el 1
   de marzo de 2027. TCGdex es gratis, abierta y **no pide clave**; sus FAQ
   dicen que no hay límite de peticiones publicado y piden usarla con
   cabeza, que es justo lo que hacen el antirrebote del componente y el
   `revalidate` de aquí abajo.

   Por qué REST y no GraphQL
   -------------------------
   La primera versión de este fichero montaba la consulta GraphQL
   concatenando el texto tecleado dentro del documento de la consulta. Con
   un filtro de comillas delante, pero concatenando. Eso es construir código
   con datos del usuario, y es la clase de cosa que se arregla una vez y no
   se vuelve a dejar: aquí los parámetros viajan en el querystring, y
   `URLSearchParams` los escapa solo.

   Lo que se pierde a cambio: la lista de resultados de REST (`CardBrief`)
   no trae la rareza. La línea de decklist no la necesita —basta nombre, set
   y número—, así que sale `null` y la pantalla simplemente no la enseña.

   Cómo filtra TCGdex
   ------------------
   `?name=pikachu` es un filtro de **contiene**, que es exactamente lo que
   quiere un buscador. Los prefijos `eq:`, `neq:`, `not:`… cambian el
   operador, por eso `consultaLimpia()` quita los dos puntos.
   ========================================================================= */

/** `en` y no `es`: los códigos de set y los nombres de carta de una decklist
 *  de Pokémon TCG Live van en inglés, y una línea en español no se importa.
 *  TCGdex sirve `es` en la misma ruta si algún día se quiere para mostrar. */
const IDIOMA = "en";
const API = `https://api.tcgdex.net/v2/${IDIOMA}`;

const HORA = 60 * 60;
const DIA = HORA * 24;

export type CardInfo = Carta;

type CardBrief = { id: string; localId?: string; name: string; image?: string };
type SetBrief = { id: string; name: string; abbreviation?: { official?: string } };

async function pedir<T>(ruta: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(`${API}${ruta}`, {
      headers: { "User-Agent": "PokeArena-TCG (liga privada)" },
      signal: AbortSignal.timeout(6000),
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Los sets, por id, para traducir `sv08` a `TWM` y a «Twilight Masquerade».
 *
 * Se piden una vez por semana: la lista cambia cuando sale una expansión, o
 * sea tres o cuatro veces al año. Si falla, se devuelve un mapa vacío y las
 * cartas salen con el id del set en vez de la abreviatura; feo pero usable,
 * y desde luego mejor que no enseñar nada.
 */
async function mapaDeSets(): Promise<Map<string, SetBrief>> {
  const sets = await pedir<SetBrief[]>("/sets", DIA * 7);
  return new Map((sets ?? []).map((s) => [s.id, s]));
}

/**
 * Busca cartas por nombre.
 *
 * Nunca lanza: si la API no contesta, devuelve lista vacía. Esto es un
 * adorno del editor de mazos y que se caiga no puede impedir guardar nada.
 */
export async function searchCards(query: string, limit = 12): Promise<CardInfo[]> {
  const q = consultaLimpia(query);
  if (!q) return [];

  const params = new URLSearchParams({
    name: q,
    "pagination:page": "1",
    "pagination:itemsPerPage": String(Math.min(Math.max(1, Math.floor(limit)), 50)),
  });

  const [cards, sets] = await Promise.all([
    pedir<CardBrief[]>(`/cards?${params}`, DIA),
    mapaDeSets(),
  ]);
  if (!cards?.length) return [];

  return cards.map((c) => {
    const localId = c.localId ?? "";
    const setId = setIdDeCarta(c.id, localId);
    const set = sets.get(setId);
    return {
      id: c.id,
      name: c.name,
      setCode: set?.abbreviation?.official || setId,
      setName: set?.name ?? "",
      number: localId,
      // La lista de resultados de REST no trae rareza (ver cabecera).
      rarity: null,
      images: {
        small: urlDeImagen(c.image, "low"),
        large: urlDeImagen(c.image, "high"),
      },
    };
  });
}

/**
 * TCGdex no usa claves de API. Se deja como función y no como constante
 * para que la pantalla de Ajustes pueda seguir preguntando «¿esta fuente
 * necesita que configure algo?» sin saber de quién se trata.
 */
export const FUENTE_DE_CARTAS = {
  nombre: "TCGdex",
  url: "https://tcgdex.dev",
  requiereClave: false,
} as const;
