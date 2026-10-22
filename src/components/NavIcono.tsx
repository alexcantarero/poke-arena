"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { leerRef, urlDeObjeto } from "@/lib/objetos";
import { spriteUrl } from "@/lib/pokemon";

/* v0.64 — El icono de una sección del menú: un objeto o un Pokémon (sprites
   enlazados, como los de toda la app), y si no carga, el icono de línea de
   siempre. Nunca una imagen rota.

   Un sprite no cambia de color con el tema, así que la sección activa se
   distingue por la pastilla de fondo y porque las demás van un poco
   apagadas (`data-on`, en globals.css). */
export function NavIcono({
  sprite, icon, activo = false, className = "size-5",
}: { sprite?: string; icon: string; activo?: boolean; className?: string }) {
  const [fallo, setFallo] = useState(false);
  const ref = sprite ? leerRef(sprite) : null;
  if (!ref || fallo) return <Icon name={icon} className={className} />;
  const src = ref.tipo === "objeto" ? urlDeObjeto(ref.slug) : spriteUrl(ref.slug);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src} alt="" aria-hidden="true" width={32} height={32} decoding="async"
      data-on={activo ? "true" : "false"} data-tipo={ref.tipo}
      className={`nav-sprite flex-none object-contain ${className}`}
      onError={() => setFallo(true)}
    />
  );
}
