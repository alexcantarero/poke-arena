import { GraficoTendenciaMeta } from "@/components/statistics/GraficoTendenciaMeta";
import { redirect } from "next/navigation";
import Link from "next/link";
import { loadSnapshot } from "@/lib/data";
import { CrucePanel } from "@/components/CrucePanel";
import { hrefConParam, parseCruce, valorCruce, type PartidaCruce } from "@/lib/cruces";
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
import { KpiCard } from "@/components/charts/KpiCard";
import { EnlaceArquetipo } from "@/components/EnlaceArquetipo";
import { filtroBaseParaEnlaces } from "@/lib/enlacesFiltro";
import { prepareDailyTrend, prepareHourlyDistribution } from "@/lib/chartData";
import { SortToggle, sortRows, type SortDir } from "@/components/statistics/SortToggle";
import { GlobalMeta } from "@/components/statistics/GlobalMeta";
import { tipoDePartida } from "@/lib/tiposPartida";
import { Suspense } from "react";
import { MetaOnline } from "@/components/statistics/MetaOnline";
import { ConversionEvolucionLazy, HourlyChartLazy, SeguimientoJugadoresLazy, TrendLineChartLazy } from "@/components/statistics/lazy";
import type { FilaSeguimiento } from "@/lib/seguimiento";
import type { SerieConv } from "@/components/statistics/ConversionEvolucion";
import { agruparFilas, crearAgrupador } from "@/lib/arquetipos";
import { ConversionTable, type ConvRow } from "@/components/ConversionTable";
import { byArchetype, byPlayer, overTime, type PlacementRow } from "@/lib/tournamentStats";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

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
  const lng = await getLang(); // v0.49

  const q = await searchParams;
  const snap = await loadSnapshot();
  // v0.50 — qué torneos son online, para separar online de presencial en las gráficas.
  const torneosOnline = new Set(snap.tournaments.filter((t) => t.kind === "online").map((t) => t.id));

  const fuenteRaw = Array.isArray(q.fuente) ? q.fuente[0] : q.fuente;
  const fuente: Fuente =
    fuenteRaw === "global" || fuenteRaw === "both" || fuenteRaw === "evento"
    || fuenteRaw === "regionales" || fuenteRaw === "city" || fuenteRaw === "live"
      ? fuenteRaw : "local";

  /* v0.120 — los mazos de fuera (Regionales y City Leagues) se ven en Top
     Decks; Estadísticas se queda con estadísticas y gráficos. */
  if (fuente === "regionales") redirect("/topdecks?fuente=presencial");
  if (fuente === "city") redirect("/topdecks?fuente=city");
  if (fuente === "evento") redirect("/estadisticas");

  /* La fuente manda sobre la página ENTERA, no solo sobre el primer bloque.
     Con «Meta online» no tiene sentido enseñar la matriz de emparejamientos
     ni la actividad por mes: esas salen de vuestras partidas y no existen
     fuera. */
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
  /* v0.59 — los filtros que tienen sentido para el meta online (Limitless): el
     formato y las fechas. «Desde» marca la ventana (entre 7 y 90 días); sin
     fechas, los 30 de siempre. Jugador o torneo no aplican: allí no estáis. */
  const diasMeta = filter.from
    ? Math.min(90, Math.max(7, Math.ceil((Date.now() - Date.parse(`${filter.from}T00:00:00Z`)) / 86400000)))
    : 30;
  const formatoMeta = filter.format === "expanded" ? "EXPANDED" : "STANDARD";

  /* v0.50 — una fila por jugador y partida, para el seguimiento: cada lado de
     una partida es una fila, con su resultado y su arquetipo. Respeta los
     filtros de la página porque sale de `rows`. Solo jugadores del grupo:
     el rival de fuera no tiene línea propia. */
  const filasSeguimiento: FilaSeguimiento[] = rows.flatMap((m) => {
    const o = outcome(m);
    const arq = archetypesOfMatch(m, snap.archIndex, snap.archById);
    const t = tipoDePartida(m, torneosOnline);
    const r = (lado: "a" | "b") => (o.winner === "tie" ? "t" : o.winner === lado ? "w" : "l") as "w" | "l" | "t";
    const out: FilaSeguimiento[] = [{ d: m.date, p: m.playerAId, t, r: r("a"), a: arq.a?.name ?? null }];
    if (m.playerBId) out.push({ d: m.date, p: m.playerBId, t, r: r("b"), a: arq.b?.name ?? null });
    return out;
  });
  const jugadoresSeguimiento = snap.players
    .filter((p) => filasSeguimiento.some((f) => f.p === p.id))
    .map((p) => ({ id: p.id, name: p.name, color: p.color }));

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
        firstPlayed: 0, firstWins: 0, secondPlayed: 0, secondWins: 0,
        winRate: st.played > 0 ? st.wins / st.played : 0,
      })).sort((a, b) => b.played - a.played);
  }

  /* v0.37 — los filtros ya puestos se arrastran a los enlaces de las
     gráficas: si estás mirando la temporada y la liga, pinchar en un
     arquetipo debe llevarte a ESAS partidas, no a todas las de la historia. */
  const queryFiltro = filtroBaseParaEnlaces(filter);

  const archs = agrupar
    ? agruparFilas(archsDetalle, raiz, agr.arquetipo)
    : archsDetalle;
  const ft = firstTurnStats(rows);
  // A nivel de serie. Es la única lectura posible de las rondas de torneo
  // apuntadas en modo rápido, que tienen turno y resultado pero no desglose.
  const fts = firstTurnSeriesStats(rows);
  const shapes = seriesShapes(rows);
  const months = activityByMonth(rows);
  const matrix = matchupMatrix(rows, snap.archIndex, 1, snap.archById, agrupar ? agr.raiz : undefined);
  const matrixArchById = new Map(snap.archById);
  if (agrupar) {
    for (const id of matrix.ids) {
      const archetype = agr.arquetipo(id);
      if (archetype) matrixArchById.set(id, archetype);
    }
  }
  /* v0.108 — la celda abierta de la matriz (`?cruce=arqA~arqB`): las partidas
     de ese emparejamiento, desde el lado del arquetipo de la fila. A nivel de
     SERIE (la matriz cuenta juego a juego cuando hay mazo por juego: puede
     haber más partidas aquí que en la cuenta de la celda o al revés). */
  const cruceArq = parseCruce(q.cruce);
  const hrefCruceArq = (a: string, b: string) => hrefConParam("/estadisticas", q, "cruce", valorCruce(a, b), "cruce");
  const cerrarCruceArq = hrefConParam("/estadisticas", q, "cruce", null, "matriz");
  const filasCruceArq: PartidaCruce[] = [];
  if (cruceArq) {
    const [fa, fb] = cruceArq;
    for (const m of rows) {
      if (!isPlayed(m)) continue;
      const { a: A, b: B } = archetypesOfMatch(m, snap.archIndex, snap.archById);
      if (!A || !B) continue;
      const ra = raiz(A.id), rb = raiz(B.id);
      const desdeA = ra === fa && rb === fb;
      const desdeB = ra === fb && rb === fa;
      if (!desdeA && !desdeB) continue;
      const o = outcome(m);
      const lado = desdeA ? "a" : "b";
      const resultado = m.games.length || o.declared ? (o.winner === "tie" ? "t" : o.winner === lado ? "w" : "l") : null;
      const pa = snap.playersById.get(m.playerAId)?.name ?? "?";
      const pb = m.playerBId ? snap.playersById.get(m.playerBId)?.name ?? "?" : m.opponentName || tr(lng, "cruce.rival");
      const t = m.tournamentId ? snap.toursById.get(m.tournamentId) : undefined;
      filasCruceArq.push({
        id: m.id, fecha: m.date, resultado: resultado as PartidaCruce["resultado"],
        marcador: m.games.length ? (desdeA ? `${o.ga}–${o.gb}` : `${o.gb}–${o.ga}`) : "",
        contexto: desdeA ? `${pa} vs ${pb}` : `${pb} vs ${pa}`,
        detalle: t ? `${t.name}${m.round ? ` · R${m.round}` : ""}` : undefined,
        href: t ? `/torneos/${t.id}` : `/partidas/${m.id}`,
      });
    }
  }
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
        title={tr(lng, "x.a580d598")}
        sub={
          isFiltered(filter)
            ? `${rows.length} de ${all.length} partidas · ${resumen}`
            // v0.34 — eran tres líneas en el móvil, por encima de todo lo
            // que se viene a mirar. El matiz de la matriz se explica donde
            // está la matriz, que es donde importa.
            : `${all.length} partidas registradas.`
        }
      />

      <SourceTabs current={fuente} query={query} />

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

      {/* v0.80 — «Meta online: cómo rinde cada mazo» y sus emparejamientos son
          datos de Limitless, no vuestros: van en la pestaña Online. Antes salían
          en «Jugadores de la app», mezclados con lo vuestro. */}
      {fuente === "global" && (
        <>
          <h2 className="mt-8 mb-3 font-display text-sm font-bold uppercase tracking-[0.14em] text-muted">{tr(lng, "est.b.meta")}</h2>
          <Suspense fallback={<div className="card h-96 animate-pulse" aria-hidden="true" />}>
            <MetaOnline dias={diasMeta} formato={formatoMeta} />
          </Suspense>
          <p className="mt-2 text-xs text-muted">{tr(lng, "est.notaFiltrosMeta")}</p>
          {/* v0.121 — cómo se mueve el meta: los 8 más jugados, mes a mes. */}
          <h2 className="mt-8 mb-3 font-display text-sm font-bold uppercase tracking-[0.14em] text-muted">{tr(lng, "v121.tendSeccion")}</h2>
          <Suspense fallback={<div className="card h-80 animate-pulse" aria-hidden="true" />}>
            <GraficoTendenciaMeta formato={formatoMeta} lang={lng} />
          </Suspense>
        </>
      )}

      {!conLocal && (
        <p className="card mb-4 p-3 text-xs text-ink-2">
          {tr(lng, "x.ec96e036")} <b>{tr(lng, "x.f164a10e")}</b>{tr(lng, "x.30f8ab5a")} <b>{tr(lng, "x.a48666d6")}</b> {tr(lng, "x.09a7e130")}
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
      {/* v0.52 — los bloques, en orden: meta, vuestro metagame, torneos, jugadores,
          partidas y actividad. Antes la matriz iba a mitad y «cómo acaban las series»
          al final, separada de la actividad que iba arriba. */}
      {/* v0.59 — los NÚMEROS GRANDES primero, y después los gráficos por orden. */}
      <h2 className="mt-6 mb-1 font-display text-sm font-bold uppercase tracking-[0.14em] text-muted">{tr(lng, "est.b.numeros")}</h2>
      {fuente !== "live" && (
          <div className="mb-2 mt-2 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <KpiCard label={tr(lng, "x.64f94394")} value={rows.length} sub={`${totalGames} juegos disputados`} color="blue" />
            <KpiCard label={tr(lng, "x.ba25296c")} value={archs.length} sub={`${external} contra rivales externos`} color="purple" />
            <KpiCard
              label={tr(lng, "x.6835d550")}
              value={pct(ft.winRate, 1)}
              sub={`${ft.n} juegos (gana quien empieza)`}
              color={(ft.winRate ?? 0) > 0.55 ? "green" : "blue"}
            />
            <KpiCard
              label={tr(lng, "x.621f8131")}
              value={`Bo3 ${rows.length ? Math.round(((bo[3] ?? 0) / rows.length) * 100) : 0}%`}
              sub={`Bo1: ${bo[1] ?? 0} · Bo3: ${bo[3] ?? 0} · Bo5: ${bo[5] ?? 0}`}
              color="yellow"
            />
          </div>
      )}
      <h2 className="mt-8 mb-1 font-display text-sm font-bold uppercase tracking-[0.14em] text-muted">{tr(lng, "est.b.vuestro")}</h2>
      <p className="mb-3 text-xs text-muted">{tr(lng, "est.porJuegos")}</p>
      {hayFamilias && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="label">{tr(lng, "x.ba25296c")}</span>
          <div className="seg text-xs">
            <Link href={agruparHref(false)} data-on={!agrupar}>{tr(lng, "x.8ff263c4")}</Link>
            <Link href={agruparHref(true)} data-on={agrupar}>{tr(lng, "x.285c3b48")}</Link>
          </div>
          <span className="text-[11px] text-muted">
            {agrupar ? "Variantes sumadas por su primer Pokémon (y las familias de Ajustes)." : tr(lng, "x.e5a3a605")}
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="text-lg font-bold">{tr(lng, "x.8a9e7584")}</h2>
              <p className="text-xs text-muted">{tr(lng, "x.6cf45b62")}</p>
            </div>
            <SortToggle dir={orden} href={ordenHref} />
          </div>
          <div className="p-4">
            {archs.length ? (
              <Bars rows={sortRows(archs, (a) => a.played, orden).slice(0, 10).map((a) => ({
                label: <EnlaceArquetipo arquetipo={a.archetype} filtroBase={queryFiltro} />,
                value: a.played,
                right: `${a.played} · ${pct(a.winRate, 0)}`,
              }))} />
            ) : <p className="text-sm text-muted">{tr(lng, "x.06acf61f")}</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{tr(lng, "x.d2c4cbec")}</h2>
              <p className="text-xs text-muted">{tr(lng, "x.d15c58da")}</p>
            </div>
            <SortToggle dir={orden} href={ordenHref} />
          </div>
          <div className="p-4">
            {archs.filter((a) => a.played >= 2).length ? (
              <Bars max={100} rows={sortRows(archs.filter((a) => a.played >= 2), (a) => a.winRate, orden).slice(0, 10).map((a) => ({
                label: <EnlaceArquetipo arquetipo={a.archetype} filtroBase={queryFiltro} />,
                value: (a.winRate ?? 0) * 100,
                right: `${pct(a.winRate, 0)} (${a.played})`,
                color: wrColor(a.winRate),
              }))} />
            ) : <p className="text-sm text-muted">{tr(lng, "x.e1f51531")}</p>}
          </div>
        </section>
      </div>

      {fuente !== "live" && (
        <section id="matriz" className="card mt-4 scroll-mt-20 overflow-hidden">
          <div className="card-head">
            <h2 className="text-lg font-bold">{tr(lng, "x.f0c24bc6")}</h2>
            <span className="text-xs text-muted">{tr(lng, "x.41b20a92")}</span>
          </div>
          <div className="p-4">
            <Matrix data={matrix} byId={matrixArchById} hrefCelda={hrefCruceArq} activo={cruceArq} />
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-win" />{tr(lng, "x.8acc75fa")}</span>
              <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-series-1" />{tr(lng, "x.84ea39ca")}</span>
              <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-loss" />{tr(lng, "x.c8d5d524")}</span>
              <span>{tr(lng, "x.341ee503")}</span>
              <span className="font-semibold text-info">{tr(lng, "cruce.pista")}</span>
            </div>
          </div>
          {cruceArq && (
            <CrucePanel
              titulo={trf(lng, "cruce.tituloArq", { a: snap.archById.get(cruceArq[0])?.name ?? agr.arquetipo(cruceArq[0])?.name ?? "?", b: snap.archById.get(cruceArq[1])?.name ?? agr.arquetipo(cruceArq[1])?.name ?? "?" })}
              filas={filasCruceArq} cerrar={cerrarCruceArq} />
          )}
        </section>
      )}
      <h2 className="mt-8 mb-3 font-display text-sm font-bold uppercase tracking-[0.14em] text-muted">{tr(lng, "est.b.torneos")}</h2>
      {/* -------------------- rendimiento en torneos ------------------- */}
      {fuente !== "live" && placements.length > 0 && (
        <>
          <section className="card mt-4">
            <div className="card-head">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">
                  {vista === "jugadores" ? "Qué jugadores llegan al corte" : tr(lng, "x.b8c88fe2")}
                </h2>
                <p className="text-xs text-muted">
                  {vista === "jugadores"
                    ? tr(lng, "x.f359dca7")
                    : tr(lng, "x.24eb35af")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="seg text-xs">
                  <Link href={vistaHref("mazos")} data-on={vista === "mazos"}>
                    {tr(lng, "x.78f2cee5")}
                  </Link>
                  <Link href={vistaHref("jugadores")} data-on={vista === "jugadores"}>
                    {tr(lng, "x.b5291b8d")}
                  </Link>
                </div>
                <SortToggle dir={orden} href={ordenHref} />
              </div>
            </div>
            {vista === "jugadores" ? (
              <ConversionTable
                visibles={3}
                rows={sortRows(porJugador, (r) => r.cutRate ?? r.top4Rate, orden)}
                matchColumns
                empty={tr(lng, "x.cb5d9f0a")}
              />
            ) : (
              <ConversionTable
                visibles={3}
                rows={sortRows(porMazo, (r) => r.cutRate ?? r.top8Rate, orden)}
                empty={tr(lng, "x.fab62873")}
              />
            )}
            <p className="border-t border-line-soft px-4 py-3 text-[11px] text-muted">
              <b>{tr(lng, "x.5b766ead")}</b> sale solo de los torneos que tenían top cut, así que un guion quiere
              decir «no había nada que convertir», no un cero.
              {vista === "jugadores" && " %V y V son de partidas de torneo, no de torneos enteros."}{" "}
              Usa los filtros de arriba para recortar por tipo de torneo o por fechas.
            </p>
          </section>

          {evolucion.length > 1 && (
            <section className="card mt-4 p-4">
              <h2 className="mb-1 text-lg font-bold">{tr(lng, "x.c7f03180")}</h2>
              <p className="mb-3 text-xs text-muted">
                {tr(lng, "x.094b4221")}
              </p>
              <ConversionEvolucionLazy grupo={convGrupo} jugadores={convJugadores} mazos={convMazos} />
            </section>
          )}
        </>
      )}
      <h2 className="mt-8 mb-3 font-display text-sm font-bold uppercase tracking-[0.14em] text-muted">{tr(lng, "est.b.jugadores")}</h2>
      {fuente !== "live" && rows.length > 0 && (
        <div>
                <SeguimientoJugadoresLazy filas={filasSeguimiento} jugadores={jugadoresSeguimiento} />
        </div>
      )}
      <h2 className="mt-8 mb-3 font-display text-sm font-bold uppercase tracking-[0.14em] text-muted">{tr(lng, "est.b.partidas")}</h2>
      {fuente !== "live" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <section className="card">
            <div className="card-head"><h2 className="text-lg font-bold">{tr(lng, "x.96337a0c")}</h2></div>
            <div className="p-4">
              {shapes.length
                ? <Bars rows={shapes.map((s) => ({ label: <span className="font-mono text-[13px]">{s.key}</span>, value: s.n, right: String(s.n) }))} />
                : <p className="text-sm text-muted">{tr(lng, "x.5c6132c5")}</p>}
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2 className="text-lg font-bold">{tr(lng, "x.6835d550")}</h2></div>
            <div className="p-4">
              {ft.n > 0 && ft.winRate != null ? (
                <>
                  <div className="font-display text-4xl font-extrabold tabular" style={{ color: wrColor(ft.winRate) }}>
                    {pct(ft.winRate, 1)}
                  </div>
                  <p className="mt-1 mb-3 text-sm text-muted">
                    De los {ft.n} juegos con turno anotado, los gana quien empieza.
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
                  {tr(lng, "x.8d67cedb")}
                </p>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2 className="text-lg font-bold">{tr(lng, "x.399313c0")}</h2></div>
            <div className="p-4">
              {months.length
                ? <Bars rows={months.map((x) => {
                    const [y, m] = x.key.split("-");
                    return { label: <span className="capitalize">{MONTHS[Number(m) - 1]} {y.slice(2)}</span>, value: x.n, right: String(x.n) };
                  })} />
                : <p className="text-sm text-muted">{tr(lng, "x.197d9ce5")}</p>}
            </div>
          </section>
        </div>
      )}
      {fuente !== "live" && rows.length > 0 && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <TrendLineChartLazy
                data={prepareDailyTrend(rows, 30)}
                title={tr(lng, "x.06d3e0cc")}
                subtitle={tr(lng, "x.f1628585")}
                valueLabel={tr(lng, "x.64f94394")}
              />
              <div className="min-w-0">
                {/* v0.50 — cuatro tipos con su color; ver lib/tiposPartida. */}
                <HourlyChartLazy
                  data={prepareHourlyDistribution(rows, (m) => tipoDePartida(m, torneosOnline))}
                />
              </div>
        </div>
      )}
      </>
      )}
    </>
  );
}


