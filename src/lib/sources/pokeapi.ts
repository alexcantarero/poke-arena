/* =========================================================================
   PokéAPI — para saber de qué color va cada arquetipo.

   Limitless da el nombre y el sprite de un mazo, pero no su tipo de energía,
   así que todos los arquetipos importados entraban como «incoloro» y había
   que repasarlos a mano uno a uno. Esto lo resuelve: se pregunta a PokéAPI el
   tipo del Pokémon principal y se traduce al tipo del TCG.

   La traducción no es uno a uno, porque el juego de cartas agrupa: Bicho va
   con Planta, Fantasma con Psíquico, Veneno con Oscuro, Tierra y Roca con
   Lucha. Esa tabla es lo único que hay aquí que sea una decisión y no un dato.

   Sin clave, gratis y estable. Pide que caches en lugar de martillear, y eso
   se hace: se consulta una vez por Pokémon nuevo y nunca por arquetipo que ya
   tenga tipo puesto.
   ========================================================================= */

import "server-only";
import type { EnergyType } from "../pokemon";

const API = "https://pokeapi.co/api/v2";

/**
 * De los dieciocho tipos del videojuego a los once del TCG.
 * Lo que no está en la tabla es incoloro: normal, volador y hada moderna.
 */
const TO_TCG: Record<string, EnergyType> = {
  grass: "grass",
  bug: "grass",
  fire: "fire",
  water: "water",
  ice: "water",
  electric: "lightning",
  psychic: "psychic",
  ghost: "psychic",
  fighting: "fighting",
  ground: "fighting",
  rock: "fighting",
  dark: "darkness",
  poison: "darkness",
  steel: "metal",
  dragon: "dragon",
  fairy: "fairy",
};

/**
 * El slug de Limitless no siempre es el nombre que entiende PokéAPI: las
 * formas van con sufijo ("excadrill-mega", "ogerpon-wellspring") y PokéAPI
 * quiere el Pokémon base o un nombre de forma distinto. Probamos el slug
 * entero y, si no cuela, el primer trozo.
 */
function candidates(slug: string): string[] {
  const clean = slug.trim().toLowerCase();
  if (!clean) return [];
  const base = clean.split("-")[0];
  return base && base !== clean ? [clean, base] : [clean];
}

/** Tipo de energía del Pokémon, o null si PokéAPI no lo conoce. */
export async function energyTypeOf(slug: string): Promise<EnergyType | null> {
  for (const candidate of candidates(slug)) {
    try {
      const res = await fetch(`${API}/pokemon/${encodeURIComponent(candidate)}`, {
        headers: { accept: "application/json" },
        // Un servidor lento no puede colgar la sincronización entera.
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 60 * 60 * 24 * 30 },
      } as RequestInit);
      if (!res.ok) continue;
      const data = (await res.json()) as { types?: Array<{ type?: { name?: string } }> };
      const names = (data.types ?? []).map((t) => t.type?.name ?? "").filter(Boolean);
      for (const n of names) {
        const tcg = TO_TCG[n];
        if (tcg) return tcg;
      }
      // Lo conoce, pero todos sus tipos caen en incoloro (normal, volador).
      if (names.length) return "colorless";
    } catch {
      // Un fallo de red no es motivo para parar la sincronización entera.
    }
  }
  return null;
}

/**
 * Tipos de varios Pokémon, de tres en tres.
 *
 * En serie, sesenta arquetipos son sesenta viajes de ida y vuelta; de golpe,
 * es martillear a un servicio gratuito. Tres a la vez es el punto medio que
 * tarda poco y no molesta a nadie.
 */
export async function energyTypesOf(slugs: string[], batch = 3): Promise<Map<string, EnergyType>> {
  const out = new Map<string, EnergyType>();
  const unique = [...new Set(slugs.filter(Boolean))];

  for (let i = 0; i < unique.length; i += batch) {
    const chunk = unique.slice(i, i + batch);
    const types = await Promise.all(chunk.map((s) => energyTypeOf(s)));
    chunk.forEach((s, k) => {
      const t = types[k];
      if (t) out.set(s, t);
    });
  }
  return out;
}
