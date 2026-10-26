import { NextResponse } from "next/server";

/* =========================================================================
   GET /api/version — v0.69.

   Qué versión está desplegada AHORA. Lo pregunta `AvisoVersion` al volver a
   la app: una app instalada en el móvil (sobre todo en iPhone) no se recarga
   al abrirla, se «despierta» con el código que tenía en memoria, y puede
   llevar días en una versión vieja sin que nadie lo note.

   Sin sesión a propósito y sin datos: solo el número de versión y el id del
   despliegue, que ya salen en el pie de la barra. Nunca en caché.
   ========================================================================= */

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev", build: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
