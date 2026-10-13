import { test } from "node:test";
import assert from "node:assert/strict";
import { estacionDe } from "../src/lib/estacion.ts";
import { eventos, pokemonAleatorio, pokemonDeEstacion } from "../src/lib/pokemonEstacion.ts";

test("otoño selecciona solo Pokémon fantasma", () => {
  const pokemon = pokemonDeEstacion(estacionDe("2026-10-05"));
  assert.ok(pokemon.length > 0);
  assert.ok(pokemon.every((p) => p.tipo === "fantasma"));
});

test("Halloween añade Pokémon fantasma y no mezcla otros tipos", () => {
  const pokemon = pokemonDeEstacion(estacionDe("2026-10-31"));
  assert.ok(pokemon.some((p) => p.slug === "pumpkaboo"));
  assert.ok(pokemon.some((p) => p.slug === "dusknoir"));
  assert.ok(pokemon.some((p) => p.slug === "dhelmise"));
  assert.ok(pokemon.some((p) => p.slug === "Marshadow"));
  assert.ok(pokemon.every((p) => p.tipo === "fantasma"));
});

test("los días especiales usan sus listas de Pokémon", () => {
  assert.deepEqual(
    pokemonDeEstacion(estacionDe("2026-02-14")),
    eventos.sanValentin.pokemon,
  );
  assert.deepEqual(
    pokemonDeEstacion(estacionDe("2026-02-27")),
    eventos.diaPokemon.pokemon,
  );
  assert.deepEqual(
    pokemonDeEstacion(estacionDe("2026-12-25")),
    eventos.navidad.pokemon,
  );
});

test("las fechas declaradas coinciden con los días que activa el calendario", () => {
  for (const [id, evento] of Object.entries(eventos)) {
    const fecha = `2026-${String(evento.fecha.mes).padStart(2, "0")}-${String(evento.fecha.dia).padStart(2, "0")}`;
    assert.equal(estacionDe(fecha).evento, id);
  }
});

test("las demás estaciones muestran selecciones propias", () => {
  assert.ok(pokemonDeEstacion(estacionDe("2026-04-10")).some((p) => p.tipo === "planta"));
  assert.ok(pokemonDeEstacion(estacionDe("2026-07-15")).some((p) => p.tipo === "agua"));
  assert.ok(pokemonDeEstacion(estacionDe("2027-01-20")).some((p) => p.tipo === "hielo"));
});

test("la selección aleatoria devuelve un único Pokémon de la lista", () => {
  const lista = pokemonDeEstacion(estacionDe("2026-10-05"));
  assert.equal(pokemonAleatorio(lista, () => 0)?.slug, lista[0]?.slug);
  assert.equal(pokemonAleatorio(lista, () => 0.99)?.slug, lista.at(-1)?.slug);
});

test("la selección aleatoria permite una lista vacía", () => {
  assert.equal(pokemonAleatorio([]), null);
});
