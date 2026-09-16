/* =========================================================================
   pokemontcg.io — datos de carta.

   LÉEME ANTES DE APOYARTE EN ESTO
   -------------------------------
   Esta API está **deprecada**. Comprobado el 16/09/2026 en su propia
   documentación: no admite altas de clave nuevas, y las claves que ya existen
   dejan de funcionar el **1 de marzo de 2027**. Su sucesora, Scrydex, es de
   pago por créditos.

   O sea que esto tiene fecha de caducidad conocida, y por eso está montado
   como está:

   · **Nada de la app depende de que responda.** Sirve para enriquecer —el
     nombre en condiciones de una carta, su imagen, su rareza—, y cuando falla
     se devuelve null y la pantalla enseña lo que ya tenía.
   · **Las imágenes de las listas NO salen de aquí.** Salen del CDN de
     Limitless, construyendo la URL con el set y el número que ya vienen en la
     lista pegada (`src/lib/cards.ts`). Eso no gasta cuota ni caduca.
   · Sin clave el límite es 1.000 peticiones al día y 30 por minuto, así que
     todo va cacheado un día entero.

   El día que muera, el reemplazo natural es **TCGdex** (gratis, sin clave,
   con español). Cambiar de una a otra es reescribir este fichero y nada más:
   el resto de la app solo conoce los tipos de aquí abajo.
   ========================================================================= */

import "server-only";

const API = "https://api.pokemontcg.io/v2";
const DAY = 60 * 60 * 24;

/** Una carta, con lo poco que nos interesa de ella. */
export type CardInfo = {
  id: string;
  name: string;
  /** Abreviatura del set tal y como la escribe la gente: "TWM". */
  setCode: string;
  setName: string;
  number: string;
  rarity: string | null;
  images: { small: string | null; large: string | null };
};

type RawCard = {
  id?: string;
  name?: string;
  number?: string;
  rarity?: string;
  set?: { id?: string; name?: string; ptcgoCode?: string };
  images?: { small?: string; large?: string };
};

function toCard(raw: RawCard): CardInfo | null {
  if (!raw?.id || !raw.name) return null;
  return {
    id: raw.id,
    name: raw.name,
    // `ptcgoCode` es la abreviatura que se escribe en las listas ("TWM"); el
    // `set.id` es el interno de la API ("sv6"). Nos interesa la primera.
    setCode: raw.set?.ptcgoCode ?? "",
    setName: raw.set?.name ?? "",
    number: raw.number ?? "",
    rarity: raw.rarity ?? null,
    images: { small: raw.images?.small ?? null, large: raw.images?.large ?? null },
  };
}

async function get<T>(path: string): Promise<T | null> {
  const key = process.env.POKEMONTCG_API_KEY;
  try {
    const res = await fetch(`${API}${path}`, {
      headers: {
        accept: "application/json",
        ...(key ? { "X-Api-Key": key } : {}),
      },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: DAY },
    } as RequestInit);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // Que esto falle nunca puede tumbar una pantalla: es un adorno.
    return null;
  }
}

/** Busca cartas por nombre. Devuelve [] si la API no responde. */
export async function searchCards(query: string, limit = 12): Promise<CardInfo[]> {
  const q = query.trim();
  if (!q) return [];
  // Las comillas son parte de la sintaxis de búsqueda de la API, así que se
  // quitan del texto de la persona para no romper la consulta.
  const safe = q.replace(/["\\]/g, " ").slice(0, 60);
  const data = await get<{ data?: RawCard[] }>(
    `/cards?q=${encodeURIComponent(`name:"${safe}"`)}&pageSize=${limit}&orderBy=-set.releaseDate`,
  );
  return (data?.data ?? []).map(toCard).filter((c): c is CardInfo => c !== null);
}

/** Una carta por su id ("swsh2-91"). */
export async function getCard(id: string): Promise<CardInfo | null> {
  if (!id.trim()) return null;
  const data = await get<{ data?: RawCard }>(`/cards/${encodeURIComponent(id.trim())}`);
  return data?.data ? toCard(data.data) : null;
}

/**
 * Busca una carta concreta por abreviatura de set y número, que es lo que
 * traen las listas pegadas ("Dragapult ex TWM 130").
 */
export async function findBySetAndNumber(setCode: string, number: string): Promise<CardInfo | null> {
  const s = setCode.trim().toUpperCase();
  const n = number.trim();
  if (!s || !n) return null;
  const data = await get<{ data?: RawCard[] }>(
    `/cards?q=${encodeURIComponent(`set.ptcgoCode:${s} number:${n}`)}&pageSize=1`,
  );
  const first = data?.data?.[0];
  return first ? toCard(first) : null;
}

/** ¿Hay clave configurada? Solo para poder decirlo en Ajustes. */
export const hasPokemonTcgKey = () => Boolean(process.env.POKEMONTCG_API_KEY);
