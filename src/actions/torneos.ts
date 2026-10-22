"use server";

/* Torneos: crear, estado, asistencia, resultados, rondas, drop, limpieza e importación.
   v0.47 — partido de `src/actions/index.ts`. */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { archetypes, events, games, matches, players, tournamentResults, tournaments } from "@/db/schema";
import { borrarTorneosAbandonados, cerrarTorneosTerminados } from "@/lib/limpiezaDb";
import { canManageLeague } from "@/lib/auth";
import { TORNEOS_ZONA_2026, yaExiste } from "@/data/torneos-zona-2026";
import { newId, todayISO } from "@/lib/format";
import { cpKindOf, seasonOfDate } from "@/lib/cp";
import { withFlash } from "@/lib/flash";
import { importarTorneos, type FilaClasificacion, type TorneoRemoto } from "@/lib/limitlessImport";
import { fetchStandings, fetchTournaments } from "@/lib/sources/limitless";
import { bestOfDeRonda, familiaDe, maxRondasDe } from "@/lib/estructura";
import { currentPlayer } from "@/lib/data";
import { TOURNAMENT_STATUSES } from "@/lib/types";
import {
  str, int, maybeInt, isoDate, bool, timeOfDay, priceCents, deckOrArchetype, pick, refresh, requireActor, requireManager, owns, TOURNAMENT_KINDS, recalcTournamentCp, STATUS_FLOW, upsertResult, setDropped, syncTournamentRecord, confirmed,
  msj,
} from "./_comun";
import { saveMatch } from "./partidas";
import { notificarResultadosTorneo } from "@/lib/discord";

export async function saveTournament(fd: FormData) {
  const actor = await requireActor();
  const editing = str(fd, "id");

  // Editar la cabecera de un torneo recalcula los CP de todos los que fueron,
  // así que solo lo hace quien lo creó o un organizador.
  let current: typeof tournaments.$inferSelect | undefined;
  if (editing) {
    current = (await db.select().from(tournaments).where(eq(tournaments.id, editing)))[0];
    if (!current) return;
    if (current.createdBy !== actor.id && !canManageLeague(actor.role)) return;
  }

  const date = isoDate(fd, "date") ?? todayISO();
  const values = {
    name: str(fd, "name").slice(0, 120),
    kind: pick(fd, "kind", TOURNAMENT_KINDS, "store"),
    scope: str(fd, "scope") === "online" ? "online" : "onsite",
    format: str(fd, "format") || "standard",
    bestOf: int(fd, "bestOf", 3, 1, 5),
    // v0.57 — el formato del top cut; 0 o cualquier otra cosa = igual que el suizo.
    bestOfTop: ((v) => (v === 1 || v === 3 || v === 5 ? v : null))(int(fd, "bestOfTop", 0, 0, 5)) as number | null,
    date,
    endDate: isoDate(fd, "endDate", null),
    startTime: timeOfDay(fd, "startTime"),
    entryFeeCents: priceCents(fd, "entryFee"),
    venue: str(fd, "venue").slice(0, 120),
    city: str(fd, "city").slice(0, 80),
    country: fd.has("country") ? str(fd, "country").slice(0, 80) : (current?.country ?? ""),
    organizer: str(fd, "organizer").slice(0, 120),
    url: /^https?:\/\//i.test(str(fd, "url")) ? str(fd, "url").slice(0, 400) : "",
    playerCount: maybeInt(fd, "playerCount", 0, 100000),
    rounds: maybeInt(fd, "rounds", 0, 50),
    /* v0.45 — cuántas de esas rondas son de una segunda fase propia. Solo se
       guarda si deja al menos una ronda en la fase 1: «6 de fase 2» en un
       torneo de 5 no es un dato, es un error de tecleo. Misma regla que
       `formaDe`, para que la base nunca guarde algo que luego se ignora. */
    roundsPhase2: (() => {
      const f2 = maybeInt(fd, "roundsPhase2", 1, 30);
      const total = maybeInt(fd, "rounds", 0, 50);
      return f2 != null && total != null && f2 < total ? f2 : null;
    })(),
    topCut: maybeInt(fd, "topCut", 0, 512),
    /* v0.47 — los umbrales de paso. Solo tienen sentido con una segunda fase
       propia; sin ella se guardan vacíos, para no dejar en la base un dato que
       ninguna pantalla va a leer. */
    ...(() => {
      const conFase2 = Boolean(maybeInt(fd, "roundsPhase2", 1, 30));
      return {
        phase2Points: conFase2 ? maybeInt(fd, "phase2Points", 1, 150) : null,
        phase2Top: conFase2 ? maybeInt(fd, "phase2Top", 2, 512) : null,
        cutPoints: conFase2 ? maybeInt(fd, "cutPoints", 1, 150) : null,
      };
    })(),
    /* Sin temporada la deducimos de la fecha: julio abre la siguiente. Pero si
       el formulario ni siquiera trae el campo —el de editar no lo tiene— se
       respeta lo que ya hubiera: recalcularlo movía de temporada los CP de un
       torneo al que alguien le había puesto la suya a mano. */
    season: fd.has("season")
      ? (maybeInt(fd, "season", 2000, 2100) ?? seasonOfDate(date))
      : (current?.season ?? seasonOfDate(date)),
    division: pick(fd, "division", ["masters", "seniors", "juniors"] as const, "masters"),
    notes: str(fd, "notes").slice(0, 1000),
  };
  if (!values.name) return;

  // El estado solo se toca desde el formulario al crear. Después se cambia con
  // los botones del ciclo (`setTournamentStatus`), porque cerrar un torneo es
  // una decisión, no un campo más que se guarda sin darte cuenta.
  const status = editing ? undefined : pick(fd, "status", TOURNAMENT_STATUSES, "open");

  const id = editing || newId("t");
  if (editing) {
    await db.update(tournaments).set(values).where(eq(tournaments.id, id));
  } else {
    await db.insert(tournaments).values({
      id, ...values, createdBy: actor.id, status: status ?? "open",
    });
  }

  /* Corregir la asistencia o el tipo cambia lo que vale cada puesto, así que
     los CP guardados se vuelven a calcular. */
  if (editing) {
    await recalcTournamentCp(id, {
      kind: cpKindOf(values),
      playerCount: values.playerCount,
      season: values.season ?? seasonOfDate(date) ?? undefined,
    });
  }

  refresh();
  redirect(withFlash(`/torneos/${id}`, "ok", editing ? "Torneo guardado." : "Torneo creado."));
}

/**
 * Poner (o corregir) la asistencia de un torneo desde su propia ficha.
 *
 * EL PROBLEMA QUE RESUELVE
 * ------------------------
 * Un torneo se crea días antes y nadie sabe cuánta gente irá hasta que se
 * cierra el registro. Después, con el evento ya jugado, hay que volver y
 * apuntarla — y el sitio donde estaba ese campo era el formulario de editar,
 * con otros veinte campos al lado. El resultado práctico era que no se
 * rellenaba nunca, y sin asistencia el kicker deja los tramos bajos a cero:
 * un 15.º puesto que valía 6 CP aparecía como 0.
 *
 * Esto es un campo y un botón en la ficha del torneo. Nada más.
 *
 * Y sí, **recalcula**: el mismo ayudante que usa el formulario de editar.
 * Los CP con el número puesto a mano se respetan.
 */
export async function setTournamentAttendance(fd: FormData) {
  const actor = await currentPlayer();
  if (!actor) redirect("/entrar");

  const id = str(fd, "id");
  if (!id) redirect(withFlash("/torneos", "error", await msj("x.fa59f602")));

  const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id));
  if (!t) redirect(withFlash("/torneos", "error", await msj("x.f7387bdd")));

  // La comprobación de permiso va aquí y no en la pantalla: una Server Action
  // es un endpoint público y esconder el formulario no protege nada.
  if (t.createdBy !== actor.id && !canManageLeague(actor.role)) {
    redirect(withFlash(`/torneos/${id}`, "error", await msj("x.c73afbc0")));
  }

  const playerCount = maybeInt(fd, "playerCount", 1, 100000);
  const rounds = fd.has("rounds") ? maybeInt(fd, "rounds", 1, 50) : t.rounds;
  const topCut = fd.has("topCut") ? maybeInt(fd, "topCut", 0, 512) : t.topCut;

  await db.update(tournaments)
    .set({ playerCount, rounds, topCut })
    .where(eq(tournaments.id, id));

  const cambiadas = await recalcTournamentCp(id, {
    kind: cpKindOf(t),
    playerCount,
    season: t.season ?? seasonOfDate(t.date) ?? undefined,
  });

  refresh();
  redirect(withFlash(
    `/torneos/${id}`,
    "ok",
    playerCount == null
      ? "Asistencia borrada."
      : cambiadas > 0
        ? `Asistencia: ${playerCount}. Se han recalculado los CP de ${cambiadas} resultado${cambiadas === 1 ? "" : "s"}.`
        : `Asistencia: ${playerCount}. Los CP no cambian con esa cifra.`,
  ));
}

export async function setTournamentStatus(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const status = pick(fd, "status", TOURNAMENT_STATUSES, "open");

  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, id)))[0];
  if (!tour) return;
  if (tour.createdBy !== actor.id && !canManageLeague(actor.role)) return;
  if (!STATUS_FLOW[tour.status]?.includes(status)) return;

  // Y volver a borrador solo mientras no haya nada apuntado.
  if (status === "draft") {
    const [used] = await db.select({ n: sql<number>`count(*)::int` }).from(matches)
      .where(and(eq(matches.tournamentId, id), isNull(matches.playerBId)));
    if ((used?.n ?? 0) > 0) return;
  }

  await db.update(tournaments)
    .set({ status, closedAt: status === "closed" ? new Date() : null })
    .where(eq(tournaments.id, id));
  // v0.59 — al cerrarse, los resultados a Discord. Nunca falla: si no hay
  // webhook o Discord no responde, el torneo queda cerrado igual.
  if (status === "closed" && tour.status !== "closed") await notificarResultadosTorneo(id);

  refresh();
  const STATUS_MESSAGE: Record<string, string> = {
    draft: "Torneo vuelto a borrador.",
    open: tour.status === "draft" ? "Torneo empezado." : "Torneo reabierto.",
    closed: "Torneo cerrado.",
  };
  redirect(withFlash(`/torneos/${id}`, "ok", STATUS_MESSAGE[status] ?? "Torneo actualizado."));
}

/**
 * Borrar un torneo: la cabecera, los resultados de todos y las rondas.
 *
 * Pide escribir el nombre del torneo. Y borra las rondas a mano, antes que la
 * cabecera, porque `matches.tournamentId` es ON DELETE SET NULL: sin este
 * paso, las rondas se quedaban como partidas sin competición y sin torneo
 * —invisibles en las pantallas, pero vivas en las estadísticas de arquetipo—.
 * Los resultados sí se van en cascada solos.
 */
export async function deleteTournament(fd: FormData) {
  await requireManager();
  const id = str(fd, "id");
  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, id)))[0];
  if (!tour || !confirmed(fd, tour.name)) return;

  // Solo las rondas: son las partidas del torneo contra rivales de fuera. Una
  // partida entre dos de la liga que además esté etiquetada a este torneo se
  // conserva, y simplemente se queda sin la etiqueta.
  await db.delete(matches).where(and(eq(matches.tournamentId, id), isNull(matches.playerBId)));
  await db.delete(tournaments).where(eq(tournaments.id, id));
  refresh();
  redirect(withFlash("/torneos", "ok", `Torneo «${tour.name}» borrado.`));
}

export async function saveTournamentResult(fd: FormData) {
  const actor = await requireActor();
  const tournamentId = str(fd, "tournamentId");
  if (!tournamentId) return;

  const targetId = str(fd, "playerId") || actor.id;
  if (!owns(actor, targetId)) return;

  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)))[0];
  if (!tour) return;

  await upsertResult(tournamentId, targetId, fd, cpKindOf(tour), tour.playerCount, tour.season);

  /* Con «de mis rondas», el récord lo pone el contador y no el formulario. Hay
     que recalcularlo aquí mismo: si no, lo guardado seguía siendo lo que
     tecleó alguien la última vez, y la pantalla enseñaba dos récords distintos
     —el de la cabecera de rondas y el de la lista de resultados— a diez
     centímetros uno del otro. */
  if (pick(fd, "recordMode", ["manual", "rounds"] as const, "manual") === "rounds") {
    await syncTournamentRecord(tournamentId, targetId);
  }

  refresh();
  redirect(withFlash(`/torneos/${tournamentId}`, "ok", await msj("x.b96014cb")));
}

/**
 * v0.16 — Borrar la participación de alguien en un torneo: su resultado Y
 * sus rondas.
 *
 * EL FALLO QUE ARREGLA: antes solo borraba la fila de `tournament_results`.
 * Las rondas seguían ahí (así que «no borraba nada», visto desde la ficha),
 * y con el resultado se iba también el mazo fijado del torneo, con lo que la
 * ronda siguiente volvía a pedir el arquetipo. Borrar a medias deja un estado
 * que no corresponde a nada: o estás en el torneo o no estás.
 *
 * Para borrar una sola ronda está el botón «Eliminar» de cada ronda.
 */
export async function deleteTournamentResult(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const row = (await db.select().from(tournamentResults).where(eq(tournamentResults.id, id)))[0];
  if (!row || !owns(actor, row.playerId)) return;
  await db.delete(matches).where(and(
    eq(matches.tournamentId, row.tournamentId),
    eq(matches.playerAId, row.playerId),
    isNull(matches.playerBId),
  ));
  await db.delete(tournamentResults).where(eq(tournamentResults.id, id));
  refresh();
  redirect(withFlash(`/torneos/${row.tournamentId}`, "ok", await msj("x.7eb9d646")));
}

/**
 * v0.15 — Importar los torneos de la zona de octubre y noviembre de 2026
 * (`src/data/torneos-zona-2026.ts`) como borradores.
 *
 * Solo inserta: si el torneo ya existe —por id, o porque alguien lo creó a
 * mano el mismo día, del mismo tipo y en la misma tienda— se salta y no se
 * toca. Así se puede pulsar las veces que haga falta sin pisar correcciones.
 *
 * Los Regionales se enlazan con su evento del calendario (los de Europa), y
 * el calendario deja de pintar el evento suelto: si no, Niza salía dos veces.
 */
export async function importLocalTournaments() {
  const actor = await requireManager();

  const existentes = await db.select({
    id: tournaments.id, date: tournaments.date, kind: tournaments.kind,
    name: tournaments.name, venue: tournaments.venue, city: tournaments.city,
  }).from(tournaments);

  let nuevos = 0;
  let saltados = 0;
  for (const z of TORNEOS_ZONA_2026) {
    if (yaExiste(z, existentes)) { saltados++; continue; }
    await db.insert(tournaments).values({
      id: z.id,
      name: z.name,
      kind: z.kind,
      status: "draft",
      scope: "onsite",
      format: "standard",
      bestOf: z.bestOf,
      date: z.date,
      endDate: z.endDate ?? null,
      startTime: z.startTime ?? null,
      venue: z.venue,
      city: z.city,
      country: z.country,
      season: seasonOfDate(z.date),
      division: "masters",
      notes: z.revisar ? `Revisar la fecha: ${z.revisar}` : "",
      createdBy: actor.id,
    }).onConflictDoNothing();
    existentes.push({ id: z.id, date: z.date, kind: z.kind, name: z.name, venue: z.venue, city: z.city });
    if (z.eventoId) {
      await db.update(events).set({ tournamentId: z.id })
        .where(and(eq(events.id, z.eventoId), isNull(events.tournamentId)));
    }
    nuevos++;
  }

  refresh();
  redirect(withFlash("/torneos", "ok",
    `Torneos de la zona: ${nuevos} nuevo(s)${saltados ? `, ${saltados} ya estaban` : ""}.`));
}

/* ============================================================ v0.3.0 ==== */

/* ------------------------------------------------- rondas de un torneo -- */

/**
 * Registrar una ronda de un torneo de fuera, mientras se juega.
 *
 * Una ronda es una fila de `matches` con `tournamentId`, `round` y
 * `playerBId` nulo. No hay tabla nueva: ver la explicación en
 * `src/lib/stats.ts`, en la sección de rondas de torneo, que es donde está
 * el porqué.
 *
 * Dos maneras de rellenarla, porque el caso real es estar en el evento con
 * dos minutos antes de que salgan los emparejamientos:
 *
 *   · `mode=quick` — rival, su mazo, salí 1.º o 2.º, y gané/empaté/perdí.
 *     El resultado se guarda en `matches.seriesResult`. Cuatro toques.
 *   · `mode=games` — el desglose juego a juego. Es lo que alimenta la
 *     estadística de ventaja del primer turno, así que merece la pena cuando
 *     hay tiempo.
 *
 * Sin resultado la ronda se guarda abierta y se cierra luego: es justo lo que
 * pasa cuando apuntas el emparejamiento antes de empezar a jugar.
 */
export async function saveTournamentRound(fd: FormData) {
  const actor = await requireActor();

  const tournamentId = str(fd, "tournamentId");
  if (!tournamentId) return;
  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)))[0];
  if (!tour) return;

  // De quién es la ronda. La propia siempre; la de otro solo un organizador.
  const playerId = str(fd, "playerId") || actor.id;
  if (!owns(actor, playerId)) return;

  /* Solo un torneo abierto acepta rondas. Cerrado, porque es el sentido de
     cerrarlo —si se pudiera seguir escribiendo, «cerrado» sería un adorno—; y
     en borrador, porque la ficha ni siquiera enseña el formulario, así que una
     ronda ahí solo puede llegar por un POST a mano. */
  // v0.16: el organizador puede corregir rondas también con el torneo cerrado.
  if (tour.status !== "open" && !canManageLeague(actor.role)) return;

  const round = int(fd, "round", 1, 1, 50);

  /* v0.13 — el tope de rondas. Un League Challenge es solo suizo (§5.5.6.1,
     Variante #2): en uno de 5 rondas no existe la 6. En una Cup se admite el
     suizo más su eliminatoria, y en un Regional el suizo más el corte. El
     formulario ya no se enseña al llegar al tope, pero una Server Action es
     un endpoint público: la comprobación buena es esta. */
  const tope = maxRondasDe({
    kind: tour.kind, playerCount: tour.playerCount, rounds: tour.rounds, topCut: tour.topCut,
  });
  if (tope != null && round > tope) {
    redirect(withFlash(`/torneos/${tournamentId}`, "error",
      familiaDe(tour.kind) === "challenge"
        ? `Este Challenge tiene ${tope} rondas y no hay top cut: la ronda ${round} no existe.`
        : `Este torneo admite como mucho ${tope} rondas (suizo + top cut).`));
  }

  // v0.57 — el formato de ESTA ronda: el del top cut si es del corte, el del suizo si no.
  const bestOf = bestOfDeRonda(tour, round);

  /* v0.15 — el rival puede ser alguien del grupo. Se comprueba que exista y
     que no seas tú; si llega algo raro, se ignora y la ronda se guarda con el
     nombre a secas, como siempre. */
  const rivalPick = str(fd, "opponentPlayerId");
  const rivalPlayer = rivalPick && rivalPick !== playerId
    ? (await db.select({ id: players.id, name: players.name }).from(players)
      .where(eq(players.id, rivalPick)))[0]
    : undefined;
  const opponentName = (str(fd, "opponentName") || rivalPlayer?.name || "").slice(0, 60);
  if (!opponentName) return;

  // Quién salió primero en el JUEGO 1. Del resto se encarga `g{i}_first`, que
  // ahora se marca a mano juego por juego: en la mesa no siempre empieza quien
  // perdió el anterior (concesiones, penalizaciones, reinicios).
  const first = pick(fd, "g0_first", ["", "a", "b"] as const, "")
    || pick(fd, "first", ["", "a", "b"] as const, "");
  const mode = pick(fd, "mode", ["quick", "games"] as const, "quick");

  /* El mazo del torneo se elige UNA vez y no cambia entre rondas: en un suizo
     juegas el mismo mazo de la primera a la última. Vive en el resultado del
     torneo, no en la ronda, y desde aquí solo se rellena si aún no estaba. */
  const existingResult = (await db.select().from(tournamentResults).where(and(
    eq(tournamentResults.tournamentId, tournamentId),
    eq(tournamentResults.playerId, playerId),
  )))[0];

  /* El mazo propio también se puede fijar solo por arquetipo, sin lista de 60
     cartas: el selector ofrece las dos cosas en la misma lista —igual que ya
     pasaba con el mazo del rival— y `deckOrArchetype` deshace el prefijo
     "arch:" antes de que cualquiera de los dos ids toque una columna que no
     es la suya. */
  let deckAId: string | null = existingResult?.deckId ?? null;
  let archetypeAId: string | null = existingResult?.archetypeId ?? null;
  if (!deckAId && !archetypeAId) {
    const proposed = deckOrArchetype(fd, "deckAId");
    deckAId = proposed.deckId;
    archetypeAId = proposed.archetypeId;
  }

  // Los juegos: solo del 1 al bestOf, solo con ganador reconocible, y sin
  // pasarse de la mayoría —un 3-0 en un Bo3 no debe poder guardarse—. Es la
  // misma comprobación que en `saveMatch`, y por el mismo motivo.
  const need = Math.ceil(bestOf / 2);
  const rows: Array<{
    number: number; winner: string; first: string;
    prizesA: number | null; prizesB: number | null;
    penaltyA: boolean; penaltyB: boolean;
    mulligansA: number; mulligansB: number;
  }> = [];
  if (mode === "games") {
    let wonA = 0, wonB = 0;
    for (let i = 0; i < bestOf; i++) {
      const winner = str(fd, `g${i}_winner`);
      if (!["a", "b", "tie"].includes(winner)) continue;
      if (winner === "a") wonA++;
      if (winner === "b") wonB++;
      if (wonA > need || wonB > need) return;
      rows.push({
        number: i + 1,
        winner,
        // Cada juego lleva el suyo. Era lo que pedía la lista: «marcar si salí
        // 1.º o 2.º por cada juego de la ronda», no solo en el primero.
        first: pick(fd, `g${i}_first`, ["", "a", "b"] as const, i === 0 ? first : ""),
        mulligansA: maybeInt(fd, `g${i}_mulligans_a`, 0, 99) ?? 0,
        mulligansB: maybeInt(fd, `g${i}_mulligans_b`, 0, 99) ?? 0,
        // v0.30 — premios y penalización, igual que en `saveMatch`.
        prizesA: maybeInt(fd, `g${i}_prizes_a`, 0, 6),
        prizesB: maybeInt(fd, `g${i}_prizes_b`, 0, 6),
        penaltyA: bool(fd, `g${i}_penalty_a`),
        penaltyB: bool(fd, `g${i}_penalty_b`),
      });
      /* Un juego empatado corta la ronda ahí mismo: en la mesa un empate sale
         del reloj, y del reloj no se juega un juego más. El cliente ya deja
         de mandar campos de juegos posteriores (`visibleGames` en
         RoundForm), pero esto es la comprobación de verdad — una
         Server Action es un endpoint público y no se fía de qué campos decide
         mandar el formulario. */
      if (winner === "tie") break;
    }
  }

  // El resultado declarado. Con desglose solo se guarda cuando hace falta para
  // desempatar: un 1–1 en un Bo3 es empate si se acabó el tiempo y una ronda a
  // medias si no, y los juegos apuntados son idénticos en los dos casos.
  const declared = pick(fd, "result", ["", "a", "b", "tie"] as const, "");
  let seriesResult: string | null = null;
  if (mode === "quick") {
    seriesResult = declared || null;
  } else {
    const wonA = rows.filter((r) => r.winner === "a").length;
    const wonB = rows.filter((r) => r.winner === "b").length;
    const hasTieGame = rows.some((r) => r.winner === "tie");
    const settled = wonA >= need || wonB >= need;
    seriesResult = settled
      ? null
      // Un juego marcado como empate decide la ronda él solo, sin necesidad de
      // marcar además «se acabó el tiempo»: es la misma situación, vista desde
      // el juego en vez de desde el reloj. Sin desglose de empate, se sigue
      // necesitando el checkbox para la ambigüedad de siempre (1-1 esperando
      // el tercer juego frente a 1-1 con el tiempo agotado).
      : hasTieGame
        ? (wonA > wonB ? "a" : wonB > wonA ? "b" : "tie")
        : (bool(fd, "timeCalled") ? (wonA > wonB ? "a" : wonB > wonA ? "b" : "tie") : null);
  }

  /* Qué llevaba el rival. El selector ofrece en la misma lista los mazos de
     la biblioteca compartida y los arquetipos sueltos: si eliges un mazo se
     guarda en `deckBId` —y con él la lista de 60 cartas, que es lo que
     distingue un mazo de un arquetipo—, y si eliges un arquetipo va a
     `opponentArchetypeId`. Las estadísticas miran primero el mazo y caen al
     arquetipo, así que las dos formas alimentan la matriz igual. */
  const rival = deckOrArchetype(fd, "opponentDeck");
  const rivalDeckId = rival.deckId ?? (str(fd, "deckBId") || null);
  const rivalArchId = rival.archetypeId
    ?? deckOrArchetype(fd, "opponentArchetypeId").archetypeId
    ?? deckOrArchetype(fd, "opponentArchetypeId").deckId;

  const values = {
    competitionId: null,
    tournamentId,
    round,
    date: tour.date,
    playerAId: playerId,
    playerBId: null,
    opponentName,
    opponentPlayerId: rivalPlayer?.id ?? null,
    deckAId,
    archetypeAId,
    deckBId: rivalDeckId,
    opponentArchetypeId: rivalArchId,
    bestOf,
    status: "done" as const,
    seriesResult,
    firstTurn: first,
    note: str(fd, "note").slice(0, 300),
    createdBy: actor.id,
  };

  /* Qué fila se toca. Si el formulario viene de editar, trae el id de la
     ronda: hay que ir por él y no por el número, porque el número es
     precisamente lo que se puede estar cambiando —editar la ronda 3 y escribir
     «4» insertaba una cuarta ronda nueva y dejaba la tercera intacta—.
     Si no viene id, se busca por (torneo, jugador, ronda), que es el índice
     único que impide duplicar de un doble toque en el móvil. */
  const editingId = str(fd, "matchId");
  const existing = editingId
    ? (await db.select().from(matches).where(eq(matches.id, editingId)))[0]
    : (await db.select().from(matches).where(and(
      eq(matches.tournamentId, tournamentId),
      eq(matches.playerAId, playerId),
      eq(matches.round, round),
      // Una ronda de torneo tiene el rival fuera de la liga. Sin este filtro,
      // una partida interna etiquetada a este torneo y con el mismo número de
      // ronda entraba aquí y se sobreescribía con playerBId nulo: el jugador B
      // desaparecía y sus juegos se borraban, sin deshacer y sin avisar.
      isNull(matches.playerBId),
    )))[0];

  // Una ronda que llega por id tiene que ser de este torneo, de este jugador, y
  // ser una ronda de verdad y no una partida interna.
  if (existing && (
    existing.tournamentId !== tournamentId
    || existing.playerAId !== playerId
    || existing.playerBId !== null
  )) return;

  /* v0.15 — el drop. Con «No he acabado el torneo» guardado no se aceptan
     rondas NUEVAS; corregir las que ya estaban sí. La ficha ya no enseña el
     formulario, pero esto es la comprobación de verdad. */
  if (!existing && existingResult?.dropped) {
    redirect(withFlash(`/torneos/${tournamentId}`, "error",
      await msj("x.85f12362")));
  }

  const id = existing?.id ?? newId("m");
  if (existing) {
    /* Editar el número de ronda puede llevarla a un hueco que ya ocupa otra:
       editar la ronda 2 para ponerle un 1 cuando la 1 ya existe. Un UPDATE
       directo revienta contra `matches_tour_round_idx` a mitad de la
       sentencia, porque el índice es real y no se puede aplazar hasta el
       final de la transacción.

       Se resuelve como un intercambio, en tres pasos con un número de ronda
       centinela (-1) que ninguna ronda de verdad usa —siempre son >= 1—: la
       que estorba se aparta, la que se edita ocupa el hueco, y la que se
       apartó se queda con el número que la primera dejó libre. El resultado
       es que las dos rondas cambian de número entre sí, que es justo lo que
       alguien renumerando esperaría que pasara. */
    if (existing.round !== round) {
      const clash = (await db.select().from(matches).where(and(
        eq(matches.tournamentId, tournamentId),
        eq(matches.playerAId, playerId),
        eq(matches.round, round),
        isNull(matches.playerBId),
      )))[0];
      if (clash && clash.id !== id) {
        await db.update(matches).set({ round: -1 }).where(eq(matches.id, clash.id));
        await db.update(matches).set(values).where(eq(matches.id, id));
        await db.update(matches).set({ round: existing.round }).where(eq(matches.id, clash.id));
      } else {
        await db.update(matches).set(values).where(eq(matches.id, id));
      }
    } else {
      await db.update(matches).set(values).where(eq(matches.id, id));
    }
    await db.delete(games).where(eq(games.matchId, id));
  } else {
    /* El índice único puede saltar en una carrera: dos envíos a la vez con el
       mismo número. Que gane el último en vez de reventar con un 500.

       `targetWhere` no es opcional aquí: `matches_tour_round_idx` es un índice
       PARCIAL (solo donde `tournament_id` no es nulo), y PostgreSQL descarta
       los índices parciales al inferir el árbitro de un ON CONFLICT salvo que
       se repita el predicado. Sin esta línea el error no sería de carrera sino
       de planificación, y fallaría al apuntar CUALQUIER ronda nueva. */
    await db.insert(matches).values({ id, ...values })
      .onConflictDoUpdate({
        target: [matches.tournamentId, matches.playerAId, matches.round],
        targetWhere: sql`${matches.tournamentId} is not null`,
        set: values,
      });
  }
  if (rows.length) {
    await db.insert(games).values(rows.map((r) => ({ matchId: id, ...r, note: "" })));
  }

  // Si el mazo (o el arquetipo) del torneo se acaba de elegir aquí, queda
  // fijado en el resultado: a partir de la ronda siguiente ya viene puesto y
  // bloqueado.
  const justLocked = !(existingResult?.deckId || existingResult?.archetypeId);
  await syncTournamentRecord(
    tournamentId, playerId,
    justLocked ? deckAId : null,
    justLocked ? archetypeAId : null,
  );
  refresh();
  redirect(withFlash(`/torneos/${tournamentId}`, "ok", `Ronda ${round} guardada.`));
}

/**
 * v0.15.1 — Drop desde la ronda, en vez de apuntar la siguiente.
 *
 * Pone `dropped` en el resultado del torneo (creándolo si aún no había) y
 * vuelve a la ficha: allí ya no sale el formulario de ronda, y
 * `saveTournamentRound` rechaza rondas nuevas. Corregir las apuntadas sigue
 * pudiéndose.
 */
export async function dropFromTournament(fd: FormData) {
  await setDropped(fd, true);
}

/** Deshacer el drop: vuelve a dejar apuntar rondas. */
export async function undoDrop(fd: FormData) {
  await setDropped(fd, false);
}

export async function deleteTournamentRound(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const row = (await db.select().from(matches).where(eq(matches.id, id)))[0];
  if (!row || !row.tournamentId) return;
  if (!owns(actor, row.playerAId)) return;

  // La misma puerta que al guardar: la ficha esconde el botón en un torneo
  // cerrado, pero esconder un botón no protege nada.
  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, row.tournamentId)))[0];
  // v0.16: un organizador puede corregir también un torneo ya cerrado.
  if (!tour || (tour.status !== "open" && !canManageLeague(actor.role))) return;

  await db.delete(matches).where(eq(matches.id, id));
  await syncTournamentRecord(row.tournamentId, row.playerAId);
  refresh();
  redirect(withFlash(`/torneos/${row.tournamentId}`, "ok", await msj("x.77325517")));
}

/** Recalcular el récord a mano, por si alguien editó rondas sueltas. */
export async function refreshTournamentRecord(fd: FormData) {
  const actor = await requireActor();
  const tournamentId = str(fd, "tournamentId");
  const playerId = str(fd, "playerId") || actor.id;
  if (!tournamentId || !owns(actor, playerId)) return;
  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)))[0];
  if (tour?.status !== "open") return;
  await syncTournamentRecord(tournamentId, playerId);
  refresh();
}

/** v0.19 — Lo mismo que el cron diario, a mano. Solo organizadores. */
export async function limpiarTorneosAbandonados() {
  await requireManager();
  const borrados = await borrarTorneosAbandonados();
  // v0.45 — lo mismo que hace el cron cada noche: también cierra los que se
  // quedaron abiertos más de una semana con datos dentro.
  const cerrados = await cerrarTorneosTerminados();
  refresh();
  const partes = [
    borrados.length ? `${borrados.length} sin participación borrado(s)` : "",
    cerrados.length ? `${cerrados.length} en curso de hace más de una semana cerrado(s)` : "",
  ].filter(Boolean);
  redirect(withFlash("/ajustes", "ok", partes.length
    ? `${partes.join(" y ")}: ${[...borrados, ...cerrados].map((t) => t.name).join(", ").slice(0, 160)}.`
    : "No había nada que limpiar ni que cerrar."));
}

/* =========================================================================
   v0.36 — Importar de Limitless los torneos online que habéis jugado.

   Cómo funciona: se piden los torneos online recientes, se baja la
   clasificación de cada uno y se busca en ella a la gente de la liga por su
   nick. Los que incluyan a alguien se crean con su resultado dentro; los
   demás no se tocan.

   Tres cosas que son a propósito:

   · **De cada clasificación solo se queda lo vuestro.** `vuestrosEnElTorneo`
     descarta las demás filas antes de devolver nada. Son personas con nombre
     y apellidos que no se han dado de alta aquí (misma norma que la v0.12).
   · **Idempotente.** El id del torneo lleva dentro el de Limitless
     (`ltl-<id>`), así que reimportar cae sobre la misma fila. Y un resultado
     que ya se editó a mano no se pisa: manda lo tecleado.
   · **No borra nada.** Si un torneo importado no interesa, se borra a mano, o
     lo hace solo el cron de limpieza si nadie apuntó nada en tres días.
   ========================================================================= */

export async function importarTorneosLimitless(fd: FormData) {
  const actor = await requireManager();
  const cuantos = Math.min(Math.max(1, Number(str(fd, "cuantos")) || 25), 50);

  const jugadores = await db
    .select({ id: players.id, name: players.name, limitlessHandle: players.limitlessHandle })
    .from(players)
    .where(eq(players.active, true));

  if (!jugadores.some((j) => (j.limitlessHandle ?? "").trim())) {
    redirect(withFlash("/ajustes", "error", await msj("x.58ce5300")));
  }

  const recientes = await fetchTournaments({ limit: cuantos });

  // Las clasificaciones, de una en una y en serie a propósito: son hasta 50
  // peticiones a una API pública y gratuita, y no hay ninguna prisa.
  const entradas: Array<{ torneo: TorneoRemoto; clasificacion: FilaClasificacion[] }> = [];
  for (const t of recientes) {
    try {
      entradas.push({ torneo: t, clasificacion: await fetchStandings(t.id) });
    } catch {
      // Un torneo que no responde no puede tumbar la importación entera.
    }
  }

  const resumen = importarTorneos(entradas, jugadores);
  if (!resumen.torneos.length) {
    redirect(withFlash("/ajustes", "ok",
      `Mirados ${entradas.length} torneos online: en ninguno jugó nadie del grupo.`));
  }

  // El catálogo, para casar el slug de Limitless con vuestros arquetipos.
  const catalogo = await db.select().from(archetypes);
  const porSlug = new Map(catalogo.filter((a) => a.limitlessId).map((a) => [a.limitlessId!, a]));

  let nuevos = 0, actualizados = 0;

  for (const t of resumen.torneos) {
    const yaEstaba = await db.select({ id: tournaments.id }).from(tournaments)
      .where(eq(tournaments.id, t.id)).limit(1);

    await db.insert(tournaments).values({
      id: t.id,
      name: t.name,
      kind: "online",
      scope: "online",
      format: t.format.toLowerCase() === "standard" ? "standard" : "other",
      date: t.date,
      playerCount: t.playerCount,
      season: seasonOfDate(t.date),
      status: "closed",
      url: `https://play.limitlesstcg.com/tournament/${t.remoteId}`,
      organizer: "Limitless",
      createdBy: actor.id,
    }).onConflictDoUpdate({
      target: tournaments.id,
      // Solo se refresca lo que puede cambiar en la fuente. El nombre y la
      // fecha no se tocan por si alguien los corrigió a mano.
      set: { playerCount: t.playerCount },
    });

    if (yaEstaba.length) actualizados++; else nuevos++;

    for (const r of t.resultados) {
      const arch = r.deckSlug ? porSlug.get(r.deckSlug) ?? null : null;
      await db.insert(tournamentResults).values({
        id: newId("tr"),
        tournamentId: t.id,
        playerId: r.playerId,
        placement: r.placement,
        wins: r.wins, losses: r.losses, ties: r.ties,
        archetypeId: arch?.id ?? null,
        notes: arch || !r.deckName ? "" : `Mazo en Limitless: ${r.deckName}`,
      }).onConflictDoNothing({
        // `DoNothing` y no `DoUpdate`: si ya hay un resultado es porque
        // alguien lo apuntó o lo corrigió, y lo tecleado manda sobre lo
        // importado. Siempre.
        target: [tournamentResults.tournamentId, tournamentResults.playerId],
      });
    }
  }

  revalidatePath("/", "layout");

  const pendientes = resumen.sinNick.length
    ? ` Sin nick y por tanto sin buscar: ${resumen.sinNick.join(", ")}.`
    : "";
  redirect(withFlash("/ajustes", "ok",
    `${nuevos} torneo(s) nuevo(s) y ${actualizados} ya conocido(s), de ${entradas.length} mirados.${pendientes}`));
}
