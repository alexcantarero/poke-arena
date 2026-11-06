import test from "node:test";
import assert from "node:assert/strict";
import {
  CINTURON_CIERRE_INSCRIPCION,
  cumpleRequisitoReto,
  esCompeticionCinturon,
  incluirDescansosEnClasificacion,
  iniciarCinturonPermitido,
  inscripcionCinturonAbierta,
  plazoVencido,
} from "../src/lib/cinturon.ts";
import { isPlayed, playerRecord, standings } from "../src/lib/stats.ts";
import type { MatchFull } from "../src/lib/types.ts";

const bye = (): MatchFull => ({
  id: "bye",
  competitionId: "cinturon-inaugural-2026",
  tournamentId: null,
  round: 1,
  date: "2026-11-20",
  playerAId: "a",
  playerBId: null,
  opponentPlayerId: null,
  opponentName: "BYE",
  deckAId: null,
  deckBId: null,
  opponentArchetypeId: null,
  archetypeAId: null,
  bestOf: 3,
  status: "done",
  seriesResult: "a",
  firstTurn: "",
  note: "",
  createdBy: null,
  updatedBy: null,
  updatedAt: null,
  createdAt: new Date(),
  games: [],
});

test("la inscripción cierra exactamente a las 08:00 de Madrid del 20 de noviembre", () => {
  const cierre = Date.parse(CINTURON_CIERRE_INSCRIPCION);
  assert.equal(inscripcionCinturonAbierta(new Date(cierre - 1)), true);
  assert.equal(inscripcionCinturonAbierta(new Date(cierre)), false);
  assert.equal(iniciarCinturonPermitido(new Date(cierre - 1)), false);
  assert.equal(iniciarCinturonPermitido(new Date(cierre)), true);
});

test("los requisitos del reto son top cinco o Elo 1100, incluidos los límites", () => {
  assert.equal(cumpleRequisitoReto(5, 1000), true);
  assert.equal(cumpleRequisitoReto(6, 1099), false);
  assert.equal(cumpleRequisitoReto(null, 1100), true);
  assert.equal(cumpleRequisitoReto(1, null), true);
  assert.equal(esCompeticionCinturon("cinturon-inaugural-2026"), true);
  assert.equal(esCompeticionCinturon("cinturon-evento-2"), true);
  assert.equal(esCompeticionCinturon("liga-principal"), false);
});

test("los plazos vencen en el instante límite, no antes", () => {
  const inicio = new Date("2026-01-01T00:00:00Z");
  const limite = new Date("2026-01-11T00:00:00Z");
  assert.equal(plazoVencido(inicio, 10, new Date(limite.getTime() - 1)), false);
  assert.equal(plazoVencido(inicio, 10, limite), true);
});

test("los descansos solo se convierten en rivales virtuales para la clasificación del suizo", () => {
  const descanso = { playerAId: "a", playerBId: null, opponentName: "BYE" };
  const normal = { playerAId: "b", playerBId: null, opponentName: "Rival externo" };
  const result = incluirDescansosEnClasificacion([descanso, normal]);
  assert.equal(result[0].playerBId, "__cinturon_bye__");
  assert.equal(result[1].playerBId, null);
});

test("un BYE puntúa en el suizo pero no suma como partida en el perfil", () => {
  const rawBye = bye();
  assert.equal(isPlayed(rawBye), false);
  assert.equal(playerRecord([rawBye], "a").played, 0);

  const virtualBye = incluirDescansosEnClasificacion([rawBye]);
  assert.equal(isPlayed(virtualBye[0]), true);
  const table = standings(virtualBye, ["a", "__cinturon_bye__"]);
  assert.equal(table.find((row) => row.playerId === "a")?.wins, 1);
});
