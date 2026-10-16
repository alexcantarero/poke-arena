import { test } from "node:test";
import assert from "node:assert/strict";
import { BALLS, ballAlAzar, urlDeBall } from "../src/lib/balls.ts";

test("las tres de siempre salen la mitad de las veces", () => {
  assert.equal(ballAlAzar(0), "poke-ball");
  assert.equal(ballAlAzar(0.2), "great-ball");
  assert.equal(ballAlAzar(0.45), "ultra-ball");
});

test("el resto se reparte entre las demás", () => {
  assert.equal(ballAlAzar(0.5), "master-ball");
  assert.ok(BALLS.slice(3).includes(ballAlAzar(0.75)));
  assert.equal(ballAlAzar(0.9999), "timer-ball");
});

test("nunca devuelve undefined, ni en los bordes", () => {
  for (const r of [-1, 0, 0.4999, 0.5, 0.99999999, 1, 2]) {
    assert.ok(BALLS.includes(ballAlAzar(r)), String(r));
  }
});

test("la URL es la del repositorio de sprites de PokéAPI", () => {
  assert.equal(urlDeBall("ultra-ball"),
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png");
});
