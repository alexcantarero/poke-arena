"use client";

import { urlDeObjeto, type UsoObjeto } from "@/lib/objetos";

/* v0.63 — Un objeto de Pokémon pequeño, de adorno. Decorativo de verdad: va
   con `alt=""` y, si el sprite no carga, desaparece en vez de dejar una
   imagen rota. Ver `lib/objetos.ts` para qué objeto va en cada sitio. */
export function ObjetoSprite({ uso, className = "size-6" }: { uso: UsoObjeto; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={urlDeObjeto(uso)} alt="" aria-hidden="true" width={30} height={30}
      loading="lazy" decoding="async"
      className={`objeto-sprite flex-none ${className}`}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
}
