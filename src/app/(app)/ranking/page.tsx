import Link from "next/link";
import { compPlayers, loadSnapshot, playerCp } from "@/lib/data";
import { archetypeStats, isPlayed, outcome, recordOf, roundResult, roundsOf, standings } from "@/lib/stats";
import { applyMatchFilter, EMPTY_FILTER, MATCH_SCOPES, type FilterIndex, type MatchScope } from "@/lib/filters";
import { awardsCp, computeCp, cpKindOf, seasonOfDate, type CpResultInput } from "@/lib/cp";
import { rankingTorneos, type EntradaTorneo } from "@/lib/rankingTorneos";
import { claveRonda, matrizH2H, type Encuentro } from "@/lib/h2h";
import { TournamentRankingTable, type TourRankRow } from "@/components/TournamentRankingTable";
import { H2HHeatmap } from "@/components/H2HHeatmap";
import { Avatar, PageHead, PlayerTag, Sparkline } from "@/components/ui";
import { RankingTable, type RankRow } from "@/components/RankingTable";
import { ScopeTabs } from "@/components/ScopeTabs";
import { LadderTable } from "@/components/Ladder";
import { ladderStandings } from "@/lib/rank";
import { readSession } from "@/lib/auth";

export const metadata = { title: "Ranking" };

/* Lo que se puede mirar por separado, en el orden en que se ofrece. `all`
   sale aparte, como los demás «todo» de la app. */
const AMBITOS: MatchScope[] = ["league", "tournament", "onsite", "online", "casual"];

/* v0.15 — Los ámbitos de torneo enseñan el ranking de torneos y no la
   clasificación de liga: la de liga solo cuenta partidas entre dos del grupo,
   y con un ámbito de torneo se quedaba entera a cero. */
const AMBITOS_TORNEO: MatchScope[] = ["tournament", "onsite", "online"];

export default async function RankingPage({
  searchParams,
}: { searchParams: Promise<{ comp?: string; ambito?: string; temporada?: string }> }) {
  const q = await searchParams;
  const comp = q.comp ?? "all";
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  const played = snap.matches.filter(isPlayed);

  /* --- ámbito ---
     Petición del 19/09: poder mirar el ranking contando solo los amistosos,
     solo los torneos presenciales de la temporada, solo los online o solo la
     liga interna. Las reglas son las mismas que en Resultados y Estadísticas
     —`src/lib/filters.ts`—, así que un ámbito quiere decir lo mismo en las
     tres pantallas. */
  const ambito: MatchScope = (AMBITOS as string[]).includes(q.ambito ?? "")
    ? (q.ambito as MatchScope)
    : "all";
  const soloTemporada = q.temporada === "1";

  const index: FilterIndex = {
    tournamentKind: new Map(snap.tournaments.map((t) => [t.id, t.kind])),
    tournamentFormat: new Map(snap.tournaments.map((t) => [t.id, t.format])),
    tournamentScope: new Map(snap.tournaments.map((t) => [t.id, t.scope])),
    competitionKind: new Map(snap.competitions.map((c) => [c.id, c.kind])),
    // Aquí no se filtra por arquetipo, así que esto no llega a llamarse
    // nunca. Va vacío en vez de montar el índice de arquetipos entero para
    // nada.
    archetypesOf: () => [],
  };

  const competition = comp === "all" ? null : snap.compsById.get(comp);
  let scoped = competition ? played.filter((m) => m.competitionId === competition.id) : played;
  if (ambito !== "all") {
    scoped = applyMatchFilter(scoped, { ...EMPTY_FILTER, scope: ambito }, index);
  }

  /* La temporada de Play! Pokémon no es el año natural: empieza en julio y se
     nombra por el año en que termina, y eso ya lo sabe `seasonOfDate`. Se
     filtra por la fecha de la partida y no por `tournaments.season`, para que
     el corte valga también para las de liga y las amistosas, que no tienen
     torneo del que sacar la temporada. */
  if (soloTemporada) {
    scoped = scoped.filter((m) => seasonOfDate(m.date) === snap.config.cpSeason);
  }

  const ids = competition ? compPlayers(snap, competition.id) : snap.activePlayerIds;
  const table = standings(scoped, ids, snap.elo.rating, snap.config);

  const rows: RankRow[] = table.map((r) => {
    const own = archetypeStats(
      scoped.filter((m) => m.playerAId === r.playerId || m.playerBId === r.playerId),
      snap.archIndex, r.playerId, snap.archById,
    );
    const p = snap.playersById.get(r.playerId);
    return {
      playerId: r.playerId,
      name: p?.name ?? "—",
      // El avatar se pinta aquí, en el servidor, y viaja ya hecho: la tabla
      // es un componente de cliente y así no se lleva `lib/pokemon` entero
      // al navegador solo para resolver un sprite.
      avatar: <Avatar player={p} size="md" />,
      avatarSm: <Avatar player={p} size="sm" />,
      played: r.played, wins: r.wins, ties: r.ties, losses: r.losses,
      points: r.points, winRate: r.winRate, resistance: r.resistance,
      diff: r.diff, elo: r.elo,
      cp: playerCp(snap, r.playerId).total,
      streakKind: r.streak.kind, streakN: r.streak.n,
      topArchId: own[0]?.archetype?.id ?? null,
      topArchName: own[0]?.archetype?.name ?? null,
    };
  });

  /* ------------------------------------------------ v0.15 · torneos --- */
  const vistaTorneos = (AMBITOS_TORNEO as string[]).includes(ambito);
  const conTorneos = !competition && (vistaTorneos || ambito === "all");
  const cpSeason = snap.config.cpSeason;

  const toursEnAmbito = snap.tournaments.filter((t) =>
    (ambito === "onsite" ? t.scope !== "online" : ambito === "online" ? t.scope === "online" : true)
    && (!soloTemporada || (t.season ?? seasonOfDate(t.date)) === cpSeason));

  const entradas: EntradaTorneo[] = [];
  const cpRows = new Map<string, CpResultInput[]>();
  if (conTorneos) {
    for (const t of toursEnAmbito) {
      const quien = new Set<string>(t.results.map((x) => x.playerId));
      for (const m of snap.matches) {
        if (m.tournamentId === t.id && m.playerBId === null) quien.add(m.playerAId);
      }
      for (const pid of quien) {
        if (!snap.playersById.has(pid)) continue;
        const res = t.results.find((x) => x.playerId === pid);
        const rondas = roundsOf(snap.matches, t.id, pid);
        // El récord sale de las rondas si las hay; si no, del resultado tecleado.
        const rec = rondas.length ? recordOf(rondas) : null;
        entradas.push({
          playerId: pid,
          tournamentId: t.id,
          placement: res?.placement ?? null,
          topCut: t.topCut ?? null,
          wins: rec ? rec.wins : res?.wins ?? 0,
          losses: rec ? rec.losses : res?.losses ?? 0,
          ties: rec ? rec.ties : res?.ties ?? 0,
          dropped: res?.dropped ?? false,
        });
        // Los CP de la temporada en curso, solo de lo que está dentro del filtro.
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
  }
  const cpDe = (pid: string) => computeCp(cpSeason, cpRows.get(pid) ?? []).total;
  const tourRows: TourRankRow[] = rankingTorneos(entradas, cpDe).map((f) => {
    const p = snap.playersById.get(f.playerId);
    return {
      ...f,
      name: p?.name ?? "—",
      avatar: <Avatar player={p} size="md" />,
      avatarSm: <Avatar player={p} size="sm" />,
    };
  });

  /* ------------------------------------- v0.15 · enfrentamientos directos --- */
  const encuentros: Encuentro[] = [];
  for (const m of scoped) {
    if (m.playerBId) {
      const o = outcome(m);
      encuentros.push({ clave: `m:${m.id}`, a: m.playerAId, b: m.playerBId, resultado: o.winner });
    } else if (m.tournamentId && m.opponentPlayerId) {
      const res = roundResult(m);
      encuentros.push({
        clave: claveRonda(m.tournamentId, m.round, m.playerAId, m.opponentPlayerId),
        a: m.playerAId,
        b: m.opponentPlayerId,
        resultado: res === "w" ? "a" : res === "l" ? "b" : res === "d" ? "tie" : null,
      });
    }
  }
  const h2h = matrizH2H(encuentros);
  const h2hJugadores = snap.players.map((p) => ({ id: p.id, name: p.name, avatar: <Avatar player={p} size="sm" /> }));

  const ladder = ladderStandings(snap.players.filter((p) => p.active));

  const withHistory = snap.players.filter((p) => (snap.elo.history[p.id]?.length ?? 0) > 2);

  /** La URL de ahora con un parámetro cambiado. `null` lo quita. */
  const hrefCon = (cambios: Record<string, string | null>) => {
    const sp = new URLSearchParams();
    const base: Record<string, string | null> = {
      comp: comp === "all" ? null : comp,
      ambito: ambito === "all" ? null : ambito,
      temporada: soloTemporada ? "1" : null,
      ...cambios,
    };
    for (const [k, v] of Object.entries(base)) if (v) sp.set(k, v);
    const qs = sp.toString();
    return qs ? `/ranking?${qs}` : "/ranking";
  };

  return (
    <>
      <PageHead
        title="Ranking"
        sub={
          <>
            {snap.config.ptsWin} puntos por victoria y {snap.config.ptsTie} por empate.
            La <b>resistencia</b> es la media del % de victorias de tus rivales, con suelo del 25%,
            como en los torneos oficiales. El <b>Elo</b> es global a toda la liga.
          </>
        }
      />

      <ScopeTabs
        basePath="/ranking"
        param="comp"
        current={comp}
        options={snap.competitions.map((c) => ({ value: c.id, label: c.name }))}
        keep={{ ambito: ambito === "all" ? null : ambito, temporada: soloTemporada ? "1" : null }}
      />

      {/* Segunda fila: de dónde salen las partidas que cuentan. Son enlaces y
          no un desplegable, por lo mismo que el resto de filtros de la app:
          el estado va en la URL, se puede compartir y funciona sin JS. */}
      <div className="scroll-x mt-2 flex gap-2 pb-1">
        {(["all", ...AMBITOS] as MatchScope[]).map((v) => (
          <Link
            key={v}
            href={hrefCon({ ambito: v === "all" ? null : v })}
            aria-current={ambito === v ? "page" : undefined}
            className={`chip flex-none ${ambito === v ? "chip-brand" : ""}`}
          >
            {MATCH_SCOPES[v]}
          </Link>
        ))}
        <Link
          href={hrefCon({ temporada: soloTemporada ? null : "1" })}
          aria-current={soloTemporada ? "page" : undefined}
          className={`chip flex-none ${soloTemporada ? "chip-info" : ""}`}
        >
          Temporada {snap.config.cpSeason}
        </Link>
      </div>

      {(ambito !== "all" || soloTemporada) && (
        <p className="mt-2 text-xs text-muted">
          {scoped.length === 0
            ? "Con este filtro no queda ninguna partida, así que la tabla sale a cero."
            : `${scoped.length} partida${scoped.length === 1 ? "" : "s"}: ${
                ambito === "all" ? "todas" : MATCH_SCOPES[ambito].toLowerCase()
              }${soloTemporada ? `, temporada ${snap.config.cpSeason}` : ""}.${
                vistaTorneos
                  ? ` Los CP son los de la temporada ${cpSeason} de estos torneos, con su Best Finish Limit.`
                  : " El Elo y los CP no cambian con este filtro: son globales."
              }`}
        </p>
      )}

      {!vistaTorneos && (
        <div className="mt-4">
          {ambito === "all" && !competition && (
            <h2 className="mb-2 font-display text-lg font-bold">Liga y amistosos</h2>
          )}
          <RankingTable rows={rows} />
        </div>
      )}

      {conTorneos && (
        <section className="mt-5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-bold">
              {ambito === "online" ? "Torneos online" : ambito === "onsite" ? "Torneos presenciales" : "Torneos"}
            </h2>
            <span className="text-xs text-muted tabular">
              {new Set(entradas.map((e) => e.tournamentId)).size} torneos · conversión solo sobre los que tenían top cut
            </span>
          </div>
          <TournamentRankingTable rows={tourRows} cpLabel={`CP ${cpSeason}`} />
          {ambito === "online" && (
            <p className="mt-2 text-xs text-muted">Los torneos online no reparten Championship Points.</p>
          )}
        </section>
      )}

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
      {/* --- el ladder ---
          Es otra clasificación y va aparte de la de arriba, no en una columna
          más: la de arriba sale de vuestras partidas y esta la escribís
          vosotros. Meterlas en la misma tabla habría hecho parecer que el
          rango también se calcula. */}
      <section className="card mt-4">
        <div className="card-head">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">Ladder</h2>
            <p className="text-xs text-muted">
              El rango que cada uno se pone a mano. No sale de las partidas.
            </p>
          </div>
          <span className="text-xs text-muted">{ladder.length} con rango</span>
        </div>
        <LadderTable rows={ladder} meId={session?.playerId} />
      </section>
    </>
  );
}
