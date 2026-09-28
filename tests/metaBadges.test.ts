import { test } from "node:test";
import assert from "node:assert/strict";
import {
  arquetiposEnCorte, conversion, cuota, insigniasDe, ordenaPorCuota, tasaDelCampo,
  UMBRALES, type CampoMeta, type FilaMeta,
} from "../src/lib/metaBadges.ts";

/* =========================================================================
   El fixture es el Regional de Baltimore del 18 de septiembre de 2026, con
   los números que publica ciphermaniac: 3.122 jugadores, 3.118 listas, 559 a
   Día 2, top 8, cinco arquetipos distintos en el corte.

   Sirve de doble comprobación: si el módulo saca las mismas cuatro frases
   que saca su web con los mismos datos, es que la lógica coincide.
   ========================================================================= */

const CAMPO: CampoMeta = { decks: 3118, day2: 559, topCut: 8 };

const fila = (
  key: string, name: string, field: number, day2: number | null,
  cut = 0, onlineShare: number | null = null, bestFinish: number | null = null,
): FilaMeta => ({ key, name, field, day2, cut, onlineShare, bestFinish });

/*
   Ojo con los números: las cuotas de la web tienen DOS denominadores
   distintos y es fácil mezclarlos. El panel «Top archetypes» de su portada es
   una ventana de varios eventos —Dragapult sale al 10,1% con 768 mazos, que
   no cuadra con ningún torneo suelto—, mientras que la insignia de
   «Overbrought» compara el campo DE ESTE evento (18%) con el meta online
   (10%). Aquí todo lo que se llame `field` es de Baltimore y todo lo que se
   llame `onlineShare` es del meta online.
*/
const BALTIMORE: FilaMeta[] = [
  // 17,9% del campo contra 10,1% online: el sobrejugado del evento, +7,8 pp.
  fila("dragapult", "Dragapult", 558, 120, 2, 0.101, 3),
  fila("slowking", "Slowking", 475, 88, 1, 0.140, 4),
  fila("zoroark", "N's Zoroark", 447, 70, 0, 0.150, 12),
  fila("alakazam", "Alakazam Dudunsparce", 444, 80, 1, 0.135, 5),
  fila("basic-box", "Basic Box", 388, 96, 3, 0.110, 1),
  fila("dhelmise", "Dhelmise", 60, 12, 0, 0.042, 40),
  fila("crustle", "Crustle", 40, 6, 1, 0.029, 8),
  // Veinte pilotos, ninguno pasa: la decepción.
  fila("beedrill", "Beedrill", 20, 0, 0, 0.012, null),
  // Seis pilotos, cuatro pasan: el top performer.
  fila("clefairy-ogerpon", "Clefairy Ogerpon", 6, 4, 0, 0.004, 17),
];

/* ----------------------------------------------------- las cuentas base -- */

test("la media del campo es la que publica la web: 559 de 3.118 ≈ 18%", () => {
  const t = tasaDelCampo(CAMPO)!;
  assert.ok(Math.abs(t - 0.1793) < 0.0005, `salió ${t}`);
});

test("conversión de un arquetipo", () => {
  assert.equal(conversion(fila("x", "X", 6, 4)), 4 / 6);
  assert.equal(conversion(fila("x", "X", 20, 0)), 0);
});

test("conversión: sin Día 2 no hay conversión, y no es cero", () => {
  assert.equal(conversion(fila("x", "X", 10, null)), null);
  assert.equal(tasaDelCampo({ decks: 100, day2: null, topCut: 8 }), null);
});

test("conversión: un arquetipo sin mazos no divide por cero", () => {
  assert.equal(conversion(fila("x", "X", 0, 0)), null);
});

test("cuota sobre el campo", () => {
  assert.ok(Math.abs(cuota(BALTIMORE[0], CAMPO) - 0.179) < 0.001);
});

/* ------------------------------------------------------- las insignias -- */

test("Baltimore: las cuatro frases salen como en la web", () => {
  const i = insigniasDe(BALTIMORE, CAMPO);
  assert.equal(i.top?.fila.name, "Clefairy Ogerpon");
  assert.ok(Math.abs(i.top!.valor - 4 / 6) < 1e-9);          // 67%
  assert.equal(i.decepcion?.fila.name, "Beedrill");
  assert.equal(i.decepcion?.valor, 0);                        // 0 de 20
  assert.equal(i.sobrejugado?.fila.name, "Dragapult");
  assert.ok(Math.abs(i.sobrejugado!.valor - 7.8) < 0.2);      // ≈ +7,8 pp
  assert.equal(i.espejo?.fila.name, "Basic Box");
  assert.equal(i.espejo?.valor, 3);                           // 3 de 8
});

test("el infrajugado es la cara simétrica, y también es información", () => {
  const i = insigniasDe(BALTIMORE, CAMPO);
  // Dhelmise: 60/3118 = 1,9% en el campo contra 4,2% online, −2,3 pp.
  assert.equal(i.infrajugado?.fila.name, "Dhelmise");
  assert.ok(i.infrajugado!.valor < 0);
});

/* ------------------------------------------- lo que evita contar cuentos -- */

test("un mazo que convierte al 100% con tres pilotos no se corona", () => {
  const filas = [...BALTIMORE, fila("chiripa", "Chiripa", 3, 3)];
  const i = insigniasDe(filas, CAMPO);
  assert.notEqual(i.top?.fila.name, "Chiripa");
  assert.equal(i.top?.fila.name, "Clefairy Ogerpon");
});

test("un 0% con cuatro pilotos no es una decepción, es mala suerte", () => {
  const filas = [...BALTIMORE, fila("malasuerte", "Mala Suerte", 4, 0)];
  const i = insigniasDe(filas, CAMPO);
  assert.equal(i.decepcion?.fila.name, "Beedrill");
});

test("para ser «top» hay que batir a la media del campo, no bastar con convertir", () => {
  // 10% de conversión con muchos pilotos: por encima de cero, por debajo del campo.
  const filas = [fila("tibio", "Tibio", 100, 10)];
  const i = insigniasDe(filas, CAMPO);
  assert.equal(i.top, null);
  // Y como está por debajo de la media y lleva pilotos de sobra, es decepción.
  assert.equal(i.decepcion?.fila.name, "Tibio");
});

test("el mismo mazo no puede ser top y decepción a la vez", () => {
  const i = insigniasDe(BALTIMORE, CAMPO);
  assert.notEqual(i.top?.fila.key, i.decepcion?.fila.key);
});

test("una plaza suelta del corte no es un espejo", () => {
  const filas = BALTIMORE.map((f) => ({ ...f, cut: f.cut > 1 ? 1 : f.cut }));
  const i = insigniasDe(filas, CAMPO);
  assert.equal(i.espejo, null);
});

test("empate a conversión: gana el que lo hizo con más pilotos", () => {
  const filas = [
    fila("pocos", "Pocos", 6, 3),
    fila("muchos", "Muchos", 60, 30),
  ];
  const i = insigniasDe(filas, CAMPO);
  assert.equal(i.top?.fila.name, "Muchos");
});

/* ------------------------------------------------------ casos de borde -- */

test("un evento sin Día 2 no tiene ni top ni decepción, y no se rompe", () => {
  const campo: CampoMeta = { decks: 200, day2: null, topCut: 8 };
  const filas = BALTIMORE.map((f) => ({ ...f, day2: null }));
  const i = insigniasDe(filas, campo);
  assert.equal(i.tasaCampo, null);
  assert.equal(i.top, null);
  assert.equal(i.decepcion, null);
  // El corte sí se puede leer sin Día 2.
  assert.equal(i.espejo?.fila.name, "Basic Box");
});

test("sin meta online no hay comparación de presencia, y tampoco pasa nada", () => {
  const filas = BALTIMORE.map((f) => ({ ...f, onlineShare: null }));
  const i = insigniasDe(filas, CAMPO);
  assert.equal(i.sobrejugado, null);
  assert.equal(i.infrajugado, null);
  assert.equal(i.top?.fila.name, "Clefairy Ogerpon");
});

test("sin nada importado no se rompe nada", () => {
  const i = insigniasDe([], { decks: 0, day2: null, topCut: 0 });
  assert.deepEqual(
    [i.top, i.decepcion, i.sobrejugado, i.infrajugado, i.espejo],
    [null, null, null, null, null],
  );
});

/* ------------------------------------------------------------- tabla -- */

test("arquetiposEnCorte: «5 de 8»", () => {
  const { distintos, plazas } = arquetiposEnCorte(BALTIMORE);
  assert.equal(distintos, 5);
  assert.equal(plazas, 8);
});

test("ordenaPorCuota: primero lo más jugado, y a igualdad el que convirtió", () => {
  const filas = [
    fila("b", "B", 100, 10),
    fila("a", "A", 100, 30),
    fila("c", "C", 200, 1),
  ];
  assert.deepEqual(ordenaPorCuota(filas).map((f) => f.name), ["C", "A", "B"]);
});

test("los umbrales son los documentados", () => {
  assert.equal(UMBRALES.minParaTop, 5);
  assert.equal(UMBRALES.minParaDecepcion, 15);
  assert.ok(UMBRALES.minParaDecepcion > UMBRALES.minParaTop,
    "decir que algo falló tiene que costar más que decir que algo funcionó");
});
