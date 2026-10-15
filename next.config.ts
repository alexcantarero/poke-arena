import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* v0.35 — el id del despliegue, para el service worker. Se registra como
     `/sw.js?v=<id>`: al cambiar la URL, el navegador se baja el worker nuevo
     en vez de servir el viejo desde su propia caché HTTP. En Vercel sale del
     commit; en local, de la hora del build. */
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? String(Date.now()),
  },
  images: {
    // Sprites de arquetipo servidos por Limitless.
    remotePatterns: [{ protocol: "https", hostname: "r2.limitlesstcg.net" }],
  },
};

export default nextConfig;
