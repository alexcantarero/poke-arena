import { test } from "node:test";
import assert from "node:assert/strict";
import { CLAVES_LOGRO, anadirLogro, etiquetasDe, leerLogros, nivelDeUso } from "../src/lib/logros.ts";

test("los logros guardados: válidos, sin repetir y en orden fijo", () => {
  assert.deepEqual(leerLogros("voltorb,patata,psyduck,voltorb"), ["psyduck", "voltorb"]);
  assert.deepEqual(leerLogros(null), []);
  assert.equal(anadirLogro("voltorb", "psyduck"), "psyduck,voltorb");
  assert.equal(anadirLogro("psyduck", "psyduck"), "psyduck");
  assert.equal(anadirLogro("", "hackeado"), "");
});

test("la Ball de uso sube de Poké a Master", () => {
  assert.equal(nivelDeUso({ partidas: 0, torneos: 0, logros: 0 }).nivel.ball, "poke-ball");
  const casi = nivelDeUso({ partidas: 20, torneos: 1, logros: 0 }); // 23 puntos
  assert.equal(casi.nivel.ball, "poke-ball");
  assert.equal(casi.faltan, 2);
  assert.equal(nivelDeUso({ partidas: 20, torneos: 0, logros: 1 }).nivel.ball, "great-ball");
  const master = nivelDeUso({ partidas: 150, torneos: 10, logros: 6 });
  assert.equal(master.nivel.ball, "master-ball");
  assert.equal(master.siguiente, null);
  assert.equal(master.progreso, 1);
});

test("las etiquetas: solo las ganadas, con su escalón", () => {
  assert.deepEqual(etiquetasDe({ partidas: 3, torneos: 0, logros: 0 }), []);
  const e = etiquetasDe({ partidas: 60, torneos: 1, logros: CLAVES_LOGRO.length });
  assert.deepEqual(e.map((x) => [x.clave, x.tono]), [["partidas", "plata"], ["torneos", "bronce"], ["todos", "secreto"]]);
});
