import { test } from "node:test";
import assert from "node:assert/strict";
import { fichasDeRivales, mazosRecientes, type EncuentroPropio } from "../src/lib/scouting.ts";

const e = (o: Partial<EncuentroPropio>): EncuentroPropio => ({ clave: Math.random().toString(36), rivalId: "alex", fecha: "2026-10-01", r: "w", miMazo: "Dragapult", suMazo: "Gardevoir", ...o });

test("la ficha de un rival: marca, últimos resultados, racha y desglose por mazo", () => {
  const [f] = fichasDeRivales([
    e({ fecha: "2026-09-01", r: "l", suMazo: "Gardevoir" }),
    e({ fecha: "2026-09-15", r: "w", suMazo: "Gardevoir" }),
    e({ fecha: "2026-10-10", r: "w", suMazo: "Raging Bolt", miMazo: "Charizard" }),
    e({ fecha: "2026-10-20", r: "t", suMazo: "" }),
    e({ fecha: "2026-11-01", r: "w", suMazo: "Raging Bolt" }),
    e({ fecha: "2026-11-05", r: "w", suMazo: "Gardevoir" }),
  ]);
  assert.deepEqual([f.rivalId, f.partidas, f.w, f.l, f.t], ["alex", 6, 4, 1, 1]);
  assert.equal(f.pct, 4.5 / 6);
  assert.deepEqual(f.ultimos, ["w", "w", "t", "w", "w", "l"]);
  assert.deepEqual(f.racha, { r: "w", n: 2 });
  assert.equal(f.ultima, "2026-11-05");
  assert.deepEqual(f.porSuMazo, [{ mazo: "Gardevoir", w: 2, l: 1, t: 0 }, { mazo: "Raging Bolt", w: 2, l: 0, t: 0 }]);
  assert.deepEqual(f.porMiMazo.map((x) => [x.mazo, x.w + x.l + x.t]), [["Dragapult", 5], ["Charizard", 1]]);
});

test("una ronda apuntada desde los dos lados cuenta una vez, y manda la primera (la mía)", () => {
  const fs = fichasDeRivales([
    e({ clave: "t1:3:a:b", r: "w" }),
    e({ clave: "t1:3:a:b", r: "l" }), // la misma ronda, vista desde el otro lado y mal apuntada
    e({ clave: "x", rivalId: "rol", r: "l" }),
    e({ clave: "y", rivalId: "", r: "w" }), // sin rival del grupo: fuera
  ]);
  assert.deepEqual(fs.map((f) => [f.rivalId, f.w, f.l]), [["alex", 1, 0], ["rol", 0, 1]]);
});

test("ordenados por partidas jugadas; sin encuentros, lista vacía", () => {
  const fs = fichasDeRivales([e({ rivalId: "a" }), e({ rivalId: "b" }), e({ rivalId: "b" })]);
  assert.deepEqual(fs.map((f) => f.rivalId), ["b", "a"]);
  assert.deepEqual(fichasDeRivales([]), []);
});

test("lo que juega cada uno últimamente: desde una fecha, del más usado al menos", () => {
  const r = mazosRecientes([
    { playerId: "alex", mazo: "Gardevoir", fecha: "2026-10-01" }, { playerId: "alex", mazo: "Gardevoir", fecha: "2026-10-20" },
    { playerId: "alex", mazo: "Raging Bolt", fecha: "2026-11-01" }, { playerId: "alex", mazo: "Viejo", fecha: "2026-05-01" },
    { playerId: "alex", mazo: "", fecha: "2026-11-02" }, { playerId: "rol", mazo: "Dragapult", fecha: "2026-11-02" },
  ], "2026-08-01");
  assert.deepEqual(r.alex, [{ mazo: "Gardevoir", n: 2 }, { mazo: "Raging Bolt", n: 1 }]);
  assert.deepEqual(r.rol, [{ mazo: "Dragapult", n: 1 }]);
});
