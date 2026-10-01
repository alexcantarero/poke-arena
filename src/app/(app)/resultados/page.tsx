import Link from "next/link";
import { loadSnapshot } from "@/lib/data";
import { archetypesOfMatch, isPlayed, porRecientes } from "@/lib/stats";
import {
  applyMatchFilter, describeFilter, isFiltered, parseMatchFilter, type FilterIndex,
} from "@/lib/filters";
import { COMPETITION_KINDS, TOURNAMENT_FORMATS } from "@/lib/types";
import { getSeason } from "@/lib/cp";
import { Empty, MatchCard, MatchList, PageHead } from "@/components/ui";
import { FilterPanel } from "@/components/FilterPanel";
import { Icon } from "@/components/icons";

export const metadata = { title: "Resultados" };

/**
 * Resultados, con filtros de verdad.
 *
 * Antes solo se podía filtrar por competición, y la petición era poder
 * filtrar también por torneo — que es donde se juega casi todo. Ahora las
 * reglas viven en `src/lib/filters.ts` y las comparte con Estadísticas, así
 * que arreglar un filtro lo arregla en los dos sitios.
 */
export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const snap = await loadSnapshot();
  const filter = parseMatchFilter(q);

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

  const played = snap.matches.filter(isPlayed);
  const rows = applyMatchFilter(played, filter, index).slice().sort(porRecientes);

  // Las pendientes respetan el filtro de competición y de torneo, que es lo
  // único que tiene sentido en algo que aún no se ha jugado.
  const pending = snap.matches.filter((m) =>
    m.status === "scheduled"
    && (!filter.competitionId || m.competitionId === filter.competitionId)
    && (!filter.tournamentId || m.tournamentId === filter.tournamentId));

  const season = snap.config.cpSeason;
  const table = getSeason(season);
  const kindLabel = (k: string) => table.events[k]?.label ?? k;

  const archOf = (m: (typeof played)[number], side: "a" | "b") => {
    const { a, b } = archetypesOfMatch(m, snap.archIndex, snap.archById);
    return side === "a" ? a : b;
  };

  const resumen = describeFilter(filter, {
    tournament: (id) => snap.toursById.get(id)?.name,
    competition: (id) => snap.compsById.get(id)?.name,
    archetype: (id) => snap.archById.get(id)?.name,
    player: (id) => snap.playersById.get(id)?.name,
    kind: kindLabel,
  });

  return (
    <>
      <PageHead
        title="Resultados"
        sub={
          isFiltered(filter)
            ? `${rows.length} de ${played.length} partidas · ${resumen}`
            : `${played.length} partidas.`
        }
        actions={
          <Link className="btn btn-brand hidden md:inline-flex" href="/partidas/nueva">
            <Icon name="plus" className="size-4" /> Registrar
          </Link>
        }
      />

      <FilterPanel
        action="/resultados"
        filter={filter}
        show={["scope", "date", "tournament", "tournamentKind", "competition", "competitionKind", "archetype", "player", "format"]}
        tournaments={snap.tournaments.map((t) => ({ value: t.id, label: t.name }))}
        competitions={snap.competitions.map((c) => ({ value: c.id, label: c.name }))}
        tournamentKinds={[...new Set(snap.tournaments.map((t) => t.kind))]
          .map((k) => ({ value: k, label: kindLabel(k) }))}
        competitionKinds={Object.entries(COMPETITION_KINDS)
          .map(([v, d]) => ({ value: v, label: d.short }))}
        archetypes={snap.archetypes.map((a) => ({ value: a.id, label: a.name }))}
        players={snap.players.map((p) => ({ value: p.id, label: p.name }))}
        formats={Object.entries(TOURNAMENT_FORMATS).map(([v, l]) => ({ value: v, label: l }))}
      />

      {pending.length > 0 && (
        <section className="card mb-4">
          <div className="card-head">
            <h2 className="text-lg font-bold">Pendientes</h2>
            <span className="text-xs text-muted">{pending.length}</span>
          </div>
          <ul className="divide-y divide-line-soft">
            {pending.map((m) => (
              <li key={m.id}>
                <Link href={`/partidas/${m.id}`} className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface-2">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {snap.playersById.get(m.playerAId)?.name} <span className="text-muted">vs</span>{" "}
                    {m.playerBId ? snap.playersById.get(m.playerBId)?.name : m.opponentName}
                  </span>
                  <span className="btn btn-brand btn-sm flex-none">Anotar</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="card">
        {rows.length ? (
          <MatchList>
            {rows.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                playerA={snap.playersById.get(m.playerAId)}
                playerB={m.playerBId ? snap.playersById.get(m.playerBId)
                  : m.opponentPlayerId ? snap.playersById.get(m.opponentPlayerId) : undefined}
                archA={archOf(m, "a")}
                archB={archOf(m, "b")}
                context={m.competitionId
                  ? snap.compsById.get(m.competitionId)?.name
                  : m.tournamentId ? snap.toursById.get(m.tournamentId)?.name : undefined}
              />
            ))}
          </MatchList>
        ) : (
          <Empty title="Ninguna partida con estos filtros">
            {isFiltered(filter)
              ? <><a className="underline underline-offset-2" href="/resultados">Quítalos</a> y vuelve a mirar.</>
              : "Registra la primera y aparecerá aquí."}
          </Empty>
        )}
      </div>
    </>
  );
}
