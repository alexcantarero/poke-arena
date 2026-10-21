"use client";

import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/i18n";
import { TERMINOS, type TerminoId } from "@/lib/glosario";

/* v0.56 — un término con su explicación: subrayado de puntos; en el PC la
   definición sale al pasar el ratón, y un toque (en el móvil, que no tiene
   «pasar el ratón») lleva a su entrada del glosario. */
export function Termino({ id, children }: { id: TerminoId; children: React.ReactNode }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const t = TERMINOS.find((x) => x.id === id);
  return (
    <Link href={`/glosario#${id}`} title={t ? tr(lng, t.def) : undefined}
      className="underline decoration-dotted decoration-1 underline-offset-2 hover:text-info">
      {children}
    </Link>
  );
}
