/**
 * Crea la liga con datos de ejemplo.
 *
 *   npm run db:push     # crea las tablas
 *   npm run db:seed     # mete jugadores, mazos y partidas de muestra
 *
 * Es idempotente en lo esencial: borra lo que hubiera y vuelve a escribirlo,
 * así que sirve también para volver a un estado limpio mientras pruebas.
 * Cuando queráis empezar de verdad, pasadle --empty para crear solo la
 * configuración y los arquetipos del metagame.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();
import { db } from "./index";
import {
  archetypes, competitionPlayers, competitions, decks, events, games, matches, players, settings,
} from "./schema";
import { SEED_ARCHETYPES } from "../lib/pokemon";

const EMPTY = process.argv.includes("--empty");

const DEMO_LIST = `Pokémon: 14
3 Dragapult ex TWM 130
3 Drakloak TWM 129
4 Dreepy TWM 128
1 Dusknoir SFA 69
1 Dusclops SFA 68
2 Duskull SFA 67

Trainer: 31
4 Arven OBF 186
3 Iono PAL 185
2 Boss's Orders PAL 172
4 Buddy-Buddy Poffin TEF 144
4 Ultra Ball SVI 196
3 Nest Ball SVI 181
2 Super Rod PAL 188
1 Counter Catcher PAR 160
2 Bravery Charm PAL 173
3 Rare Candy SVI 191
2 Artazon PAL 171
1 Temple of Sinnoh ASR 155

Energy: 15
9 Basic {P} Energy SVE 13
6 Basic {F} Energy SVE 14

Total Cards: 60`;

/** Generador con semilla fija: los datos de ejemplo salen iguales cada vez. */
function makeRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

async function main() {
  console.log("Limpiando…");
  await db.delete(games);
  await db.delete(matches);
  await db.delete(competitionPlayers);
  await db.delete(competitions);
  await db.delete(decks);
  await db.delete(events);
  await db.delete(archetypes);
  await db.delete(players);
  await db.delete(settings);

  await db.insert(settings).values({
    id: "default",
    name: "Liga Arena",
    season: "Temporada 1",
    ptsWin: 3, ptsTie: 1, ptsLoss: 0,
    eloStart: 1000, eloK: 24,
    inviteCode: process.env.LEAGUE_INVITE_CODE ?? "",
  });

  const archRows = SEED_ARCHETYPES.map((a, i) => ({ id: `a${i + 1}`, ...a }));
  await db.insert(archetypes).values(archRows);
  console.log(`${archRows.length} arquetipos del metagame Standard.`);

  if (EMPTY) {
    console.log("Listo (--empty): añade jugadores desde Ajustes.");
    return;
  }

  const names: Array<[string, string]> = [
    ["Ibai", "#f0b429"], ["Marta", "#4aa8e8"], ["Javi", "#63bd5a"],
    ["Nerea", "#e987b8"], ["Unai", "#b271c9"], ["Sara", "#f0803c"],
  ];
  const playerRows = names.map(([name, color], i) => ({
    id: `p${i + 1}`, name, color, isAdmin: i === 0, active: true, pin: null, joined: "2026-06-01",
  }));
  await db.insert(players).values(playerRows);

  const deckRows = [
    { id: "d1", playerId: "p1", archetypeId: "a1", name: "Dragapult control", list: DEMO_LIST },
    { id: "d2", playerId: "p1", archetypeId: "a7", name: "Excadrill Mega", list: "" },
    { id: "d3", playerId: "p2", archetypeId: "a4", name: "Zoroark de N", list: "" },
    { id: "d4", playerId: "p2", archetypeId: "a9", name: "Lucario Mega", list: "" },
    { id: "d5", playerId: "p3", archetypeId: "a2", name: "Ogerpon Box", list: "" },
    { id: "d6", playerId: "p3", archetypeId: "a12", name: "Raging Bolt", list: "" },
    { id: "d7", playerId: "p4", archetypeId: "a3", name: "Alakazam mano", list: "" },
    { id: "d8", playerId: "p5", archetypeId: "a5", name: "Slowking", list: "" },
    { id: "d9", playerId: "p6", archetypeId: "a8", name: "Festival Lead", list: "" },
    { id: "d10", playerId: "p6", archetypeId: "a6", name: "Crustle stall", list: "" },
  ].map((d) => ({ ...d, listJson: null, format: "standard", created: "2026-06-02" }));
  await db.insert(decks).values(deckRows);

  const compRows = [
    { id: "c1", name: "Liga Regular 2026", kind: "league", bestOf: 3, status: "live", start: "2026-06-01", end: "2026-10-31", rounds: 5, topCut: 0 },
    { id: "c2", name: "Copa Verano", kind: "swiss", bestOf: 3, status: "done", start: "2026-07-12", end: "2026-07-12", rounds: 4, topCut: 4 },
    { id: "c3", name: "Amistosos", kind: "casual", bestOf: 1, status: "live", start: "2026-06-01", end: null, rounds: 0, topCut: 0 },
  ];
  await db.insert(competitions).values(compRows);
  await db.insert(competitionPlayers).values(
    compRows.flatMap((c) => playerRows.map((p, i) => ({ competitionId: c.id, playerId: p.id, seed: i + 1, dropped: false }))),
  );

  const rnd = makeRandom(20260607);
  const deckOf = (pid: string) => {
    const own = deckRows.filter((d) => d.playerId === pid);
    return own[Math.floor(rnd() * own.length)];
  };

  type MatchInsert = typeof matches.$inferInsert;
  type GameInsert = typeof games.$inferInsert;
  const matchRows: MatchInsert[] = [];
  const gameRows: GameInsert[] = [];
  let n = 0;

  function addMatch(compId: string, round: number, date: string, a: string, b: string, bestOf: number) {
    const id = `m${++n}`;
    const need = Math.ceil(bestOf / 2);
    const skillA = 0.5 + (rnd() - 0.5) * 0.34;
    let ga = 0, gb = 0, number = 0;
    while (ga < need && gb < need && number < bestOf) {
      const aWins = rnd() < skillA;
      number++;
      gameRows.push({
        matchId: id, number, winner: aWins ? "a" : "b",
        first: rnd() < 0.5 ? "a" : "b", prizesLeft: 1 + Math.floor(rnd() * 4), note: "",
      });
      if (aWins) ga++; else gb++;
    }
    matchRows.push({
      id, competitionId: compId, round, date, playerAId: a, playerBId: b,
      deckAId: deckOf(a)?.id ?? null, deckBId: deckOf(b)?.id ?? null,
      bestOf, status: "done", note: "",
    });
  }

  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < playerRows.length; i++) {
    for (let j = i + 1; j < playerRows.length; j++) pairs.push([playerRows[i].id, playerRows[j].id]);
  }
  // Liga: una vuelta completa, tres cruces por jornada
  pairs.forEach(([a, b], k) => {
    const day = new Date(Date.parse("2026-06-07T12:00:00") + Math.floor(k / 3) * 7 * 86400000);
    addMatch("c1", Math.floor(k / 3) + 1, day.toISOString().slice(0, 10), a, b, 3);
  });
  // Copa Verano: cuatro rondas suizas simuladas
  for (let r = 1; r <= 4; r++) {
    const pool = playerRows.map((p) => p.id).sort(() => rnd() - 0.5);
    for (let i = 0; i + 1 < pool.length; i += 2) addMatch("c2", r, "2026-07-12", pool[i], pool[i + 1], 3);
  }
  // Amistosos Bo1
  for (let i = 0; i < 14; i++) {
    const [a, b] = pairs[Math.floor(rnd() * pairs.length)];
    const day = new Date(Date.parse("2026-08-01T12:00:00") + Math.floor(rnd() * 35) * 86400000);
    addMatch("c3", 0, day.toISOString().slice(0, 10), a, b, 1);
  }

  await db.insert(matches).values(matchRows);
  await db.insert(games).values(gameRows);

  await db.insert(events).values([
    { id: "e1", title: "Jornada 6 · Liga Regular", date: "2026-09-12", kind: "round", competitionId: "c1", note: "Casa de Javi, 18:00" },
    { id: "e2", title: "Cierre de listas de mazo", date: "2026-09-10", kind: "deadline", competitionId: "c1", note: "Subir decklist antes de la jornada" },
    { id: "e3", title: "Copa Otoño (suizo + top 4)", date: "2026-10-04", kind: "tourney", competitionId: null, note: "6 jugadores, 4 rondas" },
  ]);

  console.log(`Listo: ${playerRows.length} jugadores, ${deckRows.length} mazos, ${matchRows.length} partidas, ${gameRows.length} juegos.`);
  console.log(`Código de invitación: ${process.env.LEAGUE_INVITE_CODE || "(vacío: entrada libre)"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
