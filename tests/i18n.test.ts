import { test } from "node:test";
import assert from "node:assert/strict";
import { asLang, tr } from "../src/lib/i18n.ts";

test("cualquier valor raro de la cookie cae a español", () => {
  assert.equal(asLang(undefined), "es");
  assert.equal(asLang("fr"), "es");
  assert.equal(asLang("en"), "en");
});

test("las claves del menú existen en los dos idiomas", () => {
  assert.equal(tr("es", "nav./torneos"), "Torneos");
  assert.equal(tr("en", "nav./torneos"), "Tournaments");
});

test("una clave desconocida no revienta: devuelve la clave", () => {
  assert.equal(tr("en", "no.existe"), "no.existe");
});

/* ------------------------------------------------------- v0.48 ---------- */

import { diasRelativos, ordinal, trf } from "../src/lib/i18n.ts";

test("trf rellena los huecos en los dos idiomas", () => {
  assert.equal(trf("es", "home.players", { n: 12 }), "12 jugadores");
  assert.equal(trf("en", "home.players", { n: 12 }), "12 players");
});

test("trf deja a la vista un hueco que no llega, en vez de esconderlo", () => {
  assert.equal(trf("es", "home.players", {}), "{n} jugadores");
});

test("ordinales: «3.º» en español, y 1st 2nd 3rd 4th en inglés", () => {
  assert.equal(ordinal("es", 3), "3.º");
  assert.deepEqual([1, 2, 3, 4, 21, 22, 23, 101].map((n) => ordinal("en", n)),
    ["1st", "2nd", "3rd", "4th", "21st", "22nd", "23rd", "101st"]);
});

test("ordinales en inglés: 11th, 12th y 13th son la excepción", () => {
  assert.deepEqual([11, 12, 13, 111, 112].map((n) => ordinal("en", n)), ["11th", "12th", "13th", "111th", "112th"]);
});

test("el ordinal y la clave de puesto no se pisan: «3.º puesto», no «3.º.º»", () => {
  assert.equal(trf("es", "home.place", { n: ordinal("es", 3) }), "3.º puesto");
  assert.equal(trf("en", "home.place", { n: ordinal("en", 3) }), "3rd place");
});

test("días relativos en los dos idiomas", () => {
  assert.deepEqual([0, 1, -1, 3, -4].map((n) => diasRelativos("es", n)), ["hoy", "mañana", "ayer", "en 3 días", "hace 4 días"]);
  assert.deepEqual([0, 1, -1, 3, -4].map((n) => diasRelativos("en", n)), ["today", "tomorrow", "yesterday", "in 3 days", "4 days ago"]);
});
