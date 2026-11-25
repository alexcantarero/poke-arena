import type { MetadataRoute } from "next";

/* v0.135 — Lo que puede leer Google: la portada (entrar), el alta y lo legal.
   Lo demás es de la liga y está tras el inicio de sesión: ni se indexa ni se
   pide. Las páginas privadas llevan además `noindex` (layout raíz). */
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  return {
    rules: [{ userAgent: "*", allow: ["/entrar", "/registro", "/privacidad", "/condiciones"], disallow: ["/"] }],
    ...(base ? { sitemap: `${base}/sitemap.xml`, host: base } : {}),
  };
}
