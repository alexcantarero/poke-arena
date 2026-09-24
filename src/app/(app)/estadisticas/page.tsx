import { loadSnapshot } from "@/lib/data";
import {
  activityByMonth, archetypeStats, archetypesOfMatch, firstTurnSeriesStats, firstTurnStats,
  isInternal, isPlayed, matchupMatrix, seriesShapes,
} from "@/lib/stats";
import {
  applyMatchFilter, describeFilter, filterToQuery, isFiltered, parseMatchFilter,
  type FilterIndex,
} from "@/lib/filters";
import { COMPETITION_KINDS, TOURNAMENT_FORMATS } from "@/lib/types";
import { getSeason } from "@/lib/cp";
import { MONTHS, pct, wrColor } from "@/lib/format";
import { Bars, Kpi, PageHead, Sprites } from "@/components/ui";
import { Matrix } from "@/components/Matrix";
import { FilterPanel } from "@/components/FilterPanel";
import { SourceTabs } from "@/components/statistics/SourceTabs";
import { LastEvent } from "@/components/statistics/LastEvent";
import { fetchLastBigTournament } from "@/lib/sources/limitless";
import { SortToggle, sortRows, type SortDir } from "@/components/statistics/SortToggle";
import { GlobalMeta } from "@/components/statistics/GlobalMeta";
import { ArchetypeChart } from "@/components/statistics/Charts";
import { ConversionChart } from "@/components/statistics/ConversionChart";
import { ConversionTable, type ConvRow } from "@/components/ConversionTable";
import { byArchetype, overTime, type PlacementRow } from "@/lib/tournamentStats";

export const metadata = { title: "Estadísticas" };

/**
 * Estadísticas, con tres fuentes y filtros que filtran.
 *
 * Lo que cambia respecto a antes:
 *
 * · Se puede mirar **tu liga**, el **metagame online** o **los dos a la vez**.
 *   La comparación es el punto: un mazo que en el mundo gana el 55% y en
 *   vuestra liga el 30% dice algo que ninguno de los dos números dice solo.
 * · Los filtros de fecha y de tipo **funcionan**. Antes estaban puestos pero
 *   no tocaban lo que se pintaba; ahora las reglas están en
 *   `src/lib/filters.ts` y son las mismas que usa Resultados.
 *
 * Lo local sale del snapshot, que ya está en memoria, así que se ve al
 * instante. Lo mundial son varias llamadas a Limitless y tarda segundos, por
 * eso lo pide un componente cliente aparte en vez de bloquear la página.
 */
export default async function StatsPage({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const snap = await loadSnapshot();

  const fuenteRaw = Array.isArray(q.fuente) ? q.fuente[0] : q.fuente;
  const fuente: "local" | "global" | "both" | "evento" =
    fuenteRaw === "global" || fuenteRaw === "both" || fuenteRaw === "evento"
      ? fuenteRaw : "local";

  /* La fuente manda sobre la página ENTERA, no solo sobre el primer bloque.
     Con «Meta online» o «Último torneo» no tiene sentido enseñar la matriz de
     emparejamientos ni la actividad por mes: esas salen de vuestras partidas
     y no existen fuera. En vez de dejarlas ahí diciendo lo de siempre —que
     era lo confuso—, se ocultan y se dice por qué. */
  const conLocal = fuente === "local" || fuente === "both";

  /* Orden de los gráficos y de las listas de arquetipos. Descendente por
     defecto: lo primero que se busca es lo que más pesa. */
  const orden: SortDir = (Array.isArray(q.orden) ? q.orden[0] : q.orden) === "asc" ? "asc" : "desc";

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

  const all = snap.matches.filter(isPlayed);
  const rows = applyMatchFilter(all, filter, index);

  const archs = archetypeStats(rows, snap.archIndex, undefined, snap.archById);
  const ft = firstTurnStats(rows);
  // A nivel de serie. Es la única lectura posible de las rondas de torneo
  // apuntadas en modo rápido, que tienen turno y resultado pero no desglose.
  const fts = firstTurnSeriesStats(rows);
  const shapes = seriesShapes(rows);
  const months = activityByMonth(rows);
  const matrix = matchupMatrix(rows, snap.archIndex, 1, snap.archById);
  const totalGames = rows.reduce((a, m) => a + m.games.length, 0);
  const external = rows.filter((m) => !isInternal(m)).length;
  const bo: Record<number, number> = { 1: 0, 3: 0, 5: 0 };
  for (const m of rows) bo[m.bestOf] = (bo[m.bestOf] ?? 0) + 1;

  const season = snap.config.cpSeason;
  const table = getSeason(season);
  const kindLabel = (k: string) => table.events[k]?.label ?? k;

  const focus = filter.archetypeId ? snap.archById.get(filter.archetypeId) : undefined;
  const focusRow = filter.archetypeId
    ? archs.find((a) => a.archetypeId === filter.archetypeId)
    : undefined;

  // Lo que se le pasa al bloque mundial: los mismos filtros, y los arquetipos
  // de la liga ya calculados para poder cruzarlos.
  const query = filterToQuery(filter).toString();
  const localRows = archs.map((a) => ({
    id: a.archetypeId,
    name: a.archetype?.name ?? a.archetypeId,
    main: a.archetype?.main ?? "",
    secondary: a.archetype?.secondary ?? "",
    type: a.archetype?.type ?? "colorless",
    played: a.played,
    wins: a.wins,
    losses: a.losses,
    ties: a.ties,
    winRate: a.winRate,
    share: rows.length ? a.played / (rows.length * 2) : 0,
  }));

  /* --------------------------------------------------------------
     Rendimiento por mazo en torneos.

     Ojo a la diferencia con «Uso del metagame» y «Rendimiento», que están
     más abajo: aquellas miran PARTIDAS —cuánto se juega un mazo y cuántas
     rondas gana— y esta mira TORNEOS —con cuántos llega al corte—. Un mazo
     puede ganar muchas rondas y no cerrar nunca, y al revés.

     Se respeta el filtro de tipo de torneo del panel de arriba, que es el
     que ya existe, en vez de inventar otro filtro distinto al lado.
     -------------------------------------------------------------- */
  const placements: PlacementRow[] = snap.tournaments
    .filter((t) => !filter.tournamentKind || t.kind === filter.tournamentKind)
    .filter((t) => !filter.tournamentId || t.id === filter.tournamentId)
    .filter((t) => !filter.from || t.date >= filter.from)
    .filter((t) => !filter.to || t.date <= filter.to)
    .flatMap((t) => t.results.map((r) => ({
      playerId: r.playerId,
      archetypeId: r.archetypeId
        ?? (r.deckId ? snap.decksById.get(r.deckId)?.archetypeId ?? null : null),
      placement: r.placement ?? null,
      date: t.date,
      kind: t.kind,
      playerCount: t.playerCount ?? null,
      topCut: t.topCut ?? null,
    })));

  const porMazo: ConvRow[] = [...byArchetype(placements).entries()]
    .map(([archetypeId, stats]) => {
      const a = snap.archById.get(archetypeId);
      return {
        ...stats,
        id: archetypeId,
        label: a?.name ?? archetypeId,
        icon: <Sprites archetype={a} size="sm" />,
        href: `/estadisticas?arch=${archetypeId}`,
      };
    })
    .sort((a, b) =>
      (b.cutRate ?? -1) - (a.cutRate ?? -1)
      || (b.top4Rate ?? -1) - (a.top4Rate ?? -1)
      || b.entries - a.entries);

  const evolucion = overTime(placements);

  /* El informe del último torneo grande. Solo se pide cuando toca: son dos
     llamadas encadenadas a Limitless y no hay por qué pagarlas en las otras
     tres pestañas. */
  const informe = fuente === "evento"
    ? await fetchLastBigTournament({
        days: 14,
        minPlayers: 64,
        format: (filter.format || "standard").toUpperCase(),
        apiKey: process.env.LIMITLESS_API_KEY,
      })
    : null;

  /** La URL de ahora con otro orden. */
  const ordenHref = (d: SortDir) => {
    const p = new URLSearchParams(query);
    if (fuente !== "local") p.set("fuente", fuente);
    if (d === "asc") p.set("orden", "asc");
    else p.delete("orden");
    const qs = p.toString();
    return qs ? `/estadisticas?${qs}` : "/estadisticas";
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
        title="Estadísticas"
        sub={
          isFiltered(filter)
            ? `${rows.length} de ${all.length} partidas · ${resumen}`
            : "Sobre las partidas registradas. Las que no llevan mazo en los dos lados cuentan para el ranking, pero no para la matriz."
        }
      />

      <SourceTabs current={fuente} query={query} />

      {fuente === "evento" ? (
        <LastEvent report={informe} />
      ) : (
      <>
      <FilterPanel
        action="/estadisticas"
        filter={filter}
        show={["scope", "date", "tournament", "tournamentKind", "competition", "competitionKind", "archetype", "player", "format"]}
        keep={{
          ...(fuente === "local" ? {} : { fuente }),
          ...(orden === "asc" ? { orden: "asc" } : {}),
        }}
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

      {fuente !== "local" && (
        <GlobalMeta
          mode={fuente === "both" ? "both" : "global"}
          local={localRows}
          days={filter.preset === "90d" ? 90 : filter.preset === "365d" ? 365 : 30}
          query={query}
        />
      )}

      {!conLocal && (
        <p className="card mb-4 p-3 text-xs text-ink-2">
          Estás mirando el <b>metagame online</b>. Las secciones que salen de vuestras
          partidas —la matriz de emparejamientos, el primer turno, la actividad por mes y el
          rendimiento por mazo— no existen fuera de vuestra liga, así que no se enseñan. Pasa
          a <b>Comparar</b> para verlas junto al mundo.
        </p>
      )}

      {conLocal && focus && focusRow && (
        <section className="card mt-4 p-4">
          <div className="flex items-center gap-3">
            <Sprites archetype={focus} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold">{focus.name}</h2>
              <p className="text-sm text-muted">
                {focusRow.played} usos · {focusRow.wins}V {focusRow.losses}D · juegos {focusRow.gameWins}–{focusRow.gameLosses}
              </p>
            </div>
            <span className="font-display text-3xl font-extrabold tabular" style={{ color: wrColor(focusRow.winRate) }}>
              {pct(focusRow.winRate, 0)}
            </span>
          </div>
        </section>
      )}

      {/* A partir de aquí todo sale de VUESTRAS partidas. Con la fuente en
          «Meta online» no se enseña: no existe fuera de la liga y dejarlo
          puesto era lo que hacía pensar que el filtro no funcionaba. */}
      {conLocal && (
      <>
      <div className="my-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi tone="local" icon="database" label="Partidas" value={rows.length} note={`${totalGames} juegos`} />
        <Kpi tone="local" icon="deck" label="Arquetipos" value={archs.length} note={`${external} contra gente de fuera`} />
        <Kpi label="Gana quien empieza" icon="star" value={pct(ft.winRate, 1)} note={`${ft.n} juegos anotados`} highlight={(ft.winRate ?? 0) > 0.55} />
        <Kpi label="Formato" icon="results" value={`Bo3 ${rows.length ? Math.round(((bo[3] ?? 0) / rows.length) * 100) : 0}%`}
          note={`Bo1 ${bo[1] ?? 0} · Bo3 ${bo[3] ?? 0} · Bo5 ${bo[5] ?? 0}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="card-head">
            <h2 className="text-lg font-bold">Uso del metagame</h2>
            <SortToggle dir={orden} href={ordenHref} />
          </div>
          <div className="p-4">
            {archs.length ? (
              <Bars rows={sortRows(archs, (a) => a.played, orden).slice(0, 10).map((a) => ({
                label: <span className="inline-flex min-w-0 items-center gap-1.5"><Sprites archetype={a.archetype} size="sm" /><span className="truncate text-[13px]">{a.archetype?.name}</span></span>,
                value: a.played,
                right: `${a.played}`,
              }))} />
            ) : <p className="text-sm text-muted">Sin mazos asignados todavía.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Rendimiento</h2>
              <p className="text-xs text-muted">mín. 2 usos</p>
            </div>
            <SortToggle dir={orden} href={ordenHref} />
          </div>
          <div className="p-4">
            {archs.filter((a) => a.played >= 2).length ? (
              <Bars max={100} rows={sortRows(archs.filter((a) => a.played >= 2), (a) => a.winRate, orden).slice(0, 10).map((a) => ({
                label: <span className="inline-flex min-w-0 items-center gap-1.5"><Sprites archetype={a.archetype} size="sm" /><span className="truncate text-[13px]">{a.archetype?.name}</span></span>,
                value: (a.winRate ?? 0) * 100,
                right: `${pct(a.winRate, 0)} (${a.played})`,
                color: wrColor(a.winRate),
              }))} />
            ) : <p className="text-sm text-muted">Hacen falta al menos dos usos por arquetipo.</p>}
          </div>
        </section>
      </div>

      {archs.filter((a) => a.played >= 2).length > 1 && (
        <section className="card mt-4 p-4">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h2 className="min-w-0 text-lg font-bold">Victorias por arquetipo</h2>
            <SortToggle dir={orden} href={ordenHref} />
          </div>
          <p className="mb-3 text-xs text-muted">
            Los más jugados de tu liga, con el filtro que tengas puesto.
          </p>
          <ArchetypeChart
            mode="local"
            rows={sortRows(archs.filter((a) => a.played >= 2), (a) => a.winRate, orden).map((a) => ({
              id: a.archetypeId,
              name: a.archetype?.name ?? a.archetypeId,
              // Los sprites del eje salen de aquí: sin ellos la gráfica cae al
              // nombre corto, que es lo que había antes.
              main: a.archetype?.main ?? "",
              secondary: a.archetype?.secondary ?? "",
              local: a.winRate,
              played: a.played,
            }))}
          />
        </section>
      )}

      {/* -------------------- rendimiento en torneos por mazo ------------------- */}
      {placements.length > 0 && (
        <>
          <section className="card mt-4">
            <div className="card-head">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">Qué mazos llegan al corte</h2>
                <p className="text-xs text-muted">
                  Esto mira <b>torneos</b>, no partidas: con qué mazo se entra en el top cut.
                </p>
              </div>
              <SortToggle dir={orden} href={ordenHref} />
            </div>
            <ConversionTable
              rows={sortRows(porMazo, (r) => r.cutRate ?? r.top8Rate, orden)}
              empty="Ningún resultado de torneo tiene el mazo apuntado todavía."
            />
            <p className="border-t border-line-soft px-4 py-3 text-[11px] text-muted">
              <b>%Cut</b> sale solo de los torneos que tenían top cut, así que un guion quiere
              decir «no había nada que convertir», no un cero. Usa los filtros de arriba para
              recortar por tipo de torneo o por fechas.
            </p>
          </section>

          {evolucion.length > 1 && (
            <section className="card mt-4 p-4">
              <h2 className="mb-1 text-lg font-bold">Conversión mes a mes</h2>
              <p className="mb-3 text-xs text-muted">
                Todos los resultados del grupo juntos, agrupados por mes. Los meses sin
                torneos no salen: rellenarlos con ceros dibujaría caídas que no han pasado.
              </p>
              <ConversionChart points={evolucion} />
            </section>
          )}
        </>
      )}

      <section className="card mt-4">
        <div className="card-head">
          <h2 className="text-lg font-bold">Matriz de emparejamientos</h2>
          <span className="text-xs text-muted">fila contra columna</span>
        </div>
        <div className="p-4">
          <Matrix data={matrix} byId={snap.archById} />
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-win" />favorable (≥55%)</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-series-1" />equilibrado</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-loss" />desfavorable (≤45%)</span>
            <span>La intensidad crece con el número de partidas.</span>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="card">
          <div className="card-head"><h2 className="text-lg font-bold">Cómo acaban las series</h2></div>
          <div className="p-4">
            {shapes.length
              ? <Bars rows={shapes.map((s) => ({ label: <span className="font-mono text-[13px]">{s.key}</span>, value: s.n, right: String(s.n) }))} />
              : <p className="text-sm text-muted">Aún no hay series a más de un juego.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2 className="text-lg font-bold">Primer turno</h2></div>
          <div className="p-4">
            {ft.n && ft.winRate != null ? (
              <>
                <div className="font-display text-4xl font-extrabold tabular" style={{ color: wrColor(ft.winRate) }}>
                  {pct(ft.winRate, 1)}
                </div>
                <p className="mt-1 mb-3 text-sm text-muted">
                  de los {ft.n} juegos con turno anotado los gana quien empieza
                </p>
                <div className="flex h-2 overflow-hidden rounded-full bg-surface-3">
                  <i className="block h-full bg-win" style={{ width: `${(ft.winRate * 100).toFixed(1)}%` }} />
                  <i className="block h-full bg-loss" style={{ width: `${((1 - ft.winRate) * 100).toFixed(1)}%` }} />
                </div>
                {fts.n > 0 && fts.winRate != null && (
                  <p className="mt-3 text-xs text-muted">
                    Contando series completas en vez de juegos sueltos: {pct(fts.winRate, 1)} de{" "}
                    {fts.n} partidas las gana quien salió primero. Aquí entran también las rondas
                    de torneo apuntadas sin desglose, que tienen turno y resultado pero no juegos.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">
                Anota quién empezó cada juego y aquí sabrás si el primer turno pesa tanto como dice todo el mundo.
              </p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2 className="text-lg font-bold">Actividad</h2></div>
          <div className="p-4">
            {months.length
              ? <Bars rows={months.map((x) => {
                  const [y, m] = x.key.split("-");
                  return { label: <span className="capitalize">{MONTHS[Number(m) - 1]} {y.slice(2)}</span>, value: x.n, right: String(x.n) };
                })} />
              : <p className="text-sm text-muted">Sin partidas.</p>}
          </div>
        </section>
      </div>
      </>
      )}
      </>
      )}
    </>
  );
}
