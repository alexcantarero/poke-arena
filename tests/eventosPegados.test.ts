import { test } from "node:test";
import assert from "node:assert/strict";
import { fechaDe, parseEventosPegados, tipoDe } from "../src/lib/eventosPegados.ts";

test("fechaDe: los formatos habituales", () => {
  assert.equal(fechaDe("Sat, Oct 4, 2026 10:00 AM"), "2026-10-04");
  assert.equal(fechaDe("4 oct. 2026"), "2026-10-04");
  assert.equal(fechaDe("sábado, 4 de octubre de 2026"), "2026-10-04");
  assert.equal(fechaDe("04/10/2026"), "2026-10-04");
  assert.equal(fechaDe("2026-10-04"), "2026-10-04");
  assert.equal(fechaDe("Carrer de Balmes 12"), null);
});

test("tipoDe", () => {
  assert.equal(tipoDe("TCG League Cup"), "league_cup");
  assert.equal(tipoDe("Pokémon TCG League Challenge"), "league_challenge");
  assert.equal(tipoDe("Prerelease"), null);
});

test("bloques separados por líneas vacías, con ruido y otros juegos", () => {
  const txt = `
League Challenge - TCG
Sat, Oct 4, 2026 10:00 AM
Tienda Ejemplo BCN
Carrer de Balmes 12, Barcelona
2.3 km
Register

League Cup
Oct 18, 2026 16:30
Otra Tienda
Avinguda Diagonal 400, Barcelona

VGC League Challenge
Oct 11, 2026
Tienda Ejemplo BCN

Prerelease
Oct 25, 2026
Tienda Ejemplo BCN
`;
  const { eventos, ignorados } = parseEventosPegados(txt);
  assert.equal(eventos.length, 2);
  assert.deepEqual(
    { ...eventos[0], id: "" },
    { id: "", date: "2026-10-04", kind: "league_challenge", title: "League Challenge · Tienda Ejemplo BCN",
      store: "Tienda Ejemplo BCN", location: "Carrer de Balmes 12, Barcelona", time: "10:00" },
  );
  assert.equal(eventos[1].kind, "league_cup");
  assert.equal(eventos[1].time, "16:30");
  assert.equal(ignorados, 2); // el de VGC y el prerelease
});

test("sin líneas vacías: corta al aparecer otra fecha; el mismo evento dos veces no se duplica", () => {
  const txt = [
    "League Challenge", "04/10/2026", "Tienda A",
    "League Cup", "18/10/2026", "Tienda B",
  ].join("\n");
  const { eventos } = parseEventosPegados(txt);
  assert.deepEqual(eventos.map((e) => [e.date, e.kind, e.store]), [
    ["2026-10-04", "league_challenge", "Tienda A"],
    ["2026-10-18", "league_cup", "Tienda B"],
  ]);
  const dos = parseEventosPegados("League Cup\n18/10/2026\nTienda B\n\nLeague Cup\n18/10/2026\nTienda B");
  assert.equal(dos.eventos.length, 1);
});
