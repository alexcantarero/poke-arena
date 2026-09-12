import { compPlayers, loadSnapshot, playerCp } from "@/lib/data";
import { archetypeStats, isPlayed, standings } from "@/lib/stats";
import { PageHead, PlayerTag, Sparkline } from "@/components/ui";
import { RankingTable, type RankRow } from "@/components/RankingTable";
import { ScopeTabs } from "@/components/ScopeTabs";
import { LadderTable } from "@/components/Ladder";
import { ladderStandings } from "@/lib/rank";
import { readSession } from "@/lib/auth";

export const metadata = { title: "Ranking" };

export default async function RankingPage({
  searchParams,
}: { searchParams: Promise<{ comp?: string }> }) {
  const { comp = "all" } = await searchParams;
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  const played = snap.matches.filter(isPlayed);
  const competition = comp === "all" ? null : snap.compsById.get(comp);
  const scoped = competition ? played.filter((m) => m.competitionId === competition.id) : played;
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
      color: p?.color ?? "#888",
      avatarKind: p?.avatarKind ?? "none",
      avatarValue: p?.avatarValue ?? "",
      played: r.played, wins: r.wins, ties: r.ties, losses: r.losses,
      points: r.points, winRate: r.winRate, resistance: r.resistance,
      diff: r.diff, elo: r.elo,
      cp: playerCp(snap, r.playerId).total,
      streakKind: r.streak.kind, streakN: r.streak.n,
      topArchId: own[0]?.archetype?.id ?? null,
      topArchName: own[0]?.archetype?.name ?? null,
    };
  });

  const ladder = ladderStandings(snap.players.filter((p) => p.active));

  const withHistory = snap.players.filter((p) => (snap.elo.history[p.id]?.length ?? 0) > 2);

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
      />

      <div className="mt-4">
        <RankingTable rows={rows} />
      </div>

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
