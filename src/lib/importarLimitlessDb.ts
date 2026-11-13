import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { archetypes, matches, players, tournamentResults, tournaments } from "@/db/schema";
import { newId } from "@/lib/format";
import { seasonOfDate } from "@/lib/cp";
import { PREFIJO_NO_PRESENTADO } from "@/lib/causasDerrota";
import { importarTorneos, rondasDeJugador, vuestrosEnElTorneo, type FilaClasificacion, type FilaEmparejamiento, type TorneoRemoto } from "@/lib/limitlessImport";
import { fetchPairings, fetchStandings, fetchTournamentDetails, fetchTournamentsDesde, phaseShape, type LimitlessPhase } from "@/lib/sources/limitless";

/* =========================================================================
   v0.122 — Traer los torneos online de los del grupo (por su nick de
   Limitless). Lo usan el botón de Ajustes y el cron diario.

   EL FALLO DE ANTES: se miraban los 25–50 torneos MÁS RECIENTES de toda la
   plataforma. Limitless tiene tantos torneos que eso son unas horas: casi
   nunca aparecía nadie del grupo. Ahora:
     · se recorre la VENTANA de días pedida (paginando la API), torneos de
       8 o más jugadores, del más reciente al más antiguo, hasta `maxTorneos`;
     · el cron lo hace CADA DÍA con los dos últimos días, así que con el
       tiempo no se escapa ninguno;
     · de los torneos donde jugó alguien del grupo se piden los detalles:
       rondas de suizo, top cut y organizador;
     · el mazo se casa con el catálogo por el id de Limitless y, si no, por el
       nombre.
   Lo apuntado a mano manda: un resultado que ya existe no se pisa.

   v0.127 — Y LAS RONDAS. Del torneo solo se guardaba el resultado final. Ahora
   se piden también los emparejamientos (una llamada más por torneo en el que
   jugó alguien del grupo) y, para cada uno, se crea una ronda por partida: el
   resultado y el mazo del rival (ver `rondasDeJugador`). Es lo que alimenta la
   matriz de emparejamientos, el %V por arquetipo y el Elo.
     · Se guardan como las rondas apuntadas a mano (misma tabla, mismos campos).
     · NO se guarda el nick ni el nombre del rival: «Rival R3». Si el rival es
       alguien del grupo, sí se enlaza con su jugador.
     · Una ronda que ya existe (apuntada a mano o importada antes) no se pisa.
     · Vale también para los torneos que ya estaban importados: al volver a
       pasar por ellos, se les añaden las rondas que falten.
   ========================================================================= */

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

export type ResumenLimitless = {
  mirados: number;
  nuevos: number;
  actualizados: number;
  resultados: number;
  /** v0.127 — rondas nuevas guardadas (con su resultado y, si se supo, el mazo rival). */
  rondas: number;
  /** v0.127 — de esas, las que se quedaron sin mazo rival (el rival no tenía mazo identificado o no está en el catálogo). */
  rondasSinMazo: number;
  sinNick: string[];
};

export async function importarDesdeLimitless(
  { dias = 7, maxTorneos = 150, actorId = null, maxAtrasados = 10 }: { dias?: number; maxTorneos?: number; actorId?: string | null; maxAtrasados?: number },
): Promise<ResumenLimitless> {
  const apiKey = process.env.LIMITLESS_API_KEY;
  const jugadores = await db
    .select({ id: players.id, name: players.name, limitlessHandle: players.limitlessHandle })
    .from(players)
    .where(eq(players.active, true));
  const conNick = jugadores.filter((j) => (j.limitlessHandle ?? "").trim());
  const vacio = { mirados: 0, nuevos: 0, actualizados: 0, resultados: 0, rondas: 0, rondasSinMazo: 0, sinNick: jugadores.filter((j) => !(j.limitlessHandle ?? "").trim()).map((j) => j.name) };
  if (!conNick.length) return vacio;

  const ventana = (await fetchTournamentsDesde({ days: dias, apiKey, minPlayers: 8, maxPaginas: 30 }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, maxTorneos);

  // Clasificaciones de 8 en 8: cada una va a la caché de 6 h de `fetch`.
  const entradas: Array<{ torneo: TorneoRemoto; clasificacion: FilaClasificacion[] }> = [];
  for (let i = 0; i < ventana.length; i += 8) {
    const lote = ventana.slice(i, i + 8);
    const res = await Promise.allSettled(lote.map((t) => fetchStandings(t.id, apiKey)));
    res.forEach((r, k) => { if (r.status === "fulfilled") entradas.push({ torneo: lote[k], clasificacion: r.value }); });
  }

  const resumen = importarTorneos(entradas, jugadores);
  // v0.127 — aunque en esta ventana no haya jugado nadie, se sigue: quedan las rondas atrasadas.

  const catalogo = await db.select().from(archetypes);
  const porSlug = new Map<string, (typeof catalogo)[number]>(catalogo.filter((a) => a.limitlessId).map((a) => [a.limitlessId!, a]));
  const porNombre = new Map<string, (typeof catalogo)[number]>(catalogo.map((a) => [norm(a.name), a]));
  // Quien sale como creador de lo importado por el cron: el primer organizador.
  const creador = actorId ?? (await db.select({ id: players.id }).from(players)
    .where(eq(players.role, "owner")).orderBy(asc(players.createdAt)).limit(1))[0]?.id ?? null;

  const clasifDe = new Map(entradas.map((e) => [e.torneo.id, e.clasificacion]));
  const arquetipoDe = (slug: string | null, nombre: string | null) =>
    (slug ? porSlug.get(slug) : undefined) ?? (nombre ? porNombre.get(norm(nombre)) : undefined) ?? null;

  let nuevos = 0, actualizados = 0, resultados = 0, rondasNuevas = 0, rondasSinMazo = 0;
  for (const t of resumen.torneos) {
    const [yaEstaba] = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.id, t.id)).limit(1);
    let rondas: number | null = null, corte: number | null = null, organizador = "Limitless";
    let fases: LimitlessPhase[] = [];
    try {
      const d = await fetchTournamentDetails(t.remoteId, apiKey);
      fases = d?.phases ?? [];
      const forma = phaseShape(d?.phases);
      rondas = forma.swissRounds || null;
      corte = forma.topCut || 0;
      if (d?.organizer?.name) organizador = d.organizer.name;
    } catch { /* sin detalles: se guarda lo demás */ }

    await db.insert(tournaments).values({
      id: t.id,
      name: t.name,
      kind: "online",
      scope: "online",
      format: t.format.toLowerCase() === "standard" ? "standard" : t.format.toLowerCase() === "expanded" ? "expanded" : "other",
      date: t.date,
      playerCount: t.playerCount,
      rounds: rondas,
      topCut: corte,
      bestOf: 1,
      bestOfTop: corte ? 3 : null,
      season: seasonOfDate(t.date),
      status: "closed",
      url: `https://play.limitlesstcg.com/tournament/${t.remoteId}`,
      organizer: organizador,
      createdBy: creador,
    }).onConflictDoUpdate({
      target: tournaments.id,
      // Lo que puede cambiar en la fuente; el nombre y la fecha no, por si se corrigieron a mano.
      set: { playerCount: t.playerCount, ...(rondas ? { rounds: rondas } : {}), ...(corte != null ? { topCut: corte } : {}), organizer: organizador },
    });
    if (yaEstaba) actualizados++; else nuevos++;

    for (const r of t.resultados) {
      const arch = (r.deckSlug ? porSlug.get(r.deckSlug) : undefined) ?? (r.deckName ? porNombre.get(norm(r.deckName)) : undefined) ?? null;
      const ins = await db.insert(tournamentResults).values({
        id: newId("tr"),
        tournamentId: t.id,
        playerId: r.playerId,
        placement: r.placement,
        wins: r.wins, losses: r.losses, ties: r.ties,
        archetypeId: arch?.id ?? null,
        notes: arch || !r.deckName ? "" : `Mazo en Limitless: ${r.deckName}`,
      }).onConflictDoNothing({ target: [tournamentResults.tournamentId, tournamentResults.playerId] }).returning({ id: tournamentResults.id });
      resultados += ins.length;
    }

    // v0.127 — las rondas de cada uno (resultado y mazo rival).
    const g = await guardarRondas({
      torneoId: t.id, remoteId: t.remoteId, fecha: t.date, clasificacion: clasifDe.get(t.remoteId) ?? [],
      resultados: t.resultados, fases, jugadores, arquetipoDe, creador, apiKey,
    });
    rondasNuevas += g.rondas; rondasSinMazo += g.sinMazo;
  }

  /* v0.127 — y los torneos que YA estaban importados de antes y se quedaron sin
     rondas (los de fuera de esta ventana): unos pocos en cada pasada, del más
     reciente al más antiguo, hasta ponerse al día. */
  const yaVistos = new Set(resumen.torneos.map((x) => x.id));
  const atrasados = await completarRondasAtrasadas({ excluir: yaVistos, max: maxAtrasados, jugadores, arquetipoDe, creador, apiKey });
  rondasNuevas += atrasados.rondas; rondasSinMazo += atrasados.sinMazo;
  return { mirados: entradas.length, nuevos, actualizados, resultados, rondas: rondasNuevas, rondasSinMazo, sinNick: resumen.sinNick };
}

type Catalogado = { id: string } | null;
type JugadorGrupo = { id: string; name: string; limitlessHandle: string | null };

/** v0.127 — Guarda las rondas de los del grupo en UN torneo. Nunca lanza: sin emparejamientos, no hace nada. */
async function guardarRondas(o: {
  torneoId: string; remoteId: string; fecha: string; clasificacion: FilaClasificacion[];
  resultados: Array<{ playerId: string; nick: string; deckSlug: string | null; deckName: string | null }>;
  fases: LimitlessPhase[]; jugadores: JugadorGrupo[];
  arquetipoDe: (slug: string | null, nombre: string | null) => Catalogado;
  creador: string | null; apiKey?: string;
}): Promise<{ rondas: number; sinMazo: number }> {
  let rondas = 0, sinMazo = 0;
  let pares: FilaEmparejamiento[] = [];
  try { pares = await fetchPairings(o.remoteId, o.apiKey); } catch { pares = []; }
  if (!pares.length) return { rondas, sinMazo };
  const nombreDe = new Map(o.jugadores.map((j) => [j.id, j.name]));
  const bestOfDeFase = (fase: number) => {
    const modo = o.fases.find((f) => f.phase === fase)?.mode ?? "";
    const n = Number(/(\d)/.exec(modo)?.[1] ?? 1);
    return n === 3 || n === 5 ? n : 1;
  };
  for (const r of o.resultados) {
    const mio = o.arquetipoDe(r.deckSlug, r.deckName);
    const filas = rondasDeJugador(pares, o.clasificacion, r.nick, o.jugadores).map((x) => {
      const rival = x.bye || x.sinJugar ? null : o.arquetipoDe(x.rivalSlug, x.rivalMazo);
      const notas = [
        x.sinJugar ? `${PREFIJO_NO_PRESENTADO}: yo` : "",
        !rival && x.rivalMazo && !x.bye && !x.sinJugar ? `Mazo rival en Limitless: ${x.rivalMazo}` : "",
        "Importado de Limitless",
      ].filter(Boolean);
      return {
        id: newId("m"),
        competitionId: null,
        tournamentId: o.torneoId,
        round: x.ronda,
        date: o.fecha,
        playerAId: r.playerId,
        playerBId: null,
        // Sin el nick del rival: solo si es del grupo se pone su nombre.
        opponentName: x.bye ? "BYE" : (x.rivalPlayerId && nombreDe.get(x.rivalPlayerId)) || `Rival R${x.ronda}`,
        opponentPlayerId: x.bye ? null : x.rivalPlayerId,
        deckAId: null,
        archetypeAId: mio?.id ?? null,
        deckBId: null,
        opponentArchetypeId: rival?.id ?? null,
        bestOf: bestOfDeFase(x.fase),
        status: "done" as const,
        seriesResult: x.resultado,
        firstTurn: "",
        note: notas.join(" · ").slice(0, 300),
        createdBy: o.creador,
      };
    });
    if (!filas.length) continue;
    try {
      // Lo apuntado a mano manda: si la ronda ya existe, no se toca.
      const ins = await db.insert(matches).values(filas)
        .onConflictDoNothing({
          target: [matches.tournamentId, matches.playerAId, matches.round],
          where: sql`${matches.tournamentId} is not null`,
        })
        .returning({ rival: matches.opponentArchetypeId, nombre: matches.opponentName, nota: matches.note });
      rondas += ins.length;
      sinMazo += ins.filter((m) => !m.rival && m.nombre !== "BYE" && !m.nota.startsWith(PREFIJO_NO_PRESENTADO)).length;
    } catch (e) {
      console.warn("[limitless] no se han podido guardar las rondas", o.torneoId, e instanceof Error ? e.message : e);
    }
  }
  return { rondas, sinMazo };
}

/**
 * v0.127 — Los torneos importados ANTES de que se trajeran las rondas: se
 * buscan los `ltl-…` en los que algún resultado no tiene ninguna ronda y se
 * completan pidiendo su clasificación y sus emparejamientos por id (sin
 * recorrer ventanas de días). `max` torneos por pasada.
 */
async function completarRondasAtrasadas(o: {
  excluir: Set<string>; max: number; jugadores: JugadorGrupo[];
  arquetipoDe: (slug: string | null, nombre: string | null) => Catalogado;
  creador: string | null; apiKey?: string;
}): Promise<{ rondas: number; sinMazo: number }> {
  let rondas = 0, sinMazo = 0;
  if (o.max <= 0) return { rondas, sinMazo };
  try {
    const pendientes = await db.select({ id: tournaments.id, date: tournaments.date, playerCount: tournaments.playerCount, name: tournaments.name })
      .from(tournaments)
      .where(sql`${tournaments.id} LIKE 'ltl-%' AND EXISTS (
        SELECT 1 FROM ${tournamentResults}
        WHERE ${tournamentResults.tournamentId} = ${tournaments.id}
          AND NOT EXISTS (SELECT 1 FROM ${matches} WHERE ${matches.tournamentId} = ${tournaments.id} AND ${matches.playerAId} = ${tournamentResults.playerId})
      )`)
      /* Al azar y no por fecha: un torneo sin emparejamientos publicados (o del que
         alguien se retiró antes de jugar) seguiría «pendiente» siempre, y con un
         orden fijo taparía a los demás en cada pasada. */
      .orderBy(sql`random()`)
      .limit(o.max + o.excluir.size);
    for (const t of pendientes.filter((x) => !o.excluir.has(x.id)).slice(0, o.max)) {
      const remoteId = t.id.slice(4);
      try {
        const [clasificacion, detalles] = await Promise.all([
          fetchStandings(remoteId, o.apiKey),
          fetchTournamentDetails(remoteId, o.apiKey).catch(() => null),
        ]);
        const vuestros = vuestrosEnElTorneo(
          { id: remoteId, name: t.name, date: t.date, format: "", players: t.playerCount ?? 0 }, clasificacion, o.jugadores,
        );
        if (!vuestros) continue;
        const g = await guardarRondas({
          torneoId: t.id, remoteId, fecha: t.date, clasificacion, resultados: vuestros.resultados,
          fases: detalles?.phases ?? [], jugadores: o.jugadores, arquetipoDe: o.arquetipoDe, creador: o.creador, apiKey: o.apiKey,
        });
        rondas += g.rondas; sinMazo += g.sinMazo;
      } catch { /* este torneo, en la próxima pasada */ }
    }
  } catch (e) {
    console.warn("[limitless] rondas atrasadas", e instanceof Error ? e.message : e);
  }
  return { rondas, sinMazo };
}
