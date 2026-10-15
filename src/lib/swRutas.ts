/* =========================================================================
   Qué puede guardar el service worker, y qué no.

   Sin imports: lo cargan los tests y también el propio `sw.js`, que no pasa
   por el empaquetador. Por eso las funciones de aquí se duplican tal cual
   dentro de `public/sw.js` — están probadas aquí y copiadas allí, y el test
   `sw-copia` comprueba que las dos versiones no se han separado.

   LA REGLA QUE IMPORTA
   --------------------
   Un service worker mal puesto sirve una versión vieja de la app después de
   desplegar: tú ves lo nuevo, tus amigos ven lo viejo y nadie entiende por
   qué. De todos los fallos posibles, ese es el más difícil de diagnosticar
   desde el móvil de otro. Así que:

   · **Nada de HTML en caché.** Las páginas van siempre a la red. Si no hay
     red, sale la página de sin conexión. La app no finge estar actualizada.
   · **Solo se cachea lo inmutable.** Los ficheros de `/_next/static/` llevan
     un hash en el nombre: si cambia el contenido, cambia la URL. Guardarlos
     para siempre no puede servir nada viejo, porque la URL vieja ya no la
     pide nadie.
   · **Nada con sesión dentro.** Ninguna respuesta de `/api/` se guarda: ahí
     van datos de la liga detrás del login y no tienen por qué quedarse en el
     disco del teléfono.
   ========================================================================= */

/** Qué hacer con una petición. */
export type Estrategia =
  /** Caché primero, y si no está, red. Solo para ficheros con hash. */
  | "inmutable"
  /** Red primero; si falla y es una navegación, la página de sin conexión. */
  | "red"
  /** Ni se toca: el service worker se aparta. */
  | "ignorar";

const INMUTABLES = ["/_next/static/", "/logos/"];
const NUNCA = ["/api/", "/_next/image", "/_vercel/"];

/**
 * Decide la estrategia de una petición.
 *
 * @param metodo  Método HTTP. Solo GET entra en caché; cualquier otra cosa
 *                es una escritura y no se toca jamás.
 * @param url     URL absoluta de la petición.
 * @param origen  Origen de la propia app, para no meternos con terceros.
 */
export function estrategiaDe(metodo: string, url: string, origen: string): Estrategia {
  if (metodo !== "GET") return "ignorar";

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "ignorar";
  }

  // Los sprites de Limitless, las fuentes de Google: de otro origen. Que se
  // encargue el navegador con sus propias cabeceras de caché.
  if (u.origin !== origen) return "ignorar";

  if (NUNCA.some((p) => u.pathname.startsWith(p))) return "ignorar";
  if (INMUTABLES.some((p) => u.pathname.startsWith(p))) return "inmutable";

  // Iconos y manifiesto: cambian poco y no llevan hash, así que van por red
  // como todo lo demás. No merece la pena arriesgarse por tres ficheros.
  return "red";
}

/** ¿Es una navegación a una página? Decide si toca el fallback sin conexión. */
export function esNavegacion(modo: string, destino: string): boolean {
  return modo === "navigate" || destino === "document";
}

/**
 * El nombre de la caché para una versión del despliegue.
 *
 * Lleva el id del build dentro a propósito: al desplegar, el nombre cambia,
 * la caché vieja deja de coincidir y se borra entera en el `activate`. Es lo
 * que garantiza que no queden restos de la versión anterior.
 */
export function nombreDeCache(buildId: string): string {
  return `pokearena-${buildId || "dev"}`;
}

/** ¿Hay que borrar esta caché al activar la versión nueva? */
export function cacheObsoleta(nombre: string, actual: string): boolean {
  return nombre.startsWith("pokearena-") && nombre !== actual;
}
