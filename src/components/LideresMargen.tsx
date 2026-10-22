"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { lideresDe } from "@/lib/lideres";
import { spriteUrl } from "@/lib/pokemon";

/* v0.58 — Los líderes de la pestaña en los márgenes vacíos, a izquierda y
   derecha del contenido. Solo en pantallas MUY anchas (donde de verdad sobra
   sitio), decorativos (aria-hidden, sin capturar toques), y si un sprite no
   carga, ese lado no se pinta. */
function Lider({ slug, lado }: { slug: string; lado: "izq" | "der" }) {
  const [roto, setRoto] = useState(false);
  if (roto) return null;
  return (
    <div className={`lider lider-${lado}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={slug} src={spriteUrl(slug)} alt="" onError={() => setRoto(true)} className="lider-img" />
      <span className="lider-peana" />
    </div>
  );
}

export function LideresMargen() {
  const ruta = usePathname();
  const [izq, der] = lideresDe(ruta);
  return (
    <>
      <Lider key={`i-${izq}`} slug={izq} lado="izq" />
      <Lider key={`d-${der}`} slug={der} lado="der" />
    </>
  );
}
