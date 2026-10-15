/* =========================================================================
   Service worker de PokeArena TCG — v0.35.

   Las funciones de decisión son COPIA LITERAL de `src/lib/swRutas.ts`, que
   es donde están probadas. Este fichero no pasa por el empaquetador (lo
   sirve `public/` tal cual), así que no puede importarlas. El test
   `tests/swRutas.test.ts` comprueba que las dos copias siguen diciendo lo
   mismo; si tocas una, toca la otra.

   QUÉ HACE Y QUÉ NO
   -----------------
   · Guarda SOLO ficheros con hash en el nombre (`/_next/static/`, `/logos/`).
     Esos no pueden quedarse viejos: si cambia el contenido, cambia la URL.
   · Las páginas van SIEMPRE a la red. Nada de HTML en caché. Si no hay red,
     sale `/sin-conexion`.
   · Nada de `/api/`: ahí van datos de la liga detrás del login.
   · `skipWaiting` + `clients.claim`: al desplegar, la versión nueva toma el
     control en cuanto se cierra la pestaña, sin quedarse esperando.

   SI ALGO VA MAL: en Ajustes hay un botón «Desactivar modo sin conexión»,
   que lo da de baja y borra sus cachés. Es la salida de emergencia.
   ========================================================================= */

/* El id del despliegue viaja en la URL con la que se registra el worker
   (`/sw.js?v=<build>`). Cambiar esa URL es lo que hace que el navegador se
   baje el worker nuevo: si el fichero se llamara siempre igual, podría
   servirse desde su propia caché HTTP y quedarse clavado días. */
const BUILD_ID = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = `pokearena-${BUILD_ID}`;
const SIN_CONEXION = "/sin-conexion";

const INMUTABLES = ["/_next/static/", "/logos/"];
const NUNCA = ["/api/", "/_next/image", "/_vercel/"];

function estrategiaDe(metodo, url, origen) {
  if (metodo !== "GET") return "ignorar";
  let u;
  try { u = new URL(url); } catch { return "ignorar"; }
  if (u.origin !== origen) return "ignorar";
  if (NUNCA.some((p) => u.pathname.startsWith(p))) return "ignorar";
  if (INMUTABLES.some((p) => u.pathname.startsWith(p))) return "inmutable";
  return "red";
}

function esNavegacion(modo, destino) {
  return modo === "navigate" || destino === "document";
}

function cacheObsoleta(nombre, actual) {
  return nombre.startsWith("pokearena-") && nombre !== actual;
}

self.addEventListener("install", (e) => {
  // Solo la página de sin conexión. Nada más se precarga: precargar rutas
  // reales sería guardar HTML, que es justo lo que no queremos.
  e.waitUntil(caches.open(CACHE).then((c) => c.add(SIN_CONEXION)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(
        nombres.filter((n) => cacheObsoleta(n, CACHE)).map((n) => caches.delete(n)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (e) => {
  // La salida de emergencia: el botón de Ajustes manda esto.
  if (e.data === "desactivar") {
    e.waitUntil(
      caches.keys()
        .then((ns) => Promise.all(ns.filter((n) => n.startsWith("pokearena-")).map((n) => caches.delete(n))))
        .then(() => self.registration.unregister()),
    );
  }
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const estrategia = estrategiaDe(req.method, req.url, self.location.origin);

  if (estrategia === "ignorar") return;

  if (estrategia === "inmutable") {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        // Solo se guarda una respuesta completa y correcta. Un 206 o un
        // error en caché serían peores que no tener nada.
        if (res.ok && res.status === 200) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      })),
    );
    return;
  }

  // "red": siempre a la red. Sin red y navegando → página de sin conexión.
  if (esNavegacion(req.mode, req.destination)) {
    e.respondWith(
      fetch(req).catch(() => caches.match(SIN_CONEXION).then((r) => r || Response.error())),
    );
  }
});
