import { test } from "node:test";
import assert from "node:assert/strict";
import { detectarCabeceraMes, fechaDe, parseEventosPegados, tipoDe } from "../src/lib/eventosPegados.ts";

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
  assert.equal(tipoDe("Regional Championships"), "regional");
  assert.equal(tipoDe("Special Event"), "special");
  assert.equal(tipoDe("Prerelease"), null);
});

test("detectarCabeceraMes", () => {
  const ref = new Date("2026-10-04T12:00:00Z");
  assert.deepEqual(detectarCabeceraMes("CTUBRE", ref), { mes: 10, anio: 2026 });
  assert.deepEqual(detectarCabeceraMes("OCTUBRE", ref), { mes: 10, anio: 2026 });
  assert.deepEqual(detectarCabeceraMes("NOVIEMBRE", ref), { mes: 11, anio: 2026 });
  assert.deepEqual(detectarCabeceraMes("NOVIEMBRE 2026", ref), { mes: 11, anio: 2026 });
  assert.equal(detectarCabeceraMes("CHALLENGE Sábado 3 - 16:30 Freakshow", ref), null);
  assert.equal(detectarCabeceraMes("Oct 4, 2026", ref), null);
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

test("formato compacto WhatsApp: lista por meses con Challenges, Cups y Regionales", () => {
  const txt = `CTUBRE 
CHALLENGE Sábado 3 - 16:30 Freakshow (Girona)
CUP Domingo 4 - 10:30 Mythic (Calella)
CHALLENGE Domingo 4 - 16:30 Mythic (Calella)
CHALLENGE Miércoles 7 - 17:30 Vanilla Games (Reus)
CHALLENGE Sábado 10 - 10:00 DeckTCG (Sant Boi)
CHALLENGE Sábado 10 - 16:30 TCG Legacy (Palleja)
CHALLENGE Domingo 11 - 17:00 Decksden (Barcelona)
REGIONAL NIZA 17-18
CUP Sábado 17 - 10:00 DeckTCG (Sant Boi)
CHALLENGE Domingo 17 - 17:00 Homoludicus (Granollers)
CHALLENGE Lunes 25 - 17:00 La órden del friki (La Llagosta)


NOVIEMBRE 
CHALLENGE Domingo 1 - 10:30 Mythic (Calella)
CHALLENGE Viernes 6 - 17:30 Doki Doki Daus (Mataró)
CHALLENGE Sábado 7 - 16:30 MonkeyWorld13 (Reus)
CHALLENGE Sábado 14 - 16:30 Freakshow (Girona)
CUP Sábado 14 - 17:00 Vanilla Games (Reus)
CHALLENGE Sábado 15 - 17:00 Decksden (Barcelona)
CHALLENGE Sábado 21 - 10:00 DeckTCG (Sant Boi)
CHALLENGE Sábado 21 - 17:00 Homoludicus (Granollers)
CHALLENGE Sábado 25 - 17:30 Vanilla Games (Reus)
REGIONAL GDANSK 30-1`;

  const ref = new Date("2026-10-04T12:00:00Z");
  const { eventos } = parseEventosPegados(txt, ref);

  assert.equal(eventos.length, 21, "debe reconocer los 21 torneos de la lista");

  // Octubre
  const freakshow1 = eventos.find((e) => e.date === "2026-10-03");
  assert.ok(freakshow1);
  assert.equal(freakshow1.kind, "league_challenge");
  assert.equal(freakshow1.time, "16:30");
  assert.equal(freakshow1.store, "Freakshow");
  assert.equal(freakshow1.location, "Girona");
  assert.equal(freakshow1.title, "League Challenge · Freakshow");

  // Mismo día, dos torneos distintos (Cup por la mañana, Challenge por la tarde)
  const mythicCup = eventos.find((e) => e.date === "2026-10-04" && e.kind === "league_cup");
  const mythicCh = eventos.find((e) => e.date === "2026-10-04" && e.kind === "league_challenge");
  assert.ok(mythicCup && mythicCh);
  assert.equal(mythicCup.time, "10:30");
  assert.equal(mythicCh.time, "16:30");
  assert.notEqual(mythicCup.id, mythicCh.id);

  // Regional de Niza con rango de fechas
  const niza = eventos.find((e) => e.store === "Niza");
  assert.ok(niza);
  assert.equal(niza.kind, "regional");
  assert.equal(niza.date, "2026-10-17");
  assert.equal(niza.endDate, "2026-10-18");
  assert.equal(niza.title, "Regional de Niza");

  // Discrepancias de día de semana detectadas y avisadas en notas
  const homoludicus1 = eventos.find((e) => e.date === "2026-10-17" && e.kind === "league_challenge");
  assert.ok(homoludicus1);
  assert.match(homoludicus1.note ?? "", /decía «domingo 17», pero el 17 es sábado/i);

  const ordenFriki = eventos.find((e) => e.date === "2026-10-25");
  assert.ok(ordenFriki);
  assert.match(ordenFriki.note ?? "", /decía «lunes 25», pero el 25 es domingo/i);

  const decksdenNov = eventos.find((e) => e.date === "2026-11-15");
  assert.ok(decksdenNov);
  assert.match(decksdenNov.note ?? "", /decía «sábado 15», pero el 15 es domingo/i);

  const vanillaNov = eventos.find((e) => e.date === "2026-11-25");
  assert.ok(vanillaNov);
  assert.match(vanillaNov.note ?? "", /decía «sábado 25», pero el 25 es miércoles/i);

  // Regional de Gdansk con fin de semana entre octubre y noviembre
  const gdansk = eventos.find((e) => /gdansk/i.test(e.store));
  assert.ok(gdansk);
  assert.equal(gdansk.kind, "regional");
  assert.equal(gdansk.endDate, "2026-11-01");

  // Idempotencia
  const segundaVez = parseEventosPegados(txt, ref);
  assert.equal(segundaVez.eventos.length, 21);
  assert.deepEqual(segundaVez.eventos.map((e) => e.id), eventos.map((e) => e.id));
});

test("nombres que contienen CUP o Challenge no se confunden con la etiqueta del tipo", () => {
  const txt = `Copa de Liga
Mythic L. CUP October
CARRER DE LA BRUGUERA, 129, 08370 CALELLA, BARCELONA, SPAIN
sábado, 31 de octubre de 2026 10:30 a.m.

Desafío de Liga
Mythic L. Challenge October
CARRER DE LA BRUGUERA, 129, 08370 CALELLA, BARCELONA, SPAIN
sábado, 31 de octubre de 2026 04:30 p.m.`;
  const { eventos } = parseEventosPegados(txt);
  assert.equal(eventos.length, 2);
  const cup = eventos.find((e) => e.kind === "league_cup")!;
  const ch = eventos.find((e) => e.kind === "league_challenge")!;
  assert.equal(cup.store, "Mythic L. CUP October");
  assert.equal(cup.title, "League Cup · Mythic L. CUP October");
  assert.equal(cup.location, "CARRER DE LA BRUGUERA, 129, 08370 CALELLA, BARCELONA, SPAIN");
  assert.equal(cup.date, "2026-10-31");
  assert.equal(cup.time, "10:30");
  assert.equal(ch.store, "Mythic L. Challenge October");
  assert.equal(ch.time, "16:30"); // 04:30 p.m. → 16:30
});

test("mismo texto sin líneas vacías: se separan igual", () => {
  const txt = `Copa de Liga
Mythic L. CUP October
CARRER DE LA BRUGUERA, 129, 08370 CALELLA, BARCELONA, SPAIN
sábado, 31 de octubre de 2026 10:30 a.m.
Desafío de Liga
Mythic L. Challenge October
CARRER DE LA BRUGUERA, 129, 08370 CALELLA, BARCELONA, SPAIN
sábado, 31 de octubre de 2026 04:30 p.m.`;
  const { eventos } = parseEventosPegados(txt);
  assert.deepEqual(
    eventos.map((e) => [e.kind, e.store, e.time]).sort(),
    [["league_challenge", "Mythic L. Challenge October", "16:30"], ["league_cup", "Mythic L. CUP October", "10:30"]],
  );
});

test("nombre con «Legue Challenge» y etiqueta «League Challenge - TCG»", () => {
  const txt = `Desafío de Liga
Legue Challenge TCG at Infiniti World
CARRER DE LA MARE DE DÉU DE LORDA, 45, 08913 SANTA COLOMA DE GRAMENET, BARCELONA, SPAIN
sábado, 31 de octubre de 2026 10:00 a.m.

League Challenge - TCG
LORCANOS - TCG League Challenge October
CARRER D'IGNASI IGLESIAS, 10, 08912 BADALONA, BARCELONA, SPAIN
sábado, 31 de octubre de 2026 10:30 a.m.`;
  const { eventos } = parseEventosPegados(txt);
  assert.deepEqual(
    eventos.map((e) => [e.kind, e.store, e.time]).sort(),
    [["league_challenge", "LORCANOS - TCG League Challenge October", "10:30"],
     ["league_challenge", "Legue Challenge TCG at Infiniti World", "10:00"]],
  );
});
