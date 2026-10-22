"use client";

import { useState, type ReactNode } from "react";

/* v0.58 — El sprite del Sustituto para «Other». Lo que se pedía desde la
   v0.11: Limitless no lo tiene (404), así que sale del repositorio de sprites
   de Pokémon Showdown, que sí lo publica. Si algún día no cargara, se pinta el
   respaldo (`fallback`): el marcador de cartas apiladas de siempre, nunca una
   imagen rota. */
export const URL_SUSTITUTO = "https://play.pokemonshowdown.com/sprites/substitutes/gen5/substitute.png";

export function SustitutoImg({ className, fallback, titulo }: { className: string; fallback: ReactNode; titulo: string }) {
  const [roto, setRoto] = useState(false);
  if (roto) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={URL_SUSTITUTO} alt={titulo} title={titulo} onError={() => setRoto(true)}
      /* v0.61 — ampliado: el dibujo de Showdown trae mucho margen transparente y salía
         diminuto al lado de los demás sprites. */
      className={`inline-block flex-none scale-[1.7] object-contain [image-rendering:pixelated] ${className}`} />
  );
}
