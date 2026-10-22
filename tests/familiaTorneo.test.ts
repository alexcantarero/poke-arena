import { test } from "node:test";
import assert from "node:assert/strict";
import { familiaTorneo } from "../src/lib/familiaTorneo.ts";

test("los alias van juntos y los grandes, en «major»", () => {
  assert.equal(familiaTorneo("pokemon_challenge"), "challenge");
  assert.equal(familiaTorneo("league_cup"), "cup");
  assert.equal(familiaTorneo("regional"), "major");
  assert.equal(familiaTorneo("worlds"), "major");
  assert.equal(familiaTorneo("online"), "online");
  assert.equal(familiaTorneo("store"), "otro");
  assert.equal(familiaTorneo(null), "otro");
});
