import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

/* v0.50 — la versión, leída del package.json EN EL BUILD. Antes la etiqueta
   usaba `process.env.npm_package_version`, que solo existe mientras corre npm:
   en el servidor de Vercel podía faltar, y entonces enseñaba un «0.27.0» escrito
   a mano. Con una versión que miente no se puede saber qué despliega cada rama. */
const version = JSON.parse(readFileSync("./package.json", "utf8")).version as string;

const nextConfig: NextConfig = {
  /* v0.35 — el id del despliegue, para el service worker. Se registra como
     `/sw.js?v=<id>`: al cambiar la URL, el navegador se baja el worker nuevo
     en vez de servir el viejo desde su propia caché HTTP. En Vercel sale del
     commit; en local, de la hora del build. */
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? String(Date.now()),
    NEXT_PUBLIC_APP_VERSION: version,
    // v0.50 — de qué rama y commit sale ESTE despliegue, y si es producción o una
    // vista previa. Vercel los rellena solo; en local quedan vacíos.
    NEXT_PUBLIC_GIT_REF: process.env.VERCEL_GIT_COMMIT_REF ?? "",
    NEXT_PUBLIC_GIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "",
    NEXT_PUBLIC_DEPLOY_ENV: process.env.VERCEL_ENV ?? "local",
  },
  images: {
    // Sprites de arquetipo servidos por Limitless.
    remotePatterns: [{ protocol: "https", hostname: "r2.limitlesstcg.net" }],
  },
};

export default nextConfig;
