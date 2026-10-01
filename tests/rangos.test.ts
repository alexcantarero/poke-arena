import { test } from "node:test";
import assert from "node:assert/strict";
import { medallaDe, rangoRegional, textoRango } from "../src/lib/rangos.ts";

test("la escala de Regional por potencias de dos", () => {
  const casos: Array<[number, string]> = [
    [1, "challenger"], [2, "grandmaster"], [4, "grandmaster"], [5, "master"], [8, "master"],
    [9, "diamond"], [16, "diamond"], [17, "emerald"], [33, "platinum"], [65, "gold"],
    [128, "gold"], [129, "silver"], [257, "bronze"], [410, "bronze"], [513, "iron"], [1024, "iron"],
  ];
  for (const [p, clave] of casos) assert.equal(rangoRegional(p)?.clave, clave, `puesto ${p}`);
  assert.equal(rangoRegional(1025), null);
  assert.equal(rangoRegional(null), null);
});

test("Frankfurt, puesto 410 de 3.342: Bronce · Top 512", () => {
  assert.deepEqual(medallaDe("regional", 410, 5), { className: "cp-rank-bronze", nombre: "Bronce · Top 512" });
  assert.equal(textoRango(rangoRegional(1)!), "1.º");
});

test("Challenge y Cup: podio, y debajo acero (no plata)", () => {
  assert.equal(medallaDe("league_challenge", 1, 0).className, "cp-rank-gold");
  assert.equal(medallaDe("league_challenge", 2, 1).className, "cp-rank-silver");
  assert.equal(medallaDe("league_cup", 4, 2).className, "cp-rank-bronze");
  assert.equal(medallaDe("league_challenge", 6, 3).className, "cp-rank-steel");
});
