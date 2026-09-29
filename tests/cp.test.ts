import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bflBucket, computeCp, cpForPlacement, awardsCp, effectiveCp, explainCp, seasonOfDate,
  simulate, tierFor, type CpResultInput,
} from "../src/lib/cp.ts";

const r = (over: Partial<CpResultInput> & { id: string; kind: string; placement: number | null }): CpResultInput => ({
  date: "2026-01-01", playerCount: 40, cpEarned: 0, cpManual: false, tournamentName: "T", ...over,
});

test("tabla de CP por puesto", () => {
  assert.equal(cpForPlacement(2026, "league_cup", 1, 40), 50);
  assert.equal(cpForPlacement(2026, "league_cup", 3, 40), 32);
  assert.equal(cpForPlacement(2026, "league_challenge", 1, 20), 15);
  assert.equal(cpForPlacement(2026, "regional", 1, 900), 350);
  assert.equal(cpForPlacement(2026, "international", 1, 1500), 500);
});

test("el kicker de asistencia apaga los tramos bajos", () => {
  // 9.º-16.º en una League Challenge necesita 48 jugadores.
  assert.equal(cpForPlacement(2026, "league_challenge", 9, 30), 0);
  assert.equal(cpForPlacement(2026, "league_challenge", 9, 60), 6);
});

test("los torneos que no dan CP devuelven null", () => {
  assert.equal(cpForPlacement(2026, "store", 1, 20), null);
  assert.equal(awardsCp(2026, "store"), false);
  assert.equal(awardsCp(2026, "regional"), true);
});

test("los alias puntúan como su equivalente y comparten contador", () => {
  assert.equal(cpForPlacement(2026, "pokemon_cup", 1, 40), 50);
  assert.equal(bflBucket(2026, "pokemon_cup"), "league_cup");
  assert.equal(bflBucket(2026, "pokemon_challenge"), "league_challenge");
  assert.equal(bflBucket(2026, "special"), "regional");
});

test("el Best Finish Limit descarta los peores resultados", () => {
  // Los límites de esta liga son de casa y no los oficiales: 4 Challenges,
  // 4 Cups y 5 Regionales. Siete League Cups, límite 4: se caen las tres
  // peores. Si alguien cambia el `bfl` en cp.ts, esta prueba lo avisa.
  const results = [50, 40, 32, 24, 20, 16, 13].map((cp, i) =>
    r({ id: "c" + i, kind: "league_cup", placement: null, cpEarned: cp, cpManual: true }));
  const out = computeCp(2026, results);
  assert.equal(out.total, 50 + 40 + 32 + 24);
  assert.equal(out.rows.filter((x) => x.excluded).length, 3);
  assert.deepEqual(
    out.rows.filter((x) => x.excluded).map((x) => x.cpEarned).sort((a, b) => b - a),
    [20, 16, 13],
  );
});

test("los límites de casa son 4 Challenges, 4 Cups y 5 Regionales", () => {
  // Cada contador va por separado: ocho Cups y ocho Challenges no compiten
  // entre sí. Si algún día se quiere un único cubo de 4 para los dos, se pone
  // `sharesBflWith: "league_cup"` en `league_challenge` y esta prueba cae.
  const many = (kind: string, n: number, cp: number) =>
    Array.from({ length: n }, (_, i) =>
      r({ id: `${kind}${i}`, kind, placement: null, cpEarned: cp, cpManual: true }));

  for (const season of [2026, 2027]) {
    const out = computeCp(season, [
      ...many("league_challenge", 6, 15),
      ...many("league_cup", 6, 50),
      ...many("regional", 7, 100),
    ]);
    const b = (k: string) => out.buckets.find((x) => x.bucket === k);
    assert.equal(b("league_challenge")?.bfl, 4, `challenges en ${season}`);
    assert.equal(b("league_cup")?.bfl, 4, `cups en ${season}`);
    assert.equal(b("regional")?.bfl, 5, `regionales en ${season}`);
    assert.equal(out.total, 4 * 15 + 4 * 50 + 5 * 100, `total en ${season}`);
  }
});

test("Pokémon Cup y League Cup compiten por los mismos cuatro huecos", () => {
  const cups = [1, 2, 3, 4].map((i) =>
    r({ id: "lc" + i, kind: "league_cup", placement: 1, playerCount: 40 }));
  const extra = r({ id: "pc1", kind: "pokemon_cup", placement: 1, playerCount: 40 });
  const out = computeCp(2026, [...cups, extra]);
  assert.equal(out.total, 4 * 50, "el quinto resultado no debe sumar");
  assert.equal(out.rows.filter((x) => x.excluded).length, 1);
  const bucket = out.buckets.find((b) => b.bucket === "league_cup");
  assert.equal(bucket?.counting, 4);
  assert.equal(bucket?.spare, 0);
});

test("los Internationals no tienen límite", () => {
  const ics = [1, 2, 3, 4, 5, 6, 7].map((i) =>
    r({ id: "ic" + i, kind: "international", placement: 1, playerCount: 1000 }));
  assert.equal(computeCp(2026, ics).total, 7 * 500);
});

test("un valor puesto a mano manda sobre la tabla", () => {
  const out = computeCp(2026, [r({ id: "x", kind: "league_cup", placement: 1, cpEarned: 7, cpManual: true })]);
  assert.equal(out.total, 7);
});

test("los huecos libres de cada contador se cuentan bien", () => {
  const out = computeCp(2026, [
    r({ id: "a", kind: "league_cup", placement: 1 }),
    r({ id: "b", kind: "league_cup", placement: 2 }),
  ]);
  const bucket = out.buckets.find((b) => b.bucket === "league_cup");
  assert.equal(bucket?.counting, 2);
  // Cuatro huecos de Cup, dos usados.
  assert.equal(bucket?.spare, 2);
});

test("la simulación dice la ganancia real, no la nominal", () => {
  const llenos = [1, 1, 1, 1, 1, 1].map((_, i) =>
    r({ id: "f" + i, kind: "league_cup", placement: 1, playerCount: 40 }));
  // Con los seis huecos ocupados por primeros puestos, un 3.º no aporta nada.
  const nada = simulate(2026, llenos, { kind: "league_cup", placement: 3, playerCount: 40 });
  assert.equal(nada.gain, 0);

  // Con solo dos resultados, sí aporta.
  const hueco = simulate(2026, llenos.slice(0, 2), { kind: "league_cup", placement: 3, playerCount: 40 });
  assert.equal(hueco.gain, 32);
});

test("la temporada 2027 ya tiene cifras confirmadas", () => {
  assert.equal(computeCp(2027, []).confirmed, true);
  assert.equal(computeCp(2026, []).confirmed, true);
});

test("sin asistencia conocida no se activa un tramo que exige mínimo", () => {
  // Era la puerta de atrás: dejar en blanco "cantidad de gente" y cobrar el
  // tramo de 48 personas en una League Challenge de seis.
  assert.equal(cpForPlacement(2026, "league_challenge", 9, null), 0);
  assert.equal(cpForPlacement(2026, "league_challenge", 9, 0), 0);
  // Un primer puesto no exige mínimo, así que sí cobra.
  assert.equal(cpForPlacement(2026, "league_challenge", 1, null), 15);
});

test("la temporada se deduce de la fecha: julio abre la siguiente", () => {
  assert.equal(seasonOfDate("2026-06-30"), 2026);
  assert.equal(seasonOfDate("2026-07-01"), 2027);
  assert.equal(seasonOfDate("2026-12-15"), 2027);
  assert.equal(seasonOfDate("2027-01-10"), 2027);
  assert.equal(seasonOfDate(null), null);
  assert.equal(seasonOfDate("no es una fecha"), null);
});

/* ------------------------------------------------- temporada 2027 ------ */

test("los kickers de 2027 son los oficiales", () => {
  // Un 2.º puesto cobra con 4 personas; con 3 no.
  assert.equal(cpForPlacement(2027, "league_challenge", 2, 4), 12);
  assert.equal(cpForPlacement(2027, "league_challenge", 2, 3), 0);
  // Un 5.º-8.º de Challenge necesita 14; de Cup, 17.
  assert.equal(cpForPlacement(2027, "league_challenge", 5, 14), 8);
  assert.equal(cpForPlacement(2027, "league_challenge", 5, 13), 0);
  assert.equal(cpForPlacement(2027, "league_cup", 5, 17), 25);
  assert.equal(cpForPlacement(2027, "league_cup", 5, 16), 0);
  // Y los topes de cada tabla.
  assert.equal(cpForPlacement(2027, "league_cup", 64, 128), 13);
  assert.equal(cpForPlacement(2027, "regional", 1, 200), 350);
  assert.equal(cpForPlacement(2027, "international", 1, 900), 500);
  assert.equal(cpForPlacement(2027, "international", 1024, 2049), 42);
});

test("regionales e internacionales comparten los cinco huecos", () => {
  assert.equal(bflBucket(2027, "international"), "regional");
  assert.equal(bflBucket(2027, "special"), "regional");

  // Seis resultados entre los dos tipos: solo cuentan los cinco mejores.
  const rows = [
    r({ id: "1", kind: "international", placement: 1, playerCount: 900 }),   // 500
    r({ id: "2", kind: "regional", placement: 1, playerCount: 300 }),        // 350
    r({ id: "3", kind: "regional", placement: 2, playerCount: 300 }),        // 325
    r({ id: "4", kind: "regional", placement: 3, playerCount: 300 }),        // 300
    r({ id: "5", kind: "regional", placement: 5, playerCount: 300 }),        // 280
    r({ id: "6", kind: "regional", placement: 9, playerCount: 300 }),        // 200, fuera
  ];
  const out = computeCp(2027, rows);
  assert.equal(out.total, 500 + 350 + 325 + 300 + 280);
  assert.equal(out.rows.find((x) => x.id === "6")?.excluded, true);
});

test("challenges y cups tienen cuatro huecos cada uno, por separado", () => {
  const bucket = (k: string) => bflBucket(2027, k);
  assert.equal(bucket("league_challenge"), "league_challenge");
  assert.equal(bucket("pokemon_challenge"), "league_challenge");
  assert.equal(bucket("league_cup"), "league_cup");
  assert.equal(bucket("pokemon_cup"), "league_cup");

  const five = (kind: string, cp: number[]) =>
    cp.map((_, i) => r({ id: `${kind}${i}`, kind, placement: 1, playerCount: 50 }));
  const out = computeCp(2027, [...five("league_challenge", [1, 2, 3, 4, 5]), ...five("league_cup", [1, 2, 3, 4, 5])]);
  // 4 challenges de 15 + 4 cups de 50, y el quinto de cada uno fuera.
  assert.equal(out.total, 4 * 15 + 4 * 50);
});

test("el tramo dice si además da invitación al Mundial", () => {
  assert.equal(tierFor(2027, "regional", 1, 300)?.invite, true);
  assert.equal(tierFor(2027, "regional", 2, 300)?.invite, false);
  assert.equal(tierFor(2027, "international", 4, 900)?.invite, true);
  assert.equal(tierFor(2027, "international", 5, 900)?.invite, false);
  // El kicker apaga los puntos, no la invitación.
  const t = tierFor(2027, "league_cup", 5, 10);
  assert.equal(t?.cp, 0);
  assert.equal(t?.blockedByKicker, true);
  assert.equal(t?.needed, 17);
});

/* ================= la asistencia que se rellena después (v0.9.0) ========= */

const res = (placement: number | null, over: Partial<{ cpEarned: number; cpManual: boolean }> = {}) =>
  ({ placement, cpEarned: 0, cpManual: false, ...over });

test("sin asistencia, un puesto con kicker no puntúa", () => {
  // 15.º en un League Challenge: el tramo 9-16 da 6 CP pero pide 25 personas.
  assert.equal(effectiveCp(2027, "league_challenge", res(15), null), 0);
});

test("al poner la asistencia, el mismo resultado pasa a valer lo suyo", () => {
  // Es literalmente el caso de «me tendría que haber llevado 6».
  assert.equal(effectiveCp(2027, "league_challenge", res(15), 25), 6);
  assert.equal(effectiveCp(2027, "league_challenge", res(15), 40), 6);
});

test("con gente de menos sigue siendo cero, y eso no es un fallo", () => {
  assert.equal(effectiveCp(2027, "league_challenge", res(15), 24), 0);
});

test("un CP puesto a mano no lo pisa nadie", () => {
  assert.equal(effectiveCp(2027, "league_challenge", res(15, { cpEarned: 99, cpManual: true }), null), 99);
  assert.equal(effectiveCp(2027, "league_challenge", res(15, { cpEarned: 99, cpManual: true }), 40), 99);
});

test("effectiveCp no se fía de la columna cuando no es manual", () => {
  // La columna dice 0 (se guardó sin asistencia) pero ahora hay 25 personas.
  assert.equal(effectiveCp(2027, "league_challenge", res(15, { cpEarned: 0 }), 25), 6);
});

test("explainCp distingue los tres motivos de un cero", () => {
  const sinAsistencia = explainCp(2027, "league_challenge", res(15), null);
  assert.equal(sinAsistencia.kind, "no-attendance");
  if (sinAsistencia.kind === "no-attendance") {
    assert.equal(sinAsistencia.wouldBe, 6);
    assert.equal(sinAsistencia.needs, 25);
  }

  const pocaGente = explainCp(2027, "league_challenge", res(15), 20);
  assert.equal(pocaGente.kind, "kicker");
  if (pocaGente.kind === "kicker") {
    assert.equal(pocaGente.have, 20);
    assert.equal(pocaGente.needs, 25);
    assert.equal(pocaGente.wouldBe, 6);
  }

  assert.equal(explainCp(2027, "league_challenge", res(null), 40).kind, "no-placement");
  assert.equal(explainCp(2027, "store", res(1), 40).kind, "no-cp");
});

test("el primer puesto no depende de la asistencia: su kicker es cero", () => {
  assert.equal(effectiveCp(2027, "league_challenge", res(1), null), 15);
  assert.equal(explainCp(2027, "league_challenge", res(1), null).kind, "ok");
});

test("las tablas de 2026 y 2027 no son la misma, y por eso importa la temporada", () => {
  // 5.º en un Challenge: en 2027 pide 14 personas y en 2026 pedía 24.
  assert.equal(effectiveCp(2027, "league_challenge", res(5), 20), 8);
  assert.equal(effectiveCp(2026, "league_challenge", res(5), 20), 0);
});

/* ------------------------- v0.13 · oficial: contrastado el 28/09/2026 -- */

import { CP_2027 } from "../src/lib/cp.ts";

const OFICIAL_2027: Record<string, Array<[number, number, number, number]>> = {
  // [desde, hasta, CP, kicker]
  league_challenge: [[1,1,15,0],[2,2,12,4],[3,4,10,8],[5,8,8,14],[9,16,6,25],[17,32,4,48]],
  league_cup: [[1,1,50,0],[2,2,40,4],[3,4,32,8],[5,8,25,17],[9,16,20,48],[17,32,16,80],[33,64,13,128]],
  regional: [[1,1,350,0],[2,2,325,4],[3,4,300,8],[5,8,280,17],[9,16,200,33],[17,32,160,65],
    [33,64,120,129],[65,128,80,257],[129,256,60,513],[257,512,45,1025],[513,1024,22,2049]],
  international: [[1,1,500,0],[2,2,480,4],[3,4,420,8],[5,8,380,17],[9,16,300,33],[17,32,240,65],
    [33,64,180,129],[65,128,140,257],[129,256,100,513],[257,512,85,1025],[513,1024,42,2049]],
};

for (const [kind, filas] of Object.entries(OFICIAL_2027)) {
  test(`v0.13 · oficial: ${kind} 2027 coincide con championships.pokemon.com`, () => {
    const tiers = CP_2027.events[kind].tiers!;
    assert.deepEqual(tiers.map((t) => [t.from, t.to, t.cp, t.minPlayers]), filas);
  });
}

test("v0.13 · oficial: BFL 4 + 4 sin compartir; 5 compartido entre Regional, Special e IC", () => {
  assert.equal(CP_2027.events.league_challenge.bfl, 4);
  assert.equal(CP_2027.events.league_cup.bfl, 4);
  assert.notEqual(bflBucket(2027, "league_challenge"), bflBucket(2027, "league_cup"));
  assert.equal(bflBucket(2027, "pokemon_cup"), bflBucket(2027, "league_cup"));
  assert.equal(bflBucket(2027, "special"), bflBucket(2027, "regional"));
  assert.equal(bflBucket(2027, "international"), bflBucket(2027, "regional"));
});
