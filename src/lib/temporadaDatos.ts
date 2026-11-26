import type { Snapshot } from "@/lib/data";
import { archetypesOfMatch, esNoPresentadoPartida, outcome } from "@/lib/stats";
import { cpKindOf, effectiveCp, seasonOfDate } from "@/lib/cp";
import { resumenDeTemporada, type PartidaTemporada, type TorneoTemporada } from "@/lib/resumenTemporada";

/* v0.140 — Los datos de la temporada de un jugador: los usan la pantalla
   (`/perfil/<id>/temporada`) y su imagen para compartir. */
export function datosDeTemporada(snap: Snapshot, id: string, temporada: number) {
  const enTemporada = (fecha: string) => seasonOfDate(fecha) === temporada;
  const partidas: PartidaTemporada[] = [];
  const temporadasConDatos = new Set<number>();
  for (const m of snap.matches) {
    const soyA = m.playerAId === id, soyB = m.playerBId === id;
    if (!soyA && !soyB) continue;
    const s = seasonOfDate(m.date);
    if (s != null) temporadasConDatos.add(s);
    if (!enTemporada(m.date) || m.opponentName === "BYE" || esNoPresentadoPartida(m)) continue;
    const g = outcome(m).winner;
    if (!g) continue;
    const { a, b } = archetypesOfMatch(m, snap.archIndex, snap.archById);
    partidas.push({
      fecha: m.date, r: g === "tie" ? "t" : (g === "a") === soyA ? "w" : "l",
      miMazo: (soyA ? a : b)?.name ?? "", suMazo: (soyA ? b : a)?.name ?? "",
    });
  }
  const torneos: TorneoTemporada[] = [];
  for (const t of snap.tournaments) {
    const r = t.results.find((x) => x.playerId === id);
    if (!r || (t.season ?? seasonOfDate(t.date)) !== temporada) continue;
    torneos.push({ nombre: t.name, fecha: t.date, puesto: r.placement, jugadores: t.playerCount, cp: effectiveCp(temporada, cpKindOf(t), r, t.playerCount) });
  }
  const elo = (snap.elo.history[id] ?? []).filter((h) => enTemporada(h.date)).map((h) => ({ fecha: h.date, valor: h.value }));
  const r = resumenDeTemporada(partidas, torneos, elo);
  return { r, temporadasConDatos };
}
