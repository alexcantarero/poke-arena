/** Los once tipos de energía del TCG, con el color con el que se pintan. */
export const TYPES = {
  grass: { name: "Planta", color: "#63bd5a" },
  fire: { name: "Fuego", color: "#f0803c" },
  water: { name: "Agua", color: "#4aa8e8" },
  lightning: { name: "Rayo", color: "#f2cd3a" },
  psychic: { name: "Psíquico", color: "#b271c9" },
  fighting: { name: "Lucha", color: "#c96a3c" },
  darkness: { name: "Oscuro", color: "#5c6b80" },
  metal: { name: "Metal", color: "#9aa6b4" },
  dragon: { name: "Dragón", color: "#c8a94a" },
  fairy: { name: "Hada", color: "#e987b8" },
  colorless: { name: "Incoloro", color: "#cfc9be" },
} as const;

export type EnergyType = keyof typeof TYPES;
export const TYPE_KEYS = Object.keys(TYPES) as EnergyType[];

export function typeOf(t: string | null | undefined) {
  return TYPES[(t || "colorless") as EnergyType] ?? TYPES.colorless;
}

/**
 * Sprite del Pokémon. Limitless sirve los iconos que usa en su propio
 * metagame en esta ruta; el slug es el nombre en minúsculas con guiones
 * ("raging-bolt", "excadrill-mega").
 */
export function spriteUrl(slug: string) {
  return `https://r2.limitlesstcg.net/pokemon/gen9/${pokeSlug(slug)}.png`;
}

/**
 * Convierte lo que escribe una persona en el slug que usa Limitless para sus
 * sprites. Limitless nombra el Pokémon base, con la forma como sufijo:
 *
 *   "Mega Excadrill ex"      -> excadrill-mega
 *   "N's Zoroark ex"         -> zoroark
 *   "Ogerpon Wellspring ex"  -> ogerpon-wellspring
 *   "Raging Bolt ex"         -> raging-bolt
 *
 * Si ya le pasas un slug ("excadrill-mega") lo deja como está.
 */
export function pokeSlug(name: string) {
  let s = (name || "").trim();
  if (!s) return "";

  // Prefijos de personaje: "N's Zoroark", "Lillie's Clefairy", "Rocket's Mewtwo"…
  s = s.replace(/^(?:team\s+)?[a-zà-ÿ'’.]+(?:'s|’s)\s+/i, "");

  // "Mega X" -> "X mega" (así lo nombra Limitless)
  const mega = /^mega[\s-]+/i.test(s);
  if (mega) s = s.replace(/^mega[\s-]+/i, "");

  // Sufijos de rareza: no forman parte del nombre del Pokémon.
  s = s.replace(/[\s-]+(ex|v|vmax|vstar|gx|tag\s*team)$/i, "");

  s = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’.]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (mega && !s.endsWith("-mega")) s = `${s}-mega`;
  return s;
}

export function prettyPokemon(slug: string) {
  return (slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Catálogo de arranque, tomado del metagame Standard de Limitless. */
export const SEED_ARCHETYPES: Array<{
  name: string; main: string; secondary: string; type: EnergyType;
}> = [
  { name: "Dragapult ex", main: "dragapult", secondary: "", type: "psychic" },
  { name: "Ogerpon Box", main: "ogerpon", secondary: "ogerpon-wellspring", type: "grass" },
  { name: "Alakazam Mano Poderosa", main: "alakazam", secondary: "dudunsparce", type: "psychic" },
  { name: "Zoroark ex de N", main: "zoroark", secondary: "", type: "darkness" },
  { name: "Slowking Busca Inspiración", main: "slowking", secondary: "", type: "water" },
  { name: "Crustle Roca Misteriosa", main: "crustle", secondary: "", type: "fighting" },
  { name: "Mega Excadrill ex", main: "excadrill-mega", secondary: "", type: "metal" },
  { name: "Festival Lead", main: "dipplin", secondary: "thwackey", type: "grass" },
  { name: "Mega Lucario ex", main: "lucario-mega", secondary: "", type: "fighting" },
  { name: "Clefairy ex de Lillie", main: "clefairy", secondary: "", type: "psychic" },
  { name: "Mega Lopunny ex", main: "lopunny-mega", secondary: "", type: "colorless" },
  { name: "Raging Bolt ex", main: "raging-bolt", secondary: "ogerpon", type: "dragon" },
  { name: "Hydrapple ex", main: "hydrapple", secondary: "", type: "grass" },
  { name: "Dhelmise Esconderse", main: "dhelmise", secondary: "banette", type: "grass" },
  { name: "Toxtricity Oleada Siniestra", main: "toxtricity", secondary: "", type: "lightning" },
  { name: "Mega Sharpedo ex", main: "sharpedo-mega", secondary: "", type: "darkness" },
  { name: "Mewtwo ex del Team Rocket", main: "mewtwo", secondary: "spidops", type: "psychic" },
  { name: "Mega Venusaur ex", main: "venusaur-mega", secondary: "", type: "grass" },
  { name: "Mega Kangaskhan ex", main: "kangaskhan-mega", secondary: "", type: "colorless" },
  { name: "Mega Chandelure ex", main: "chandelure-mega", secondary: "", type: "fire" },
];
