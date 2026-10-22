"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { pokemonAleatorio } from "@/lib/pokemonEstacion";

type Pokemon = { slug: string; src: string };
type Burst = { id: number; x: number; y: number; abajo: boolean; pokemon: Pokemon };

const VIDA_MS = 2300;

export function SeasonPokemonButton({
  children,
  className,
  label,
  pokemon,
}: {
  children: ReactNode;
  className: string;
  label: string;
  pokemon: Pokemon[];
}) {
  const [burst, setBurst] = useState<Burst | null>(null);
  const nextId = useRef(0);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const activate = (event: MouseEvent<HTMLButtonElement>) => {
    if (pokemon.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (timer.current !== null) window.clearTimeout(timer.current);
    const seleccionado = pokemonAleatorio(pokemon);
    if (!seleccionado) return;
    setBurst({
      id: ++nextId.current,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      // v0.58 — si el botón está arriba del todo (la cabecera del móvil), el
      // Pokémon sale HACIA ABAJO: subiendo se iba fuera de la pantalla.
      abajo: rect.top < 140,
      pokemon: seleccionado,
    });
    timer.current = window.setTimeout(() => {
      setBurst(null);
      timer.current = null;
    }, VIDA_MS);
  };

  return (
    <>
      <button
        type="button"
        className={`cursor-pointer ${className}`}
        aria-label={label}
        title={label}
        onClick={activate}
      >
        {children}
      </button>
      {burst && (
        <div key={burst.id} className="season-pokemon-burst" aria-hidden="true">
          <img
            className={`season-pokemon-sprite${burst.abajo ? " hacia-abajo" : ""}`}
            style={{ left: `${burst.x - 32}px`, top: `${burst.abajo ? burst.y + 8 : burst.y - 32}px` } as CSSProperties}
            src={burst.pokemon.src}
            alt=""
          />
        </div>
      )}
    </>
  );
}
