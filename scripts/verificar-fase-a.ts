/**
 * Verifica la Fase A contra la base de datos de verdad.
 *
 *   npm run verificar:fase-a
 *
 * Para qué: la Fase A traduce a SQL un filtro que hasta ahora se aplicaba en
 * memoria. El compilador no puede comprobar que las dos rutas devuelvan las
 * mismas partidas, y los tests tampoco, porque no hay base de datos. Esto sí:
 * para cada combinación de filtros, pide las partidas por el camino nuevo
 * (SQL) y por el viejo (snapshot + applyMatchFilter) y compara los ids.
 *
 * Compara también el ORDEN, que importa tanto como el conjunto: si la base
 * ordena distinto que la memoria, pasar de página se salta filas o repite.
 *
 * LANZARLO CONTRA LA RAMA `dev`. Solo lee, pero la regla es la regla.
 */
import { config } from "dotenv";
import { createInterface } from "node:readline/promises";

config({ path: ".env.local" });
config();

import { loadDeckArchetypeIndex, loadMatchesPage, loadSnapshot } from "../src/lib/data";
import { applyMatchFilter, EMPTY_FILTER, type FilterIndex, type MatchFilter } from "../src/lib/filters";
import { planDeConsulta } from "../src/lib/matchQuery";
import { archetypesOfMatch, isPlayed, porRecientes } from "../src/lib/stats";

const GRANDE = 100_000;

async function confirmarRamaDev() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      "Verificación cancelada sin consultar la base: ejecuta este comando en una terminal interactiva y confirma que DATABASE_URL apunta a la rama dev de Neon.",
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL; no se ha consultado ninguna base de datos.");
  }

  console.log(
    "Comprueba en Neon que el endpoint usado por DATABASE_URL pertenece a la rama dev. No se puede deducir la rama de forma fiable solo desde la cadena de conexión.",
  );
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const confirmacion = await terminal.question("Escribe dev para continuar: ");
    if (confirmacion.trim() !== "dev") {
      throw new Error("Verificación cancelada; no se ha consultado ninguna base de datos.");
    }
  } finally {
    terminal.close();
  }
}

async function main() {
  await confirmarRamaDev();

  const snap = await loadSnapshot();
  const archIndex = await loadDeckArchetypeIndex();

  const index: FilterIndex = {
    tournamentKind: new Map(snap.tournaments.map((t) => [t.id, t.kind])),
    tournamentFormat: new Map(snap.tournaments.map((t) => [t.id, t.format])),
    tournamentScope: new Map(snap.tournaments.map((t) => [t.id, t.scope])),
    competitionKind: new Map(snap.competitions.map((c) => [c.id, c.kind])),
    archetypesOf: (m) => {
      const { a, b } = archetypesOfMatch(m, archIndex, snap.archById);
      return [a?.id, b?.id];
    },
  };

  const unTorneo = snap.tournaments[0]?.id ?? "";
  const unaComp = snap.competitions[0]?.id ?? "";
  const unJugador = snap.players[0]?.id ?? "";
  const unArquetipo = snap.archetypes[0]?.id ?? "";
  const unTipo = snap.tournaments[0]?.kind ?? "";

  const casos: Array<[string, Partial<MatchFilter>]> = [
    ["sin filtros", {}],
    ["solo liga", { scope: "league" }],
    ["solo torneos", { scope: "tournament" }],
    ["solo amistosos", { scope: "casual" }],
    ["presenciales", { scope: "onsite" }],
    ["online", { scope: "online" }],
    ["desde 2026-01-01", { from: "2026-01-01" }],
    ["rango cerrado", { from: "2026-01-01", to: "2026-06-30" }],
    ["un torneo", { tournamentId: unTorneo }],
    ["una competición", { competitionId: unaComp }],
    ["una persona", { playerId: unJugador }],
    ["un tipo de torneo", { tournamentKind: unTipo }],
    ["ronda 1", { round: 1 }],
    ["persona + fecha", { playerId: unJugador, from: "2026-01-01" }],
    ["torneos de una persona", { scope: "tournament", playerId: unJugador }],
    ["un arquetipo (no paginable)", { archetypeId: unArquetipo }],
    ["arquetipo + liga", { scope: "league", archetypeId: unArquetipo }],
  ];

  let fallos = 0;
  const jugadas = snap.matches.filter(isPlayed);

  for (const [nombre, parcial] of casos) {
    if (Object.values(parcial).some((v) => v === "")) {
      console.log(`– ${nombre}: saltado, no hay datos para montarlo`);
      continue;
    }

    const filtro: MatchFilter = { ...EMPTY_FILTER, ...parcial };
    const plan = planDeConsulta(filtro);

    const viejo = applyMatchFilter(jugadas, filtro, index).slice().sort(porRecientes).map((m) => m.id);

    const page = await loadMatchesPage(filtro, GRANDE, 1);
    let nuevo = page.filas;
    if (!plan.paginable) nuevo = applyMatchFilter(nuevo, filtro, index).slice().sort(porRecientes);
    const nuevoIds = nuevo.map((m) => m.id);

    const enViejo = new Set(viejo);
    const enNuevo = new Set(nuevoIds);
    const faltan = viejo.filter((id) => !enNuevo.has(id));
    const sobran = nuevoIds.filter((id) => !enViejo.has(id));

    if (faltan.length || sobran.length) {
      fallos++;
      console.error(`✗ ${nombre}: viejo ${viejo.length} · nuevo ${nuevoIds.length}`);
      if (faltan.length) console.error(`    faltan en el nuevo: ${faltan.slice(0, 5).join(", ")}`);
      if (sobran.length) console.error(`    sobran en el nuevo: ${sobran.slice(0, 5).join(", ")}`);
    } else if (viejo.join(",") !== nuevoIds.join(",")) {
      fallos++;
      console.error(`✗ ${nombre}: las mismas ${viejo.length} partidas, EN DISTINTO ORDEN.`);
    } else {
      console.log(`✓ ${nombre} · ${viejo.length} partidas`);
    }
  }

  console.log(fallos ? `\n${fallos} caso(s) con diferencias.` : "\nTodo cuadra.");
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
