import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BADGE_TOTAL, badgesOf, earnedCount, type BadgeInput,
} from "../src/lib/badges.ts";

const vacio: BadgeInput = {
  played: 0, wins: 0, bestStreak: 0, archetypes: 0, decksWithList: 0,
  tournaments: 0, cuts: 0, tournamentWins: 0, bestPlacement: null, cp: 0,
  roundsWithTurn: 0,
};

const de = (id: string, input: BadgeInput) => badgesOf(input).find((b) => b.id === id)!;

test("alguien que acaba de entrar las ve todas, y todas sin conseguir", () => {
  const b = badgesOf(vacio);
  assert.equal(b.length, BADGE_TOTAL);
  assert.equal(earnedCount(b), 0);
  // Se enseñan igual: una vitrina con huecos es la mitad de la gracia.
  assert.ok(b.every((x) => x.tier === "none"));
});

test("los tres escalones de una medalla", () => {
  assert.equal(de("victorias", { ...vacio, wins: 4 }).tier, "none");
  assert.equal(de("victorias", { ...vacio, wins: 5 }).tier, "bronze");
  assert.equal(de("victorias", { ...vacio, wins: 25 }).tier, "silver");
  assert.equal(de("victorias", { ...vacio, wins: 75 }).tier, "gold");
  assert.equal(de("victorias", { ...vacio, wins: 900 }).tier, "gold");
});

test("el oro no tiene siguiente escalón y lo dice", () => {
  const oro = de("victorias", { ...vacio, wins: 100 });
  assert.equal(oro.next, null);
  assert.equal(oro.hint, "Completa");
});

test("lo que falta se dice en las unidades de cada medalla", () => {
  assert.equal(de("victorias", { ...vacio, wins: 3 }).hint, "Te faltan 2 victorias");
  assert.equal(de("victorias", { ...vacio, wins: 4 }).hint, "Te faltan 1 victoria");
  assert.equal(de("cp", { ...vacio, cp: 30 }).hint, "Te faltan 20 CP");
});

test("una vez ganada, el aviso cambia de tono", () => {
  const b = de("victorias", { ...vacio, wins: 10 });
  assert.equal(b.tier, "bronze");
  assert.equal(b.next, 25);
  assert.match(b.hint, /para la siguiente/);
});

test("ninguna medalla depende de lo que hagan los demás", () => {
  // En un grupo de cinco, una medalla por ser el primero del ranking es una
  // alegría y cuatro frustraciones. Todo se mide contra uno mismo.
  const ids = badgesOf(vacio).map((b) => b.id);
  for (const prohibido of ["lider", "primero", "mejor-del-grupo"]) {
    assert.ok(!ids.includes(prohibido));
  }
});

test("cada medalla mide una cosa distinta", () => {
  const ids = badgesOf(vacio).map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length);
});
