import Link from "next/link";
import type { ReactNode } from "react";
import { compPlayers, loadSnapshot, playerCp } from "@/lib/data";
import {
  archetypeStats, isPlayed, outcome, playerRecord, recordOf, roundResult, roundsOf, standings,
} from "@/lib/stats";
import { awardsCp, computeCp, cpKindOf, getSeason, seasonOfDate, type CpResultInput } from "@/lib/cp";
import { estadoMundial, porPuestoZona } from "@/lib/mundial";
import { getLang } from "@/lib/lang";
import { tr } from "@/lib/i18n";
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
  { v: "all", label: "Todo", hint: "Todas tus partidas —liga, torneos y sueltas— sumadas en una sola tabla, con tus torneos y CP al lado." },
  { v: "league", label: "Liga", hint: "Solo las partidas de competiciones internas, entre gente del grupo. Con resistencia y diferencia de juegos." },
  { v: "tournament", label: "Torneos", hint: "Solo los torneos de fuera: rondas, conversión al top cut, puesto medio y CP." },
  { v: "casual", label: "Sueltos", hint: "Partidas que no son de ninguna competición ni torneo (lo que el formulario llama «amistoso suelto»)." },
];

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ comp?: string; ambito?: string; donde?: string; temporada?: string; fav?: string }>;
}) {
  const q = await searchParams;
  const [snap, session, lang] = await Promise.all([loadSnapshot(), readSession(), getLang()]);

  /* v0.17 — «¿A quién?»: todos, o solo los que sigues (más tú). Recorta las
     tablas, el cara a cara y el camino al Mundial; no cambia los cálculos
     (el Elo y los puestos siguen siendo los de toda la liga). */
  const meId = session?.playerId ?? null;
  const misFavs = meId ? snap.favoritePlayers.get(meId) ?? new Set<string>() : new Set<string>();
  const soloFavs = q.fav === "1" && meId != null;
  const visible = (pid: string) => !soloFavs || pid === meId || misFavs.has(pid);
  const played = snap.matches.filter(isPlayed);
  const cpSeason = snap.config.cpSeason;

  /* --- qué se mira --- */
  const legacyDonde: Donde | null = q.ambito === "onsite" ? "onsite" : q.ambito === "online" ? "online" : null;
  const vista: Vista = legacyDonde ? "tournament"
    : q.ambito === "league" || q.ambito === "tournament" || q.ambito === "casual" ? q.ambito : "all";
  const donde: Donde = legacyDonde ?? (q.donde === "onsite" || q.donde === "online" ? q.donde : "both");
  const soloTemporada = q.temporada === "1";
  const competition = vista === "league" && q.comp ? snap.compsById.get(q.comp) ?? null : null;

  const enTemporada = (fecha: string) => !soloTemporada || seasonOfDate(fecha) === cpSeason;
  const tourOk = (t: TournamentFull | undefined) =>
    Boolean(t)
    && (donde === "both" || (donde === "online" ? t!.scope === "online" : t!.scope !== "online"))
    && (!soloTemporada || (t!.season ?? seasonOfDate(t!.date)) === cpSeason);

  /** Las partidas que entran con la vista elegida. */
  const scoped: MatchFull[] = played.filter((m) => {
    if (!enTemporada(m.date)) return false;
    if (vista === "league") return m.competitionId != null && (!competition || m.competitionId === competition.id);
    if (vista === "casual") return !m.competitionId && !m.tournamentId;
    if (vista === "tournament") return m.tournamentId != null && tourOk(snap.toursById.get(m.tournamentId));
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
    tabla = <RankingTodoTable rows={filas} />;
  } else if (vista === "tournament") {
    const filas: TourRankRow[] = [...porTorneo.values()]
      .filter((f) => visible(f.playerId))
      .map((f) => ({ ...f, ...avatarDe(f.playerId) }));
    tabla = (
      <>
        <TournamentRankingTable rows={filas} cpLabel={`CP ${cpSeason}`} />
        {donde === "online" && (
          <p className="mt-2 text-xs text-muted">Los torneos online no reparten Championship Points.</p>
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

  const ladder = ladderStandings(snap.players.filter((p) => p.active));
  const withHistory = snap.players.filter((p) => (snap.elo.history[p.id]?.length ?? 0) > 2);

  /** La URL de ahora con cambios. `null` quita el parámetro. */
  const hrefCon = (cambios: Record<string, string | null>) => {
    const base: Record<string, string | null> = {
      ambito: vista === "all" ? null : vista,
      donde: vista === "tournament" && donde !== "both" ? donde : null,
      comp: competition?.id ?? null,
      temporada: soloTemporada ? "1" : null,
      fav: soloFavs ? "1" : null,
      ...cambios,
    };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(base)) if (v) sp.set(k, v);
    const qs = sp.toString();
    return qs ? `/ranking?${qs}` : "/ranking";
  };
  const vistaInfo = VISTAS.find((x) => x.v === vista)!;
  const nTorneos = new Set(entradas.map((e) => e.tournamentId)).size;

  const Seg = ({ items }: { items: Array<{ href: string; label: string; on: boolean }> }) => (
    <div className="seg w-full sm:w-auto">
      {items.map((it) => (
        <Link key={it.label} href={it.href} data-on={it.on} aria-current={it.on ? "page" : undefined}
          className="items-center justify-center whitespace-nowrap">
          {it.label}
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <PageHead
        title="Ranking"
        sub={
          <>
            {snap.config.ptsWin} puntos por victoria y {snap.config.ptsTie} por empate. El <b>Elo</b> solo
            se mueve con partidas entre gente del grupo y es el mismo en todas las vistas.
          </>
        }
      />

      {/* ------------------------------ filtros ------------------------------ */}
      <section className="card mb-4 flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="label">¿Qué partidas cuentan?</span>
          <Seg items={VISTAS.map((x) => ({
            href: hrefCon({ ambito: x.v === "all" ? null : x.v, donde: null, comp: null }),
            label: x.label, on: vista === x.v,
          }))} />
          <p className="text-xs text-muted">{vistaInfo.hint}</p>
        </div>

        {vista === "league" && snap.competitions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="label">Competición</span>
            <div className="flex flex-wrap gap-1.5">
              <Link href={hrefCon({ comp: null })} className={`chip ${!competition ? "chip-brand" : ""}`}>Todas</Link>
              {snap.competitions.map((c) => (
                <Link key={c.id} href={hrefCon({ comp: c.id })}
                  className={`chip ${competition?.id === c.id ? "chip-brand" : ""}`}>
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {vista === "tournament" && (
          <div className="flex flex-col gap-1.5">
            <span className="label">Dónde</span>
            <Seg items={([["both", "Ambos"], ["onsite", "Presencial"], ["online", "Online"]] as const)
              .map(([v, label]) => ({ href: hrefCon({ donde: v === "both" ? null : v }), label, on: donde === v }))} />
          </div>
        )}

        {meId && (
          <div className="flex flex-col gap-1.5">
            <span className="label">{tr(lang, "fav.who")}</span>
            <Seg items={[
              { href: hrefCon({ fav: null }), label: tr(lang, "fav.everyone"), on: !soloFavs },
              { href: hrefCon({ fav: "1" }), label: `★ ${tr(lang, "fav.mine")} (${misFavs.size})`, on: soloFavs },
            ]} />
            <p className="text-xs text-muted">{soloFavs && misFavs.size === 0 ? tr(lang, "fav.empty") : tr(lang, "fav.hint")}</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="label">Temporada</span>
          <Seg items={[
            { href: hrefCon({ temporada: null }), label: "Todas", on: !soloTemporada },
            { href: hrefCon({ temporada: "1" }), label: `Solo ${cpSeason}`, on: soloTemporada },
          ]} />
          <p className="text-xs text-muted">
            La temporada de Play! Pokémon va de julio a junio. Los CP son siempre los de la temporada {cpSeason}.
          </p>
        </div>

        <p className="border-t border-line-soft pt-3 text-xs text-ink-2">
          {scoped.length === 0 && !nTorneos
            ? "Con este filtro no queda nada, así que la tabla sale a cero."
            : <>Cuentan <b className="tabular">{scoped.length}</b> partida{scoped.length === 1 ? "" : "s"}
              {vista === "all" || vista === "tournament" ? <> y <b className="tabular">{nTorneos}</b> torneo{nTorneos === 1 ? "" : "s"}</> : null}
              {competition ? <> de <b>{competition.name}</b></> : null}
              {soloTemporada ? <>, temporada {cpSeason}</> : null}.</>}
        </p>
      </section>

      {tabla}

      {/* ---------------------- v0.17: camino al Mundial ---------------------- */}
      <section className="card mt-5" id="mundial">
        <div className="card-head">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{tr(lang, "zone.title")} · {tr(lang, "zone.europe")}</h2>
            <p className="text-xs text-muted">{tr(lang, "zone.sub")}</p>
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
                    <PlayerTag player={p} size="sm" className="min-w-0 flex-1" />
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
            <h2 className="text-lg font-bold">Enfrentamientos directos</h2>
            <p className="text-xs text-muted">Cuántas veces os habéis cruzado, con el filtro de arriba.</p>
          </div>
        </div>
        <H2HHeatmap matriz={h2h} jugadores={h2hJugadores} />
      </section>

      {withHistory.length > 0 && (
        <section className="card mt-4">
          <div className="card-head">
            <h2 className="text-lg font-bold">Evolución del Elo</h2>
            <span className="text-xs text-muted">desde {snap.config.eloStart}</span>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {withHistory.map((p) => {
              const values = (snap.elo.history[p.id] ?? []).map((h) => h.value);
              const last = Math.round(values[values.length - 1]);
              const delta = last - snap.config.eloStart;
              return (
                <div key={p.id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <PlayerTag player={p} size="sm" />
                    <span className="font-mono text-sm font-bold tabular">
                      {last}{" "}
                      <span className={`text-xs ${delta >= 0 ? "text-win" : "text-loss"}`}>
                        {delta >= 0 ? "+" : ""}{delta}
                      </span>
                    </span>
                  </div>
                  <Sparkline values={values} width={240} height={44} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* El ladder es otra clasificación: la escribís vosotros, no sale de las partidas. */}
      <section className="card mt-4">
        <div className="card-head">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">Ladder</h2>
            <p className="text-xs text-muted">El rango que cada uno se pone a mano. No sale de las partidas.</p>
          </div>
          <span className="text-xs text-muted">{ladder.length} con rango</span>
        </div>
        <LadderTable rows={ladder} meId={session?.playerId} />
      </section>
    </>
  );
}
