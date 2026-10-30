import "server-only";
import { gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { matches, players, tournaments } from "@/db/schema";
import { horasActivasPorDia, type MedidasUso } from "@/lib/usoLimites";

/* =========================================================================
   v0.86 — Lo que se puede medir del uso, para el panel de organizadores.

   Todo son lecturas pequeñas (recuentos y tamaños), y la página solo la abren
   los organizadores: no añade gasto apreciable.
     · Activos: quien ha entrado (último acceso) o ha apuntado/editado una
       partida en el periodo.
     · Horas con actividad: horas distintas con partidas creadas o editadas,
       torneos creados o accesos, de media en 14 días.
     · Tamaño de la base y de cada tabla: de Postgres.
     · Neon real (opcional): con NEON_API_KEY y NEON_PROJECT_ID en Vercel, se
       leen de su API las horas de cómputo y el tráfico del periodo actual.
   ========================================================================= */

const TABLAS_SNAPSHOT = ["decks", "competitions", "competition_players", "matches", "events", "tournaments", "deck_favorites", "player_favorites", "games", "tournament_results"];

type Filas = Array<Record<string, unknown>>;
const filasDe = (r: unknown): Filas => ((r as { rows?: Filas })?.rows ?? (Array.isArray(r) ? (r as Filas) : []));

export type InformeUso = MedidasUso & {
  jugadores: number;
  jugadoresActivos: number;
  activos7: number;
  tablas: Array<{ tabla: string; filas: number; bytes: number }>;
  neonConfigurado: boolean;
  neonError: string | null;
};

async function neonReal(): Promise<{ cuHoras: number | null; transferGB: number | null } | null> {
  const key = process.env.NEON_API_KEY, id = process.env.NEON_PROJECT_ID;
  if (!key || !id) return null;
  const r = await fetch(`https://console.neon.tech/api/v2/projects/${encodeURIComponent(id)}`, {
    headers: { authorization: `Bearer ${key}`, accept: "application/json" },
    cache: "no-store", signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new Error(`Neon respondió ${r.status}`);
  const p = ((await r.json()) as { project?: Record<string, unknown> }).project ?? {};
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const cs = num(p.compute_time_seconds), tb = num(p.data_transfer_bytes);
  return { cuHoras: cs != null ? cs / 3600 : null, transferGB: tb != null ? tb / 1024 ** 3 : null };
}

export async function medirUso(ahora = new Date()): Promise<InformeUso> {
  const hace = (d: number) => new Date(ahora.getTime() - d * 86_400_000);
  const [jug, partidas, torneos] = await Promise.all([
    db.select({ id: players.id, active: players.active, visto: players.lastSeenAt }).from(players),
    db.select({ creado: matches.createdAt, editado: matches.updatedAt, por: matches.createdBy, editor: matches.updatedBy })
      .from(matches).where(gte(matches.createdAt, hace(30))),
    db.select({ creado: tournaments.createdAt }).from(tournaments).where(isNotNull(tournaments.createdAt)),
  ]);
  const activosEn = (dias: number) => {
    const desde = hace(dias).getTime();
    const s = new Set<string>();
    for (const p of jug) if (p.visto && new Date(p.visto).getTime() >= desde) s.add(p.id);
    for (const m of partidas) {
      if (m.por && new Date(m.creado).getTime() >= desde) s.add(m.por);
      if (m.editor && m.editado && new Date(m.editado).getTime() >= desde) s.add(m.editor);
    }
    return s.size;
  };
  const momentos: Date[] = [
    ...partidas.flatMap((m) => [m.creado, m.editado].filter(Boolean).map((d) => new Date(d as Date))),
    ...torneos.map((t) => new Date(t.creado as Date)),
    ...jug.filter((p) => p.visto).map((p) => new Date(p.visto as Date)),
  ];

  let bytesBase: number | null = null;
  let tablas: InformeUso["tablas"] = [];
  try {
    const [tam, tb] = await Promise.all([
      db.execute(sql`select pg_database_size(current_database())::bigint as bytes`),
      db.execute(sql`select relname as tabla, n_live_tup::bigint as filas, pg_total_relation_size(relid)::bigint as bytes
                     from pg_stat_user_tables order by pg_total_relation_size(relid) desc`),
    ]);
    bytesBase = Number(filasDe(tam)[0]?.bytes ?? NaN);
    if (!Number.isFinite(bytesBase)) bytesBase = null;
    tablas = filasDe(tb).map((x) => ({ tabla: String(x.tabla), filas: Number(x.filas) || 0, bytes: Number(x.bytes) || 0 }));
  } catch { /* sin permisos de estadísticas: se enseña sin tamaños */ }
  const bytesCarga = tablas.filter((t) => TABLAS_SNAPSHOT.includes(t.tabla)).reduce((s, t) => s + t.bytes, 0);

  let neon: InformeUso["neon"] = null, neonError: string | null = null;
  try { neon = await neonReal(); } catch (e) { neonError = e instanceof Error ? e.message : "Neon no respondió"; }

  return {
    activos30: activosEn(30), activos7: activosEn(7),
    jugadores: jug.length, jugadoresActivos: jug.filter((p) => p.active).length,
    horasActivasDia: horasActivasPorDia(momentos, 14, ahora),
    bytesBase, bytesCarga, tablas, neon,
    neonConfigurado: Boolean(process.env.NEON_API_KEY && process.env.NEON_PROJECT_ID), neonError,
  };
}
