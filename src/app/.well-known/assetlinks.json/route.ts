import { NextResponse } from "next/server";

/* =========================================================================
   GET /.well-known/assetlinks.json — v0.70.

   Lo que pide Android para que la app de Google Play (una TWA: la web envuelta
   tal cual) se abra a pantalla completa, sin la barra de direcciones. Une el
   paquete de la app con este dominio. Ver `docs/11-app-android.md`.

   Se rellena con dos variables de Vercel, para no tocar código el día que se
   genere la app:
     · ANDROID_TWA_PACKAGE — el paquete (p. ej. «app.vercel.poke_arena_sand.twa»)
     · ANDROID_TWA_SHA256  — la huella SHA-256 del certificado de firma. Si hay
       varias (la de subida y la de Google Play), separadas por comas.
   Sin ellas devuelve una lista vacía: válido y sin efecto.
   ========================================================================= */

export const dynamic = "force-dynamic";

export function GET() {
  const paquete = process.env.ANDROID_TWA_PACKAGE?.trim();
  const huellas = (process.env.ANDROID_TWA_SHA256 ?? "").split(",").map((h) => h.trim().toUpperCase()).filter((h) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(h));
  const cuerpo = paquete && huellas.length
    ? [{
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: paquete, sha256_cert_fingerprints: huellas },
      }]
    : [];
  return NextResponse.json(cuerpo, { headers: { "cache-control": "public, max-age=3600" } });
}
