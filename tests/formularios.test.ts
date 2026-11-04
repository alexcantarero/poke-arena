import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/* v0.95 — Regresión del «Falta el resultado» del resultado rápido.

   Un <input name="id"> dentro de un <form> tapa la propiedad `form.id` (los
   formularios dejan que sus campos con nombre pisen sus propiedades). React 19,
   al enviar un formulario con acción, copia el botón pulsado en un campo
   temporal y lo ata al formulario con `form.id`: si `form.id` es un campo y no
   un texto, el campo temporal queda huérfano y el valor del botón NO llega.

   Así que en un mismo <form> no pueden convivir un campo con un nombre que
   pise una propiedad del formulario y un botón con `name` (sin `formAction`
   propio). Este test lo busca en todo `src/`. */

const PISAN = ["id", "action", "method", "name", "target", "elements", "length", "submit", "reset", "encoding", "enctype"];

function ficheros(dir: string): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...ficheros(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

test("ningún formulario con botones con valor lleva un campo que pise form.id", () => {
  const fallos: string[] = [];
  for (const f of ficheros(join(process.cwd(), "src"))) {
    const txt = readFileSync(f, "utf8");
    for (const m of txt.matchAll(/<form\b[\s\S]*?<\/form>/g)) {
      const bloque = m[0];
      const botones = [...bloque.matchAll(/<button\b[^>]*>/g)].map((b) => b[0])
        .filter((b) => /\bname=/.test(b) && !/formAction/.test(b));
      if (!botones.length) continue;
      const pisa = PISAN.find((n) => new RegExp(`name=(?:"${n}"|\\{"${n}"\\})`).test(bloque));
      if (pisa) fallos.push(`${f.slice(process.cwd().length + 1)}: name="${pisa}" con ${botones.length} botón(es) con name`);
    }
  }
  assert.deepEqual(fallos, []);
});
