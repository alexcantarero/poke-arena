import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarDuplicado, cualConservar, familiaDeTipo, mismoTorneo, palabrasClave, paresDuplicados } from "../src/lib/duplicados.ts";

const t = (id: string, name: string, o: Partial<{ date: string; kind: string; venue: string }> = {}) =>
  ({ id, name, date: o.date ?? "2026-11-28", kind: o.kind ?? "league_cup", venue: o.venue ?? "" });

test("EL CASO DEL CALENDARIO: el mismo torneo creado a mano y pegado del localizador es el mismo", () => {
  const aMano = t("t1", "Cup Lorcanos");
  const pegado = t("t2", "LORCANOS - TCG League Cup Season 1", { venue: "Lorcanos" });
  assert.equal(mismoTorneo(aMano, pegado), true);
  // League Cup y Pokémon Cup son la misma familia.
  assert.equal(mismoTorneo(t("a", "Cup Mythic"), t("b", "Mythic Games", { kind: "pokemon_cup" })), true);
  assert.equal(familiaDeTipo("pokemon_challenge"), "challenge");
});

test("dos Cups el mismo día en tiendas distintas NO son el mismo; otro día u otro tipo, tampoco", () => {
  assert.equal(mismoTorneo(t("a", "LORCANOS - TCG League Cup Season 1"), t("b", "MYTHIC GAMES - TCG League Cup Season 1")), false);
  assert.equal(mismoTorneo(t("a", "Cup Lorcanos"), t("b", "Cup Lorcanos", { date: "2026-11-29" })), false);
  assert.equal(mismoTorneo(t("a", "Lorcanos"), t("b", "Lorcanos", { kind: "league_challenge" })), false);
  // Dos importados de Limitless con ids distintos, distintos aunque se llamen igual.
  assert.equal(mismoTorneo(t("ltl-1", "Weekly #3"), t("ltl-2", "Weekly #3")), false);
  // Solo palabras de relleno: no hay con qué decidir, y no se da por igual.
  assert.equal(mismoTorneo(t("a", "TCG League Cup Season 1"), t("b", "Pokémon League Cup")), false);
});

test("las palabras que cuentan: sin tildes, sin relleno y sin números", () => {
  assert.deepEqual([...palabrasClave("Màquina del Temps - TCG League Cup Season 1")], ["maquina", "temps"]);
  assert.deepEqual([...palabrasClave("Mythic Games", "Calella")], ["mythic", "calella"]);
});

test("buscar el duplicado y listar los pares", () => {
  const lista = [t("a", "Cup Lorcanos"), t("b", "LORCANOS - Cup", { venue: "Lorcanos" }), t("c", "Cup Mythic"), t("d", "Mythic", { date: "2026-12-01" })];
  assert.equal(buscarDuplicado(t("x", "Lorcanos"), lista)?.id, "a");
  assert.equal(buscarDuplicado(t("x", "Kanto"), lista), null);
  assert.deepEqual(paresDuplicados(lista).map(([x, y]) => [x.id, y.id]), [["a", "b"]]);
});

test("al fusionar se conserva el que tiene más datos y, a igualdad, el más antiguo", () => {
  const a = { id: "a", resultados: 0, rondas: 0, creado: "2026-11-01" };
  const b = { id: "b", resultados: 2, rondas: 5, creado: "2026-11-10" };
  assert.deepEqual(cualConservar(a, b).map((x) => x.id), ["b", "a"]);
  assert.deepEqual(cualConservar({ ...a, resultados: 2, rondas: 5 }, b).map((x) => x.id), ["a", "b"]);
});
