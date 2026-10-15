/* =========================================================================
   Busca texto corrompido por doble codificación.

       npm run verificar

   Por qué existe: el 9 de octubre una sesión reescribió `src/actions/index.ts`
   leyéndolo en Windows-1252 en vez de UTF-8, y cada «ñ» del mensaje de error
   de entrar pasó a ser dos caracteres raros. Estuvo así diez días. Ni
   `npm test`, ni `tsc`,
   ni `npm run build`, ni `npm run dev` lo detectan: un texto con caracteres
   raros compila perfectamente. Esto sí.

   Solo Node, sin dependencias, para que funcione igual en Windows.

   Las marcas se escriben con escapes \u y no tal cual a propósito: si este
   fichero las llevara escritas, se encontraría a sí mismo.
   ========================================================================= */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const CARPETAS = ["src", "tests", "scripts"];
const EXTENSIONES = /\.(ts|tsx|js|mjs|css|json)$/;

// U+00C3 y U+00C2 casi nunca aparecen en español, y son el primer byte de
// toda letra acentuada mal leída; U+00E2 seguido de U+20AC es como empiezan
// las comillas y las rayas rotas; U+FFFD es un carácter que ya se perdió.
// (Escritos como código y no tal cual: si no, este fichero se encontraría.)
const MARCAS = /\u00C3|\u00C2|\u00E2\u20AC|\uFFFD/;

const raiz = process.cwd();
const fallos = [];

function recorrer(dir) {
  for (const nombre of readdirSync(dir)) {
    if (nombre === "node_modules" || nombre.startsWith(".")) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) { recorrer(ruta); continue; }
    if (!EXTENSIONES.test(nombre)) continue;

    const lineas = readFileSync(ruta, "utf8").split(/\r?\n/);
    lineas.forEach((linea, i) => {
      if (MARCAS.test(linea)) {
        fallos.push(`${relative(raiz, ruta)}:${i + 1}  ${linea.trim().slice(0, 90)}`);
      }
    });
  }
}

for (const c of CARPETAS) {
  try { recorrer(join(raiz, c)); } catch { /* carpeta que no existe: nada que mirar */ }
}

if (fallos.length) {
  console.error(`\n✗ ${fallos.length} línea(s) con texto corrompido por doble codificación:\n`);
  for (const f of fallos.slice(0, 40)) console.error("  " + f);
  if (fallos.length > 40) console.error(`  … y ${fallos.length - 40} más.`);
  console.error("\nCausa habitual: un fichero guardado en Windows-1252 en vez de UTF-8");
  console.error("(PowerShell `Set-Content` sin `-Encoding utf8`, o un editor mal configurado).\n");
  process.exit(1);
}
console.log("✓ Codificación: ningún texto corrompido en src/, tests/ ni scripts/.");
