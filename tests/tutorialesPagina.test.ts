import { test } from "node:test";
import assert from "node:assert/strict";
import { anadirVisto, tutorialDe } from "../src/lib/tutorialesPagina.ts";

test("cada página, su tutorial; las rutas concretas antes que las generales", () => {
  assert.equal(tutorialDe("/")?.clave, "inicio");
  assert.equal(tutorialDe("/torneos")?.clave, "torneos");
  assert.equal(tutorialDe("/torneos/nuevo")?.clave, "torneoNuevo");   // no «torneo»
  assert.equal(tutorialDe("/torneos/abc123")?.clave, "torneo");
  assert.equal(tutorialDe("/ranking?vista=all")?.clave, "ranking");
  assert.equal(tutorialDe("/perfil/p1")?.clave, "perfil");
  assert.equal(tutorialDe("/perfil/editar"), null);
  assert.equal(tutorialDe("/glosario"), null);
});

test("cada tutorial tiene dos pasos con sus claves de traducción", () => {
  const t = tutorialDe("/estadisticas")!;
  assert.deepEqual(t.pasos.map((p) => p.titulo), ["tp.estadisticas.t1", "tp.estadisticas.t2"]);
});

test("lo visto se guarda sin repetir y sin colar claves desconocidas", () => {
  assert.equal(anadirVisto("", "ranking"), "ranking");
  assert.equal(anadirVisto("ranking", "ranking"), "ranking");
  assert.equal(anadirVisto("ranking", "inicio"), "ranking,inicio");
  assert.equal(anadirVisto("ranking,<script>", "nada"), "ranking");
});
