import Link from "next/link";
import {
  contarPartidasJugadas, loadArchetypes, loadCompetitionHeads, loadConfig,
  loadDeckArchetypeIndex, loadMatchesPage, loadPlayers, loadTournamentHeads,
} from "@/lib/data";
import { archetypesOfMatch, porRecientes } from "@/lib/stats";
import {
  applyMatchFilter, describeFilter, filterToQuery, isFiltered, parseMatchFilter, type FilterIndex,
} from "@/lib/filters";
import { planDeConsulta } from "@/lib/matchQuery";
import { COMPETITION_KINDS, TOURNAMENT_FORMATS } from "@/lib/types";
import { getSeason } from "@/lib/cp";
import { Empty, MatchCard, MatchList, PageHead } from "@/components/ui";
import { FilterPanel } from "@/components/FilterPanel";
import { Icon } from "@/components/icons";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Resultados" };

const POR_PAGINA = 40;

/**
 * Resultados, con filtros de verdad.
 *
 * Las reglas de filtrado viven en `src/lib/filters.ts` y las comparte con
 * Estadísticas, así que arreglar un filtro lo arregla en los dos sitios.
 *
 * v0.29 — Fase A del plan de rendimiento. Antes esta pantalla cargaba el
 * snapshot entero (todas las partidas y todos los juegos) para enseñar
 * cuarenta tarjetas. Ahora la base devuelve solo la página pedida.
 *
 * El filtro de arquetipo es la excepción, y a propósito: depende del índice
 * de mazos y de las familias de arquetipos, y reproducir esa cadena en SQL
 * sería tener dos definiciones de «con qué se jugó». Con ese filtro puesto
 * se trae el conjunto ya recortado por lo demás y se termina en memoria.
 */
export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lng = await getLang(); // v0.49

  const q = await searchParams;
  const filter = parseMatchFilter(q);
  const plan = planDeConsulta(filter);

  const paginaCruda = Number(Array.isArray(q.pagina) ? q.pagina[0] : q.pagina);
  const pagina = Number.isFinite(paginaCruda) && paginaCruda > 1 ? Math.floor(paginaCruda) : 1;

  const [pageData, players, archetypes, tours, comps, archIndex, totalJugadas, cfg] = await Promise.all([
    loadMatchesPage(filter, POR_PAGINA, pagina),
    loadPlayers(),
    loadArchetypes(),
    loadTournamentHeads(),
    loadCompetitionHeads(),
    loadDeckArchetypeIndex(),
    contarPartidasJugadas(),
    loadConfig(),
  ]);

  const playersById = new Map(players.map((p) => [p.id, p]));
  const archById = new Map(archetypes.map((a) => [a.id, a]));
  const toursById = new Map(tours.map((t) => [t.id, t]));
  const compsById = new Map(comps.map((c) => [c.id, c]));

  const index: FilterIndex = {
    tournamentKind: new Map(tours.map((t) => [t.id, t.kind])),
    tournamentFormat: new Map(tours.map((t) => [t.id, t.format])),
    tournamentScope: new Map(tours.map((t) => [t.id, t.scope])),
    competitionKind: new Map(comps.map((c) => [c.id, c.kind])),
    archetypesOf: (m) => {
      const { a, b } = archetypesOfMatch(m, archIndex, archById);
      return [a?.id, b?.id];
    },
  };

  /* Con filtro de arquetipo la base no ha podido paginar: se termina aquí,
     con el MISMO `applyMatchFilter` que usa Estadísticas. Sin él, lo que
     llega ya es exactamente la página. */
  let visibles = pageData.filas;
  let total = pageData.total;
  let hayMas = pageData.hayMas;

  if (!plan.paginable) {
    const todas = applyMatchFilter(pageData.filas, filter, index).slice().sort(porRecientes);
    total = todas.length;
    const desde = (pagina - 1) * POR_PAGINA;
    visibles = todas.slice(desde, desde + POR_PAGINA);
    hayMas = todas.length > desde + POR_PAGINA;
  }

  const hrefPagina = (n: number) => {
    const sp = filterToQuery(filter);
    if (n > 1) sp.set("pagina", String(n));
    const s = sp.toString();
    return s ? `/resultados?${s}` : "/resultados";
  };

  const table = getSeason(cfg.cpSeason);
  const kindLabel = (k: string) => table.events[k]?.label ?? k;

  const archOf = (m: (typeof visibles)[number], side: "a" | "b") => {
    const { a, b } = archetypesOfMatch(m, archIndex, archById);
    return side === "a" ? a : b;
  };

  const resumen = describeFilter(filter, {
    tournament: (id) => toursById.get(id)?.name,
    competition: (id) => compsById.get(id)?.name,
    archetype: (id) => archById.get(id)?.name,
    player: (id) => playersById.get(id)?.name,
    kind: kindLabel,
  });

  /* Sin contar aparte, el total de una página paginada es «al menos esto».
     Decirlo así es más honesto que inventar una cifra exacta. */
  const subtitulo = isFiltered(filter)
    ? `${pageData.totalRecortado && plan.paginable ? "más de " : ""}${total} de ${totalJugadas} partidas · ${resumen}`
    : `${totalJugadas} partidas.`;

  return (
    <>
      <PageHead
        title={tr(lng, "x.b164a1ab")}
        sub={subtitulo}
        actions={
          <Link className="btn btn-brand hidden md:inline-flex" href="/partidas/nueva">
            <Icon name="plus" className="size-4" /> {tr(lng, "x.caacc66c")}
          </Link>
        }
      />

      <FilterPanel
        action="/resultados"
        filter={filter}
        show={["scope", "date", "tournament", "tournamentKind", "competition", "competitionKind", "archetype", "player", "format", "round"]}
        tournaments={tours.map((t) => ({ value: t.id, label: t.name }))}
        competitions={comps.map((c) => ({ value: c.id, label: c.name }))}
        tournamentKinds={[...new Set(tours.map((t) => t.kind))]
          .map((k) => ({ value: k, label: kindLabel(k) }))}
        competitionKinds={Object.entries(COMPETITION_KINDS)
          .map(([v, d]) => ({ value: v, label: d.short }))}
        archetypes={archetypes.map((a) => ({ value: a.id, label: a.name }))}
        players={players.map((p) => ({ value: p.id, label: p.name }))}
        formats={Object.entries(TOURNAMENT_FORMATS).map(([v, l]) => ({ value: v, label: l }))}
      />

      {!plan.paginable && pageData.totalRecortado && (
        <p className="mb-3 text-xs text-muted">
          {tr(lng, "x.342e6493")}
        </p>
      )}

      <div className="card">
        {visibles.length ? (
          <MatchList>
            {visibles.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                playerA={playersById.get(m.playerAId)}
                playerB={m.playerBId ? playersById.get(m.playerBId)
                  : m.opponentPlayerId ? playersById.get(m.opponentPlayerId) : undefined}
                archA={archOf(m, "a")}
                archB={archOf(m, "b")}
                context={m.competitionId
                  ? compsById.get(m.competitionId)?.name
                  : m.tournamentId ? toursById.get(m.tournamentId)?.name : undefined}
              />
            ))}
          </MatchList>
        ) : (
          <Empty title={tr(lng, "x.f75fc8cd")}>
            {isFiltered(filter)
              ? <><a className="underline underline-offset-2" href="/resultados?limpiar=1">{tr(lng, "x.b605ff08")}</a> {tr(lng, "x.b2639653")}</>
              : tr(lng, "x.2bf60f0b")}
          </Empty>
        )}
      </div>

      {(hayMas || pagina > 1) && (
        <nav className="mt-3 flex items-center justify-between gap-2" aria-label={tr(lng, "x.f0f3ce8c")}>
          {pagina > 1 ? (
            <Link href={hrefPagina(pagina - 1)} scroll={false} className="btn">
              <Icon name="back" className="size-4" /> {tr(lng, "x.e859e9dd")}
            </Link>
          ) : <span />}
          <span className="text-xs text-muted tabular">Página {pagina}</span>
          {hayMas ? (
            <Link href={hrefPagina(pagina + 1)} scroll={false} className="btn">
              {tr(lng, "x.cdf489d6")}
            </Link>
          ) : <span />}
        </nav>
      )}
    </>
  );
}
