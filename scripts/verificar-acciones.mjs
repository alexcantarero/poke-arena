/* =========================================================================
   Comprueba la regla de los ficheros «use server».

       npm run verificar:acciones   (va también dentro de `npm run verificar`)

   v0.47 — al partir `src/actions/index.ts` en ficheros por tema, hay una
   regla de Next que ni `tsc` ni los tests comprueban: un fichero con
   "use server" SOLO puede exportar funciones `async`. Si alguien exporta ahí
   una constante o una función normal, compila y pasa los tests, pero
   `npm run build` falla. Esto lo caza antes.
   ========================================================================= */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "src", "actions");
const fallos = [];

for (const f of readdirSync(dir).filter((x) => /\.tsx?$/.test(x))) {
  const txt = readFileSync(join(dir, f), "utf8");
  const conDirectiva = /^\s*["']use server["'];/.test(txt);
  if (f === "index.ts" && conDirectiva) {
    fallos.push(`${f}: el barril NO debe llevar "use server" (solo reexporta).`);
  }
  if (!conDirectiva) continue;
  txt.split(/\r?\n/).forEach((l, i) => {
    if (!/^export\s/.test(l)) return;
    if (/^export\s+async\s+function\s/.test(l)) return;
    if (/^export\s+type\s/.test(l) || /^export\s+interface\s/.test(l)) return; // se borran al compilar
    fallos.push(`${f}:${i + 1}  ${l.trim().slice(0, 80)}`);
  });
}

if (fallos.length) {
  console.error("\n✗ Exportaciones que no puede tener un fichero «use server»:\n");
  for (const x of fallos) console.error("  " + x);
  console.error("\nLlévalas a src/actions/_comun.ts, que no lleva la directiva.\n");
  process.exit(1);
}
console.log("✓ Acciones: los ficheros «use server» solo exportan funciones async.");
