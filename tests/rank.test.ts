import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LADDER_MAX, LADDER_MIN, NOVATO_MAX, TIERS, clampElo, ladderStandings, rankOf,
} from "../src/lib/rank.ts";

/* El ladder manual.

   Lo importante no son los nombres de los tiers: es que la escala no tenga
   huecos ni solapes, que 1 sea exactamente el suelo y 2100 exactamente
   Challenger, y que el valor esté acotado en el código y no solo en el
   formulario —una Server Action es un endpoint público—. */

test("1 es el suelo y 2100 es Challenger", () => {
  assert.equal(rankOf(LADDER_MIN).label, "Novato");
  assert.equal(rankOf(LADDER_MAX).label, "Challenger");
});

test("la escala cubre todo el rango sin huecos ni solapes", () => {
  for (let i = 0; i < TIERS.length; i++) {
    const t = TIERS[i];
    assert.equal(rankOf(t.floor).tier.id, t.id, `el suelo de ${t.id}`);
    const next = TIERS[i + 1];
    if (next) {
      const topOfTier = t.id === "novato" ? NOVATO_MAX : next.floor - 1;
      assert.equal(rankOf(topOfTier).tier.id, t.id, `el punto de arriba de ${t.id}`);
      assert.ok(next.floor > t.floor, `${next.id} va por encima de ${t.id}`);
    }
  }
  // Y cada punto de la escala cae en algún tier.
  for (let e = LADDER_MIN; e <= LADDER_MAX; e++) {
    assert.ok(rankOf(e).tier, `${e} sin tier`);
  }
});

test("las divisiones van de IV abajo a I arriba", () => {
  assert.equal(rankOf(1450).divisionLabel, "IV");
  assert.equal(rankOf(1470).divisionLabel, "III");
  assert.equal(rankOf(1529).divisionLabel, "I");
  // Maestro y por encima no tienen divisiones, igual que en el juego.
  assert.equal(rankOf(1920).divisionLabel, null);
  assert.equal(rankOf(2100).divisionLabel, null);
});

test("el valor se acota, y la basura cae al suelo", () => {
  assert.equal(clampElo(0), LADDER_MIN);
  assert.equal(clampElo(99999), LADDER_MAX);
  assert.equal(clampElo("nada"), LADDER_MIN);
  assert.equal(clampElo(null), LADDER_MIN);
  assert.equal(clampElo(1700.6), 1701);
});

test("Challenger va al 100% de progreso, no al 0%", () => {
  // Es el borde que se cuela: sin siguiente tier, el cálculo daba 0.
  assert.equal(rankOf(2100).progress, 1);
  assert.equal(rankOf(2100).toNext, null);
  assert.equal(rankOf(2099).toNext, 1);
});

test("la clasificación comparte puesto en los empates y deja fuera a quien no tiene rango", () => {
  const rows = ladderStandings([
    { id: "p1", ladderElo: 1700 },
    { id: "p2", ladderElo: 1900 },
    { id: "p3", ladderElo: 1700 },
    { id: "p4", ladderElo: 1550 },
    { id: "p5", ladderElo: null },
  ]);
  assert.deepEqual(rows.map((r) => r.position), [1, 2, 2, 4]);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].player.id, "p2");
});
