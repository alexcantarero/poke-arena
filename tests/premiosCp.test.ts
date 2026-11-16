import { test } from "node:test";
import assert from "node:assert/strict";
import { CP_2027, tablaDePremios } from "../src/lib/cp.ts";

test("las tablas de 2027 de Challenge y Cup son las oficiales (contrastadas el 16/11/2026)", () => {
  const t = (k: string) => CP_2027.events[k].tiers!.map((x) => [x.from, x.to, x.minPlayers, x.cp]);
  assert.deepEqual(t("league_challenge"), [[1, 1, 0, 15], [2, 2, 4, 12], [3, 4, 8, 10], [5, 8, 14, 8], [9, 16, 25, 6], [17, 32, 48, 4]]);
  assert.deepEqual(t("league_cup"), [[1, 1, 0, 50], [2, 2, 4, 40], [3, 4, 8, 32], [5, 8, 17, 25], [9, 16, 48, 20], [17, 32, 80, 16], [33, 64, 128, 13]]);
});

test("una Cup de 24: puntúa hasta el 8.º, y faltan 24 personas para que pague el 9–16", () => {
  const p = tablaDePremios(2027, "league_cup", 24)!;
  assert.deepEqual(p.filas.map((f) => [f.from, f.to, f.cp, f.cobra, f.faltan]), [
    [1, 1, 50, true, 0], [2, 2, 40, true, 0], [3, 4, 32, true, 0], [5, 8, 25, true, 0],
    [9, 16, 20, false, 24], [17, 32, 16, false, 56], [33, 64, 13, false, 104],
  ]);
  assert.equal(p.ultimoPuesto, 8);
  assert.deepEqual([p.siguiente?.from, p.siguiente?.faltan], [9, 24]);
  assert.equal(p.conAsistencia, true);
});

test("una Challenge de 12: hasta el 4.º; el alias Pokémon Challenge da lo mismo; y nadie queda por debajo del último", () => {
  assert.equal(tablaDePremios(2027, "league_challenge", 12)!.ultimoPuesto, 4);
  assert.deepEqual(tablaDePremios(2027, "pokemon_challenge", 12)!.filas, tablaDePremios(2027, "league_challenge", 12)!.filas);
  // Con 50 personas paga el tramo 17–32, y llega hasta el 32.º; con 20 en una tabla que pagara hasta el 32, hasta el 20.º.
  assert.equal(tablaDePremios(2027, "league_challenge", 50)!.ultimoPuesto, 32);
  assert.equal(tablaDePremios(2027, "league_challenge", 3)!.ultimoPuesto, 1);
});

test("sin asistencia apuntada solo se sabe lo que paga siempre; un tipo sin tabla no tiene premios", () => {
  const p = tablaDePremios(2027, "league_cup", null)!;
  assert.deepEqual([p.conAsistencia, p.ultimoPuesto, p.filas[1].cobra, p.filas[1].faltan], [false, 1, false, 0]);
  assert.equal(tablaDePremios(2027, "store", 30), null);
});
