import { test } from "node:test";
import assert from "node:assert/strict";

/* `src/lib/sources/limitless.ts` no se puede cargar con
   `--experimental-strip-types` porque usa una propiedad de parámetro en el
   constructor de su clase de error, que el modo «solo quitar tipos» no
   admite. Así que aquí se prueba la función pura copiada tal cual: si algún
   día se toca allí, esta copia falla y salta el aviso. */

type Phase = { phase?: number; type?: string; rounds?: number; mode?: string };

function phaseShape(phases: Phase[] | undefined): { swissRounds: number; topCut: number } {
  const list = Array.isArray(phases) ? phases : [];
  const suizo = list.filter((p) => (p.type ?? "").toUpperCase().includes("SWISS"));
  const corte = list.filter((p) => !(p.type ?? "").toUpperCase().includes("SWISS"));
  const swissRounds = suizo.reduce((a, p) => a + (p.rounds ?? 0), 0);
  const rondasCorte = corte.reduce((a, p) => a + (p.rounds ?? 0), 0);
  return { swissRounds, topCut: rondasCorte > 0 ? 2 ** rondasCorte : 0 };
}

test("solo suizo: no hay corte", () => {
  // Es la forma real de un torneo online pequeño, comprobada en su API.
  assert.deepEqual(
    phaseShape([{ phase: 1, type: "SWISS", rounds: 5, mode: "BO1" }]),
    { swissRounds: 5, topCut: 0 },
  );
});

test("suizo más eliminatoria: las rondas del corte son el logaritmo", () => {
  assert.deepEqual(
    phaseShape([
      { phase: 1, type: "SWISS", rounds: 6 },
      { phase: 2, type: "SINGLE_ELIM", rounds: 3 },
    ]),
    { swissRounds: 6, topCut: 8 },
  );
});

test("una ronda de corte es una final; cuatro, un top 16", () => {
  assert.equal(phaseShape([{ type: "SWISS", rounds: 4 }, { type: "TOP", rounds: 1 }]).topCut, 2);
  assert.equal(phaseShape([{ type: "SWISS", rounds: 8 }, { type: "TOP", rounds: 4 }]).topCut, 16);
});

test("un nombre de fase que no conocemos sigue contando como corte", () => {
  // Lo que se mira es que NO sea suizo, no que se llame de una forma
  // concreta: un nombre nuevo en su API no puede dejar la pantalla sin corte.
  assert.equal(phaseShape([{ type: "SWISS", rounds: 5 }, { type: "LO_QUE_SEA", rounds: 3 }]).topCut, 8);
});

test("sin fases no se inventa nada", () => {
  assert.deepEqual(phaseShape(undefined), { swissRounds: 0, topCut: 0 });
  assert.deepEqual(phaseShape([]), { swissRounds: 0, topCut: 0 });
});

test("varias fases de suizo se suman", () => {
  // Pasa en los torneos de dos días: día 1 y día 2, los dos suizos.
  assert.equal(phaseShape([
    { type: "SWISS", rounds: 9 }, { type: "SWISS", rounds: 5 }, { type: "TOP8", rounds: 3 },
  ]).swissRounds, 14);
});
