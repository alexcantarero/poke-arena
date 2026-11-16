import { test } from "node:test";
import assert from "node:assert/strict";
import { cartasDe, clavePrincipal, diffListas, pctDeMarca, versionBase } from "../src/lib/versiones.ts";

const bonito = (s: string) => s[0].toUpperCase() + s.slice(1);

test("el arquetipo principal: el padre si lo tiene; si no, el Pokémon líder", () => {
  const drapion = { id: "a1", name: "Slowking / Drapion", main: "slowking", parentId: null };
  const kyurem = { id: "a2", name: "Slowking / Kyurem", main: "slowking", parentId: null };
  assert.deepEqual(clavePrincipal(drapion, null, bonito), { clave: "l:slowking", nombre: "Slowking" });
  assert.equal(clavePrincipal(kyurem, null, bonito).clave, clavePrincipal(drapion, null, bonito).clave); // EL CASO: van juntos
  assert.deepEqual(clavePrincipal({ ...drapion, parentId: "p9" }, { id: "p9", name: "Slowking Stall" }, bonito), { clave: "p:p9", nombre: "Slowking Stall" });
  assert.deepEqual(clavePrincipal({ id: "a3", name: "Basic Box", main: "" }, null, bonito), { clave: "a:a3", nombre: "Basic Box" });
  assert.deepEqual(clavePrincipal(null, null, bonito, "zz"), { clave: "a:zz", nombre: "—" });
});

test("lo que cambia entre dos versiones, por nombre de carta y sumando copias", () => {
  const base = cartasDe({
    pokemon: [{ n: 4, name: "Slowking", set: "SCR", number: "58" }, { n: 2, name: "Drapion V" }],
    trainer: [{ n: 4, name: "Ultra Ball" }, { n: 2, name: "Boss's Orders" }, { n: 1, name: "Boss's Orders", set: "PAL" }],
    energy: [{ n: 6, name: "Psychic Energy" }],
  });
  assert.equal(base.get("Boss's Orders"), 3); // la misma carta de dos expansiones es una
  const otra = cartasDe({
    pokemon: [{ n: 4, name: "Slowking" }, { n: 2, name: "Kyurem" }],
    trainer: [{ n: 3, name: "Ultra Ball" }, { n: 4, name: "Boss's Orders" }],
    energy: [{ n: 6, name: "Psychic Energy" }],
  });
  const d = diffListas(base, otra);
  assert.deepEqual(d.entran, [{ name: "Kyurem", n: 2 }, { name: "Boss's Orders", n: 1 }]);
  assert.deepEqual(d.salen, [{ name: "Drapion V", n: 2 }, { name: "Ultra Ball", n: 1 }]);
  assert.equal(d.cambios, 3);
  assert.deepEqual(diffListas(base, base), { entran: [], salen: [], cambios: 0 });
});

test("una lista vacía o rota no revienta; la base es la más usada y, a igual uso, la más antigua", () => {
  assert.equal(cartasDe(null).size, 0);
  assert.equal(cartasDe({ pokemon: "x", trainer: [{ n: "dos", name: "A" }, { n: 2 }, { n: 2, name: " B " }] }).get("B"), 2);
  const vs = [{ id: "c", usos: 4, creado: "2026-10-01" }, { id: "a", usos: 36, creado: "2026-09-13" }, { id: "b", usos: 36, creado: "2026-09-01" }];
  assert.equal(versionBase(vs)?.id, "b");
  assert.equal(versionBase([]), null);
  assert.equal(pctDeMarca({ w: 3, l: 1, t: 2 }), 4 / 6);
  assert.equal(pctDeMarca({ w: 0, l: 0, t: 0 }), null);
});
