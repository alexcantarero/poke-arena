import "server-only";
import { inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { matches, tournamentResults, tournaments } from "@/db/schema";
import { torneosAbandonados } from "./limpieza";

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
