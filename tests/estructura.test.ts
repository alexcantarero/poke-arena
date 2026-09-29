import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DESEMPATES, MIN_COMPETIDORES, TOP_CUT_MAXIMO_TCG, VARIANTE_2, VARIANTE_3, VARIANTE_5,
  estructuraDe, pasaDiaDos, puntosDe, recordLimpio, techoDe, umbralesDe, varianteDe,
  veredictoDe, victoriasNecesarias, winPercentage,
} from "../src/lib/estructura.ts";

/* =========================================================================
   Contrastado contra el Play! Pokémon Tournament Rules Handbook, revisión
   del 1 de septiembre de 2026. Las secciones van citadas en cada bloque.
   ========================================================================= */

/* --------------------------------------------- §5.5.6, las tres tablas -- */

test("cada tipo de torneo de TCG va a su variante", () => {
  assert.equal(varianteDe("league_challenge"), "swiss");      // Variante #2
  assert.equal(varianteDe("league_cup"), "singleDay");        // Variante #3
  assert.equal(varianteDe("regional"), "dosFases");           // Variante #5
  assert.equal(varianteDe("international"), "dosFases");
  assert.equal(varianteDe("worlds"), "dosFases");
  assert.equal(varianteDe("special"), "dosFases");
});

test("lo que no es del circuito no tiene estructura oficial que imponer", () => {
  assert.equal(varianteDe("store"), null);
  assert.equal(varianteDe("online"), null);
  assert.equal(estructuraDe(40, "store"), null);
});

test("EL FALLO QUE ESTO CORRIGE: con la misma gente, cada variante da rondas distintas", () => {
  // 17–32 personas.
  assert.equal(estructuraDe(24, "league_challenge")?.total, 5);   // Variante #2
  assert.equal(estructuraDe(24, "league_cup")?.total, 5);         // Variante #3
  assert.equal(estructuraDe(24, "regional")?.total, 6);           // Variante #5
  // Y el corte tampoco es el mismo.
  assert.equal(estructuraDe(24, "league_challenge")?.topCut, 0);  // no hay
  assert.equal(estructuraDe(24, "league_cup")?.topCut, 8);
  assert.equal(estructuraDe(24, "regional")?.topCut, 4);
});

test("las tres tablas cubren sus rangos sin huecos ni solapes", () => {
  for (const tabla of [VARIANTE_2, VARIANTE_3, VARIANTE_5]) {
    for (let i = 1; i < tabla.length; i++) {
      assert.equal(tabla[i].min, tabla[i - 1].max + 1,
        `hueco entre ${tabla[i - 1].max} y ${tabla[i].min}`);
    }
    assert.equal(tabla[0].min, MIN_COMPETIDORES);
  }
});

test("fase uno + fase dos suman el total en todas las filas", () => {
  for (const tabla of [VARIANTE_2, VARIANTE_3, VARIANTE_5]) {
    for (const e of tabla) assert.equal(e.fase1 + e.fase2, e.total);
  }
});

test("solo la Variante #5 tiene corte asimétrico", () => {
  for (const e of [...VARIANTE_2, ...VARIANTE_3]) assert.equal(e.asimetrico, false);
  for (const e of VARIANTE_5) if (e.topCut > 0) assert.equal(e.asimetrico, true);
});

test("una League Challenge nunca tiene corte", () => {
  for (const e of VARIANTE_2) assert.equal(e.topCut, 0);
});

/* ------------------------------------- §5.5.6.2, la tabla de dos fases -- */

test("la segunda fase empieza en 65 personas, que es la línea roja del reglamento", () => {
  assert.equal(estructuraDe(64, "regional")?.fase2, 0);
  assert.equal(estructuraDe(65, "regional")?.fase2, 2);
  assert.equal(estructuraDe(64, "regional")?.total, 7);
  assert.equal(estructuraDe(65, "regional")?.total, 9);
});

test("los bordes de la tabla de dos fases", () => {
  assert.equal(estructuraDe(2048, "regional")?.total, 13);
  assert.equal(estructuraDe(2049, "regional")?.total, 14);
  assert.equal(estructuraDe(4096, "regional")?.total, 14);
  assert.equal(estructuraDe(4097, "regional")?.total, 15);
  assert.equal(estructuraDe(4097, "regional")?.umbral, 19);
});

test("el corte asimétrico de TCG se queda en 16 plazas", () => {
  assert.equal(TOP_CUT_MAXIMO_TCG, 16);
});

test("por encima de la tabla se usa el último tramo", () => {
  assert.equal(estructuraDe(20000, "regional")?.total, 15);
  assert.equal(estructuraDe(20000, "league_cup")?.total, 10);
});

test("menos de cuatro personas no es un torneo sancionado", () => {
  assert.equal(estructuraDe(3, "regional"), null);
  assert.equal(estructuraDe(null, "regional"), null);
});

/* ------------------------------------------------- los dos umbrales -- */

test("el caso de Ibai: 3.342 en un Regional", () => {
  const u = umbralesDe(3342, "regional")!;
  assert.equal(u.estructura.fase1, 8);
  assert.equal(u.estructura.fase2, 6);
  assert.equal(u.estructura.total, 14);
  assert.equal(u.diaDos?.puntos, 16);
  assert.equal(u.diaDos?.record, "5-2-1");
  assert.equal(u.corte?.record, "12-2");
  assert.equal(u.corte?.puntos, 36);
});

test("«pelear el corte» son siempre dos derrotas, sea cual sea el total", () => {
  for (const p of [128, 256, 512, 1024, 2048, 3342, 5000]) {
    const u = umbralesDe(p, "regional")!;
    assert.equal(u.corte?.record, `${u.estructura.total - 2}-2`);
  }
});

test("un torneo sin corte no tiene umbral de corte que enseñar", () => {
  const u = umbralesDe(80, "league_challenge")!;
  assert.equal(u.corte, null);
  assert.equal(u.diaDos, null);
});

test("un torneo de una fase no tiene Día 2", () => {
  const u = umbralesDe(80, "league_cup")!;
  assert.equal(u.diaDos, null);
  assert.equal(u.corte?.record, "5-2");
});

/* --------------------------------------------------- récord limpio -- */

test("recordLimpio: el de más victorias entre los que dan esos puntos", () => {
  assert.equal(recordLimpio(16, 8), "5-2-1");   // también vale 4-0-4
  assert.equal(recordLimpio(13, 7), "4-2-1");
  assert.equal(recordLimpio(18, 8), "6-2");
  assert.equal(recordLimpio(24, 8), "8-0");
});

/* ----------------------------------------------- dentro/depende/fuera -- */

test("los tres estados, y que estar justo en el mínimo es «depende»", () => {
  const u = umbralesDe(3342, "regional")!;
  assert.equal(veredictoDe(39, u.corte), "dentro");    // 13-1
  assert.equal(veredictoDe(37, u.corte), "dentro");    // 12-1-1
  assert.equal(veredictoDe(36, u.corte), "depende");   // 12-2 exacto
  assert.equal(veredictoDe(35, u.corte), "fuera");
});

test("sin umbral no hay veredicto que dar", () => {
  assert.equal(veredictoDe(20, null), null);
});

/* ----------------------------------------------------------- Día 2 -- */

test("pasaDiaDos: el umbral es absoluto, 16 entra y 15 no", () => {
  const u = umbralesDe(3342, "regional")!;
  assert.equal(pasaDiaDos(16, u), true);
  assert.equal(pasaDiaDos(15, u), false);
});

test("los dos récords de 8 rondas que dan justo 16", () => {
  assert.equal(puntosDe(5, 1), 16);   // 5-2-1
  assert.equal(puntosDe(4, 4), 16);   // 4-0-4
  assert.equal(puntosDe(5, 0), 15);   // 5-3, se queda fuera por un punto
});

/* ------------------------------------------- lo que se enseña en vivo -- */

test("techoDe: lo máximo que se puede llegar a tener", () => {
  assert.equal(techoDe(12, 5, 14), 12 + 9 * 3);   // 39
  assert.equal(techoDe(12, 14, 14), 12);          // no queda nada
});

test("victoriasNecesarias: «gana dos de las tres que quedan»", () => {
  const u = umbralesDe(3342, "regional")!;
  // 30 puntos en la ronda 11: faltan 6 para 36, o sea dos victorias.
  assert.equal(victoriasNecesarias(30, 11, 14, u.corte), 2);
  // Ya está: no hace falta ninguna.
  assert.equal(victoriasNecesarias(36, 12, 14, u.corte), 0);
});

test("victoriasNecesarias devuelve nulo cuando ya no se puede", () => {
  const u = umbralesDe(3342, "regional")!;
  // 12 puntos en la ronda 13: queda una y hacen falta ocho victorias.
  assert.equal(victoriasNecesarias(12, 13, 14, u.corte), null);
});

/* ----------------------------------- §5.3.3.1, porcentaje de victorias -- */

test("winPercentage: suelo del 25%, que casi nadie sabe", () => {
  assert.equal(winPercentage(0, 8), 0.25);
  assert.equal(winPercentage(1, 8), 0.25);   // 12,5% real, pero cuenta 25
});

test("winPercentage: el techo baja a 75% si el rival se retiró", () => {
  assert.equal(winPercentage(5, 5), 1);
  assert.equal(winPercentage(5, 5, { dropped: true }), 0.75);
});

test("winPercentage: los ejemplos del propio reglamento", () => {
  assert.equal(winPercentage(1, 5), 0.25);
  assert.equal(winPercentage(3, 5), 0.6);
  assert.equal(winPercentage(5, 5), 1);
  assert.equal(winPercentage(5, 5, { dropped: true }), 0.75);
});

/* --------------------------------------------- §5.5.2.1, los desempates -- */

test("el orden de los desempates es el del reglamento", () => {
  assert.deepEqual(DESEMPATES.map((d) => d.corto),
    ["Op Win %", "Op Op Win %", "Head-to-head"]);
});

/* -------------------------------------------- v0.13: fases por tipo -- */

import { etapaDeRonda, familiaDe, maxRondasDe, rondasDeCorte } from "../src/lib/estructura.ts";

test("v0.13 · familiaDe: Challenge y Cup nunca son de dos fases", () => {
  assert.equal(familiaDe("league_challenge"), "challenge");
  assert.equal(familiaDe("pokemon_challenge"), "challenge");
  assert.equal(familiaDe("league_cup"), "cup");
  assert.equal(familiaDe("pokemon_cup"), "cup");
  assert.equal(familiaDe("regional"), "dosFases");
  assert.equal(familiaDe("store"), "libre");
});

test("v0.13 · Challenge: ninguna ronda lleva Día 2 ni top cut, aunque sean 200 personas", () => {
  for (const r of [1, 5, 8, 9, 12]) {
    assert.deepEqual(etapaDeRonda(r, { kind: "league_challenge", playerCount: 200, rounds: 8 }),
      { tipo: "suizo", etiqueta: null });
  }
});

test("v0.13 · Challenge de 5 rondas: la 5 es la última que se puede apuntar", () => {
  assert.equal(maxRondasDe({ kind: "league_challenge", rounds: 5 }), 5);
  // Con un top cut tecleado por error, sigue sin haber corte.
  assert.equal(maxRondasDe({ kind: "league_challenge", rounds: 5, topCut: 8 }), 5);
  // Sin rondas, sale de la tabla: 17–32 personas son 5.
  assert.equal(maxRondasDe({ kind: "league_challenge", playerCount: 25 }), 5);
});

test("v0.13 · Cup: suizo + eliminatoria el mismo día, sin Día 2", () => {
  const cup = { kind: "league_cup", playerCount: 28, rounds: 5, topCut: 8 };
  assert.equal(etapaDeRonda(5, cup).etiqueta, null);
  assert.deepEqual(etapaDeRonda(6, cup), { tipo: "corte", etiqueta: "Cuartos" });
  assert.deepEqual(etapaDeRonda(8, cup), { tipo: "corte", etiqueta: "Final" });
  assert.equal(maxRondasDe(cup), 8);
  // Una Cup enorme sigue sin tener Día 2.
  assert.notEqual(etapaDeRonda(8, { kind: "league_cup", playerCount: 300, rounds: 9 }).tipo, "dia2");
});

test("v0.13 · Regional de 3.342: rondas 9–14 son Día 2, la 15 es cuartos", () => {
  const reg = { kind: "regional", playerCount: 3342 };
  assert.equal(etapaDeRonda(8, reg).etiqueta, null);
  assert.deepEqual(etapaDeRonda(9, reg), { tipo: "dia2", etiqueta: "Día 2" });
  assert.deepEqual(etapaDeRonda(14, reg), { tipo: "dia2", etiqueta: "Día 2" });
  assert.equal(etapaDeRonda(15, reg).tipo, "corte");
  // Corte asimétrico: hasta 16 plazas, cuatro rondas de eliminatoria.
  assert.equal(maxRondasDe(reg), 18);
});

test("v0.13 · rondasDeCorte", () => {
  assert.equal(rondasDeCorte(0), 0);
  assert.equal(rondasDeCorte(4), 2);
  assert.equal(rondasDeCorte(8), 3);
  assert.equal(rondasDeCorte(16), 4);
});
