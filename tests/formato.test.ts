import { test } from "node:test";
import assert from "node:assert/strict";
import { diasHasta, estadoFormato, legalDe, type ExpansionDato, type FormatoDato } from "../src/lib/formato.ts";
import { EXPANSIONES, FORMATO_ESTANDAR } from "../src/data/formatoEstandar.ts";

const exps: ExpansionDato[] = [
  { nombre: "A", salida: "2026-07-17", oficial: true },
  { nombre: "B", salida: "2026-09-16", oficial: true },
  { nombre: "C", salida: "2026-11-06", legal: "2026-11-20", legalCalculada: true, oficial: true },
  { nombre: "D", salida: "2027-02-05", oficial: false },
];
const fmt: FormatoDato = {
  marcas: ["H", "I", "J"], desde: "Temporal Forces",
  rotacionAnterior: { fecha: "2026-04-10", sale: "G", quedan: ["H", "I", "J"], oficial: true },
  rotacionSiguiente: { fecha: null, sale: "H", quedan: ["I", "J"], oficial: false, estimada: "2027-04" },
  finTemporada: { nombre: "Mundial 2027", desde: "2027-08-13", hasta: "2027-08-15", lugar: "Singapore EXPO" },
  revisado: "2026-11-06",
};

test("días hasta una fecha", () => {
  assert.equal(diasHasta("2026-11-20", "2026-11-06"), 14);
  assert.equal(diasHasta("2026-11-01", "2026-11-06"), -5);
  assert.equal(legalDe(exps[0]), "2026-07-17");
  assert.equal(legalDe(exps[2]), "2026-11-20");
});

test("EL HUECO DE DOS SEMANAS: a la venta hoy, pero todavía vale la anterior", () => {
  const e = estadoFormato("2026-11-06", exps, fmt);
  assert.equal(e.actual?.nombre, "B");
  assert.equal(e.enEspera?.nombre, "C");
  assert.equal(e.enEspera?.diasParaLegal, 14);
  assert.equal(e.proxima?.nombre, "D");
  assert.equal(e.proxima?.diasParaSalida, 91);
});

test("el día que pasa a ser legal, ya es la actual y no hay espera", () => {
  const e = estadoFormato("2026-11-20", exps, fmt);
  assert.equal(e.actual?.nombre, "C");
  assert.equal(e.enEspera, null);
  assert.equal(e.proxima?.nombre, "D");
});

test("sin legal explícita, vale desde la salida", () => {
  const e = estadoFormato("2026-09-16", exps, fmt);
  assert.equal(e.actual?.nombre, "B");
  assert.equal(e.enEspera, null);
  assert.equal(e.proxima?.nombre, "C");
});

test("rotación sin anunciar: sin días; temporada con su cuenta atrás", () => {
  const e = estadoFormato("2026-11-06", exps, fmt);
  assert.equal(e.rotacion.dias, null);
  assert.equal(e.rotacion.estimada, "2027-04");
  assert.deepEqual(e.marcas, ["H", "I", "J"]);
  assert.equal(e.finTemporada.dias, 280);
});

test("si la rotación anunciada ya pasó y nadie tocó el fichero, las marcas siguen la rotación", () => {
  const conFecha: FormatoDato = { ...fmt, rotacionSiguiente: { ...fmt.rotacionSiguiente, fecha: "2027-04-09", oficial: true } };
  assert.equal(estadoFormato("2027-01-10", exps, conFecha).rotacion.dias, 89);
  const tarde = estadoFormato("2027-05-01", exps, conFecha);
  assert.deepEqual(tarde.marcas, ["I", "J"]);
  assert.equal(tarde.rotacion.dias, null);
  assert.equal(tarde.proxima, null);
});

test("los datos reales del fichero se leen y tienen sentido", () => {
  const e = estadoFormato("2026-11-06", EXPANSIONES, FORMATO_ESTANDAR);
  assert.equal(e.actual?.nombre, "30th Celebration");
  assert.equal(e.enEspera?.nombre, "Delta Reign");
  assert.equal(e.proxima?.nombre, "Flowing Fists");
  assert.equal(e.proxima?.oficial, false);
  // Fechas bien formadas y en orden.
  for (const x of EXPANSIONES) assert.match(x.salida, /^\d{4}-\d{2}-\d{2}$/);
  const fechas = EXPANSIONES.map((x) => x.salida);
  assert.deepEqual(fechas, [...fechas].sort());
});
