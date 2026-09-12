import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bflBucket, computeCp, cpForPlacement, awardsCp, seasonOfDate, simulate, type CpResultInput,
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

test("la temporada 2027 existe pero está marcada como no confirmada", () => {
  assert.equal(computeCp(2027, []).confirmed, false);
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
