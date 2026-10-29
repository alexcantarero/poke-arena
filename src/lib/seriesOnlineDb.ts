import "server-only";
import { and, eq, inArray, isNull, like, lt } from "drizzle-orm";
import { db } from "@/db";
import { events, tournaments } from "@/db/schema";
import { fetchTournaments } from "@/lib/sources/limitless";
import { num } from "@/lib/format";
import { SERIES_SEGUIDAS } from "@/data/seriesSeguidas";
import {
  detectarSeries, diaMadrid, nombreBase, edicionesReales, horaMadrid, idEventoPrevisto, PREFIJO_PREVISTO, proximasEdiciones,
} from "./seriesOnline";

/* =========================================================================
   v0.44 — Torneos online previstos en el calendario.

   La llaman el cron diario (`/api/cron/limpieza`) y el botón de Ajustes.

   Se crean como EVENTOS del calendario y no como torneos, y es a propósito:
   un torneo previsto no es un torneo al que alguien se haya apuntado, y si
   se creara como torneo el propio cron de limpieza lo borraría a los tres
   días por no tener ninguna participación. Para apuntar un resultado, el
   torneo de verdad lo trae la importación de Limitless de la v0.36.
   ========================================================================= */

export type ResultadoSeries = {
  series: number;
  creados: number;
  actualizados: number;
  retirados: number;
  /** La API no contestó: no se ha tocado nada. */
  sinRespuesta: boolean;
};

/** v0.73 — el día EN ESPAÑA (antes, en UTC: los de las 23:00 UTC salían un día antes). */
const soloDia = (iso: string) => diaMadrid(iso);

export async function sincronizarSeriesOnline(
  ahora = new Date(),
  { semanas = 2, minJugadores = 100 } = {},
): Promise<ResultadoSeries> {
  const torneos = await fetchTournaments({ limit: 200 });

  // Si la API no contesta, no se borra lo que ya había: un fallo de red no
  // puede vaciar el calendario.
  if (!torneos.length) {
    return { series: 0, creados: 0, actualizados: 0, retirados: 0, sinRespuesta: true };
  }

  // v0.45 — más las series que se siguen siempre (src/data/seriesSeguidas.ts).
  const series = detectarSeries(torneos, ahora, {
    minJugadores, seguidas: SERIES_SEGUIDAS.map((x) => x.patron),
  });

  /* v0.73 — primero las ediciones ya PUBLICADAS en Limitless (fecha y enlace
     reales); las previstas solo para los días en que aún no hay ninguna. */
  const reales = series.flatMap((s) => edicionesReales(s, torneos, ahora, semanas).map((t) => ({
    id: `${PREFIJO_PREVISTO}r-${t.id}`,
    title: `${nombreBase(t.name) || s.nombre} (online)`,
    date: soloDia(t.date),
    endDate: null,
    kind: "tourney",
    tournamentKind: "online",
    location: "Limitless · online",
    url: `https://play.limitlesstcg.com/tournament/${t.id}`,
    competitionId: null,
    tournamentId: null,
    note: `Publicado en Limitless: ${t.name}. Empieza a las ${horaMadrid(t.date)} (hora de España).`,
    _hora: horaMadrid(t.date),
  })));
  const diasReales = new Set(reales.map((r) => `${r.title}|${r.date}`));

  const filas = [...reales, ...series.flatMap((s) => proximasEdiciones(s, ahora, semanas)
    .filter((cuando) => !diasReales.has(`${s.nombre} (online)|${soloDia(cuando)}`))
    .map((cuando) => ({
    id: idEventoPrevisto(s, cuando),
    title: `${s.nombre} (online)`,
    date: soloDia(cuando),
    endDate: null,
    kind: "tourney",
    tournamentKind: "online",
    location: "Limitless · online",
    url: `https://play.limitlesstcg.com/tournament/${s.ultimaId}`,
    competitionId: null,
    tournamentId: null,
    // Que se lea como lo que es: una previsión, no una inscripción.
    note: `Previsto${s.seguida ? " (serie que seguís)" : ""}: ${s.ediciones} ediciones recientes, `
      + `una media de ${num(s.mediaJugadores)} jugadores. Hora prevista ${horaMadrid(cuando)} (hora de España). `
      + `El enlace es la última edición; confirma la próxima en Limitless.`,
    _hora: horaMadrid(cuando),
  })))];

  const ids = filas.map((f) => f.id);
  const yaEstaban = new Set(ids.length
    ? (await db.select({ id: events.id }).from(events).where(inArray(events.id, ids))).map((r) => r.id)
    : []);

  let creados = 0, actualizados = 0;
  for (const f of filas) {
    const { id, _hora, ...valores } = f;
    void _hora;
    if (yaEstaban.has(id)) {
      await db.update(events).set(valores).where(inArray(events.id, [id]));
      actualizados++;
    } else {
      await db.insert(events).values({ id, ...valores });
      creados++;
    }
  }

  /* v0.78 — Cada torneo online del calendario es también un TORNEO de la app:
     sale en Torneos, el calendario lleva a su ficha y la ficha enlaza a
     Limitless. Se crea «en curso» (para poder apuntar rondas sin pasos) y una sola vez: si
     ya existe, no se toca (podéis haber apuntado rondas). Si nadie apunta nada,
     la limpieza lo borra a los 3 días de su fecha; si se apunta algo, se cierra
     solo a los 7. */
  const sinTorneo = await db.select({ id: events.id }).from(events)
    .where(and(like(events.id, `${PREFIJO_PREVISTO}%`), isNull(events.tournamentId)));
  const pendientes = new Set(sinTorneo.map((r) => r.id));
  for (const f of filas) {
    if (!pendientes.has(f.id)) continue;
    const idTorneo = `to-${f.id.slice(PREFIJO_PREVISTO.length)}`.slice(0, 120);
    await db.insert(tournaments).values({
      id: idTorneo, name: f.title.slice(0, 160), kind: "online", scope: "online", status: "open",
      date: f.date, startTime: f._hora || null, venue: "Limitless", organizer: "Limitless",
      url: f.url ?? "", bestOf: 1, bestOfTop: 3, notes: f.note,
    }).onConflictDoNothing();
    await db.update(events).set({ tournamentId: idTorneo }).where(eq(events.id, f.id));
  }

  // Las previsiones ya pasadas se retiran: no son historia, eran una apuesta.
  // Solo las de este prefijo; un evento puesto a mano nunca se toca.
  const hoy = soloDia(ahora.toISOString());
  const retirados = await db.delete(events)
    .where(and(like(events.id, `${PREFIJO_PREVISTO}%`), lt(events.date, hoy)))
    .returning({ id: events.id });

  return { series: series.length, creados, actualizados, retirados: retirados.length, sinRespuesta: false };
}
