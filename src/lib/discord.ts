import "server-only";
import { and, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { archetypes, competitions, decks, events, matches, players, tournamentResults, tournaments } from "@/db/schema";
import {
  embedAgenda, embedPendientes, embedTorneo, semanaDe,
  type Embed, type EventoAgenda, type Pendiente, type ResultadoTorneo,
} from "./discordMensajes";

/* =========================================================================
   v0.59 — Avisos automáticos a Discord, por webhooks.

   Tres webhooks, uno por canal, en variables de entorno (cada uno opcional:
   sin la variable, ese aviso simplemente no se manda):
     · DISCORD_WEBHOOK_RESULTADOS  — resultados de un torneo al cerrarse
     · DISCORD_WEBHOOK_LIGA        — partidas de liga pendientes (los lunes)
     · DISCORD_WEBHOOK_AGENDA      — eventos de la semana (los lunes)

   REGLA: un aviso NUNCA rompe nada. Si Discord no responde, tarda o devuelve
   un error, se devuelve `false` y sigue todo: cerrar un torneo o pasar el
   cron no puede fallar por culpa de Discord. La URL del webhook es un
   secreto: no se escribe en ningún log ni sale en ninguna pantalla.
   ========================================================================= */

/** La dirección pública de la app, para los enlaces de los mensajes. */
export function urlApp(): string {
  const propia = process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (propia) return propia.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "https://poke-arena-sand.vercel.app";
}

export type Canal = "resultados" | "liga" | "agenda";
const VARIABLE: Record<Canal, string> = {
  resultados: "DISCORD_WEBHOOK_RESULTADOS", liga: "DISCORD_WEBHOOK_LIGA", agenda: "DISCORD_WEBHOOK_AGENDA",
};

/** Qué canales tienen webhook puesto (sin decir cuál: es un secreto). */
export function canalesConfigurados(): Record<Canal, boolean> {
  return {
    resultados: Boolean(process.env[VARIABLE.resultados]),
    liga: Boolean(process.env[VARIABLE.liga]),
    agenda: Boolean(process.env[VARIABLE.agenda]),
  };
}

async function enviar(canal: Canal, embed: Embed): Promise<boolean> {
  const url = process.env[VARIABLE[canal]];
  if (!url || !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(url)) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "PokeArena", embeds: [embed], allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Resultados de un torneo, al cerrarse. Solo los jugadores del grupo. */
export async function notificarResultadosTorneo(torneoId: string): Promise<boolean> {
  try {
    const t = (await db.select().from(tournaments).where(eq(tournaments.id, torneoId)))[0];
    if (!t) return false;
    const filas = await db.select().from(tournamentResults).where(eq(tournamentResults.tournamentId, torneoId));
    if (!filas.length) return false;
    const ids = (xs: Array<string | null>) => [...new Set(xs.filter((x): x is string => Boolean(x)))];
    const [jug, mz, ar] = await Promise.all([
      db.select({ id: players.id, name: players.name }).from(players).where(inArray(players.id, ids(filas.map((f) => f.playerId)))),
      ids(filas.map((f) => f.deckId)).length ? db.select({ id: decks.id, name: decks.name, arch: decks.archetypeId }).from(decks).where(inArray(decks.id, ids(filas.map((f) => f.deckId)))) : Promise.resolve([]),
      db.select({ id: archetypes.id, name: archetypes.name }).from(archetypes),
    ]);
    const nombre = new Map(jug.map((p) => [p.id, p.name]));
    const mazo = new Map(mz.map((d) => [d.id, d]));
    const arq = new Map(ar.map((a) => [a.id, a.name]));
    const resultados: ResultadoTorneo[] = filas.map((f) => {
      const d = f.deckId ? mazo.get(f.deckId) : undefined;
      return {
        jugador: nombre.get(f.playerId) ?? "?",
        puesto: f.placement ?? null,
        mazo: (f.archetypeId && arq.get(f.archetypeId)) || (d?.arch && arq.get(d.arch)) || d?.name || null,
        wins: f.wins ?? 0, losses: f.losses ?? 0, ties: f.ties ?? 0, drop: Boolean(f.dropped),
      };
    });
    return enviar("resultados", embedTorneo(
      { id: t.id, nombre: t.name, fecha: String(t.date).slice(0, 10), jugadores: t.playerCount ?? null, topCut: t.topCut ?? null },
      resultados, urlApp()));
  } catch {
    return false;
  }
}

/** Las partidas de liga sin resultado. */
export async function notificarPendientesLiga(): Promise<boolean> {
  try {
    const filas = await db.select({
      round: matches.round, a: matches.playerAId, b: matches.playerBId, rival: matches.opponentName, comp: matches.competitionId,
    }).from(matches).where(eq(matches.status, "pending"));
    if (!filas.length) return false;
    const [jug, comps] = await Promise.all([
      db.select({ id: players.id, name: players.name }).from(players),
      db.select({ id: competitions.id, name: competitions.name }).from(competitions),
    ]);
    const n = new Map(jug.map((p) => [p.id, p.name]));
    const c = new Map(comps.map((x) => [x.id, x.name]));
    const p: Pendiente[] = filas.map((f) => ({
      liga: (f.comp && c.get(f.comp)) || "Liga", jornada: f.round ?? null,
      a: n.get(f.a) ?? "?", b: (f.b && n.get(f.b)) || f.rival || "?",
    }));
    const e = embedPendientes(p, urlApp());
    return e ? enviar("liga", e) : false;
  } catch {
    return false;
  }
}

/** La agenda de la semana: eventos del calendario y torneos apuntados. */
export async function notificarAgendaSemana(hoyIso: string): Promise<boolean> {
  try {
    const { desde, hasta } = semanaDe(hoyIso);
    const [ev, tor] = await Promise.all([
      db.select().from(events).where(lte(events.date, hasta)),
      db.select().from(tournaments).where(and(gte(tournaments.date, desde), lte(tournaments.date, hasta), ne(tournaments.status, "closed"))),
    ]);
    const enSemana = ev.filter((e) => String(e.endDate ?? e.date).slice(0, 10) >= desde);
    const yaEnCalendario = new Set(enSemana.map((e) => e.tournamentId).filter(Boolean));
    const app = urlApp();
    const lista: EventoAgenda[] = [
      ...enSemana.map((e) => ({
        fecha: String(e.date).slice(0, 10), fin: e.endDate ? String(e.endDate).slice(0, 10) : null, titulo: e.title,
        lugar: e.location || null, url: e.tournamentId ? `${app}/torneos/${e.tournamentId}` : e.url || null,
      })),
      ...tor.filter((t) => !yaEnCalendario.has(t.id)).map((t) => ({
        fecha: String(t.date).slice(0, 10), fin: t.endDate ? String(t.endDate).slice(0, 10) : null, titulo: t.name,
        lugar: t.city || t.venue || null, url: `${app}/torneos/${t.id}`,
      })),
    ];
    const e = embedAgenda({ desde, hasta }, lista, app);
    return e ? enviar("agenda", e) : false;
  } catch {
    return false;
  }
}
