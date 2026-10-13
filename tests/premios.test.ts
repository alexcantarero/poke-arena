import { test } from "node:test";
import assert from "node:assert/strict";
import {
  avisosDePremios, margenDe, objetivoDe, premiosValidos, resumenDeMargen, type PremiosDeJuego,
} from "../src/lib/premios.ts";

const j = (over: Partial<PremiosDeJuego> = {}): PremiosDeJuego => ({
  premiosA: null, premiosB: null, penalizadoA: false, penalizadoB: false, winner: "a", ...over,
});

/* ------------------------------------------------------------- objetivo -- */

test("sin penalización hacen falta 6 premios", () => {
  assert.equal(objetivoDe(false), 6);
});

test("LA REGLA QUE ESTO CORRIGE: la penalización baja el objetivo del RIVAL, no da premios", () => {
  // Penalizado A → B necesita 4, no «B coge 2 gratis». Es la diferencia entre
  // guardar un 6-3 que ocurrió y un 6-3 que nunca estuvo en la mesa.
  assert.equal(objetivoDe(true), 4);

  const g = j({ premiosA: 2, premiosB: 4, penalizadoA: true, winner: "b" });
  const m = margenDe(g);
  assert.equal(m?.marcador, "4-2", "el marcador es el real, no el inflado a 6");
  // A necesitaba 6 y se quedó en 2: le faltaban 4.
  assert.equal(m?.faltaban, 4);
  assert.equal(m?.conPenalizacion, true);
});

/* --------------------------------------------------------------- margen -- */

test("margen: el caso normal", () => {
  assert.deepEqual(margenDe(j({ premiosA: 6, premiosB: 3, winner: "a" })),
    { faltaban: 3, marcador: "6-3", conPenalizacion: false });
  // El más ajustado posible.
  assert.equal(margenDe(j({ premiosA: 6, premiosB: 5, winner: "a" }))?.faltaban, 1);
  // Paliza.
  assert.equal(margenDe(j({ premiosA: 6, premiosB: 0, winner: "a" }))?.faltaban, 6);
});

test("margen: el marcador se lee siempre desde el ganador", () => {
  assert.equal(margenDe(j({ premiosA: 1, premiosB: 6, winner: "b" }))?.marcador, "6-1");
});

test("margen: nulo cuando no se puede decir, que no es lo mismo que cero", () => {
  assert.equal(margenDe(j({ premiosA: null, premiosB: 3 })), null);
  assert.equal(margenDe(j({ premiosA: 6, premiosB: 3, winner: "" })), null);
  // El perdedor llegó a su objetivo: el dato no cuadra, no se inventa un margen.
  assert.equal(margenDe(j({ premiosA: 6, premiosB: 6, winner: "a" })), null);
});

test("margen: se puede ganar sin llegar a 6 (deck-out, concesión)", () => {
  const m = margenDe(j({ premiosA: 2, premiosB: 1, winner: "a" }));
  assert.equal(m?.marcador, "2-1");
  assert.equal(m?.faltaban, 5);
});

/* --------------------------------------------------------------- avisos -- */

test("avisos: sin nada apuntado no se molesta a nadie", () => {
  assert.deepEqual(avisosDePremios(j({ winner: "a" })), []);
});

test("avisos: medio marcador es un aviso", () => {
  const a = avisosDePremios(j({ premiosA: 6, premiosB: null }));
  assert.equal(a.length, 1);
  assert.equal(a[0].campo, "b");
});

test("avisos: el perdedor no puede haber llegado a su objetivo", () => {
  const a = avisosDePremios(j({ premiosA: 6, premiosB: 6, winner: "a" }), "Ibai", "Alex");
  assert.ok(a.some((x) => x.texto.includes("Alex")));
});

test("avisos: con penalización, llegar a 4 ya es llegar", () => {
  // B necesitaba 4 porque A fue penalizado. Si figura como perdedor, chirría.
  const a = avisosDePremios(j({ premiosA: 5, premiosB: 4, penalizadoA: true, winner: "a" }), "Ibai", "Alex");
  assert.ok(a.some((x) => x.campo === "b"), "debería avisar de que Alex llegó a 4");
});

test("avisos: ganar sin llegar al objetivo se avisa, pero como dato raro", () => {
  const a = avisosDePremios(j({ premiosA: 3, premiosB: 2, winner: "a" }), "Ibai", "Alex");
  assert.equal(a.length, 1);
  assert.ok(a[0].texto.includes("deck-out"));
});

test("premiosValidos: solo enteros de 0 a 6, o nada", () => {
  for (const n of [0, 1, 6, null]) assert.equal(premiosValidos(n), true, String(n));
  for (const n of [-1, 7, 2.5]) assert.equal(premiosValidos(n), false, String(n));
});

/* -------------------------------------------------------------- resumen -- */

test("resumen: los juegos con penalización se descartan y se cuentan aparte", () => {
  const r = resumenDeMargen([
    j({ premiosA: 6, premiosB: 5, winner: "a" }),             // faltaban 1
    j({ premiosA: 6, premiosB: 1, winner: "a" }),             // faltaban 5
    j({ premiosA: 4, premiosB: 0, penalizadoB: true, winner: "a" }), // descartado
    j({ premiosA: null, premiosB: null, winner: "a" }),       // sin datos
  ]);
  assert.equal(r.juegos, 2);
  assert.equal(r.margenMedio, 3);
  assert.equal(r.ajustados, 1);
  assert.equal(r.palizas, 1);
  assert.equal(r.descartadosPorPenalizacion, 1);
});

test("resumen: sin juegos utilizables el margen es nulo, no cero", () => {
  const r = resumenDeMargen([j(), j({ premiosA: 6, premiosB: 2, winner: "" })]);
  assert.equal(r.juegos, 0);
  assert.equal(r.margenMedio, null);
});
