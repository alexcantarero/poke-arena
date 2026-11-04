import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLAVES_LOGRO, anadirLogro, etiquetasDe, leerLogros, nivelDeUso, popularidadLogros,
  NIVELES_BALL, rarezaPorcentaje, tituloDePerfil, tituloValido, titulosDisponibles, type AvanceTitulos,
} from "../src/lib/logros.ts";

test("los logros guardados: válidos, sin repetir y en orden fijo", () => {
  assert.deepEqual(leerLogros("voltorb,patata,psyduck,voltorb"), ["psyduck", "voltorb"]);
  assert.deepEqual(leerLogros(null), []);
  assert.equal(anadirLogro("voltorb", "psyduck"), "psyduck,voltorb");
  assert.equal(anadirLogro("psyduck", "psyduck"), "psyduck");
  assert.equal(anadirLogro("", "hackeado"), "");
});

test("v0.94: la rareza usa porcentajes y límites estrictos", () => {
  assert.equal(rarezaPorcentaje(0.99), "menos1");
  assert.equal(rarezaPorcentaje(1), "menos5");
  assert.equal(rarezaPorcentaje(4.99), "menos5");
  assert.equal(rarezaPorcentaje(5), "menos10");
  assert.equal(rarezaPorcentaje(10), "menos25");
  assert.equal(rarezaPorcentaje(25), "comun");
  assert.equal(rarezaPorcentaje(null), "sinDatos");

  const popularidad = popularidadLogros(["solrock", "solrock,lunatone", ""]);
  assert.equal(popularidad.solrock.cantidad, 2);
  assert.equal(popularidad.solrock.total, 3);
  assert.ok(Math.abs((popularidad.solrock.porcentaje ?? 0) - 200 / 3) < 1e-10);
  assert.equal(popularidad.solrock.rareza, "comun");
  assert.equal(popularidad.lunatone.cantidad, 1);
  assert.equal(popularidad.missingno.porcentaje, 0);
  assert.equal(popularidadLogros([]).solrock.rareza, "sinDatos");
});

test("v0.94: los títulos de logro requieren desbloquear el logro y la Ball base siempre está", () => {
  const cero: AvanceTitulos = { liga: 0, torneos: 0, cortes: 0, medallas: 0, medallasOro: 0, logros: 0 };
  const disponibles = titulosDisponibles("solrock", cero);
  assert.ok(disponibles.some((titulo) => titulo.id === "entrenador"));
  assert.ok(disponibles.some((titulo) => titulo.id === "logro:solrock"));
  assert.ok(!disponibles.some((titulo) => titulo.id === "logro:lunatone"));
  assert.equal(tituloDePerfil("logro:solrock", "solrock", cero)?.clave, "logro.solrock.nombre");
  assert.equal(tituloDePerfil("logro:lunatone", "solrock", cero), null);
  assert.equal(tituloValido("", "", cero), true);
  assert.equal(tituloValido("entrenador", "", cero), true);
  assert.equal(tituloValido("logro:solrock", "solrock", cero), true);
  assert.equal(tituloValido("logro:solrock", "", cero), false);
  assert.equal(tituloValido("titulo-inventado", "", cero), false);
});

test("v0.94: las rutas de títulos evolucionan al mayor escalón alcanzado", () => {
  const avance: AvanceTitulos = {
    liga: 15, torneos: 5, cortes: 1, medallas: 3, medallasOro: 1, logros: 3,
  };
  const disponibles = titulosDisponibles("", avance);
  assert.equal(disponibles.find((titulo) => titulo.id === "liga")?.clave, "perfil.titulo.rivalLiga");
  assert.equal(disponibles.find((titulo) => titulo.id === "circuito")?.clave, "perfil.titulo.viajeroCircuito");
  assert.equal(disponibles.find((titulo) => titulo.id === "eventos")?.clave, "perfil.titulo.finalistaEventos");
  assert.equal(disponibles.find((titulo) => titulo.id === "medallas")?.clave, "perfil.titulo.coleccionistaMedallas");
  assert.equal(disponibles.find((titulo) => titulo.id === "oro")?.clave, "perfil.titulo.medallistaDorado");
  assert.equal(disponibles.find((titulo) => titulo.id === "secretos")?.clave, "perfil.titulo.cazadorSecretos");

  const evolucion = { ...avance, liga: 250, torneos: 30, cortes: 20, medallas: 8, medallasOro: 8, logros: CLAVES_LOGRO.length };
  assert.equal(tituloDePerfil("liga", "", evolucion)?.clave, "perfil.titulo.guardiaLiga");
  assert.equal(tituloDePerfil("circuito", "", evolucion)?.clave, "perfil.titulo.leyendaCircuito");
  assert.equal(tituloDePerfil("eventos", "", evolucion)?.clave, "perfil.titulo.leyendaEventos");
  assert.equal(tituloDePerfil("medallas", "", evolucion)?.clave, "perfil.titulo.leyendaVitrina");
  assert.equal(tituloDePerfil("oro", "", evolucion)?.clave, "perfil.titulo.leyendaDorada");
  assert.equal(tituloDePerfil("secretos", "", evolucion)?.clave, "perfil.titulo.leyendaSecretos");
});

test("las Balls de uso avanzan por rareza, con umbrales ordenados y sin duplicados", () => {
  assert.equal(NIVELES_BALL.length, 43);
  assert.equal(new Set(NIVELES_BALL.map((nivel) => nivel.ball)).size, NIVELES_BALL.length);
  assert.ok(NIVELES_BALL.every((nivel, i) => i === 0 || nivel.desde > NIVELES_BALL[i - 1].desde));
  assert.deepEqual(
    NIVELES_BALL.slice(0, 4).map(({ ball }) => ball),
    ["poke-ball", "great-ball", "ultra-ball", "net-ball"],
  );
  assert.equal(NIVELES_BALL.at(-1)?.ball, "laorigin-ball");
});

test("la Ball de uso progresa de Poké a las variantes más raras", () => {
  assert.equal(nivelDeUso({ partidas: 0, torneos: 0, logros: 0 }).nivel.ball, "poke-ball");
  const casi = nivelDeUso({ partidas: 35, torneos: 1, logros: 0 }); // 38 puntos
  assert.equal(casi.nivel.ball, "poke-ball");
  assert.equal(casi.faltan, 2);
  assert.equal(nivelDeUso({ partidas: 35, torneos: 0, logros: 1 }).nivel.ball, "great-ball");
  assert.equal(nivelDeUso({ partidas: 300, torneos: 20, logros: 4 }).nivel.ball, "repeat-ball"); // 380 puntos
  assert.equal(nivelDeUso({ partidas: 1520, torneos: 0, logros: 0 }).nivel.ball, "master-ball");
  const maximo = nivelDeUso({ partidas: 4000, torneos: 0, logros: 0 });
  assert.equal(maximo.nivel.ball, "laorigin-ball");
  assert.equal(maximo.siguiente, null);
  assert.equal(maximo.progreso, 1);
});

test("las etiquetas: solo las ganadas, con su escalón", () => {
  assert.deepEqual(etiquetasDe({ partidas: 3, torneos: 0, logros: 0 }), []);
  const e = etiquetasDe({ partidas: 60, torneos: 1, logros: CLAVES_LOGRO.length });
  assert.deepEqual(e.map((x) => [x.clave, x.tono]), [["partidas", "plata"], ["torneos", "bronce"], ["todos", "secreto"]]);
});

import { avanzaKonami, KONAMI, rachaDerrotas } from "../src/lib/logros.ts";

test("v0.90: racha de derrotas y código Konami", () => {
  assert.equal(rachaDerrotas(["w", "l", "l", "l", "l", "l"]), 5);
  assert.equal(rachaDerrotas(["l", "l", "w"]), 0);
  let p = 0;
  for (const k of KONAMI) p = avanzaKonami(p, k);
  assert.equal(p, KONAMI.length);
  assert.equal(avanzaKonami(3, "x"), 0);
  assert.equal(avanzaKonami(2, "ArrowUp"), 1);
});
