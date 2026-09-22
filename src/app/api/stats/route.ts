import { NextResponse, type NextRequest } from "next/server";
import { currentPlayer, loadSnapshot } from "@/lib/data";
import { applyMatchFilter, parseMatchFilter, type FilterIndex } from "@/lib/filters";
import { archetypeStats, archetypesOfMatch, isPlayed } from "@/lib/stats";
import { fetchMetaSnapshot } from "@/lib/sources/limitless";
import type { StatsPayload } from "@/lib/types";

/* =========================================================================
   GET /api/stats — los números de la pantalla de estadísticas.

   Devuelve el trozo local (vuestra liga), el global (el metagame mundial
   según Limitless) o los dos, según `source`. Los dos vienen con la misma
   forma para que la pantalla los pinte con el mismo componente y compararlos
   sea restar dos campos, no reconciliar dos estructuras.

   Por qué un endpoint y no solo un Server Component: la pantalla cambia de
   fuente y de filtros sin recargar, y el trozo global tarda segundos —son
   varias llamadas a Limitless—. Con un endpoint, lo local sale al instante y
   lo global entra cuando llega, en vez de bloquear la página entera.

   Es privado: los datos de la liga son de la liga. Sin sesión, 401.
   ========================================================================= */

/** Limitless son varias llamadas encadenadas; con el límite por defecto no cabe. */
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const me = await currentPlayer();
  if (!me) return NextResponse.json({ error: "Hace falta una sesión." }, { status: 401 });

  const sp = Object.fromEntries(new URL(request.url).searchParams.entries());
  const source = sp.source === "global" || sp.source === "both" ? sp.source : "local";
  const filter = parseMatchFilter(sp);

  const payload: StatsPayload = {};

  /* ------------------------------------------------------------ local -- */
  if (source === "local" || source === "both") {
    const snap = await loadSnapshot();
    const index: FilterIndex = {
      tournamentKind: new Map(snap.tournaments.map((t) => [t.id, t.kind])),
      tournamentFormat: new Map(snap.tournaments.map((t) => [t.id, t.format])),
      tournamentScope: new Map(snap.tournaments.map((t) => [t.id, t.scope])),
      competitionKind: new Map(snap.competitions.map((c) => [c.id, c.kind])),
      archetypesOf: (m) => {
        const { a, b } = archetypesOfMatch(m, snap.archIndex, snap.archById);
        return [a?.id, b?.id];
      },
    };

    const filtered = applyMatchFilter(snap.matches, filter, index).filter(isPlayed);
    const rows = archetypeStats(filtered, snap.archIndex, filter.playerId || undefined, snap.archById);
    const total = rows.reduce((a, r) => a + r.played, 0);

    payload.local = {
      archetypes: rows.map((r) => ({
        id: r.archetypeId,
        name: r.archetype?.name ?? r.archetypeId,
        main: r.archetype?.main ?? "",
        secondary: r.archetype?.secondary ?? "",
        type: r.archetype?.type ?? "colorless",
        played: r.played,
        wins: r.wins,
        losses: r.losses,
        ties: r.ties,
        winRate: r.winRate,
        share: total ? r.played / total : 0,
      })),
      matches: filtered.length,
      players: snap.activePlayerIds.length,
    };
  }

  /* ----------------------------------------------------------- global -- */
  if (source === "global" || source === "both") {
    const days = Number(sp.days) || 30;
    try {
      const meta = await fetchMetaSnapshot({
        days: Math.min(365, Math.max(7, days)),
        limit: Math.min(40, Math.max(5, Number(sp.limit) || 20)),
        minPlayers: Math.max(0, Number(sp.minPlayers) || 16),
        format: (sp.formato || "STANDARD").toUpperCase(),
        apiKey: process.env.LIMITLESS_API_KEY,
      });

      payload.global = {
        archetypes: meta.rows.map((r) => ({
          id: r.identifier,
          name: r.name,
          main: r.main,
          secondary: r.secondary,
          // Limitless no dice el tipo de energía; la pantalla colorea por otra vía.
          type: "colorless",
          played: r.entries,
          wins: r.wins,
          losses: r.losses,
          ties: r.ties,
          winRate: r.winRate,
          share: r.share,
        })),
        tournaments: meta.tournaments,
        entries: meta.entries,
        days: meta.days,
        fetchedAt: meta.fetchedAt,
        failed: meta.failed,
        worldwideOnly: true,
      };
    } catch (e) {
      // Que Limitless no responda no puede dejar sin datos al trozo local.
      payload.error = `No se ha podido leer el metagame global: ${
        e instanceof Error ? e.message : "error de red"
      }.`;
    }
  }

  return NextResponse.json(payload);
}
