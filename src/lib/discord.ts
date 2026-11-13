import "server-only";
import { and, eq, gte, inArray, isNull, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { archetypes, competitions, decks, discordHilos, events, ligaDivisiones, ligaTemporadas, matches, players, settings, tournamentResults, tournaments } from "@/db/schema";
import { resetReciente } from "./recordatorios";
import {
  conEspera, embedAgenda, embedEnfrentamiento, embedEventoCinturon, embedLiga, embedPendientes, embedRecordatorioLadder, embedResetLadder, embedTorneo, nombreHilo, semanaDe, urlHilo,
  type Embed, type EventoAgenda, type EventoCinturon, type EventoLiga, type Pendiente, type ResultadoTorneo,
} from "./discordMensajes";
import { motivoDeEstado, normalizarWebhook, type MotivoDiscord } from "./discordWebhook";

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

/** v0.68 — Estado de cada canal: sin poner, puesto pero con una URL que no es de
    un webhook, o bien. Sigue sin enseñar la URL. Y si hay CRON_SECRET: sin él,
    el cron diario responde 401 y los avisos de los lunes no salen nunca. */
export function estadoDiscord(): { canales: Record<Canal, "ok" | "sinVariable" | "urlRara">; cron: boolean } {
  const de = (c: Canal) => {
    const raw = process.env[VARIABLE[c]];
    if (!raw) return "sinVariable" as const;
    return normalizarWebhook(raw) ? ("ok" as const) : ("urlRara" as const);
  };
  return { canales: { resultados: de("resultados"), liga: de("liga"), agenda: de("agenda") }, cron: Boolean(process.env.CRON_SECRET) };
}

/* v0.68 — Devuelve el MOTIVO, no solo sí/no. La URL se normaliza (comillas,
   espacios, PTB/Canary, /api/v10/). Un aviso sigue sin romper nunca nada. */
async function enviarConMotivo(canal: Canal, embed: Embed): Promise<MotivoDiscord> {
  const raw = process.env[VARIABLE[canal]];
  if (!raw) return "sinVariable";
  const url = normalizarWebhook(raw);
  if (!url) return "urlRara";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "PokeArena", embeds: [embed], allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    const motivo = motivoDeEstado(res.status);
    // Al log de Vercel va el canal y el código, NUNCA la URL (es un secreto).
    if (motivo !== "ok") console.warn(`[discord] ${canal}: HTTP ${res.status}`);
    return motivo;
  } catch {
    console.warn(`[discord] ${canal}: sin respuesta`);
    return "red";
  }
}

async function enviar(canal: Canal, embed: Embed): Promise<boolean> {
  return (await enviarConMotivo(canal, embed)) === "ok";
}

/**
 * v0.68 — El botón de prueba: manda un mensaje de prueba de verdad a ese canal,
 * haya o no algo que contar. Antes probaba con el aviso real, y sin partidas
 * pendientes o sin eventos esa semana no mandaba nada y decía «no enviado»:
 * parecía que el webhook fallaba cuando estaba bien.
 */
export async function probarCanal(canal: Canal): Promise<MotivoDiscord> {
  const nombres: Record<Canal, string> = { resultados: "resultados de torneos", liga: "partidas de liga pendientes", agenda: "agenda de la semana" };
  return enviarConMotivo(canal, {
    title: "✅ Prueba de PokeArena",
    description: `Este canal recibirá los avisos de **${nombres[canal]}**. Si lees esto, el webhook funciona.`,
    color: 0x2a78d6,
    url: urlApp(),
    timestamp: new Date().toISOString(),
  });
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
      db.select({ id: players.id, name: players.name, beltHolder: players.beltHolder }).from(players).where(inArray(players.id, ids(filas.map((f) => f.playerId)))),
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
        cinturon: jug.some((p) => p.id === f.playerId && p.beltHolder),
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
      db.select({ id: players.id, name: players.name, beltHolder: players.beltHolder }).from(players),
      db.select({ id: competitions.id, name: competitions.name }).from(competitions),
    ]);
    const n = new Map(jug.map((p) => [p.id, p.name]));
    const titular = new Set(jug.filter((p) => p.beltHolder).map((p) => p.id));
    const c = new Map(comps.map((x) => [x.id, x.name]));
    const p: Pendiente[] = filas.map((f) => ({
      liga: (f.comp && c.get(f.comp)) || "Liga", jornada: f.round ?? null,
      a: n.get(f.a) ?? "?", b: (f.b && n.get(f.b)) || f.rival || "?",
      aCinturon: titular.has(f.a), bCinturon: f.b ? titular.has(f.b) : false,
    }));
    const e = embedPendientes(p, urlApp());
    return e ? enviar("liga", e) : false;
  } catch {
    return false;
  }
}

/* =========================================================================
   v0.117 — Un post en un canal de FORO de Discord por cada enfrentamiento de
   la liga por divisiones, para quedar ahí (fecha, hora) entre los dos.

   · DISCORD_WEBHOOK_FORO: el webhook de un canal de tipo foro. La API de
     Discord crea un post nuevo si se manda `thread_name` (y solo funciona en
     foros). Con `?wait=true` devuelve el mensaje, cuyo `channel_id` es el hilo.
   · DISCORD_SERVIDOR_ID (opcional, no es secreto): el id del servidor, para
     enlazar el post desde la ficha de la partida.
   Se crean los de la semana (partidas pendientes con fecha hasta dentro de 6
   días), unos pocos por llamada y con pausa, para no chocar con el límite de
   Discord. Lo que no dé tiempo, al día siguiente lo hace el cron.
   ========================================================================= */
export function foroConfigurado(): boolean {
  return Boolean(normalizarWebhook(process.env.DISCORD_WEBHOOK_FORO));
}

export async function crearHilosLiga(hoyIso: string, maximo = 8): Promise<number> {
  const url = normalizarWebhook(process.env.DISCORD_WEBHOOK_FORO);
  if (!url) return 0;
  try {
    const hasta = new Date(`${hoyIso.slice(0, 10)}T12:00:00Z`);
    hasta.setUTCDate(hasta.getUTCDate() + 6);
    const limite = hasta.toISOString().slice(0, 10);
    const divs = await db.select({ c: ligaDivisiones.competitionId, nivel: ligaDivisiones.nivel, temporada: ligaTemporadas.nombre })
      .from(ligaDivisiones).innerJoin(ligaTemporadas, eq(ligaTemporadas.id, ligaDivisiones.temporadaId))
      .where(eq(ligaTemporadas.estado, "en_curso"));
    if (!divs.length) return 0;
    const porComp = new Map<string, { c: string; nivel: number; temporada: string }>(divs.map((d) => [d.c, d]));
    const candidatas = await db.select().from(matches).where(and(
      inArray(matches.competitionId, [...porComp.keys()]),
      eq(matches.status, "scheduled"),
      lte(matches.date, limite),
    ));
    if (!candidatas.length) return 0;
    const hechos = new Set((await db.select({ m: discordHilos.matchId }).from(discordHilos)
      .where(inArray(discordHilos.matchId, candidatas.map((m) => m.id)))).map((r) => r.m));
    const nombres = new Map<string, string>((await db.select({ id: players.id, name: players.name }).from(players)).map((p) => [p.id, p.name]));
    const app = urlApp();
    let creados = 0;
    for (const m of candidatas.filter((x) => !hechos.has(x.id)).sort((x, y) => x.date.localeCompare(y.date) || x.round - y.round)) {
      if (creados >= maximo) break;
      const d = porComp.get(m.competitionId!)!;
      const e = {
        matchId: m.id, temporada: d.temporada, division: d.nivel, jornada: m.round, fecha: m.date,
        a: nombres.get(m.playerAId) ?? "?", b: (m.playerBId && nombres.get(m.playerBId)) || "?", bestOf: m.bestOf,
      };
      const res = await fetch(conEspera(url), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "PokeArena", thread_name: nombreHilo(e), embeds: [embedEnfrentamiento(e, app)], allowed_mentions: { parse: [] } }),
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      });
      if (res.status === 429) { console.warn("[discord] foro: límite de Discord, se sigue mañana"); break; }
      if (!res.ok) { console.warn(`[discord] foro: HTTP ${res.status}`); break; }
      const cuerpo = await res.json().catch(() => null) as { channel_id?: string } | null;
      if (!cuerpo?.channel_id) break;
      await db.insert(discordHilos).values({ matchId: m.id, hiloId: cuerpo.channel_id }).onConflictDoNothing();
      creados++;
      await new Promise((r) => setTimeout(r, 1200)); // pausa: el límite de un webhook es de pocos mensajes por segundo
    }
    return creados;
  } catch {
    return 0; // sin la migración 0034, sin red o Discord caído: mañana
  }
}

/** El enlace al post de una partida, o null (sin post, sin servidor configurado o sin migración). */
export async function enlaceHiloDe(matchId: string): Promise<string | null> {
  try {
    const [h] = await db.select({ hilo: discordHilos.hiloId }).from(discordHilos).where(eq(discordHilos.matchId, matchId)).limit(1);
    return h ? urlHilo(process.env.DISCORD_SERVIDOR_ID, h.hilo) : null;
  } catch {
    return null;
  }
}

/** v0.116 — la liga por divisiones, al canal de la liga. Nunca rompe nada. */
export async function notificarLiga(evento: EventoLiga): Promise<boolean> {
  try {
    return await enviar("liga", embedLiga(evento, urlApp()));
  } catch {
    return false;
  }
}

export async function notificarCambioCinturon(evento: EventoCinturon): Promise<boolean> {
  return enviar("resultados", embedEventoCinturon(evento, urlApp()));
}

/* =========================================================================
   v0.124 — Reset del ladder. Va al canal de la LIGA (el de los avisos a los
   jugadores); si no está puesto, al de la agenda, y si tampoco, al de
   resultados. Así sale sin configurar nada nuevo.
   ========================================================================= */
async function enviarAvisoGeneral(embed: Embed): Promise<boolean> {
  for (const canal of ["liga", "agenda", "resultados"] as const) {
    if (!normalizarWebhook(process.env[VARIABLE[canal]])) continue;
    return enviar(canal, embed);
  }
  return false;
}

/** El anuncio, justo al hacer el reset. Nunca rompe nada. */
export async function notificarResetLadder(): Promise<boolean> {
  try {
    return await enviarAvisoGeneral(embedResetLadder(urlApp()));
  } catch {
    return false;
  }
}

/** Los lunes, mientras el reset sea reciente y falte alguien por apuntar su rango. */
export async function notificarPendientesLadder(ahora: Date): Promise<boolean> {
  try {
    const [cfg] = await db.select({ desde: settings.ladderSince }).from(settings).where(eq(settings.id, "default"));
    if (!resetReciente(cfg?.desde ?? null, ahora.getTime())) return false;
    const [todos, sinRango] = await Promise.all([
      db.select({ id: players.id }).from(players).where(eq(players.active, true)),
      db.select({ name: players.name }).from(players).where(and(eq(players.active, true), isNull(players.ladderElo))),
    ]);
    const e = embedRecordatorioLadder(sinRango.map((p) => p.name), todos.length, urlApp());
    return e ? await enviarAvisoGeneral(e) : false;
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
