import { test } from "node:test";
import assert from "node:assert/strict";
import { pokemonDelTema, RAFAGA_POR_DEFECTO, registrarClic } from "../src/lib/rafaga.ts";

/** Simula una secuencia de clics y devuelve en cuáles hubo ráfaga. */
function simula(tiempos: number[]) {
  let h: number[] = [];
  return tiempos.map((t) => {
    const r = registrarClic(h, t);
    h = r.historial;
    return r.rafaga;
  });
}

test("un clic suelto no es ráfaga", () => {
  assert.deepEqual(simula([0]), [false]);
});

test("cambiar de tema, no convencer y volver no dispara nada", () => {
  // El caso normal de alguien que prueba el tema oscuro y vuelve al claro.
  assert.deepEqual(simula([0, 800, 1600]), [false, false, false]);
});

test("cinco clics en menos de dos segundos y medio sí", () => {
  assert.deepEqual(simula([0, 300, 600, 900, 1200]), [false, false, false, false, true]);
});

test("cinco clics demasiado separados no cuentan", () => {
  // Uno cada segundo: en cada momento solo hay dos o tres dentro de la ventana.
  assert.deepEqual(simula([0, 1000, 2000, 3000, 4000]).some(Boolean), false);
});

test("revienta UNA vez por ráfaga, no en cada clic de después", () => {
  // Sin vaciar el historial al disparar, el sexto y el séptimo volverían a
  // contar y Tadbulb reventaría en cada pulsación.
  const r = simula([0, 100, 200, 300, 400, 500, 600]);
  assert.equal(r.filter(Boolean).length, 1);
  assert.equal(r[4], true);
  assert.equal(r[5], false);
  assert.equal(r[6], false);
});

test("se puede volver a disparar con una ráfaga nueva", () => {
  const r = simula([0, 100, 200, 300, 400, 5000, 5100, 5200, 5300, 5400]);
  assert.equal(r.filter(Boolean).length, 2);
});

test("el historial se poda: no acumula marcas para siempre", () => {
  let h: number[] = [];
  for (let t = 0; t < 100_000; t += 3000) h = registrarClic(h, t).historial;
  assert.ok(h.length <= RAFAGA_POR_DEFECTO.clics);
});

test("para disparar el egg no hace falta pasar de 3 cambios por segundo", () => {
  // Lo que esto garantiza y lo que no: el ritmo de cambios lo marca quien
  // pulsa, y cada clic cambia la pantalla entera de claro a oscuro, haya
  // egg o no. Lo que SÍ depende de nosotros es no premiar el machaqueo: que
  // la ráfaga se complete a 2 cambios por segundo, por debajo del umbral de
  // riesgo por fotosensibilidad, en vez de exigir pulsar más rápido.
  const porSegundo = RAFAGA_POR_DEFECTO.clics / (RAFAGA_POR_DEFECTO.ventanaMs / 1000);
  assert.ok(porSegundo < 3, `son ${porSegundo} por segundo`);
});

test("día es Solrock y noche es Lunatone", () => {
  assert.equal(pokemonDelTema(false), "solrock");
  assert.equal(pokemonDelTema(true), "lunatone");
});
