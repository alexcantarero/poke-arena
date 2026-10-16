import "server-only";
import { and, inArray, like, lt } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { fetchTournaments } from "@/lib/sources/limitless";
import { num } from "@/lib/format";
import { SERIES_SEGUIDAS } from "@/data/seriesSeguidas";
import {
  detectarSeries, idEventoPrevisto, PREFIJO_PREVISTO, proximasEdiciones,
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

/** De «2026-10-18T18:00:00.000Z» a «2026-10-18»: la columna es `date`. */
const soloDia = (iso: string) => iso.slice(0, 10);

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

  const filas = series.flatMap((s) => proximasEdiciones(s, ahora, semanas).map((cuando) => ({
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
      + `una media de ${num(s.mediaJugadores)} jugadores. Hora prevista ${cuando.slice(11, 16)} UTC. `
      + `El enlace es la última edición; confirma la próxima en Limitless.`,
  })));

  const ids = filas.map((f) => f.id);
  const yaEstaban = new Set(ids.length
    ? (await db.select({ id: events.id }).from(events).where(inArray(events.id, ids))).map((r) => r.id)
    : []);

  let creados = 0, actualizados = 0;
  for (const f of filas) {
    const { id, ...valores } = f;
    if (yaEstaban.has(id)) {
      await db.update(events).set(valores).where(inArray(events.id, [id]));
      actualizados++;
    } else {
      await db.insert(events).values(f);
      creados++;
    }
  }

  // Las previsiones ya pasadas se retiran: no son historia, eran una apuesta.
  // Solo las de este prefijo; un evento puesto a mano nunca se toca.
  const hoy = soloDia(ahora.toISOString());
  const retirados = await db.delete(events)
    .where(and(like(events.id, `${PREFIJO_PREVISTO}%`), lt(events.date, hoy)))
    .returning({ id: events.id });

  return { series: series.length, creados, actualizados, retirados: retirados.length, sinRespuesta: false };
}
