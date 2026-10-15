import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PARAMS, etiquetaDeEnlace, urlDeArquetipo, urlDeJugador, urlDeMes, urlResultados,
} from "../src/lib/enlacesFiltro.ts";

test("sin filtros, la URL va limpia", async () => {
  assert.equal(urlResultados({}), "/resultados");
});

test("los valores vacíos no ensucian el enlace", async () => {
  // Un `?arquetipo=` vacío no filtra nada pero rompe el «¿hay filtros
  // puestos?» de la cabecera, que mira si la cadena tiene contenido.
  assert.equal(urlResultados({ arquetipo: "", jugador: null, jornada: 0 }), "/resultados");
});

test("un arquetipo", async () => {
  assert.equal(urlDeArquetipo("a-dragapult"), "/resultados?arquetipo=a-dragapult");
});

test("se pueden acumular filtros", async () => {
  const u = urlDeArquetipo("a-dragapult", { ambito: "league" });
  assert.ok(u.includes("ambito=league"));
  assert.ok(u.includes("arquetipo=a-dragapult"));
});

test("un jugador", async () => {
  assert.equal(urlDeJugador("p1"), "/resultados?jugador=p1");
});

test("los ids raros se escapan solos", async () => {
  assert.ok(urlDeArquetipo("a b&c=d").includes("arquetipo=a+b%26c%3Dd"));
});

/* ------------------------------------------------------------------ meses */

test("un mes se convierte en su rango completo", async () => {
  const u = urlDeMes("2026-10")!;
  assert.ok(u.includes("desde=2026-10-01"));
  assert.ok(u.includes("hasta=2026-10-31"));
});

test("febrero y los bisiestos, que es donde falla escribir 30 o 31 a mano", async () => {
  assert.ok(urlDeMes("2026-02")!.includes("hasta=2026-02-28"));
  assert.ok(urlDeMes("2028-02")!.includes("hasta=2028-02-29"));
  assert.ok(urlDeMes("2026-04")!.includes("hasta=2026-04-30"));
  assert.ok(urlDeMes("2026-12")!.includes("hasta=2026-12-31"));
});

test("un mes que no es un mes devuelve null, no una URL rota", async () => {
  for (const malo of ["2026-13", "2026-00", "octubre", "2026", ""]) {
    assert.equal(urlDeMes(malo), null, malo);
  }
});

test("etiquetaDeEnlace dice a dónde va", async () => {
  // Sin esto, para un lector de pantalla la gráfica es un montón de enlaces
  // que se llaman todos «61 %».
  assert.equal(etiquetaDeEnlace("Dragapult ex"), "Ver las partidas de Dragapult ex");
});

/* ----------------------------------------------------------- LA PARIDAD -- */

test("los nombres de parámetro son los mismos que escribe filters.ts", async () => {
  // Dos sitios generando la misma URL con nombres distintos es una pantalla
  // que se abre sin filtrar y nadie entiende por qué. Esto lo caza el día
  // que alguien renombre un parámetro en filters.ts y se olvide de aquí.
  const filters = readFileSync(new URL("../src/lib/filters.ts", import.meta.url), "utf8");
  for (const nombre of Object.values(PARAMS)) {
    assert.ok(
      filters.includes(`p.set("${nombre}"`) || filters.includes(`one("${nombre}")`),
      `filters.ts no conoce el parámetro «${nombre}»`,
    );
  }
});

/* ------------------------------------------------- arrastrar el contexto */

test("filtroBaseParaEnlaces traduce los nombres de MatchFilter a los de la URL", async () => {
  const { filtroBaseParaEnlaces } = await import("../src/lib/enlacesFiltro.ts");
  const r = filtroBaseParaEnlaces({
    scope: "league", from: "2026-01-01", to: "", tournamentKind: "regional",
    competitionKind: "", tournamentId: "t1", competitionId: "", format: "standard",
  });
  assert.deepEqual(r, {
    ambito: "league", desde: "2026-01-01", tipoTorneo: "regional",
    torneo: "t1", formato: "standard",
  });
});

test("«todo» no es un filtro y no viaja", async () => {
  const { filtroBaseParaEnlaces } = await import("../src/lib/enlacesFiltro.ts");
  assert.deepEqual(filtroBaseParaEnlaces({ scope: "all" }), {});
});

test("el arquetipo no se arrastra: es lo que el enlace va a fijar", async () => {
  const { filtroBaseParaEnlaces, urlDeArquetipo } = await import("../src/lib/enlacesFiltro.ts");
  const base = filtroBaseParaEnlaces({ scope: "league" });
  const u = urlDeArquetipo("a-gardevoir", base);
  assert.equal((u.match(/arquetipo=/g) ?? []).length, 1);
  assert.ok(u.includes("ambito=league"));
});
