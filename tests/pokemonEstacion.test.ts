import { test } from "node:test";
import assert from "node:assert/strict";
import { estacionDe } from "../src/lib/estacion.ts";
import { pokemonDeEstacion } from "../src/lib/pokemonEstacion.ts";

test("otoño selecciona solo Pokémon fantasma", () => {
  const pokemon = pokemonDeEstacion(estacionDe("2026-10-05"));
  assert.ok(pokemon.length > 0);
  assert.ok(pokemon.every((p) => p.tipo === "fantasma"));
});

test("Halloween añade Pokémon fantasma y no mezcla otros tipos", () => {
  const pokemon = pokemonDeEstacion(estacionDe("2026-10-31"));
  assert.ok(pokemon.some((p) => p.slug === "pumpkaboo"));
  assert.ok(pokemon.every((p) => p.tipo === "fantasma"));
});

test("las demás estaciones muestran selecciones propias", () => {
  assert.ok(pokemonDeEstacion(estacionDe("2026-04-10")).some((p) => p.tipo === "planta"));
  assert.ok(pokemonDeEstacion(estacionDe("2026-07-15")).some((p) => p.tipo === "agua"));
  assert.ok(pokemonDeEstacion(estacionDe("2027-01-20")).some((p) => p.tipo === "hielo"));
});
