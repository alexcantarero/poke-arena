import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cacheObsoleta, esNavegacion, estrategiaDe, nombreDeCache } from "../src/lib/swRutas.ts";

const O = "https://arena.example";

/* Lo que protege este fichero es la regla de oro del service worker: que no
   pueda servir una versión vieja de la app. Todo lo que no lleve hash en el
   nombre tiene que ir a la red, siempre. */

test("el HTML NUNCA se cachea: las páginas van siempre a la red", () => {
  for (const ruta of ["/", "/ranking", "/torneos/abc", "/estadisticas?ambito=league"]) {
    assert.equal(estrategiaDe("GET", `${O}${ruta}`, O), "red", ruta);
  }
});

test("solo se cachea lo que lleva hash en el nombre", () => {
  assert.equal(estrategiaDe("GET", `${O}/_next/static/chunks/main-abc123.js`, O), "inmutable");
  assert.equal(estrategiaDe("GET", `${O}/logos/regional.svg`, O), "inmutable");
});

test("nada de /api/: ahí van datos de la liga detrás del login", () => {
  assert.equal(estrategiaDe("GET", `${O}/api/cards?q=dragapult`, O), "ignorar");
  assert.equal(estrategiaDe("GET", `${O}/api/stats`, O), "ignorar");
  assert.equal(estrategiaDe("GET", `${O}/_next/image?url=x`, O), "ignorar");
});

test("solo GET: una escritura jamás pasa por el service worker", () => {
  for (const m of ["POST", "PUT", "DELETE", "PATCH"]) {
    assert.equal(estrategiaDe(m, `${O}/_next/static/x-abc.js`, O), "ignorar", m);
  }
});

test("otros orígenes se dejan en paz", () => {
  // Los sprites de Limitless y las fuentes de Google tienen sus propias
  // cabeceras de caché; no somos nadie para pisarlas.
  assert.equal(estrategiaDe("GET", "https://r2.limitlesstcg.net/pokemon/gen9/x.png", O), "ignorar");
  assert.equal(estrategiaDe("GET", "https://fonts.gstatic.com/x.woff2", O), "ignorar");
});

test("una URL rota no revienta el worker", () => {
  assert.equal(estrategiaDe("GET", "no-es-una-url", O), "ignorar");
});

test("esNavegacion distingue una página de un recurso", () => {
  assert.equal(esNavegacion("navigate", ""), true);
  assert.equal(esNavegacion("cors", "document"), true);
  assert.equal(esNavegacion("cors", "script"), false);
});

test("la caché lleva el id del despliegue, y la vieja se borra", () => {
  const actual = nombreDeCache("abc123");
  assert.equal(actual, "pokearena-abc123");
  assert.equal(cacheObsoleta("pokearena-viejo", actual), true);
  assert.equal(cacheObsoleta(actual, actual), false);
  // Una caché de otra app no se toca.
  assert.equal(cacheObsoleta("otra-cosa", actual), false);
});

/* ------------------------------------------------------------------------
   El test que de verdad hace falta: `public/sw.js` no pasa por el
   empaquetador, así que no puede importar el módulo de arriba y tiene una
   copia literal de estas funciones. Dos copias es una invitación a que se
   separen y a que lo probado y lo que corre dejen de ser lo mismo.
   ------------------------------------------------------------------------ */

test("sw.js no se ha separado de swRutas.ts", () => {
  const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

  // Las listas tienen que ser idénticas, en contenido y en orden.
  assert.match(sw, /const INMUTABLES = \["\/_next\/static\/", "\/logos\/"\];/);
  assert.match(sw, /const NUNCA = \["\/api\/", "\/_next\/image", "\/_vercel\/"\];/);

  // Y las tres decisiones tienen que seguir estando.
  for (const fn of ["function estrategiaDe", "function esNavegacion", "function cacheObsoleta"]) {
    assert.ok(sw.includes(fn), `falta ${fn} en sw.js`);
  }

  // La regla de oro, por si alguien añade una línea con buena intención.
  assert.ok(!/caches\.open\([^)]*\)\.then\([^)]*\.addAll/.test(sw),
    "sw.js no debe precargar una lista de rutas: eso sería guardar HTML");
});
