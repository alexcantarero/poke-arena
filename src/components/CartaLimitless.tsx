"use client";

import { useState } from "react";
import { urlCartaLimitless, type CartaLista } from "@/lib/listasLimitless";

/* v0.51 — una carta de la lista, con su imagen si carga. La imagen viene de un
   CDN de terceros sin contrato: si no carga, se queda la línea de texto, que
   ya dice todo lo que importa (cantidad, nombre, set y número). */
export function CartaLimitless({ c }: { c: CartaLista }) {
  const [rota, setRota] = useState(false);
  const url = urlCartaLimitless(c);
  return (
    <figure className="flex min-w-0 flex-col gap-1">
      {url && !rota ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={c.name} loading="lazy" onError={() => setRota(true)}
          className="aspect-[63/88] w-full rounded-md bg-surface-2 object-cover" />
      ) : (
        <div className="grid aspect-[63/88] w-full place-items-center rounded-md bg-surface-2 p-1 text-center text-[10px] text-muted">{c.name}</div>
      )}
      <figcaption className="truncate text-[11px] tabular"><b>{c.count}×</b> {c.name}</figcaption>
    </figure>
  );
}
