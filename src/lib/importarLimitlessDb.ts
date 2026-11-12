import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { archetypes, players, tournamentResults, tournaments } from "@/db/schema";
import { newId } from "@/lib/format";
import { seasonOfDate } from "@/lib/cp";
import { importarTorneos, type FilaClasificacion, type TorneoRemoto } from "@/lib/limitlessImport";
import { fetchStandings, fetchTournamentDetails, fetchTournamentsDesde, phaseShape } from "@/lib/sources/limitless";

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
   ========================================================================= */

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

export type ResumenLimitless = {
  mirados: number;
  nuevos: number;
  actualizados: number;
  resultados: number;
  sinNick: string[];
};

export async function importarDesdeLimitless(
  { dias = 7, maxTorneos = 150, actorId = null }: { dias?: number; maxTorneos?: number; actorId?: string | null },
): Promise<ResumenLimitless> {
  const apiKey = process.env.LIMITLESS_API_KEY;
  const jugadores = await db
    .select({ id: players.id, name: players.name, limitlessHandle: players.limitlessHandle })
    .from(players)
    .where(eq(players.active, true));
  const conNick = jugadores.filter((j) => (j.limitlessHandle ?? "").trim());
  const vacio = { mirados: 0, nuevos: 0, actualizados: 0, resultados: 0, sinNick: jugadores.filter((j) => !(j.limitlessHandle ?? "").trim()).map((j) => j.name) };
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
  if (!resumen.torneos.length) return { ...vacio, mirados: entradas.length, sinNick: resumen.sinNick };

  const catalogo = await db.select().from(archetypes);
  const porSlug = new Map<string, (typeof catalogo)[number]>(catalogo.filter((a) => a.limitlessId).map((a) => [a.limitlessId!, a]));
  const porNombre = new Map<string, (typeof catalogo)[number]>(catalogo.map((a) => [norm(a.name), a]));
  // Quien sale como creador de lo importado por el cron: el primer organizador.
  const creador = actorId ?? (await db.select({ id: players.id }).from(players)
    .where(eq(players.role, "owner")).orderBy(asc(players.createdAt)).limit(1))[0]?.id ?? null;

  let nuevos = 0, actualizados = 0, resultados = 0;
  for (const t of resumen.torneos) {
    const [yaEstaba] = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.id, t.id)).limit(1);
    let rondas: number | null = null, corte: number | null = null, organizador = "Limitless";
    try {
      const d = await fetchTournamentDetails(t.remoteId, apiKey);
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
  }
  return { mirados: entradas.length, nuevos, actualizados, resultados, sinNick: resumen.sinNick };
}
