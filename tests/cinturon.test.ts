import test from "node:test";
import assert from "node:assert/strict";
import {
  CINTURON_CIERRE_INSCRIPCION,
  incluirDescansosEnClasificacion,
  iniciarCinturonPermitido,
  inscripcionCinturonAbierta,
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
