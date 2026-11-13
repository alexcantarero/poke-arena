"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

/* v0.124 — El icono de Discord en vez de la palabra, en el pie de la barra.

   El logotipo es de Discord: no se redibuja aquí. Se usa SU fichero oficial,
   guardado como `public/logos/discord.svg` (ver IMPLEMENTAR-v0.124.0.md). Si
   el fichero no está (o no carga), se queda lo de antes —el globo y la
   palabra—, así que nunca sale una imagen rota. El nombre accesible lo pone
   el enlace (`aria-label`), por eso la imagen va con `alt` vacío. */
export function DiscordMarca({ etiqueta }: { etiqueta: string }) {
  const [hay, setHay] = useState(true);
  const img = useRef<HTMLImageElement>(null);
  // Si la imagen falló antes de hidratar, `onError` ya no salta: se mira aquí.
  useEffect(() => {
    const i = img.current;
    if (i && i.complete && i.naturalWidth === 0) setHay(false);
  }, []);
  if (!hay) {
    return (
      <>
        <Icon name="globe" className="size-4" />
        <span className="barra-texto">{etiqueta}</span>
      </>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={img} src="/logos/discord.svg" alt="" width={22} height={22} className="discord-marca" onError={() => setHay(false)} />
  );
}
