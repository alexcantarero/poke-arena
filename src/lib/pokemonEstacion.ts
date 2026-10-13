import type { Estacion } from "./estacion";

export type PokemonEstacional = {
  slug: string;
  nombre: string;
  tipo: "bicho" | "planta" | "hada" | "agua" | "fuego" | "electrico" | "fantasma" | "hielo";
};

const POR_ESTACION: Record<Estacion["id"], PokemonEstacional[]> = {
  primavera: [
    { slug: "butterfree", nombre: "Butterfree", tipo: "bicho" },
    { slug: "florges", nombre: "Florges", tipo: "hada" },
    { slug: "leafeon", nombre: "Leafeon", tipo: "planta" },
    { slug: "combee", nombre: "Combee", tipo: "bicho" },
  ],
  verano: [
    { slug: "lapras", nombre: "Lapras", tipo: "agua" },
    { slug: "arcanine", nombre: "Arcanine", tipo: "fuego" },
    { slug: "pikachu", nombre: "Pikachu", tipo: "electrico" },
    { slug: "psyduck", nombre: "Psyduck", tipo: "agua" },
  ],
  otono: [
    { slug: "gastly", nombre: "Gastly", tipo: "fantasma" },
    { slug: "haunter", nombre: "Haunter", tipo: "fantasma" },
    { slug: "gengar", nombre: "Gengar", tipo: "fantasma" },
    { slug: "phantump", nombre: "Phantump", tipo: "fantasma" },
    { slug: "mimikyu", nombre: "Mimikyu", tipo: "fantasma" },
  ],
  invierno: [
    { slug: "snorunt", nombre: "Snorunt", tipo: "hielo" },
    { slug: "glaceon", nombre: "Glaceon", tipo: "hielo" },
    { slug: "delibird", nombre: "Delibird", tipo: "hielo" },
    { slug: "cubchoo", nombre: "Cubchoo", tipo: "hielo" },
  ],
};

const HALLOWEEN: PokemonEstacional[] = [
  { slug: "gastly", nombre: "Gastly", tipo: "fantasma" },
  { slug: "haunter", nombre: "Haunter", tipo: "fantasma" },
  { slug: "gengar", nombre: "Gengar", tipo: "fantasma" },
  { slug: "mimikyu", nombre: "Mimikyu", tipo: "fantasma" },
  { slug: "pumpkaboo", nombre: "Pumpkaboo", tipo: "fantasma" },
  { slug: "chandelure", nombre: "Chandelure", tipo: "fantasma" },
];

export function pokemonDeEstacion(estacion: Pick<Estacion, "id" | "evento">): PokemonEstacional[] {
  return estacion.evento === "halloween" ? HALLOWEEN : POR_ESTACION[estacion.id];
}
