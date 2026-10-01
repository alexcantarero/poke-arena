import { test } from "node:test";
import assert from "node:assert/strict";
import { TORNEOS_ZONA_2026, yaExiste } from "../src/data/torneos-zona-2026.ts";

test("la lista tiene los 21 torneos y los ids no se repiten", () => {
  assert.equal(TORNEOS_ZONA_2026.length, 21);
  assert.equal(new Set(TORNEOS_ZONA_2026.map((t) => t.id)).size, 21);
});

test("Gdansk va con la fecha oficial, 31 oct – 1 nov", () => {
  const g = TORNEOS_ZONA_2026.find((t) => t.city === "Gdansk")!;
  assert.equal(g.date, "2026-10-31");
  assert.equal(g.endDate, "2026-11-01");
});

test("las fechas son ISO y del otoño de 2026", () => {
  for (const t of TORNEOS_ZONA_2026) assert.match(t.date, /^2026-1[01]-\d{2}$/);
});

test("no duplica uno creado a mano en la misma tienda y día", () => {
  const z = TORNEOS_ZONA_2026.find((t) => t.id === "zona-2026-1011-decksden")!;
  assert.equal(yaExiste(z, [{ id: "t_x", date: "2026-10-11", kind: "pokemon_challenge", name: "Challenge en Decksden", venue: "", city: "" }]), true);
  assert.equal(yaExiste(z, [{ id: "t_x", date: "2026-10-11", kind: "league_cup", name: "Cup Decksden", venue: "", city: "" }]), false);
  assert.equal(yaExiste(z, [{ id: "t_x", date: "2026-10-12", kind: "league_challenge", name: "Decksden", venue: "", city: "" }]), false);
});

test("un Regional apuntado a mano como «Regional Nice» cuenta como el mismo", () => {
  const n = TORNEOS_ZONA_2026.find((t) => t.kind === "regional" && t.city === "Niza")!;
  assert.equal(yaExiste(n, [{ id: "t_y", date: "2026-10-17", kind: "regional", name: "Regional Nice", venue: "", city: "" }]), true);
});
