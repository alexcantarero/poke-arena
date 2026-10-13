import { test } from "node:test";
import assert from "node:assert/strict";
import { estacionDe } from "../src/lib/estacion.ts";

test("estaciones por fecha", () => {
  assert.equal(estacionDe("2026-04-10").id, "primavera");
  assert.equal(estacionDe("2026-07-15").id, "verano");
  assert.equal(estacionDe("2026-10-05").id, "otono");
  assert.equal(estacionDe("2027-01-20").id, "invierno");
  assert.equal(estacionDe("2026-12-21").id, "invierno");
});

test("fechas señaladas mandan sobre la estación", () => {
  assert.equal(estacionDe("2026-02-14").evento, "sanValentin");
  assert.equal(estacionDe("2026-02-27").evento, "diaPokemon");
  assert.equal(estacionDe("2026-10-31").evento, "halloween");
  assert.equal(estacionDe("2026-12-24").evento, "navidad");
  assert.equal(estacionDe("2027-01-05").evento, "navidad");
  assert.equal(estacionDe("2027-08-14").evento, "mundial");
  assert.equal(estacionDe("2026-10-05").evento, null);
});

test("las fechas exactas nuevas tienen emblemas y partículas propios", () => {
  const sanValentin = estacionDe("2026-02-14");
  assert.equal(sanValentin.emblema, "💝");
  assert.deepEqual(sanValentin.particulas, ["💖", "💕", "✨"]);

  const diaPokemon = estacionDe("2026-02-27");
  assert.equal(diaPokemon.emblema, "⚡");
  assert.deepEqual(diaPokemon.particulas, ["⚡", "✨", "🔴"]);
});
