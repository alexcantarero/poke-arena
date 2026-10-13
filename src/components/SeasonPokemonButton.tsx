"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";

type Pokemon = { slug: string; src: string };
type Burst = { id: number; x: number; y: number };

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
    const rect = event.currentTarget.getBoundingClientRect();
    if (timer.current !== null) window.clearTimeout(timer.current);
    setBurst({ id: ++nextId.current, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
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
          {pokemon.map((p, i) => {
            const x = Math.max(12, Math.min(window.innerWidth - 76, burst.x + ((i % 3) - 1) * 82 + Math.floor(i / 3) * 18));
            const y = Math.max(24, Math.min(window.innerHeight - 76, burst.y + Math.floor(i / 3) * 48 - 20));
            const style = {
              left: `${x}px`,
              top: `${y}px`,
              animationDelay: `${(i % 4) * 70}ms`,
            } as CSSProperties;
            return <img key={p.slug} className="season-pokemon-sprite" style={style} src={p.src} alt="" />;
          })}
        </div>
      )}
    </>
  );
}
