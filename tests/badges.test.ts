import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BADGE_TOTAL, badgesOf, earnedCount, type BadgeInput,
} from "../src/lib/badges.ts";

const vacio: BadgeInput = {
  played: 0, wins: 0, winRate: 0, bestStreak: 0, archetypes: 0,
  tournaments: 0, cuts: 0, bestPlacement: null, cp: 0,
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

test("los escalones exigen cumplir sus dos objetivos", () => {
  assert.equal(de("partidas", { ...vacio, played: 20, wins: 9 }).tier, "none");
  assert.equal(de("partidas", { ...vacio, played: 20, wins: 10 }).tier, "bronze");
  assert.equal(de("partidas", { ...vacio, played: 75, wins: 35 }).tier, "silver");
  assert.equal(de("partidas", { ...vacio, played: 200, wins: 100 }).tier, "gold");
  assert.equal(de("victorias", { ...vacio, wins: 100, winRate: 64 }).tier, "silver");
  assert.equal(de("victorias", { ...vacio, wins: 100, winRate: 65 }).tier, "gold");
});

test("el oro no tiene requisitos pendientes y lo dice", () => {
  const oro = de("victorias", { ...vacio, wins: 100, winRate: 65 });
  assert.equal(oro.nextTier, null);
  assert.equal(oro.requirements.length, 0);
  assert.equal(oro.hint, "¡Completada!");
});

test("muestra ambos requisitos del siguiente escalón y su progreso", () => {
  const victoria = de("victorias", { ...vacio, wins: 8, winRate: 60 });
  assert.equal(victoria.hint, "Para Bronce");
  assert.deepEqual(victoria.requirements.map((r) => [r.current, r.target, r.met]), [
    [8, 10, false],
    [60, 55, true],
  ]);
  const viajera = de("torneos", { ...vacio, tournaments: 3, bestPlacement: 20 });
  assert.deepEqual(viajera.requirements.map((r) => r.met), [true, false]);
});

test("una vez ganada, muestra los requisitos del próximo nivel", () => {
  const b = de("victorias", { ...vacio, wins: 12, winRate: 56 });
  assert.equal(b.tier, "bronze");
  assert.equal(b.nextTier, "silver");
  assert.equal(b.hint, "Para Plata");
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
  assert.equal(BADGE_TOTAL, 8);
  assert.ok(!ids.includes("listas"));
});
