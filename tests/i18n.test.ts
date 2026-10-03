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
