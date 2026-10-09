import Link from "next/link";
import { loadMetaIrl, loadSnapshot } from "@/lib/data";
import { irlMeta } from "@/lib/metaIrl";
import { MetaIrlEvents, MetaIrlTable } from "@/components/MetaIrlTable";
import {
  activityByMonth, archetypeStats, archetypesOfMatch, firstTurnSeriesStats, firstTurnStats,
  isInternal, isPlayed, matchupMatrix, outcome, seriesShapes,
} from "@/lib/stats";
import {
  applyMatchFilter, describeFilter, filterToQuery, isFiltered, parseMatchFilter,
  type FilterIndex,
} from "@/lib/filters";
import { COMPETITION_KINDS, TOURNAMENT_FORMATS } from "@/lib/types";
import { getSeason } from "@/lib/cp";
import { MONTHS, pct, wrColor } from "@/lib/format";
import { Avatar, Bars, Kpi, PageHead, Sprites } from "@/components/ui";
import { Matrix } from "@/components/Matrix";
import { FilterPanel } from "@/components/FilterPanel";
import { SourceTabs, type Fuente } from "@/components/statistics/SourceTabs";
import { LastEvent } from "@/components/statistics/LastEvent";
import { fetchLastBigTournament } from "@/lib/sources/limitless";
import { SortToggle, sortRows, type SortDir } from "@/components/statistics/SortToggle";
import { GlobalMeta } from "@/components/statistics/GlobalMeta";
import { ConversionEvolucionLazy } from "@/components/statistics/lazy";
import type { SerieConv } from "@/components/statistics/ConversionEvolucion";
import { agruparFilas, crearAgrupador } from "@/lib/arquetipos";
import { ConversionTable, type ConvRow } from "@/components/ConversionTable";
import { byArchetype, byPlayer, overTime, type PlacementRow } from "@/lib/tournamentStats";

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
  const fuente: Fuente =
    fuenteRaw === "global" || fuenteRaw === "both" || fuenteRaw === "evento"
    || fuenteRaw === "regionales" || fuenteRaw === "city" || fuenteRaw === "live"
      ? fuenteRaw : "local";

  /* v0.14 — Regionales y City Leagues: el metagame presencial (lo traído de
     Limitless o pegado a mano), partido por tipo de evento. Son mazos de
     fuera: los filtros de partidas de la liga no aplican, así que la página
     se queda en la tabla y la lista de eventos. */
  if (fuente === "regionales" || fuente === "city") {
    const { events, entries } = await loadMetaIrl();
    const tipos = fuente === "city"
      ? new Set(["city_league"])
      : new Set(["regional", "special", "international", "worlds"]);
    const evs = events.filter((e) => tipos.has(e.kind));
    const ids = new Set(evs.map((e) => e.id));
    const meta = irlMeta(
      evs.map((e) => ({
        id: e.id, name: e.name, date: e.date, kind: e.kind,
        coverage: e.coverage, playerCount: e.playerCount, topCut: e.topCut,
      })),
      entries.filter((r) => ids.has(r.eventId)).map((r) => ({
        eventId: r.eventId, placement: r.placement, copies: r.copies,
        archetypeId: r.archetypeId, archetypeName: r.archetypeName,
        main: r.main, secondary: r.secondary,
      })),
    );
    const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      <>
        <PageHead
          title="Estadísticas"
          sub={fuente === "city"
            ? "City Leagues de Japón: el top de cada evento, solo puesto y mazo. Su formato va por delante del internacional."
            : "Regionales, Specials e Internacionales: recuento del Día 2 y top cut. Sin nombres de jugador."}
        />
        <SourceTabs current={fuente} query="" />
        <MetaIrlTable meta={meta} nuestros={new Set(snap.archetypes.map((a) => norm(a.name)))} />
        <MetaIrlEvents eventos={evs.map((e) => ({
          id: e.id, name: e.name, date: e.date, kind: e.kind, location: e.location,
          sourceName: e.sourceName, sourceUrl: e.sourceUrl, coverage: e.coverage,
          playerCount: e.playerCount, division: e.division,
        }))} />
        <p className="mt-3 text-xs text-muted">
          Se actualiza en Ajustes → «Regionales y City Leagues automáticos». Datos de{" "}
          <a className="underline" href="https://limitlesstcg.com" target="_blank" rel="noopener noreferrer">Limitless TCG</a>.
        </p>
      </>
    );
  }

  /* La fuente manda sobre la página ENTERA, no solo sobre el primer bloque.
     Con «Meta online» o «Último torneo» no tiene sentido enseñar la matriz de
     emparejamientos ni la actividad por mes: esas salen de vuestras partidas
     y no existen fuera. En vez de dejarlas ahí diciendo lo de siempre —que
     era lo confuso—, se ocultan y se dice por qué. */
  const conLocal = fuente === "local" || fuente === "both" || fuente === "live";

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

  /* v0.21 — «Vista agrupada»: las variantes cuentan bajo su arquetipo
     principal (`archetypes.parent_id`). Usos, %V y conversión se recalculan
     con los totales de la familia, no se promedian. */
  const agruparRaw = Array.isArray(q.agrupar) ? q.agrupar[0] : q.agrupar;
  const agrupar = agruparRaw === "1";
  /* v0.22: agrupación AUTOMÁTICA por el primer Pokémon (Dragapult / X →
     Dragapult), con los padres puestos a mano por encima. */
  const agr = crearAgrupador(snap.archetypes);
  const hayFamilias = true;
  const raiz = (id: string) => (agrupar ? agr.raiz(id) : id);

  let archsDetalle = archetypeStats(rows, snap.archIndex, undefined, snap.archById);
  if (fuente === "live") {
    const liveStats = new Map<string, { played: number; wins: number; losses: number }>();
    for (const d of snap.decks) {
      // TODO: se podría filtrar por d.playerId si hay filtro de jugador, pero de momento global.
      if (d.liveWins > 0 || d.liveLosses > 0) {
        const id = d.archetypeId;
        const cur = liveStats.get(id) ?? { played: 0, wins: 0, losses: 0 };
        cur.played += d.liveWins + d.liveLosses;
        cur.wins += d.liveWins;
        cur.losses += d.liveLosses;
        liveStats.set(id, cur);
      }
    }
      archsDetalle = Array.from(liveStats.entries()).map(([id, st]) => ({
        archetypeId: id,
        archetype: snap.archById.get(id),
        played: st.played,
        wins: st.wins,
        losses: st.losses,
        ties: 0,
        gameWins: 0,
        gameLosses: 0,
        winRate: st.played > 0 ? st.wins / st.played : 0,
      })).sort((a, b) => b.played - a.played);
  }

  const archs = agrupar
    ? agruparFilas(archsDetalle, raiz, agr.arquetipo)
    : archsDetalle;
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
      archetypeId: ((id: string | null) => (id ? raiz(id) : null))(r.archetypeId
        ?? (r.deckId ? snap.decksById.get(r.deckId)?.archetypeId ?? null : null)),
      placement: r.placement ?? null,
      date: t.date,
      kind: t.kind,
      playerCount: t.playerCount ?? null,
      topCut: t.topCut ?? null,
    })));

  const porMazo: ConvRow[] = [...byArchetype(placements).entries()]
    .map(([archetypeId, stats]) => {
      const a = agr.arquetipo(archetypeId);
      return {
        ...stats,
        id: archetypeId,
        label: a?.name ?? archetypeId,
        icon: <Sprites archetype={a} size="sm" />,
        // Una familia virtual (`fam:…`) no es un arquetipo filtrable.
        href: archetypeId.startsWith("fam:") ? undefined : `/estadisticas?arch=${archetypeId}`,
      };
    })
    .sort((a, b) =>
      (b.cutRate ?? -1) - (a.cutRate ?? -1)
      || (b.top4Rate ?? -1) - (a.top4Rate ?? -1)
      || b.entries - a.entries);

  const porJugador: ConvRow[] = [...byPlayer(placements).entries()]
    .map(([playerId, stats]) => {
      const p = snap.playersById.get(playerId);
      const mias = rows.filter((m) => m.tournamentId && m.playerAId === playerId);
      const ganadas = mias.filter((m) => outcome(m).winner === "a").length;
      const perdidas = mias.filter((m) => outcome(m).winner === "b").length;
      const empatadas = mias.length - ganadas - perdidas;
      return {
        ...stats,
        id: playerId,
        label: p?.name ?? "—",
        icon: <Avatar player={p} size="sm" />,
        href: `/perfil/${playerId}`,
        matchWins: ganadas,
        matchWinRate: mias.length ? (ganadas + empatadas / 2) / mias.length : null,
      };
    })
    .sort((a, b) =>
      (b.cutRate ?? -1) - (a.cutRate ?? -1)
      || (b.top4Rate ?? -1) - (a.top4Rate ?? -1)
      || b.entries - a.entries);

  const vistaRaw = Array.isArray(q.vista) ? q.vista[0] : q.vista;
  const vista: "mazos" | "jugadores" = vistaRaw === "jugadores" ? "jugadores" : "mazos";

  const vistaHref = (v: "mazos" | "jugadores") => {
    const p = new URLSearchParams(query);
    if (agrupar) p.set("agrupar", "1");
    if (fuente !== "local") p.set("fuente", fuente);
    if (orden === "asc") p.set("orden", "asc");
    if (v !== "mazos") p.set("vista", v);
    else p.delete("vista");
    const qs = p.toString();
    return qs ? `/estadisticas?${qs}` : "/estadisticas";
  };

  const evolucion = overTime(placements);

  /* v0.24 — la misma conversión mes a mes, también por jugador y por mazo
     (los 6 con más resultados en cada caso). */
  const serieConv = (id: string, name: string, color: string, rows: typeof placements): SerieConv => ({
    id, name, color,
    puntos: overTime(rows).map((p) => ({
      key: p.key, entries: p.entries, cutRate: p.cutRate, top8Rate: p.top8Rate, winRate: p.winRate,
    })),
  });
  const top6 = (clave: (r: (typeof placements)[number]) => string | null) => {
    const n = new Map<string, number>();
    for (const r of placements) { const k = clave(r); if (k) n.set(k, (n.get(k) ?? 0) + 1); }
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
  };
  const convGrupo: SerieConv[] = [serieConv("grupo", "Grupo", "var(--series-1)", placements)];
  const convJugadores: SerieConv[] = top6((r) => r.playerId).map((pid, i) =>
    serieConv(pid, snap.playersById.get(pid)?.name ?? "—",
      snap.playersById.get(pid)?.color || `var(--series-${(i % 7) + 1})`,
      placements.filter((r) => r.playerId === pid)));
  const convMazos: SerieConv[] = top6((r) => r.archetypeId).map((aid, i) =>
    serieConv(aid, agr.arquetipo(aid)?.name ?? aid, `var(--series-${(i % 7) + 1})`,
      placements.filter((r) => r.archetypeId === aid)));

  /** v0.21: la URL de ahora con la vista agrupada encendida o apagada. */
  const agruparHref = (on: boolean) => {
    const p = new URLSearchParams(query);
    if (fuente !== "local") p.set("fuente", fuente);
    if (orden === "asc") p.set("orden", "asc");
    if (vista !== "mazos") p.set("vista", vista);
    if (on) p.set("agrupar", "1");
    const qs = p.toString();
    return qs ? `/estadisticas?${qs}` : "/estadisticas";
  };

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
    if (agrupar) p.set("agrupar", "1");
    if (fuente !== "local") p.set("fuente", fuente);
    if (vista !== "mazos") p.set("vista", vista);
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
          ...(vista === "mazos" ? {} : { vista }),
          ...(orden === "asc" ? { orden: "asc" } : {}),
          ...(agrupar ? { agrupar: "1" } : {}),
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

      {fuente !== "local" && fuente !== "live" && (
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
                {focusRow.firstPlayed > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    Empezando: {focusRow.firstWins}V {focusRow.firstPlayed - focusRow.firstWins}D ({pct(focusRow.firstWins / focusRow.firstPlayed, 0)}) · Segundo: {focusRow.secondWins}V {focusRow.secondPlayed - focusRow.secondWins}D ({pct(focusRow.secondWins / focusRow.secondPlayed, 0)})
                  </p>
                )}
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
      {fuente !== "live" && (
        <div className="my-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Kpi tone="local" icon="database" label="Partidas" value={rows.length} note={`${totalGames} juegos`} />
          <Kpi tone="local" icon="deck" label="Arquetipos" value={archs.length} note={`${external} contra gente de fuera`} />
          <Kpi label="Gana quien empieza" icon="star" value={pct(ft.winRate, 1)} note={`${ft.n} juegos anotados`} highlight={(ft.winRate ?? 0) > 0.55} />
          <Kpi label="Formato" icon="results" value={`Bo3 ${rows.length ? Math.round(((bo[3] ?? 0) / rows.length) * 100) : 0}%`}
            note={`Bo1 ${bo[1] ?? 0} · Bo3 ${bo[3] ?? 0} · Bo5 ${bo[5] ?? 0}`} />
        </div>
      )}

      {hayFamilias && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="label">Arquetipos</span>
          <div className="seg text-xs">
            <Link href={agruparHref(false)} data-on={!agrupar}>Vista detallada</Link>
            <Link href={agruparHref(true)} data-on={agrupar}>Vista agrupada</Link>
          </div>
          <span className="text-[11px] text-muted">
            {agrupar ? "Variantes sumadas por su primer Pokémon (y las familias de Ajustes)." : "Cada variante por separado."}
          </span>
        </div>
      )}

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

      {/* v0.20 — fuera la gráfica «Victorias por arquetipo»: enseñaba exactamente
          lo mismo que las barras de «Rendimiento» de arriba (mismos mazos, mismo
          %V, mismo mínimo de 2 usos) y obligaba a cargar Recharts entero. */}

      {/* -------------------- rendimiento en torneos ------------------- */}
      {fuente !== "live" && placements.length > 0 && (
        <>
          <section className="card mt-4">
            <div className="card-head">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">
                  {vista === "jugadores" ? "Qué jugadores llegan al corte" : "Qué mazos llegan al corte"}
                </h2>
                <p className="text-xs text-muted">
                  {vista === "jugadores"
                    ? "De cada vez que vais a un torneo, cuántas entráis al top cut."
                    : "Esto mira torneos, no partidas: con qué mazo se entra en el top cut."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="seg text-xs">
                  <Link href={vistaHref("mazos")} data-on={vista === "mazos"}>
                    Mazos
                  </Link>
                  <Link href={vistaHref("jugadores")} data-on={vista === "jugadores"}>
                    Jugadores
                  </Link>
                </div>
                <SortToggle dir={orden} href={ordenHref} />
              </div>
            </div>
            {vista === "jugadores" ? (
              <ConversionTable
                rows={sortRows(porJugador, (r) => r.cutRate ?? r.top4Rate, orden)}
                matchColumns
                empty="Nadie tiene todavía un puesto apuntado en un torneo de este tipo."
              />
            ) : (
              <ConversionTable
                rows={sortRows(porMazo, (r) => r.cutRate ?? r.top8Rate, orden)}
                empty="Ningún resultado de torneo tiene el mazo apuntado todavía."
              />
            )}
            <p className="border-t border-line-soft px-4 py-3 text-[11px] text-muted">
              <b>%Cut</b> sale solo de los torneos que tenían top cut, así que un guion quiere
              decir «no había nada que convertir», no un cero.
              {vista === "jugadores" && " %V y V son de partidas de torneo, no de torneos enteros."}{" "}
              Usa los filtros de arriba para recortar por tipo de torneo o por fechas.
            </p>
          </section>

          {evolucion.length > 1 && (
            <section className="card mt-4 p-4">
              <h2 className="mb-1 text-lg font-bold">Conversión mes a mes</h2>
              <p className="mb-3 text-xs text-muted">
                Del grupo entero, de cada jugador o de cada mazo. Respeta los filtros de arriba
                (y la vista agrupada de arquetipos).
              </p>
              <ConversionEvolucionLazy grupo={convGrupo} jugadores={convJugadores} mazos={convMazos} />
            </section>
          )}
        </>
      )}

      {fuente !== "live" && (
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
      )}

      {fuente !== "live" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <section className="card">
            <div className="card-head"><h2 className="text-lg font-bold">Cómo acaban las series</h2></div>
            <div className="p-4">
              {shapes.length
                ? <Bars rows={shapes.map((s) => ({ label: <span className="font-mono text-[13px]">{s.key}</span>, value: s.n, right: String(s.n) }))} />
                : <p className="text-sm text-muted">Aún no hay series a más de un juego.</p>}
            </div>
          </section>

        <section className="card">`n          <div className="card-head"><h2 className="text-lg font-bold">Primer turno</h2></div>
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
        </section>`n
      </div>)}
      </>
      )}
      </>
      )}
    </>
  );
}




