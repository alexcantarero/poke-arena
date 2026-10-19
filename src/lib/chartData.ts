import type { MatchFull } from "./types";
import type { TrendPoint } from "@/components/charts/TrendLineChart";
import type { HourlyPoint } from "@/components/charts/HourlyChart";
import type { TipoPartida } from "./tiposPartida";

/**
 * Agrupa partidas por fecha (YYYY-MM-DD) y calcula la media móvil de 7 días.
 * Rellena los días vacíos intermedios con 0 para que la escala temporal sea real.
 */
export function prepareDailyTrend(matches: MatchFull[], daysBack = 30): TrendPoint[] {
  const countsByDate = new Map<string, number>();
  for (const m of matches) {
    countsByDate.set(m.date, (countsByDate.get(m.date) ?? 0) + 1);
  }

  // Generamos la serie de los últimos N días hasta hoy en Europe/Madrid
  const todayStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  const todayDate = new Date(`${todayStr}T00:00:00Z`);

  const points: TrendPoint[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    points.push({
      date: iso,
      value: countsByDate.get(iso) ?? 0,
    });
  }

  // Calculamos media móvil de 7 días
  return points.map((pt, idx, arr) => {
    const start = Math.max(0, idx - 6);
    const window = arr.slice(start, idx + 1);
    const sum = window.reduce((s, curr) => s + curr.value, 0);
    const avg = Number((sum / window.length).toFixed(1));
    return { ...pt, avg7: avg };
  });
}

/**
 * Distribuye las partidas por hora del día (0-23) en la zona horaria 'Europe/Madrid'
 * utilizando la marca de tiempo `createdAt` de cada partida.
 *
 * Serie A: Partidas de liga (competitionId != null)
 * Serie B: Partidas de torneo (tournamentId != null o externas)
 */
/**
 * Partidas por hora del día (Europe/Madrid), por tipo.
 *
 * v0.50 — cuatro tipos (liga, presencial, online, amistoso) en vez de dos: antes
 * «Torneos» se llevaba también los amistosos. La función que clasifica entra por
 * parámetro (`tipoDe`), para no importar nada en este módulo.
 *
 * OJO, la hora es la de REGISTRO (`createdAt`), no la de juego: la app no
 * guarda a qué hora se jugó. Por eso el subtítulo de la gráfica lo dice.
 */
export function prepareHourlyDistribution(
  matches: MatchFull[],
  tipoDe: (m: MatchFull) => TipoPartida,
): HourlyPoint[] {
  const distribution: HourlyPoint[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h, liga: 0, presencial: 0, online: 0, amistoso: 0,
  }));
  const hourFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric", hourCycle: "h23", timeZone: "Europe/Madrid",
  });
  for (const m of matches) {
    if (!m.createdAt) continue;
    const t = new Date(m.createdAt);
    if (Number.isNaN(t.getTime())) continue;
    const h = Number(hourFormatter.format(t)) % 24;
    if (h >= 0 && h < 24) distribution[h][tipoDe(m)]++;
  }
  return distribution;
}

