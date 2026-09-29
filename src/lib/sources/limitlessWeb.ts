/* =========================================================================
   Regionales y City Leagues desde limitlesstcg.com — solo mazos.

   La API de Limitless (play.limitlesstcg.com/api) cubre su plataforma
   online; los presenciales están en su web principal, sin API. Aquí se leen
   dos páginas públicas por torneo, con las condiciones que explica
   `lib/limitlessHtml.ts` (robots.txt permisivo, sin condiciones de uso
   publicadas, User-Agent propio, pausas, un tope por sincronización y cada
   torneo terminado leído una sola vez).

   Solo de servidor, y solo lo llama la acción de Ajustes (un botón de
   organizador). Nunca se ejecuta al cargar una página.
   ========================================================================= */

import "server-only";
import {
  LIMITLESS_WEB, parseCabezaResultados, parseCityLeague, parseEstadisticas,
  parseListaCityLeagues, parseListaTorneos, tipoDeTorneo,
  type CityLeague, type FilaEstadistica, type PuestoMazo, type TorneoLimitless,
} from "@/lib/limitlessHtml";

const UA = "Arena/0.14 (liga privada de Pokemon TCG; lectura manual y ocasional, con cache)";
const PAUSA_MS = 600;

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pagina(path: string): Promise<string> {
  const res = await fetch(`${LIMITLESS_WEB}${path}`, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    // Un torneo terminado no cambia: una vez leído, que lo sirva la caché.
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new Error(`Limitless respondió ${res.status} en ${path}`);
  return res.text();
}

export type RegionalLeido = {
  torneo: TorneoLimitless;
  kind: NonNullable<ReturnType<typeof tipoDeTorneo>>;
  stats: FilaEstadistica[];
  cabeza: PuestoMazo[];
  url: string;
};

/**
 * Los Regionales (y Specials, Internacionales) más recientes que aún no
 * tenemos. `yaTenemos` son los ids de Limitless ya importados: esos no se
 * vuelven a pedir.
 */
export async function recogerRegionales(opts: {
  yaTenemos: Set<string>; desde: string; max?: number;
}): Promise<{ leidos: RegionalLeido[]; fallos: string[] }> {
  const { yaTenemos, desde, max = 6 } = opts;
  const lista = parseListaTorneos(await pagina("/tournaments"))
    .filter((t) => t.date >= desde && t.format === "standard" && tipoDeTorneo(t.name))
    .filter((t) => !yaTenemos.has(t.id))
    .slice(0, max);

  const leidos: RegionalLeido[] = [];
  const fallos: string[] = [];
  for (const t of lista) {
    try {
      await pausa(PAUSA_MS);
      const stats = parseEstadisticas(await pagina(`/tournaments/${t.id}/statistics`));
      await pausa(PAUSA_MS);
      const cabeza = parseCabezaResultados(await pagina(`/tournaments/${t.id}`), 8);
      if (!stats.length) { fallos.push(`${t.name}: sin estadísticas todavía`); continue; }
      leidos.push({ torneo: t, kind: tipoDeTorneo(t.name)!, stats, cabeza, url: `${LIMITLESS_WEB}/tournaments/${t.id}` });
    } catch (e) {
      fallos.push(`${t.name}: ${e instanceof Error ? e.message : "error"}`);
    }
  }
  return { leidos, fallos };
}

export type CityLeagueLeida = { liga: CityLeague; puestos: PuestoMazo[]; url: string };

/** Las City Leagues de Japón más recientes que aún no tenemos. */
export async function recogerCityLeagues(opts: {
  yaTenemos: Set<string>; max?: number;
}): Promise<{ leidas: CityLeagueLeida[]; fallos: string[] }> {
  const { yaTenemos, max = 15 } = opts;
  const lista = parseListaCityLeagues(await pagina("/tournaments/jp"))
    .filter((c) => !yaTenemos.has(c.id))
    .slice(0, max);
  const leidas: CityLeagueLeida[] = [];
  const fallos: string[] = [];
  for (const c of lista) {
    try {
      await pausa(PAUSA_MS);
      const puestos = parseCityLeague(await pagina(`/tournaments/jp/${c.id}`));
      if (puestos.length) leidas.push({ liga: c, puestos, url: `${LIMITLESS_WEB}/tournaments/jp/${c.id}` });
    } catch (e) {
      fallos.push(`City League ${c.id}: ${e instanceof Error ? e.message : "error"}`);
    }
  }
  return { leidas, fallos };
}
