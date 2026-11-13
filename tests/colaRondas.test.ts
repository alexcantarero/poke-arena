import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aFormulario, aplicarRespuesta, encolar, forzar, listaParaGuardar, parseCola, porSubir, quitar, recordCon, siguienteRonda,
  type RondaEnCola,
} from "../src/lib/colaRondas.ts";

const r = (o: Partial<RondaEnCola>): RondaEnCola => ({
  torneoId: "t1", ronda: 1, resultado: "a", rival: "arch:drago", rivalNombre: "Dragapult ex", oponente: "", primero: "",
  especial: "", miMazo: "", conocida: false, creado: 1, estado: "pendiente", detalle: "", forzar: false, ...o,
});

test("una entrada por ronda: volver a apuntar la 2 sustituye la 2 de la cola, y la cola va en orden", () => {
  let c = encolar([], r({ ronda: 2, resultado: "b" }));
  c = encolar(c, r({ ronda: 1 }));
  c = encolar(c, r({ ronda: 2, resultado: "a", estado: "error", detalle: "x" }));
  assert.deepEqual(c.map((x) => [x.ronda, x.resultado, x.estado, x.detalle]), [[1, "a", "pendiente", ""], [2, "a", "pendiente", ""]]);
  assert.deepEqual(quitar(c, 1).map((x) => x.ronda), [2]);
});

test("al servidor van los mismos campos que el formulario de ronda, en modo rápido", () => {
  assert.deepEqual(aFormulario(r({ ronda: 3, resultado: "tie", primero: "b", oponente: "Marta", miMazo: "d-9", conocida: true })), {
    tournamentId: "t1", round: "3", mode: "quick", result: "tie", conocida: "1", forzar: "0",
    opponentName: "Marta", deckAId: "d-9", opponentDeck: "arch:drago", g0_first: "b",
  });
  // Bye y no presentado: sin mazo del rival ni quién empezó.
  const bye = aFormulario(r({ especial: "bye", rival: "", primero: "a" }));
  assert.equal(bye.bye, "1"); assert.equal(bye.opponentDeck, undefined); assert.equal(bye.g0_first, undefined);
  assert.equal(aFormulario(r({ especial: "np-rival" })).np, "rival");
  assert.equal(aFormulario(r({ especial: "np-yo", resultado: "b" })).np, "yo");
});

test("la respuesta del servidor: entra → fuera de la cola; choca → espera decisión; rechaza → error con motivo", () => {
  const c = [r({ ronda: 1 }), r({ ronda: 2 }), r({ ronda: 3 })];
  assert.deepEqual(aplicarRespuesta(c, 1, { ok: true }).map((x) => x.ronda), [2, 3]);
  assert.deepEqual(aplicarRespuesta(c, 1, { ok: true, yaEstaba: true }).map((x) => x.ronda), [2, 3]);
  const choca = aplicarRespuesta(c, 2, { ok: false, error: "ya hay otra", conflicto: { resultado: "b", rival: "Pablo" } });
  assert.equal(choca[1].estado, "conflicto");
  assert.equal(choca[1].detalle, "derrota contra Pablo");
  // Las que chocan no se reintentan solas; «usar la mía» las devuelve a la cola forzando.
  assert.deepEqual(porSubir(choca).map((x) => x.ronda), [1, 3]);
  const mia = forzar(choca, 2);
  assert.deepEqual([mia[1].estado, mia[1].forzar, aFormulario(mia[1]).forzar], ["pendiente", true, "1"]);
  const mal = aplicarRespuesta(c, 3, { ok: false, error: "Este Challenge tiene 5 rondas y no hay top cut: la ronda 6 no existe." });
  assert.equal(mal[2].estado, "error");
  assert.match(mal[2].detalle, /5 rondas/);
  // Un error se puede reintentar (p. ej. el torneo se abrió después).
  assert.deepEqual(porSubir(mal).map((x) => x.ronda), [1, 2, 3]);
});

test("el récord mezcla servidor y cola, y la cola manda en sus rondas", () => {
  const servidor = [{ ronda: 1, r: "w" as const }, { ronda: 2, r: "l" as const }, { ronda: 3, r: null }];
  assert.deepEqual(recordCon(servidor, []), { w: 1, l: 1, t: 0, puntos: 3, rondas: 3 });
  const cola = [r({ ronda: 2, resultado: "a", conocida: true }), r({ ronda: 4, resultado: "tie" })];
  assert.deepEqual(recordCon(servidor, cola), { w: 2, l: 0, t: 1, puntos: 7, rondas: 4 });
  assert.equal(siguienteRonda(servidor, cola, null), 5);
  assert.equal(siguienteRonda(servidor, cola, 5), 5);
  assert.equal(siguienteRonda(servidor, cola, 4), null); // torneo completo
  assert.equal(siguienteRonda([], [], 5), 1);
});

test("lo guardado en el teléfono se lee con cuidado: basura fuera, sin reventar", () => {
  assert.deepEqual(parseCola(null, "t1"), []);
  assert.deepEqual(parseCola("{no es json", "t1"), []);
  assert.deepEqual(parseCola('{"a":1}', "t1"), []);
  const c = parseCola(JSON.stringify([
    r({ ronda: 2, estado: "conflicto", detalle: "derrota" }),
    { ronda: 0, resultado: "a" }, { ronda: 3, resultado: "zzz" }, null, "x",
    { ronda: 1, especial: "bye", resultado: "b", rival: "arch:x", primero: "a" },
  ]), "t1");
  assert.deepEqual(c.map((x) => [x.ronda, x.resultado, x.estado, x.rival]), [[1, "a", "pendiente", ""], [2, "a", "conflicto", "arch:drago"]]);
  assert.equal(c[0].torneoId, "t1");
});

test("cuándo se puede guardar: resultado y mazo del rival, salvo bye o no presentado; y mi mazo si no estaba fijado", () => {
  const base = { resultado: "a", rival: "arch:x", especial: "" as const, miMazo: "", mazoFijado: true };
  assert.equal(listaParaGuardar(base), true);
  assert.equal(listaParaGuardar({ ...base, rival: "" }), false);
  assert.equal(listaParaGuardar({ ...base, resultado: "" }), false);
  assert.equal(listaParaGuardar({ ...base, resultado: "", rival: "", especial: "bye" }), true);
  assert.equal(listaParaGuardar({ ...base, mazoFijado: false }), false);
  assert.equal(listaParaGuardar({ ...base, mazoFijado: false, miMazo: "arch:y" }), true);
});
