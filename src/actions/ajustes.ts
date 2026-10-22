"use server";

/* Ajustes de la liga, Elo, ladder y cambios de temporada.
   v0.47 — partido de `src/actions/index.ts`. */

import { redirect } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { competitionPlayers, competitions, events, games, ladderEntries, matches, players, seasonResets, settings, tournamentResults, tournaments } from "@/db/schema";
import { isOwner } from "@/lib/auth";
import { newId, todayISO } from "@/lib/format";
import { withFlash } from "@/lib/flash";
import { normalizeLadderInput } from "@/lib/rank";
import {
  str, maybeNum, int, isoDate, bool, refresh, requireActor, requireManager, owns, confirmed,
  msj,
} from "./_comun";
import { notificarAgendaSemana, notificarPendientesLiga } from "@/lib/discord";

/**
 * Empezar el Elo de cero desde hoy.
 *
 * No borra nada: pone la fecha de corte a hoy, y a partir de ahí `eloTable`
 * ignora lo anterior. Todos vuelven al Elo inicial y se reconstruye con las
 * partidas nuevas.
 *
 * Es reversible desde Ajustes quitando la fecha, porque las partidas siguen
 * exactamente donde estaban. Por eso esto no pide confirmación: lo que pide
 * confirmación es lo que no se puede deshacer.
 */
export async function resetElo() {
  await requireManager();
  const hoy = todayISO();

  const existing = await db.select().from(settings).where(eq(settings.id, "default"));
  if (existing[0]) {
    await db.update(settings).set({ eloSince: hoy, updatedAt: new Date() })
      .where(eq(settings.id, "default"));
  } else {
    await db.insert(settings).values({ id: "default", eloSince: hoy });
  }

  refresh();
  redirect(withFlash("/ajustes", "ok", `Elo reiniciado: solo cuentan las partidas desde el ${hoy}.`));
}

/** Volver a contar el Elo desde el principio. */
export async function clearEloReset() {
  await requireManager();
  await db.update(settings).set({ eloSince: null, updatedAt: new Date() })
    .where(eq(settings.id, "default"));
  refresh();
  redirect(withFlash("/ajustes", "ok", await msj("x.7952ec9f")));
}

/* ------------------------------------------------------------- ajustes -- */

export async function saveSettings(fd: FormData) {
  await requireManager();
  const values = {
    name: str(fd, "name").slice(0, 80) || "Liga Arena",
    season: str(fd, "season").slice(0, 80) || "Temporada 1",
    cpSeason: int(fd, "cpSeason", 2027, 2000, 2100),
    ptsWin: int(fd, "ptsWin", 3, 0, 100),
    ptsTie: int(fd, "ptsTie", 1, 0, 100),
    ptsLoss: int(fd, "ptsLoss", 0, 0, 100),
    eloStart: int(fd, "eloStart", 1000, 100, 4000),
    eloK: int(fd, "eloK", 24, 1, 100),
    // Cualquier otra cosa cae en el valor recomendado en vez de romper: el
    // campo viene de un desplegable, pero un formulario se puede manipular.
    eloScope: ["all", "competitive", "tournaments"].includes(str(fd, "eloScope"))
      ? str(fd, "eloScope")
      : "competitive",
    // Vacío = desde el principio. `isoDate` con null por defecto ya rechaza
    // cualquier cosa que no sea una fecha de verdad.
    eloSince: isoDate(fd, "eloSince", null),
    ratingZone: str(fd, "ratingZone") || "europe",
    registrationOpen: bool(fd, "registrationOpen"),
    updatedAt: new Date(),
  };
  const existing = await db.select().from(settings).where(eq(settings.id, "default"));
  if (existing[0]) await db.update(settings).set(values).where(eq(settings.id, "default"));
  else await db.insert(settings).values({ id: "default", ...values });
  refresh();
  redirect(withFlash("/ajustes", "ok", await msj("x.06111673")));
}

/* --------------------------------------------------------- ladder manual -- */

/**
 * Poner o cambiar el rango del ladder.
 *
 * El rango propio lo cambia cada uno; el de otra persona, solo un
 * organizador. El rango se acota en el formulario, aquí, y con un CHECK en la
 * base de datos: tres sitios, porque una Server Action es un endpoint público
 * y a esta se puede llamar con 99999 desde la consola del navegador.
 */
export async function setLadderElo(fd: FormData) {
  const actor = await requireActor();
  const playerId = str(fd, "playerId") || actor.id;
  if (!owns(actor, playerId)) return;

  // v0.18: 1–550 y 1350–2100; entre medias es el salto Arceus (→ 1500).
  const elo = normalizeLadderInput(maybeNum(fd, "ladderElo"));
  if (elo == null) {
    redirect(withFlash(`/perfil/${playerId}`, "error", await msj("x.b84e95bd")));
  }
  const note = str(fd, "ladderNote").slice(0, 200);

  await db.update(players)
    .set({ ladderElo: elo, ladderEloUpdatedAt: new Date(), ladderNote: note })
    .where(eq(players.id, playerId));

  // Cada cambio deja historial, que es lo que permite pintar la evolución.
  await db.insert(ladderEntries).values({
    id: newId("le"), playerId, elo, note, createdBy: actor.id,
  });

  refresh();
  redirect(`/perfil/${playerId}`);
}

export async function clearLadderElo(fd: FormData) {
  const actor = await requireActor();
  const playerId = str(fd, "playerId") || actor.id;
  if (!owns(actor, playerId)) return;
  await db.update(players)
    .set({ ladderElo: null, ladderEloUpdatedAt: new Date(), ladderNote: "" })
    .where(eq(players.id, playerId));
  refresh();
  redirect(`/perfil/${playerId}`);
}

/**
 * Vaciar una temporada: sus torneos, las rondas de esos torneos y los
 * resultados. No toca jugadores, mazos, arquetipos ni la liga interna.
 */
export async function wipeSeason(fd: FormData) {
  const actor = await requireActor();
  if (!isOwner(actor.role)) return;
  const season = int(fd, "season", 0, 2000, 2100);
  if (!season || !confirmed(fd, `borrar temporada ${season}`)) return;

  const rows = await db.select({ id: tournaments.id }).from(tournaments)
    .where(eq(tournaments.season, season));
  if (rows.length) {
    const ids = rows.map((r) => r.id);
    // Las rondas primero: `matches.tournamentId` es ON DELETE SET NULL, así que
    // borrar el torneo sin más dejaría partidas huérfanas sin competición ni
    // torneo, invisibles en todas las pantallas pero contando en el ranking.
    await db.delete(matches).where(and(inArray(matches.tournamentId, ids), isNull(matches.playerBId)));
    await db.delete(tournaments).where(inArray(tournaments.id, ids));
  }
  refresh();
  redirect("/torneos");
}

/**
 * Borrar todo el historial de juego y quedarse con la gente.
 *
 * Sobreviven: jugadores con sus cuentas, mazos y arquetipos. Se van: partidas,
 * juegos, competiciones, torneos, resultados, eventos y el ladder.
 */
export async function resetLeague(fd: FormData) {
  const actor = await requireActor();
  if (!isOwner(actor.role)) return;
  if (!confirmed(fd, "borrar todo el historial")) return;

  await db.delete(matches);          // `games` se va en cascada
  await db.delete(competitionPlayers);
  await db.delete(competitions);
  await db.delete(tournamentResults);
  await db.delete(tournaments);
  await db.delete(events);
  await db.delete(ladderEntries);
  await db.update(players).set({ ladderElo: null, ladderNote: "" });
  refresh();
  redirect("/");
}

/**
 * Reset global del ladder para el cambio de temporada. Solo organizadores y
 * con la frase escrita, porque toca a todo el mundo a la vez.
 *
 * Quita el rango de todos y marca el inicio de temporada (`ladder_since`).
 * El historial (`ladder_entries`) NO se borra: queda como archivo y la
 * gráfica del líder empieza a contar desde aquí. Opcionalmente reinicia
 * también el Elo de la liga (fecha de corte, reversible).
 */
export async function resetLadderSeason(fd: FormData) {
  const actor = await requireManager();
  if (!confirmed(fd, "nueva temporada")) {
    redirect(withFlash("/ajustes", "error", await msj("x.f8541dbf")));
  }
  const ahora = new Date();
  const tambienElo = str(fd, "elo") === "1";
  const tambienPuestos = str(fd, "puestos") === "1";

  await db.update(players).set({
    ladderElo: null,
    ladderNote: "",
    ladderEloUpdatedAt: ahora,
    ...(tambienPuestos ? { rankSpain: null, rankEurope: null, rankZoneUpdatedAt: ahora } : {}),
  });

  // v0.19: queda apuntado, para la línea roja de la gráfica del ladder.
  await db.insert(seasonResets).values({ id: newId("sr"), at: ahora, createdBy: actor.id });

  const cambios = { ladderSince: ahora, updatedAt: ahora, ...(tambienElo ? { eloSince: todayISO() } : {}) };
  const existing = await db.select({ id: settings.id }).from(settings).where(eq(settings.id, "default"));
  if (existing[0]) await db.update(settings).set(cambios).where(eq(settings.id, "default"));
  else await db.insert(settings).values({ id: "default", ...cambios });

  refresh();
  redirect(withFlash("/ajustes", "ok",
    `Temporada nueva: rangos del ladder a cero${tambienElo ? ", Elo de la liga desde hoy" : ""}${tambienPuestos ? " y puestos oficiales borrados" : ""}.`));
}

/**
 * v0.59 — Manda ahora un aviso de prueba a Discord, sin esperar al lunes.
 * Solo organizadores. Dice si salió, sin enseñar nunca la URL del webhook.
 */
export async function probarDiscord(fd: FormData) {
  await requireManager();
  const tipo = str(fd, "tipo");
  const ok = tipo === "agenda" ? await notificarAgendaSemana(new Date().toISOString().slice(0, 10))
    : tipo === "liga" ? await notificarPendientesLiga()
    : false;
  redirect(withFlash("/ajustes#discord", ok ? "ok" : "error", await msj(ok ? "dc.enviado" : "dc.noEnviado")));
}
