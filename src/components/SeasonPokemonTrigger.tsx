import type { ReactNode } from "react";
import { spriteUrl } from "@/lib/pokemon";
import { eventos, pokemonDeEstacion } from "@/lib/pokemonEstacion";
import type { Estacion } from "@/lib/estacion";
import { SeasonPokemonButton } from "./SeasonPokemonButton";

export function SeasonPokemonTrigger({
  children,
  className,
  estacion,
}: {
  children: ReactNode;
  className: string;
  estacion: Estacion;
}) {
  const evento = estacion.evento;
  const tema = evento === "diaPokemon" || evento === "sanValentin" || evento === "halloween" || evento === "navidad"
    ? eventos[evento].nombre
    : estacion.nombre.toLowerCase();
  const pokemon = pokemonDeEstacion(estacion).map((p) => ({
    slug: p.slug,
    src: spriteUrl(p.slug),
  }));

  return (
    <SeasonPokemonButton
      className={className}
      label={`Mostrar Pokémon de ${tema}`}
      pokemon={pokemon}
    >
      {children}
    </SeasonPokemonButton>
  );
}
