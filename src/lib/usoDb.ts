import "server-only";
import { desc, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { matches, players, tournaments, usoLecturas } from "@/db/schema";
import { newId } from "@/lib/format";
import {
  actividadPorDia, actividadPorHora, GB, horasActivasPorDia, resumenDespliegues,
  type Despliegue, type Lectura, type MedidasUso, type PuntoDia,
} from "@/lib/usoLimites";

/* =========================================================================
   v0.86 — Lo que se puede medir del uso, para el panel de organizadores.
   v0.95 — Neon completo (cómputo, horas encendida, tráfico, almacenamiento de
           las ramas y el inicio del periodo), lecturas guardadas por día,
           despliegues de Vercel y las series de los gráficos.

   Todo son lecturas pequeñas (recuentos y tamaños), y la página solo la abren
   los organizadores: no añade gasto apreciable. Ver docs/15-uso-vercel-neon.md.

   Variables de entorno (todas opcionales, solo en Vercel):
     · NEON_API_KEY + NEON_PROJECT_ID → cómputo, tráfico y almacenamiento reales.
     · VERCEL_TOKEN + VERCEL_PROJECT_ID (+ VERCEL_TEAM_ID si el proyecto es de
       un equipo) → despliegues y tiempos de build. Vercel Hobby NO tiene API
       de uso (invocaciones, CPU): esas se apuntan a mano.
   ========================================================================= */

const TABLAS_SNAPSHOT = ["decks", "competitions", "competition_players", "matches", "events", "tournaments", "deck_favorites", "player_favorites", "games", "tournament_results"];

type Filas = Array<Record<string, unknown>>;
const filasDe = (r: unknown): Filas => ((r as { rows?: Filas })?.rows ?? (Array.isArray(r) ? (r as Filas) : []));
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export type LecturaNeon = {
  cuHoras: number | null;
  horasEncendida: number | null;
  transferGB: number | null;
  almacenGB: number | null;
  /** Inicio del periodo de consumo actual (ISO), o null. */
  inicioPeriodo: string | null;
};

export type InformeUso = MedidasUso & {
  jugadores: number;
  jugadoresActivos: number;
  activos7: number;
  tablas: Array<{ tabla: string; filas: number; bytes: number }>;
  neonConfigurado: boolean;
  neonError: string | null;
  neonLectura: LecturaNeon | null;
  vercelConfigurado: boolean;
  vercelError: string | null;
  despliegues: ReturnType<typeof resumenDespliegues> | null;
  /** Lo último apuntado a mano del panel de Vercel, y de qué día es. */
  vercelManual: { fecha: string; datos: Record<string, unknown> } | null;
  lecturas: Lectura[];
  porDia: PuntoDia[];
  porHora: number[];
};

const neonConfigurado = () => Boolean(process.env.NEON_API_KEY && process.env.NEON_PROJECT_ID);
const vercelConfigurado = () => Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);

/**
 * Lo real de Neon. Es la API de control (console.neon.tech), no la base: NO
 * despierta el cómputo. En el plan gratuito no hay historial de consumo
 * (`/consumption_history` es de pago), así que se lee la foto del periodo:
 *   GET /projects/{id}           → compute_time_seconds, active_time_seconds,
 *                                  data_transfer_bytes, consumption_period_start
 *   GET /projects/{id}/branches  → logical_size de cada rama (el tope de 1 GB
 *                                  del plan gratuito se mide así)
 */
export async function leerNeon(): Promise<LecturaNeon | null> {
  const key = process.env.NEON_API_KEY, id = process.env.NEON_PROJECT_ID;
  if (!key || !id) return null;
  const base = `https://console.neon.tech/api/v2/projects/${encodeURIComponent(id)}`;
  const opts = { headers: { authorization: `Bearer ${key}`, accept: "application/json" }, cache: "no-store" as const, signal: AbortSignal.timeout(6000) };
  const [rp, rb] = await Promise.all([fetch(base, opts), fetch(`${base}/branches`, opts).catch(() => null)]);
  if (!rp.ok) throw new Error(`Neon respondió ${rp.status}`);
  const p = ((await rp.json()) as { project?: Record<string, unknown> }).project ?? {};
  let almacen: number | null = null;
  if (rb?.ok) {
    const ramas = ((await rb.json()) as { branches?: Array<Record<string, unknown>> }).branches ?? [];
    const tams = ramas.map((b) => num(b.logical_size)).filter((x): x is number => x != null);
    if (tams.length) almacen = tams.reduce((a, b) => a + b, 0) / GB;
  }
  const cs = num(p.compute_time_seconds), act = num(p.active_time_seconds), tb = num(p.data_transfer_bytes);
  const inicio = typeof p.consumption_period_start === "string" ? p.consumption_period_start : null;
  return {
    cuHoras: cs != null ? cs / 3600 : null,
    horasEncendida: act != null ? act / 3600 : null,
    transferGB: tb != null ? tb / GB : null,
    almacenGB: almacen,
    inicioPeriodo: inicio,
  };
}

/** Los últimos despliegues del proyecto. Solo fechas y estados: ni autores ni correos. */
async function leerDespliegues(): Promise<Despliegue[] | null> {
  const token = process.env.VERCEL_TOKEN, proyecto = process.env.VERCEL_PROJECT_ID, equipo = process.env.VERCEL_TEAM_ID;
  if (!token || !proyecto) return null;
  const q = new URLSearchParams({ projectId: proyecto, limit: "100", since: String(Date.now() - 30 * 86_400_000) });
  if (equipo) q.set("teamId", equipo);
  const r = await fetch(`https://api.vercel.com/v6/deployments?${q}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    cache: "no-store", signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new Error(`Vercel respondió ${r.status}`);
  const ds = ((await r.json()) as { deployments?: Array<Record<string, unknown>> }).deployments ?? [];
  return ds.map((d) => ({
    creado: num(d.createdAt) ?? num(d.created) ?? 0,
    empiezaBuild: num(d.buildingAt),
    listo: num(d.ready),
    estado: String(d.readyState ?? d.state ?? ""),
    produccion: d.target === "production",
  }));
}

/** Las lecturas guardadas de los últimos `dias` días. */
export async function cargarLecturas(dias = 62): Promise<Lectura[]> {
  try {
    const desde = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
    const rows = await db.select({ fecha: usoLecturas.fecha, fuente: usoLecturas.fuente, datos: usoLecturas.datos })
      .from(usoLecturas).where(gte(usoLecturas.fecha, desde)).orderBy(desc(usoLecturas.fecha));
    return rows.map((r) => ({ fecha: String(r.fecha), fuente: r.fuente, datos: (r.datos ?? {}) as Record<string, unknown> }));
  } catch {
    // Sin la migración 0029 la tabla no existe: el panel funciona igual, sin historia.
    return [];
  }
}

/** Guarda (o sustituye) la lectura de un día y fuente. */
export async function guardarLectura(fecha: string, fuente: "neon" | "vercel", datos: Record<string, number | string | null>, por: string | null = null) {
  await db.insert(usoLecturas).values({ id: newId("uso"), fecha, fuente, datos, createdBy: por })
    .onConflictDoUpdate({ target: [usoLecturas.fecha, usoLecturas.fuente], set: { datos, createdBy: por, createdAt: new Date() } });
}

/** Para el cron diario: la foto de Neon de hoy. No hace nada sin las variables. */
export async function guardarLecturaNeonDeHoy(): Promise<boolean> {
  const n = await leerNeon();
  if (!n) return false;
  await guardarLectura(new Date().toISOString().slice(0, 10), "neon", {
    cuHoras: n.cuHoras, horasEncendida: n.horasEncendida, transferGB: n.transferGB, almacenGB: n.almacenGB, inicioPeriodo: n.inicioPeriodo,
  });
  return true;
}

/** Lo justo para la tarjeta de Ajustes: las dos últimas lecturas, sin llamar a nadie de fuera. */
export async function resumenUsoRapido(): Promise<{ neon: Lectura | null; vercel: Lectura | null }> {
  const ls = await cargarLecturas(40);
  return { neon: ls.find((l) => l.fuente === "neon") ?? null, vercel: ls.find((l) => l.fuente === "vercel") ?? null };
}

export async function medirUso(ahora = new Date()): Promise<InformeUso> {
  const hace = (d: number) => new Date(ahora.getTime() - d * 86_400_000);
  const [jug, partidas, torneos, lecturas] = await Promise.all([
    db.select({ id: players.id, active: players.active, visto: players.lastSeenAt }).from(players),
    db.select({ creado: matches.createdAt, editado: matches.updatedAt, por: matches.createdBy, editor: matches.updatedBy })
      .from(matches).where(gte(matches.createdAt, hace(30))),
    db.select({ creado: tournaments.createdAt }).from(tournaments).where(isNotNull(tournaments.createdAt)),
    cargarLecturas(),
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
  // Cada partida apuntada (y cada corrección) es un evento con su autor.
  const eventos = partidas.flatMap((m) => [
    { t: new Date(m.creado), quien: m.por },
    ...(m.editado && m.editor ? [{ t: new Date(m.editado), quien: m.editor }] : []),
  ]);

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

  // Neon y Vercel a la vez: cada uno con su tiempo máximo y sin tumbar al otro.
  const [rn, rv] = await Promise.allSettled([leerNeon(), leerDespliegues()]);
  const neonLectura = rn.status === "fulfilled" ? rn.value : null;
  const neonError = rn.status === "rejected" ? (rn.reason instanceof Error ? rn.reason.message : "Neon no respondió") : null;
  const despliegues = rv.status === "fulfilled" && rv.value ? resumenDespliegues(rv.value, ahora) : null;
  const vercelError = rv.status === "rejected" ? (rv.reason instanceof Error ? rv.reason.message : "Vercel no respondió") : null;

  // Lo apuntado de Vercel vale para el periodo en curso: más de 31 días, caducado.
  const ultV = lecturas.find((l) => l.fuente === "vercel");
  const vigente = ultV && ahora.getTime() - new Date(`${ultV.fecha}T00:00:00Z`).getTime() < 31 * 86_400_000 ? ultV : null;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  return {
    activos30: activosEn(30), activos7: activosEn(7),
    jugadores: jug.length, jugadoresActivos: jug.filter((p) => p.active).length,
    horasActivasDia: horasActivasPorDia(momentos, 14, ahora),
    bytesBase, bytesCarga, tablas,
    neon: neonLectura ? { cuHoras: neonLectura.cuHoras, transferGB: neonLectura.transferGB, almacenGB: neonLectura.almacenGB } : null,
    vercel: vigente ? { invocaciones: n(vigente.datos.invocaciones), cpuHoras: n(vigente.datos.cpuHoras), memoriaGBh: n(vigente.datos.memoriaGBh) } : null,
    neonConfigurado: neonConfigurado(), neonError, neonLectura,
    vercelConfigurado: vercelConfigurado(), vercelError, despliegues,
    vercelManual: ultV ? { fecha: ultV.fecha, datos: ultV.datos } : null,
    lecturas,
    porDia: actividadPorDia(eventos, 30, ahora),
    porHora: actividadPorHora(momentos, 30, ahora),
  };
}
