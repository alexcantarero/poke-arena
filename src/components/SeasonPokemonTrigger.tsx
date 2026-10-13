import type { ReactNode } from "react";
import { spriteUrl } from "@/lib/pokemon";
import { pokemonDeEstacion } from "@/lib/pokemonEstacion";
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
  const tema = estacion.evento === "halloween" ? "Halloween" : estacion.nombre.toLowerCase();
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
