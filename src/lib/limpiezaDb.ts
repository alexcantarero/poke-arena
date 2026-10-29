import "server-only";
import { inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { matches, tournamentResults, tournaments } from "@/db/schema";
import { torneosAbandonados, torneosParaCerrar } from "./limpieza";

/**
 * v0.19 — Busca y borra los torneos abandonados (ver `lib/limpieza.ts`).
 * La usan el cron diario (`/api/cron/limpieza`) y el botón de Ajustes.
 *
 * Al borrar un torneo: sus resultados se van en cascada (no tiene ninguno,
 * por definición) y los eventos del calendario enlazados se quedan sin
 * enlace (`ON DELETE SET NULL`), así que el evento sigue en el calendario.
 */
export async function borrarTorneosAbandonados(ahora = new Date()): Promise<Array<{ id: string; name: string }>> {
  const [torneos, conResultado, conRonda] = await Promise.all([
    db.select({ id: tournaments.id, name: tournaments.name, createdAt: tournaments.createdAt,
      date: tournaments.date, endDate: tournaments.endDate }).from(tournaments),
    db.selectDistinct({ id: tournamentResults.tournamentId }).from(tournamentResults),
    db.selectDistinct({ id: matches.tournamentId }).from(matches).where(isNotNull(matches.tournamentId)),
  ]);
  const con = new Set<string>([
    ...conResultado.map((r) => r.id),
    ...conRonda.map((r) => r.id).filter((x): x is string => Boolean(x)),
  ]);
  const ids = torneosAbandonados(torneos, con, ahora);
  if (!ids.length) return [];
  await db.delete(tournaments).where(inArray(tournaments.id, ids));
  return torneos.filter((t) => ids.includes(t.id)).map((t) => ({ id: t.id, name: t.name }));
}

/**
 * v0.45 — Cierra los torneos en curso con participación cuya fecha pasó hace
 * más de una semana (ver `torneosParaCerrar` en `lib/limpieza.ts`).
 *
 * Hace lo mismo que el botón «Cerrar» de la ficha (`setTournamentStatus`):
 * cambia el estado y apunta cuándo. Nada más: los CP no cambian al cerrar,
 * porque se calculan siempre del puesto y la asistencia (`effectiveCp`).
 */
export async function cerrarTorneosTerminados(ahora = new Date()): Promise<Array<{ id: string; name: string }>> {
  const [torneos, conResultado, conRonda] = await Promise.all([
    db.select({ id: tournaments.id, name: tournaments.name, status: tournaments.status,
      date: tournaments.date, endDate: tournaments.endDate }).from(tournaments),
    db.selectDistinct({ id: tournamentResults.tournamentId }).from(tournamentResults),
    db.selectDistinct({ id: matches.tournamentId }).from(matches).where(isNotNull(matches.tournamentId)),
  ]);
  const con = new Set<string>([
    ...conResultado.map((r) => r.id),
    ...conRonda.map((r) => r.id).filter((x): x is string => Boolean(x)),
  ]);
  const ids = torneosParaCerrar(torneos, con, ahora);
  if (!ids.length) return [];
  await db.update(tournaments).set({ status: "closed", closedAt: ahora }).where(inArray(tournaments.id, ids));
  return torneos.filter((t) => ids.includes(t.id)).map((t) => ({ id: t.id, name: t.name }));
}

/**
 * v0.78 — La limpieza, también SIN el cron.
 *
 * Las reglas son las de siempre (borrar a los 3 días lo que no tiene datos;
 * cerrar a los 7 lo que sí), pero dependían del cron diario de Vercel, que sin
 * `CRON_SECRET` no se ejecuta nunca. Ahora, además, al abrir Torneos o el
 * Calendario se pasa la limpieza si hace más de 6 horas de la última (por
 * instancia del servidor: como mucho, unas pocas veces al día). Si falla, la
 * página se pinta igual.
 */
const SEIS_HORAS = 6 * 3600_000;
export async function limpiezaPerezosa(): Promise<void> {
  const g = globalThis as typeof globalThis & { __arenaLimpieza?: number };
  const ahora = Date.now();
  if (g.__arenaLimpieza && ahora - g.__arenaLimpieza < SEIS_HORAS) return;
  g.__arenaLimpieza = ahora;
  try {
    await borrarTorneosAbandonados(new Date(ahora));
    await cerrarTorneosTerminados(new Date(ahora));
    // Y los torneos online del calendario (que ahora crean su torneo en la app).
    const { sincronizarSeriesOnline } = await import("./seriesOnlineDb");
    await sincronizarSeriesOnline();
  } catch { /* la próxima vez */ }
}
