"use server";

/* Partidas: registrar, editar y borrar.
   v0.47 — partido de `src/actions/index.ts`. */

import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { archetypes, competitions, games, matches } from "@/db/schema";
import { validarMazosPorJuego } from "@/lib/juegosMazos";
import { asModalidad } from "@/lib/modalidades";
import { canManageLeague } from "@/lib/auth";
import { newId, todayISO } from "@/lib/format";
import { withFlash } from "@/lib/flash";
import {
  str, int, maybeInt, isoDate, bool, pick, refresh, requireActor, BEST_OF,
  msj,
} from "./_comun";
import { leerMarcador, secuenciaDe } from "@/lib/marcador";

export async function saveMatch(fd: FormData) {
  const actor = await requireActor();
  const editing = str(fd, "id");
  const bestOf = int(fd, "bestOf", 3, 1, 5);
  if (!BEST_OF.includes(bestOf)) return;

  const externalName = str(fd, "opponentName");
  const playerBId = str(fd, "playerBId");
  const playerAId = str(fd, "playerAId");
  if (!playerAId) return;
  if (!playerBId && !externalName) return;
  if (playerBId === playerAId) return;

  // Solo se registran partidas propias, salvo que seas organizador. Antes,
  // cualquiera podía inventar resultados entre terceros y mover el ranking.
  if (!canManageLeague(actor.role) && playerAId !== actor.id && playerBId !== actor.id) return;

  let current: typeof matches.$inferSelect | undefined;
  if (editing) {
    current = (await db.select().from(matches).where(eq(matches.id, editing)))[0];
    if (!current) return;
    const mine = current.playerAId === actor.id || current.playerBId === actor.id
      || current.createdBy === actor.id;
    if (!mine && !canManageLeague(actor.role)) return;
  }
  /* v0.15 — el enlace al rival del grupo de una ronda de torneo se conserva
     al editar desde aquí solo si el rival sigue siendo el mismo nombre. */
  const keepRivalLink = Boolean(
    current?.opponentPlayerId && !playerBId
    && (current.opponentName ?? "") === externalName.slice(0, 60),
  );

  const values = {
    competitionId: str(fd, "competitionId") || null,
    tournamentId: str(fd, "tournamentId") || null,
    round: int(fd, "round", 0, 0, 50),
    date: isoDate(fd, "date") ?? todayISO(),
    playerAId,
    playerBId: playerBId || null,
    opponentName: playerBId ? null : (externalName.slice(0, 60) || null),
    opponentPlayerId: keepRivalLink ? current!.opponentPlayerId : null,
    // v0.24: en el selector de mazo también se puede elegir solo un ARQUETIPO
    // (`arch:<id>`), para los dos lados. El de A va a `archetypeAId`; el del
    // rival del grupo, a `opponentArchetypeId` (mismo hueco que el de fuera).
    deckAId: str(fd, "deckAId").startsWith("arch:") ? null : (str(fd, "deckAId") || null),
    archetypeAId: str(fd, "deckAId").startsWith("arch:") ? str(fd, "deckAId").slice(5) || null : null,
    deckBId: playerBId && !str(fd, "deckBId").startsWith("arch:") ? (str(fd, "deckBId") || null) : null,
    opponentArchetypeId: playerBId
      ? (str(fd, "deckBId").startsWith("arch:") ? str(fd, "deckBId").slice(5) || null : null)
      : (str(fd, "opponentArchetypeId") || null),
    bestOf,
    /* v0.53 — el resultado de la SERIE cuando no se apuntan juegos: hoy, solo el
       empate por tiempo. Un Bo3 que acaba por tiempo es un estado de la partida,
       no «1-1 y un juego empatado»: no se inventan juegos que no se jugaron.
       `outcome()` ya sabe leer una partida sin juegos con `seriesResult`. */
    seriesResult: (str(fd, "empate_tiempo") === "1" ? "tie" : null) as string | null,
    status: "done" as const,
    note: str(fd, "note").slice(0, 500),
    createdBy: actor.id,
  };

  /* v0.24 — Ya no se imponen mazos de liga: cada partida lleva el mazo o
     arquetipo que se apunte. Solo queda la regla de la modalidad «Bo3». */
  if (values.competitionId) {
    const comp = (await db.select({ modality: competitions.modality })
      .from(competitions).where(eq(competitions.id, values.competitionId)))[0];
    if (comp && asModalidad(comp.modality) === "tres_mazos" && bestOf !== 3) {
      redirect(withFlash(editing ? `/partidas/${editing}` : "/partidas/nueva", "error",
        await msj("x.1597ae6e")));
    }
  }

  // Los juegos: solo los del 1 al bestOf, solo con ganador reconocible, y sin
  // pasarse de la mayoría. Un "3-0 en un Bo3" no debe poder guardarse, y un
  // ganador escrito a mano tipo "x" contaba como empate sin avisar.
  const need = Math.ceil(bestOf / 2);
  const rows: Array<{
    number: number; winner: string; first: string;
    prizesA: number | null; prizesB: number | null;
    penaltyA: boolean; penaltyB: boolean;
    archetypeAId: string | null; archetypeBId: string | null;
    mulligansA: number; mulligansB: number;
  }> = [];
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
      first: pick(fd, `g${i}_first`, ["", "a", "b"] as const, ""),
      mulligansA: maybeInt(fd, `g${i}_mulligans_a`, 0, 99) ?? 0,
      mulligansB: maybeInt(fd, `g${i}_mulligans_b`, 0, 99) ?? 0,
      /* v0.30 — premios de cada lado, 0–6, opcionales. `maybeInt` devuelve
         null si el campo no viene o está fuera de rango, y null significa
         «no se apuntó», que no es lo mismo que cero. */
      prizesA: maybeInt(fd, `g${i}_prizes_a`, 0, 6),
      prizesB: maybeInt(fd, `g${i}_prizes_b`, 0, 6),
      /* La penalización la SUFRE quien está marcado: baja a 4 el objetivo
         del OTRO. No reparte premios. Ver `src/lib/premios.ts`. */
      penaltyA: bool(fd, `g${i}_penalty_a`),
      penaltyB: bool(fd, `g${i}_penalty_b`),
      // v0.25: mazo (arquetipo) de cada lado en este juego, opcional.
      archetypeAId: str(fd, `g${i}_archA`) || null,
      archetypeBId: str(fd, `g${i}_archB`) || null,
    });
  }
  // v0.53 — sin juegos solo vale un empate por tiempo. Antes, sin juegos, la
  // acción salía SIN GUARDAR y sin decir nada.
  if (!rows.length && values.seriesResult !== "tie") {
    redirect(withFlash(editing ? `/partidas/${editing}` : "/partidas/nueva", "error", await msj("rr.faltaResultado")));
  }

  // v0.25 — regla de liga: no se repite un arquetipo con el que ya ganaste un
  // juego de esta serie. Los ids tienen que existir (no se fía del formulario).
  const archsUsados = [...new Set(rows.flatMap((r) => [r.archetypeAId, r.archetypeBId]).filter((x): x is string => Boolean(x)))];
  if (archsUsados.length) {
    const existen = new Set((await db.select({ id: archetypes.id }).from(archetypes)
      .where(inArray(archetypes.id, archsUsados))).map((r) => r.id));
    for (const r of rows) {
      if (r.archetypeAId && !existen.has(r.archetypeAId)) r.archetypeAId = null;
      if (r.archetypeBId && !existen.has(r.archetypeBId)) r.archetypeBId = null;
    }
  }
  /* v0.43 — «mismo mazo toda la serie» es un botón del formulario, no una
     regla de liga o amistoso. Sustituye a la regla de la v0.41 («amistoso ⇒
     sin mazo por juego»), que era incompleta: se puede cambiar de mazo en un
     amistoso, y se puede jugar una liga con el mismo de principio a fin.

       · Con el mazo FIJO, manda el de la serie y los de cada juego se
         descartan aunque lleguen (endpoint público). Vacío = «el de la serie».
       · SIN fijar, cada juego lleva el suyo. El de la serie no llega, y las
         estadísticas lo deducen de los juegos (`arquetipoPorJuegos`).

     Un formulario viejo en caché que no mande `mazo_fijo` cae en «sin
     fijar»: se guarda lo que traiga, que es lo que hacía antes. */
  if (str(fd, "mazo_fijo") === "1") {
    for (const r of rows) { r.archetypeAId = null; r.archetypeBId = null; }
  }

  // El bloqueo de mazo es la regla de LIGA, y solo tiene sentido si se cambia
  // de mazo entre juegos.
  if (values.competitionId && str(fd, "mazo_fijo") !== "1") {
    const fallo = validarMazosPorJuego(rows.map((r) => ({ winner: r.winner, archA: r.archetypeAId, archB: r.archetypeBId })));
    if (fallo) {
      redirect(withFlash(editing ? `/partidas/${editing}` : "/partidas/nueva", "error",
        `Juego ${fallo.juego}: no se puede repetir un mazo con el que ya se ganó un juego de esta serie.`));
    }
  }

  const id = editing || newId("m");
  if (editing) {
    // v0.54 — corregir un resultado deja rastro: quién y cuándo.
    await db.update(matches).set({ ...values, createdBy: current?.createdBy ?? values.createdBy, updatedBy: actor.id, updatedAt: new Date() }).where(eq(matches.id, id));
    await db.delete(games).where(eq(games.matchId, id));
  } else {
    await db.insert(matches).values({ id, ...values });
  }
  if (rows.length) await db.insert(games).values(rows.map((r) => ({ matchId: id, ...r, note: "" })));
  refresh();
  redirect(withFlash("/resultados", "ok", editing ? "Partida guardada." : "Partida registrada."));
}

export async function deleteMatch(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const current = (await db.select().from(matches).where(eq(matches.id, id)))[0];
  if (!current) redirect("/resultados");
  const mine = current.playerAId === actor.id || current.playerBId === actor.id
    || current.createdBy === actor.id;
  if (!mine && !canManageLeague(actor.role)) redirect("/resultados");
  await db.delete(matches).where(eq(matches.id, id));
  refresh();
  redirect(withFlash("/resultados", "ok", await msj("x.42c45bb9")));
}

/**
 * v0.54 — Resultado rápido desde una lista de pendientes: un toque y guardado.
 *
 * Misma regla de permisos que `saveMatch` (los dos jugadores, quien la creó o un
 * organizador). Solo valen los marcadores del formato de ESA partida. Si la
 * partida ya tenía resultado, queda rastro de quién lo cambió y cuándo.
 */
export async function resultadoRapido(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const volver = str(fd, "volver").startsWith("/") ? str(fd, "volver") : "/resultados";
  const m = (await db.select().from(matches).where(eq(matches.id, id)))[0];
  if (!m) redirect(withFlash(volver, "error", await msj("rr.noExiste")));
  const suya = m.playerAId === actor.id || m.playerBId === actor.id || m.createdBy === actor.id;
  if (!suya && !canManageLeague(actor.role)) redirect(withFlash(volver, "error", await msj("rr.sinPermiso")));
  const r = leerMarcador(str(fd, "marcador"), m.bestOf);
  if (!r) redirect(withFlash(volver, "error", await msj("rr.faltaResultado")));

  const correccion = m.status === "done";
  await db.delete(games).where(eq(games.matchId, id));
  if (r !== "empate") {
    await db.insert(games).values(secuenciaDe(r.a, r.b).map((winner, i) => ({
      matchId: id, number: i + 1, winner, first: "", note: "",
      prizesA: null, prizesB: null, penaltyA: false, penaltyB: false,
      archetypeAId: null, archetypeBId: null, mulligansA: 0, mulligansB: 0,
    })));
  }
  await db.update(matches).set({
    status: "done",
    seriesResult: r === "empate" ? "tie" : null,
    ...(correccion ? { updatedBy: actor.id, updatedAt: new Date() } : {}),
  }).where(eq(matches.id, id));
  refresh();
  redirect(withFlash(volver, "ok", await msj(correccion ? "rr.corregido" : "rr.guardado")));
}
