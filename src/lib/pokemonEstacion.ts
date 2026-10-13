import type { Estacion } from "./estacion";

export type PokemonEstacional = {
  slug: string;
  nombre: string;
  tipo: "bicho" | "planta" | "hada" | "agua" | "fuego" | "electrico" | "fantasma" | "hielo" | "normal";
};

export type EventoPokemon = {
  nombre: string;
  fecha: { mes: number; dia: number };
  pokemon: PokemonEstacional[];
};

export const eventos: Record<"diaPokemon" | "sanValentin" | "halloween" | "navidad", EventoPokemon> = {
  diaPokemon: {
    nombre: "Día de Pokémon",
    fecha: { mes: 2, dia: 27 },
    pokemon: [
      { slug: "pikachu", nombre: "Pikachu", tipo: "electrico" },
      { slug: "pichu", nombre: "Pichu", tipo: "electrico" },
      { slug: "raichu", nombre: "Raichu", tipo: "electrico" },
      { slug: "eevee", nombre: "Eevee", tipo: "normal" },
      { slug: "bulbasaur", nombre: "Bulbasaur", tipo: "planta" },
      { slug: "charmander", nombre: "Charmander", tipo: "fuego" },
      { slug: "squirtle", nombre: "Squirtle", tipo: "agua" },
    ],
  },
  sanValentin: {
    nombre: "San Valentín",
    fecha: { mes: 2, dia: 14 },
    pokemon: [
      { slug: "eevee", nombre: "Eevee", tipo: "normal" },
      { slug: "clefairy", nombre: "Clefairy", tipo: "hada" },
      { slug: "togepi", nombre: "Togepi", tipo: "hada" },
      { slug: "sylveon", nombre: "Sylveon", tipo: "hada" },
      { slug: "luvdisc", nombre: "Luvdisc", tipo: "agua" },
      { slug: "alomomola", nombre: "Alomomola", tipo: "agua" },
      { slug: "jigglypuff", nombre: "Jigglypuff", tipo: "hada" },
    ],
  },
  halloween: {
    nombre: "Halloween",
    fecha: { mes: 10, dia: 31 },
    pokemon: [
      { slug: "gastly", nombre: "Gastly", tipo: "fantasma" },
      { slug: "haunter", nombre: "Haunter", tipo: "fantasma" },
      { slug: "gengar", nombre: "Gengar", tipo: "fantasma" },
      { slug: "mimikyu", nombre: "Mimikyu", tipo: "fantasma" },
      { slug: "mega gengar", nombre: "Mega Gengar", tipo: "fantasma" },
      { slug: "pumpkaboo", nombre: "Pumpkaboo", tipo: "fantasma" },
      { slug: "dusknoir", nombre: "Dusknoir", tipo: "fantasma" },
      { slug: "dhelmise", nombre: "Dhelmise", tipo: "fantasma" },
      { slug: "chandelure", nombre: "Chandelure", tipo: "fantasma" },
      { slug: "phantump", nombre: "Phantump", tipo: "fantasma" },
      { slug: "mismagius", nombre: "Mismagius", tipo: "fantasma" },
      { slug: "Marowak de Alola", nombre: "Marowak de Alola", tipo: "fantasma" },
      { slug: "Marshadow", nombre: "Marshadow", tipo: "fantasma" },
    ],
  },
  navidad: {
    nombre: "Navidad",
    fecha: { mes: 12, dia: 25 },
    pokemon: [
      { slug: "delibird", nombre: "Delibird", tipo: "hielo" },
      { slug: "snorlax", nombre: "Snorlax", tipo: "normal" },
      { slug: "jigglypuff", nombre: "Jigglypuff", tipo: "hada" },
      { slug: "snover", nombre: "Snover", tipo: "hielo" },
      { slug: "abomasnow", nombre: "Abomasnow", tipo: "hielo" },
      { slug: "cubchoo", nombre: "Cubchoo", tipo: "hielo" },
      { slug: "stantler", nombre: "Stantler", tipo: "normal" },
      { slug: "spheal", nombre: "Spheal", tipo: "hielo" },
    ],
  },
};

const POR_ESTACION: Record<Estacion["id"], PokemonEstacional[]> = {
  primavera: [
    { slug: "butterfree", nombre: "Butterfree", tipo: "bicho" },
    { slug: "florges", nombre: "Florges", tipo: "hada" },
    { slug: "leafeon", nombre: "Leafeon", tipo: "planta" },
    { slug: "combee", nombre: "Combee", tipo: "bicho" },
    { slug: "beedrill", nombre: "Beedrill", tipo: "bicho" },
    { slug: "sprigatito", nombre: "Sprigatito", tipo: "planta" },
    { slug: "flabebe", nombre: "Flabébé", tipo: "hada" },
    { slug: "cherrim", nombre: "Cherrim", tipo: "planta" },
    { slug: "shaymin", nombre: "Shaymin", tipo: "planta" },
    { slug: "cutiefly", nombre: "Cutiefly", tipo: "hada" },
    { slug: "skiddo", nombre: "Skiddo", tipo: "planta" },

  ],
  verano: [
    { slug: "lapras", nombre: "Lapras", tipo: "agua" },
    { slug: "arcanine", nombre: "Arcanine", tipo: "fuego" },
    { slug: "pikachu", nombre: "Pikachu", tipo: "electrico" },
    { slug: "psyduck", nombre: "Psyduck", tipo: "agua" },
    { slug: "snorlax", nombre: "Snorlax", tipo: "normal" },
    { slug: "Jellicent", nombre: "Jellicent", tipo: "agua" },
    { slug: "slowpoke", nombre: "Slowpoke", tipo: "agua" },
    { slug: "kyogre", nombre: "Kyogre", tipo: "agua" },
    { slug: "groudon", nombre: "Groudon", tipo: "agua" },
    { slug: "magikarp", nombre: "Magikarp", tipo: "agua" },
    { slug: "vaporeon", nombre: "Vaporeon", tipo: "agua" },
    { slug: "wailord", nombre: "Wailord", tipo: "agua" },
    { slug: "charizard", nombre: "Charizard", tipo: "fuego" },



  ],
  otono: [
        { slug: "gastly", nombre: "Gastly", tipo: "fantasma" },
        { slug: "haunter", nombre: "Haunter", tipo: "fantasma" },
        { slug: "gengar", nombre: "Gengar", tipo: "fantasma" },
        { slug: "phantump", nombre: "Phantump", tipo: "fantasma" },
        { slug: "mimikyu", nombre: "Mimikyu", tipo: "fantasma" },
        { slug: "sinistcha", nombre: "Sinistcha", tipo: "fantasma" },
        { slug: "misdreavus", nombre: "Misdreavus", tipo: "fantasma" },
        { slug: "mismagius", nombre: "Mismagius", tipo: "fantasma" },
        { slug: "shuppet", nombre: "Shuppet", tipo: "fantasma" },
        { slug: "banette", nombre: "Banette", tipo: "fantasma" },
        { slug: "duskull", nombre: "Duskull", tipo: "fantasma" },
        { slug: "dusclops", nombre: "Dusclops", tipo: "fantasma" },
        { slug: "drifloon", nombre: "Drifloon", tipo: "fantasma" },
        { slug: "drifblim", nombre: "Drifblim", tipo: "fantasma" },
        { slug: "yamask", nombre: "Yamask", tipo: "fantasma" },
        { slug: "cofagrigus", nombre: "Cofagrigus", tipo: "fantasma" },

  ],
  invierno: [
    { slug: "snorunt", nombre: "Snorunt", tipo: "hielo" },
    { slug: "kyurem", nombre: "Kyurem", tipo: "hielo" },
    { slug: "Glalie", nombre: "Glalie", tipo: "hielo" },
    { slug: "articuno", nombre: "Articuno", tipo: "hielo" },
    { slug: "glaceon", nombre: "Glaceon", tipo: "hielo" },
    { slug: "delibird", nombre: "Delibird", tipo: "hielo" },
    { slug: "cubchoo", nombre: "Cubchoo", tipo: "hielo" },
    { slug: "froslass", nombre: "Froslass", tipo: "hielo" },
    { slug: "mega froslass", nombre: "Mega Froslass", tipo: "hielo" },
    { slug: "Vulpix de Alola", nombre: "Vulpix de Alola", tipo: "hielo" },
    { slug: "snover", nombre: "Snover", tipo: "hielo" },
    { slug: "abomasnow", nombre: "Abomasnow", tipo: "hielo" },



  ],
};

export function pokemonDeEstacion(estacion: Pick<Estacion, "id" | "evento">): PokemonEstacional[] {
  if (
    estacion.evento === "diaPokemon"
    || estacion.evento === "sanValentin"
    || estacion.evento === "halloween"
    || estacion.evento === "navidad"
  ) return eventos[estacion.evento].pokemon;
  return POR_ESTACION[estacion.id];
}

export function pokemonAleatorio<T>(pokemon: readonly T[], azar: () => number = Math.random): T | null {
  if (pokemon.length === 0) return null;
  const indice = Math.min(pokemon.length - 1, Math.floor(azar() * pokemon.length));
  return pokemon[indice] ?? null;
}
