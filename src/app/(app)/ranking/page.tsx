import Link from "next/link";
import type { ReactNode } from "react";
import { compPlayers, eloChartData, ladderChartData, loadSnapshot, playerCp } from "@/lib/data";
import type { SerieLadder } from "@/components/statistics/LadderChart";
import { LadderChartLazy } from "@/components/statistics/lazy";
import { seriesLadder } from "@/lib/ladderSeries";
import { RankBadge } from "@/components/Ladder";
import {
  archetypeStats, isPlayed, outcome, playerRecord, recordOf, roundResult, roundsOf, standings,
} from "@/lib/stats";
import { awardsCp, computeCp, cpKindOf, getSeason, seasonOfDate, type CpResultInput } from "@/lib/cp";
import { estadoMundial, porPuestoZona } from "@/lib/mundial";
import { FECHAS_RANKING, dentroDeRango, filtroAQuery, parseFiltroRanking, rangoDeFechas } from "@/lib/rankingFiltro";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { CALENDAR_KINDS } from "@/lib/calendar";
import { fechaCorta, todayISO } from "@/lib/format";
import { getLang } from "@/lib/lang";
import { tr, trf } from "@/lib/i18n";
import { FavStar } from "@/components/FavStar";
import { rankingTorneos, type EntradaTorneo } from "@/lib/rankingTorneos";
import { claveRonda, matrizH2H, type Encuentro } from "@/lib/h2h";
import { TournamentRankingTable, type TourRankRow } from "@/components/TournamentRankingTable";
import { RankingTodoTable, type TodoRow } from "@/components/RankingTodoTable";
import { H2HHeatmap } from "@/components/H2HHeatmap";
import { Avatar, PageHead, PlayerTag, Sparkline } from "@/components/ui";
import { RankingTable, type RankRow } from "@/components/RankingTable";
import { LadderTable } from "@/components/Ladder";
import { ladderStandings } from "@/lib/rank";
import { readSession } from "@/lib/auth";
import type { MatchFull, TournamentFull } from "@/lib/types";

export const metadata = { title: "Ranking" };

/* =========================================================================
   El ranking, v0.15.1.

   LOS FILTROS, REHECHOS
   ---------------------
   Antes había dos filas de chips que no se explicaban: arriba las
   competiciones (y como hay una competición que se llama «Amistosos», salía
   ahí) y debajo el ámbito, con otro «Amistosos». Dos botones con el mismo
   nombre que hacían cosas distintas.

   Ahora es una sola pregunta, «¿Qué partidas cuentan?», con cuatro
   respuestas y una frase debajo que dice exactamente qué entra:

     · Todo       — liga, torneos y amistosos, en UNA tabla.
     · Liga       — competiciones internas. Debajo, cuál (todas o una).
     · Torneos    — torneos de fuera. Debajo, dónde (presencial, online o los dos).
     · Sueltos    — partidas sin competición ni torneo.

   Y, aparte, la temporada: todas o solo la actual. El selector de
   competición solo sale en «Liga» y el de presencial/online solo en
   «Torneos»: en las demás vistas no significan nada.

   Las URL viejas (`?ambito=onsite`, `?ambito=online`) siguen funcionando:
   se leen como Torneos + dónde.
   ========================================================================= */

type Vista = "all" | "league" | "tournament" | "casual";
type Donde = "both" | "onsite" | "online";

const VISTAS: Array<{ v: Vista; label: string; hint: string }> = [
  { v: "all", label: "Todo", hint: "Todas tus partidas —liga, torneos y amistosos— sumadas en una sola tabla, con tus torneos y CP al lado." },
  { v: "league", label: "Liga", hint: "Solo las partidas de competiciones internas, entre gente del grupo. Con resistencia y diferencia de juegos." },
  { v: "tournament", label: "Torneos", hint: "Solo los torneos de fuera: rondas, conversión al top cut, puesto medio y CP." },
  { v: "casual", label: "Amistosos", hint: "Partidas que no son de ninguna competición ni torneo: los amistosos." },
];

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lng = await getLang(); // v0.49

  const q = await searchParams;
  /* v0.19 — todos los filtros en un sitio (`lib/rankingFiltro.ts`). */
  const filtro = parseFiltroRanking(q);
  const rango = rangoDeFechas(filtro, todayISO());
  // v0.20: los datos de la gráfica del ladder se piden a la vez que el resto,
  // no después (antes era un viaje más a la base, en cadena).
  const [snap, session, lang, datosLadder] = await Promise.all([
    loadSnapshot(), readSession(), getLang(), ladderChartData(),
  ]);

  /* v0.17 — «¿A quién?»: todos, o solo los que sigues (más tú). Recorta las
     tablas, el cara a cara y el camino al Mundial; no cambia los cálculos
     (el Elo y los puestos siguen siendo los de toda la liga). */
  const meId = session?.playerId ?? null;
  const misFavs = meId ? snap.favoritePlayers.get(meId) ?? new Set<string>() : new Set<string>();
  const soloFavs = filtro.fav && meId != null;
  const visible = (pid: string) => !soloFavs || pid === meId || misFavs.has(pid);
  const played = snap.matches.filter(isPlayed);
  const cpSeason = snap.config.cpSeason;

  /* --- qué se mira --- */
  const vista: Vista = filtro.vista;
  const donde: Donde = filtro.donde;
  const tipo = filtro.tipo;
  const soloTemporada = filtro.fecha === "temporada";
  const competition = filtro.comp ? snap.compsById.get(filtro.comp) ?? null : null;

  const enFechas = (fecha: string) =>
    (!soloTemporada || seasonOfDate(fecha) === cpSeason) && dentroDeRango(fecha, rango);
  const tourOk = (t: TournamentFull | undefined) =>
    Boolean(t)
    && (donde === "both" || (donde === "online" ? t!.scope === "online" : t!.scope !== "online"))
    && (!tipo || t!.kind === tipo)
    && (!soloTemporada || (t!.season ?? seasonOfDate(t!.date)) === cpSeason)
    && dentroDeRango(t!.date, rango);

  /** Las partidas que entran con la vista elegida. */
  const scoped: MatchFull[] = played.filter((m) => {
    if (!enFechas(m.date)) return false;
    if (vista === "league") return m.competitionId != null && (!competition || m.competitionId === competition.id);
    if (vista === "casual") return !m.competitionId && !m.tournamentId;
    if (vista === "tournament") return m.tournamentId != null && tourOk(snap.toursById.get(m.tournamentId));
    // «Todo» con un tipo o un «dónde» puesto: esos filtros son de torneo, así
    // que solo quedan las rondas de los torneos que cumplen.
    if (tipo || donde !== "both") return m.tournamentId != null && tourOk(snap.toursById.get(m.tournamentId));
    return true;
  });

  /* --- torneos: una entrada por persona y torneo --- */
  const toursEnVista = vista === "all" || vista === "tournament"
    ? snap.tournaments.filter((t) => tourOk(t))
    : [];
  const entradas: EntradaTorneo[] = [];
  /** Resultados tecleados SIN rondas: en «Todo» su récord se suma aparte. */
  const recordSinRondas = new Map<string, { wins: number; losses: number; ties: number }>();
  const cpRows = new Map<string, CpResultInput[]>();
  for (const t of toursEnVista) {
    const quien = new Set<string>(t.results.map((x) => x.playerId));
    for (const m of snap.matches) if (m.tournamentId === t.id && m.playerBId === null) quien.add(m.playerAId);
    for (const pid of quien) {
      if (!snap.playersById.has(pid)) continue;
      const res = t.results.find((x) => x.playerId === pid);
      const rondas = roundsOf(snap.matches, t.id, pid);
      const rec = rondas.length ? recordOf(rondas) : null;
      const w = rec ? rec.wins : res?.wins ?? 0;
      const l = rec ? rec.losses : res?.losses ?? 0;
      const e = rec ? rec.ties : res?.ties ?? 0;
      entradas.push({
        playerId: pid, tournamentId: t.id, placement: res?.placement ?? null, topCut: t.topCut ?? null,
        wins: w, losses: l, ties: e, dropped: res?.dropped ?? false,
      });
      if (!rec && res) {
        const acc = recordSinRondas.get(pid) ?? { wins: 0, losses: 0, ties: 0 };
        acc.wins += w; acc.losses += l; acc.ties += e;
        recordSinRondas.set(pid, acc);
      }
      const kind = cpKindOf(t);
      if (res && (t.season ?? seasonOfDate(t.date)) === cpSeason && awardsCp(cpSeason, kind)) {
        const list = cpRows.get(pid) ?? [];
        list.push({
          id: res.id, kind, date: t.date, placement: res.placement, playerCount: t.playerCount,
          cpEarned: res.cpEarned, cpManual: res.cpManual, tournamentName: t.name,
        });
        cpRows.set(pid, list);
      }
    }
  }
  const cpDe = (pid: string) => computeCp(cpSeason, cpRows.get(pid) ?? []).total;
  const porTorneo = new Map(rankingTorneos(entradas, cpDe).map((f) => [f.playerId, f]));

  /* --- las tres tablas posibles; solo se pinta una --- */
  let nJugadoresRanking = 0;
  const avatarDe = (pid: string) => {
    const p = snap.playersById.get(pid);
    return { avatar: <Avatar player={p} size="md" />, avatarSm: <Avatar player={p} size="sm" />, name: p?.name ?? "—" };
  };

  let tabla: ReactNode;
  if (vista === "all") {
    const filas: TodoRow[] = snap.activePlayerIds.filter(visible).map((pid) => {
      const r = playerRecord(scoped, pid);
      const extra = recordSinRondas.get(pid) ?? { wins: 0, losses: 0, ties: 0 };
      const wins = r.wins + extra.wins, losses = r.losses + extra.losses, ties = r.ties + extra.ties;
      const playedN = wins + losses + ties;
      const tt = porTorneo.get(pid);
      return {
        playerId: pid, ...avatarDe(pid),
        points: wins * snap.config.ptsWin + ties * snap.config.ptsTie + losses * snap.config.ptsLoss,
        played: playedN, wins, losses, ties,
        winRate: playedN ? (wins + ties * 0.5) / playedN : null,
        elo: snap.elo.rating[pid] ?? snap.config.eloStart,
        cp: playerCp(snap, pid).total,
        torneos: tt?.torneos ?? 0, conCorte: tt?.conCorte ?? 0, cortes: tt?.cortes ?? 0,
        cutRate: tt?.cutRate ?? null, avgPlacement: tt?.avgPlacement ?? null, drops: tt?.drops ?? 0,
      };
    });
    nJugadoresRanking = filas.length;
    tabla = <RankingTodoTable rows={filas} />;
  } else if (vista === "tournament") {
    const filas: TourRankRow[] = [...porTorneo.values()]
      .filter((f) => visible(f.playerId))
      .map((f) => ({ ...f, ...avatarDe(f.playerId) }));
    nJugadoresRanking = filas.length;
    tabla = (
      <>
        <TournamentRankingTable rows={filas} cpLabel={`CP ${cpSeason}`} />
        {donde === "online" && (
          <p className="mt-2 text-xs text-muted">{tr(lng, "x.6ae18d5c")}</p>
        )}
      </>
    );
  } else {
    const ids = competition ? compPlayers(snap, competition.id) : snap.activePlayerIds;
    const rows: RankRow[] = standings(scoped, ids, snap.elo.rating, snap.config)
      .filter((r) => visible(r.playerId))
      .map((r) => {
      const own = archetypeStats(
        scoped.filter((m) => m.playerAId === r.playerId || m.playerBId === r.playerId),
        snap.archIndex, r.playerId, snap.archById,
      );
      return {
        playerId: r.playerId, ...avatarDe(r.playerId),
        played: r.played, wins: r.wins, ties: r.ties, losses: r.losses,
        points: r.points, winRate: r.winRate, resistance: r.resistance,
        diff: r.diff, elo: r.elo, cp: playerCp(snap, r.playerId).total,
        streakKind: r.streak.kind, streakN: r.streak.n,
        topArchId: own[0]?.archetype?.id ?? null, topArchName: own[0]?.archetype?.name ?? null,
      };
    });
    nJugadoresRanking = rows.length;
    tabla = <RankingTable rows={rows} />;
  }

  /* --- enfrentamientos directos, con las mismas partidas --- */
  const encuentros: Encuentro[] = [];
  for (const m of scoped) {
    if (m.playerBId) {
      encuentros.push({ clave: `m:${m.id}`, a: m.playerAId, b: m.playerBId, resultado: outcome(m).winner });
    } else if (m.tournamentId && m.opponentPlayerId) {
      const res = roundResult(m);
      encuentros.push({
        clave: claveRonda(m.tournamentId, m.round, m.playerAId, m.opponentPlayerId),
        a: m.playerAId, b: m.opponentPlayerId,
        resultado: res === "w" ? "a" : res === "l" ? "b" : res === "d" ? "tie" : null,
      });
    }
  }
  const h2h = matrizH2H(encuentros);
  const h2hJugadores = snap.players
    .filter((p) => visible(p.id))
    .map((p) => ({ id: p.id, name: p.name, avatar: <Avatar player={p} size="sm" /> }));

  /* v0.17 — camino al Mundial: puesto en el leaderboard oficial de la zona,
     apuntado a mano. La línea es el Top N de invitaciones de la temporada. */
  const plazas = getSeason(cpSeason).invites[snap.config.ratingZone] ?? null;
  const zona = snap.players
    .filter((p) => p.active && visible(p.id))
    .sort(porPuestoZona);
  const conPuesto = zona.filter((p) => p.rankEurope != null).length;
  // v0.53 — la actualización más reciente de un puesto, para la cabecera.
  const ultimaZona = zona.reduce<string | null>((max, p) => {
    if (!p.rankZoneUpdatedAt) return max;
    const iso = new Date(p.rankZoneUpdatedAt).toISOString();
    return !max || iso > max ? iso : max;
  }, null);

  const ladder = ladderStandings(snap.players.filter((p) => p.active));
  /* v0.18 — el líder del ladder y su evolución desde el último reset. */
  const lider = ladder[0]?.player ?? null;
  /* v0.19 — gráfica de evolución: todos los que tienen historial, con hueco en
     cada reset. Solo viaja id, nombre, color y números al cliente. */
  const porSerie = seriesLadder(datosLadder.entries, datosLadder.resets);
  const seriesGrafica: SerieLadder[] = snap.players
    .filter((p) => p.active && porSerie.has(p.id))
    .map((p, i) => ({
      id: p.id,
      name: p.name,
      color: p.color || `var(--series-${(i % 7) + 1})`,
      actual: p.ladderElo,
      puntos: porSerie.get(p.id)!,
    }));
  const resetsGrafica = datosLadder.resets.map((r) => new Date(r).getTime());
  const eloGrafica = eloChartData(snap);

  /** La URL de ahora con cambios. `null` quita el parámetro. */
  const hrefCon = (cambios: Record<string, string | null>) => {
    const base: Record<string, string | null> = {
      ...Object.fromEntries(filtroAQuery(filtro).entries()),
      ...cambios,
    };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(base)) if (v) sp.set(k, v);
    const qs = sp.toString();
    return qs ? `/ranking?${qs}` : "/ranking";
  };
  const vistaInfo = VISTAS.find((x) => x.v === vista)!;
  const nTorneos = new Set(entradas.map((e) => e.tournamentId)).size;
  const filtrosActivos = filtroAQuery(filtro).size;

  /* v0.19 — tipos de torneo que de verdad hay, para el desplegable. */
  const tiposPresentes = [...new Set(snap.tournaments.map((t) => t.kind))]
    .filter((k) => CALENDAR_KINDS[k])
    .sort((x, y) => Object.keys(CALENDAR_KINDS).indexOf(x) - Object.keys(CALENDAR_KINDS).indexOf(y));
  const fechaLabel = FECHAS_RANKING.find((x) => x.v === filtro.fecha)?.label ?? "";

  return (
    <>
      <PageHead
        title={tr(lng, "x.3937bb62")}
        sub={
          <>
            {snap.config.ptsWin} puntos por victoria y {snap.config.ptsTie} por empate. El <b>Elo</b> {tr(lng, "x.1c36bc40")}
          </>
        }
        // v0.55 — las reglas, donde surge la duda.
        actions={<Link className="btn btn-ghost btn-sm" href="/reglas">{tr(lng, "reg.enlaceRanking")}</Link>}
      />

      <section className="mb-4 overflow-hidden rounded-2xl border border-brand/25 bg-[linear-gradient(120deg,color-mix(in_oklab,var(--brand-soft)_70%,var(--surface)),var(--surface)_65%)] shadow-sm">
        <div className="grid grid-cols-3 divide-x divide-brand/15">
          {[
            { label: tr(lng, "x.64f94394"), value: scoped.length, accent: "text-info", bar: "bg-info" },
            { label: tr(lng, "x.b5291b8d"), value: nJugadoresRanking, accent: "text-brand", bar: "bg-brand" },
            { label: tr(lng, "x.f02a0f3c"), value: nTorneos, accent: "text-win", bar: "bg-win" },
          ].map((item) => (
            <div key={item.label} className="relative min-w-0 px-4 py-3.5 sm:px-5">
              <span className={`block font-display text-2xl font-black leading-none tabular ${item.accent}`}>{item.value}</span>
              <span className="mt-1 block text-[11px] font-bold uppercase tracking-wider text-muted">{item.label}</span>
              <span className={`absolute inset-x-0 bottom-0 h-0.5 ${item.bar}`} />
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------ filtros ------------------------------ */}
      <details className="card group mb-4">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3.5 outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info [&::-webkit-details-marker]:hidden">
          <span className="grid size-9 flex-none place-items-center rounded-xl bg-brand-soft font-display text-lg font-black text-brand" aria-hidden="true">≡</span>
          <span className="min-w-0 flex-1">
            <span className="block font-display font-bold text-ink">{tr(lng, "x.dbcf4f73")}</span>
            <span className="block text-xs text-muted">
              {filtrosActivos ? `${filtrosActivos} ${filtrosActivos === 1 ? "filtro activo" : tr(lng, "x.a1bcd9b1")}` : tr(lng, "x.3595284c")}
            </span>
          </span>
          <span className="chip flex-none">{filtrosActivos ? filtrosActivos : tr(lng, "x.bf763df7")}</span>
          <span className="flex-none text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true">⌄</span>
        </summary>
      <AutoSubmitForm action="/ranking" className="flex flex-col gap-3 border-t border-line-soft p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="label">{tr(lng, "x.64f94394")}</span>
            <select className="input" name="ambito" defaultValue={vista === "all" ? "" : vista}>
              {VISTAS.map((x) => <option key={x.v} value={x.v === "all" ? "" : x.v}>{x.label}</option>)}
            </select>
          </label>

          {vista === "league" ? (
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="label">{tr(lng, "x.c28ef3fd")}</span>
              <select className="input" name="comp" defaultValue={competition?.id ?? ""}>
                <option value="">{tr(lng, "x.8a3c3440")}</option>
                {snap.competitions.filter((c) => c.kind !== "casual").map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          ) : vista !== "casual" ? (
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="label">{tr(lng, "x.bd5fd7b1")}</span>
              <select className="input" name="tipo" defaultValue={tipo}>
                <option value="">{tr(lng, "x.71577ee2")}</option>
                {tiposPresentes.map((k) => <option key={k} value={k}>{CALENDAR_KINDS[k].label}</option>)}
              </select>
            </label>
          ) : null}

          {(vista === "all" || vista === "tournament") && (
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="label">{tr(lng, "x.7c72f46c")}</span>
              <select className="input" name="donde" defaultValue={donde === "both" ? "" : donde}>
                <option value="">{tr(lng, "x.3a820563")}</option>
                <option value="onsite">{tr(lng, "x.4bb0ddec")}</option>
                <option value="online">Online</option>
              </select>
            </label>
          )}

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="label">{tr(lng, "x.3c0af1b3")}</span>
            <select className="input" name="fecha" defaultValue={filtro.fecha}>
              {FECHAS_RANKING.map((x) => (
                <option key={x.v} value={x.v}>{x.v === "temporada" ? snap.config.season : x.label}</option>
              ))}
            </select>
          </label>

          {filtro.fecha === "rango" && (
            <>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="label">{tr(lng, "x.966c7c4c")}</span>
                <input className="input" type="date" name="desde" defaultValue={filtro.desde} />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="label">{tr(lng, "x.ccdaad85")}</span>
                <input className="input" type="date" name="hasta" defaultValue={filtro.hasta} />
              </label>
            </>
          )}

          {meId && (
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="label">{tr(lang, "fav.who")}</span>
              <select className="input" name="fav" defaultValue={soloFavs ? "1" : ""}>
                <option value="">{tr(lang, "fav.everyone")}</option>
                <option value="1">★ {tr(lang, "fav.mine")} ({misFavs.size})</option>
              </select>
            </label>
          )}
        </div>

        <p className="text-xs text-muted">
          {vistaInfo.hint}
          {soloFavs && misFavs.size === 0 ? <> {tr(lang, "fav.empty")}</> : null}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3 text-xs text-ink-2">
          <p>
            {scoped.length === 0 && !nTorneos
              ? tr(lng, "x.18204bb1")
              : <>{tr(lng, "x.6fad1090")} <b className="tabular">{scoped.length}</b> partida{scoped.length === 1 ? "" : "s"}
                {vista === "all" || vista === "tournament" ? <> y <b className="tabular">{nTorneos}</b> torneo{nTorneos === 1 ? "" : "s"}</> : null}
                {competition ? <> {tr(lng, "x.600ccd1b")} <b>{competition.name}</b></> : null}
                {tipo ? <> · <b>{CALENDAR_KINDS[tipo]?.label ?? tipo}</b></> : null}
                {filtro.fecha ? <> · {filtro.fecha === "temporada" ? snap.config.season : fechaLabel.toLowerCase()}</> : null}.</>}
          </p>
          {filtroAQuery(filtro).toString() && (
            <Link href="/ranking?limpiar=1" className="font-semibold text-info hover:underline">{tr(lng, "x.632d4ca5")}</Link>
          )}
        </div>
      </AutoSubmitForm>
      </details>

      {tabla}

      {/* ---------------------- v0.22: evolución del Elo ---------------------- */}
      {eloGrafica.series.length > 0 && (
        <section className="card mt-5">
          <div className="card-head">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{tr(lng, "x.f035a26a")}</h2>
              <p className="text-xs text-muted">{tr(lng, "x.bd86d330")}</p>
            </div>
          </div>
          <LadderChartLazy series={eloGrafica.series} resets={eloGrafica.resets} fechas={eloGrafica.fechas}
            destacados={meId ? [meId] : []} inicial={5}
            pie={tr(lng, "x.c0ca7bef")} etiquetaReset={tr(lng, "x.37bf1535")} />
        </section>
      )}

      {/* ---------------------- v0.17: camino al Mundial ---------------------- */}
      <section className="card mt-5" id="mundial">
        <div className="card-head">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{tr(lang, "zone.title")} · {tr(lang, "zone.europe")}</h2>
            <p className="text-xs text-muted">{tr(lang, "zone.sub")}</p>
            {/* v0.53 — el dato más reciente de todos, para saber si la tabla está al día. */}
            {ultimaZona && (
              <p className="text-xs text-muted tabular">{trf(lang, "zone.ultima", { f: fechaCorta(ultimaZona, lang === "en" ? "en-GB" : "es-ES") })}</p>
            )}
          </div>
          {plazas != null && (
            <span className="chip chip-brand flex-none tabular" title={tr(lang, "zone.slots")}>Top {plazas}</span>
          )}
        </div>
        {zona.length ? (
          <ol className="divide-y divide-line-soft">
            {zona.map((p, i) => {
              const e = estadoMundial(p.rankEurope, plazas);
              /* La línea se dibuja entre el último que está dentro y el
                 primero que está fuera (o sin puesto). */
              const anterior = zona[i - 1];
              const linea = plazas != null && i > 0 && anterior?.rankEurope != null
                && anterior.rankEurope <= plazas && (p.rankEurope == null || p.rankEurope > plazas);
              return (
                <li key={p.id}>
                  {linea && (
                    <div className="flex items-center gap-2 bg-brand-soft px-4 py-1 text-[10px] font-bold uppercase tracking-wide text-brand">
                      <span className="h-px flex-1 bg-brand/50" />
                      {tr(lang, "zone.line")} · Top {plazas}
                      <span className="h-px flex-1 bg-brand/50" />
                    </div>
                  )}
                  <div className={`flex items-center gap-2 px-3 py-2.5 xs:gap-3 xs:px-4 ${p.id === meId ? "bg-surface-2" : ""}`}>
                    {/* v0.53 — bajo el nombre, cuándo actualizó su puesto: un 140.º de
                        ayer no vale lo mismo que uno de hace un mes. */}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <PlayerTag player={p} size="sm" className="min-w-0" />
                      {p.rankZoneUpdatedAt && (p.rankEurope != null || p.rankSpain != null) && (
                        <span className="pl-9 text-[10px] text-muted tabular">
                          {trf(lang, "zone.actualizado", { f: fechaCorta(new Date(p.rankZoneUpdatedAt).toISOString(), lang === "en" ? "en-GB" : "es-ES") })}
                        </span>
                      )}
                    </span>
                    <span className="flex w-14 flex-none flex-col items-center text-center xs:w-16">
                      <span className="font-display text-lg font-extrabold leading-none tabular">
                        {p.rankEurope != null ? `${p.rankEurope}.º` : "—"}
                      </span>
                      <span className="text-[10px] text-muted">{tr(lang, "zone.europe")}</span>
                    </span>
                    <span className="hidden w-14 flex-none flex-col items-center text-center xs:flex">
                      <span className="font-display text-base font-bold leading-none tabular text-ink-2">
                        {p.rankSpain != null ? `${p.rankSpain}.º` : "—"}
                      </span>
                      <span className="text-[10px] text-muted">{tr(lang, "zone.spain")}</span>
                    </span>
                    <span className="w-20 flex-none text-right text-[11px]">
                      {e.tipo === "dentro" ? (
                        <span className="chip chip-brand">{tr(lang, "zone.in")} · {e.margen}</span>
                      ) : e.tipo === "fuera" ? (
                        <span className="chip">{tr(lang, "zone.out")} · {e.faltan}</span>
                      ) : null}
                    </span>
                    {meId && p.id !== meId ? (
                      <FavStar playerId={p.id} on={misFavs.has(p.id)} back={hrefCon({}) + "#mundial"} lang={lang} />
                    ) : <span className="w-9 flex-none" />}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-muted">{tr(lang, "fav.empty")}</p>
        )}
        <p className="border-t border-line-soft px-4 py-3 text-xs text-muted">
          {conPuesto}/{zona.length} · {tr(lang, "zone.caveat")}
          {" "}«{tr(lang, "zone.in")} · N» = {tr(lang, "zone.margin")}; «{tr(lang, "zone.out")} · N» = {tr(lang, "zone.places")}.
        </p>
      </section>

      <section className="card mt-5 min-w-0 overflow-hidden">
        <div className="card-head">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{tr(lng, "x.55125239")}</h2>
            <p className="text-xs text-muted">{tr(lng, "x.acd50f5b")}</p>
          </div>
        </div>
        <H2HHeatmap matriz={h2h} jugadores={h2hJugadores} />
      </section>

      {/* v0.24: fuera la cuadrícula de mini-gráficas por jugador; la evolución
          del Elo es UNA gráfica con todos (arriba). */}

      {/* El ladder es otra clasificación: la escribís vosotros, no sale de las partidas. */}
      <section className="card mt-4">
        <div className="card-head">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{tr(lng, "x.0bf3d1de")}</h2>
            <p className="text-xs text-muted">{tr(lng, "x.532c27d1")}</p>
          </div>
          <span className="text-xs text-muted">{ladder.length} con rango</span>
        </div>
        {(lider || seriesGrafica.length > 0) && (
          <div className="border-b border-line-soft">
            <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
              {lider ? (
                <>
                  <span className="label">{tr(lng, "x.75af883d")}</span>
                  <PlayerTag player={lider} size="sm" />
                  <RankBadge elo={lider.ladderElo} size="sm" />
                </>
              ) : (
                <span className="label">{tr(lng, "x.d3c90408")}</span>
              )}
              <span className="ml-auto text-[11px] text-muted">
                {resetsGrafica.length
                  ? `${resetsGrafica.length} reset${resetsGrafica.length === 1 ? "" : "s"} de temporada`
                  : tr(lng, "x.29305ade")}
              </span>
            </div>
            <LadderChartLazy series={seriesGrafica} resets={resetsGrafica} />
          </div>
        )}
        <LadderTable rows={ladder} meId={session?.playerId} />
      </section>
    </>
  );
}
