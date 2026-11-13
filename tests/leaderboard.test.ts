import { test } from "node:test";
import assert from "node:assert/strict";
import { casarJugadores, normalizarNombre, parseClasificacion } from "../src/lib/leaderboard.ts";

// Nombres inventados salvo el del dueño de la app: en el repo no van clasificaciones reales.
const ESPANA = `Listas de clasificación de Play! Pokémon
VJ
JCC
GO

Spain

Masters

2027 World Championships
1

2

Mostrar:

50

100

Rango	Nombre (país/región)
Champ. Points
?
Play Points
?
1	Ana Pérez Ruiz (ESP)	447	27
2	Íñigo de la Peña (ESP)	432	28
13	Apodo99 (ESP)	230	15
52	Juan Uno (ESP)	134	13
52	Jesús A (ESP)	134	13
82	Ibai Montero (ESP)	108	10
1

2

*Última actualización 10:52 AM - November 13, 2026
©2026 Pokémon.`;

const EUROPA = `Europe

Masters
1	Aarni Ejemplo (FIN)	806	22
24	Ana Pérez Ruiz (ESP)	447	27
166	Simon M (DEU)	250	19
166	Mario J (ITA)	250	19
198	Apodo99 (ESP)	230	15`;

test("EL PEGADO DEL 13/11: filas, zona y fecha de la clasificación de España", () => {
  const c = parseClasificacion(ESPANA);
  assert.equal(c.zona, "es");
  assert.equal(c.filas.length, 6); // los «1» y «2» sueltos de la paginación no son filas
  assert.deepEqual(c.filas[5], { puesto: 82, nombre: "Ibai Montero", pais: "ESP", cp: 108 });
  assert.equal(c.actualizado, "10:52 AM - November 13, 2026");
});

test("Europa: por la cabecera, o deducida porque no todo es ESP; con espacios en vez de tabuladores también", () => {
  assert.equal(parseClasificacion(EUROPA).zona, "eu");
  const sinCabecera = parseClasificacion("1  Aarni Ejemplo (FIN)  806  22\n24  Ana Pérez Ruiz (ESP)  447  27");
  assert.equal(sinCabecera.zona, "eu");
  assert.equal(sinCabecera.filas.length, 2);
  assert.equal(parseClasificacion("82 Ibai Montero (ESP) 108 10").zona, "es");
  assert.deepEqual(parseClasificacion("nada que ver"), { zona: null, filas: [], actualizado: null });
});

test("casar: por el nombre oficial del perfil, sin acentos ni mayúsculas; si no lo tiene, por el de la app", () => {
  const { filas } = parseClasificacion(ESPANA);
  const r = casarJugadores(filas, [
    { id: "ibai", nombre: "Ibai", oficial: "ibai  montero" },
    { id: "ana", nombre: "Anita", oficial: "Ana Perez Ruiz" },
    { id: "apodo", nombre: "Apodo99" }, // sin nombre oficial: vale el de la app
    { id: "otro", nombre: "Ana Pérez Ruiz", oficial: "Otra Persona" }, // con oficial puesto, el de la app NO se usa
    { id: "nadie", nombre: "Nadie" },
  ]);
  assert.deepEqual(r.casados.map((c) => [c.id, c.puesto, c.cp]), [["ana", 1, 447], ["apodo", 13, 230], ["ibai", 82, 108]]);
  assert.deepEqual(r.sinSalir, [{ id: "otro", nombre: "Ana Pérez Ruiz", conOficial: true }, { id: "nadie", nombre: "Nadie", conOficial: false }]);
  assert.equal(normalizarNombre("  Íñigo  DE la Peña "), "inigo de la pena");
});

test("un nombre repetido con puestos distintos es ambiguo y no se asigna; empatados en el mismo puesto, sí", () => {
  const filas = [
    { puesto: 75, nombre: "David Jimenez", pais: "ESP", cp: 116 },
    { puesto: 140, nombre: "David Jiménez", pais: "ESP", cp: 80 },
    { puesto: 52, nombre: "Juan Uno", pais: "ESP", cp: 134 },
  ];
  const r = casarJugadores(filas, [{ id: "d", nombre: "David", oficial: "David Jimenez" }, { id: "j", nombre: "Juan Uno" }]);
  assert.deepEqual(r.ambiguos, [{ id: "d", nombre: "David" }]);
  assert.deepEqual(r.casados.map((c) => c.id), ["j"]);
});
