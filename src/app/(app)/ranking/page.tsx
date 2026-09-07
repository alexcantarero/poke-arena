import { compPlayers, loadSnapshot } from "@/lib/data";
import { archetypeStats, isPlayed, standings } from "@/lib/stats";
import { PageHead, PlayerTag, Sparkline } from "@/components/ui";
import { RankingTable, type RankRow } from "@/components/RankingTable";
import { CompSelector } from "@/components/CompSelector";

export default async function RankingPage({
  searchParams,
}: { searchParams: Promise<{ comp?: string }> }) {
  const { comp = "all" } = await searchParams;
  const snap = await loadSnapshot();
  const played = snap.matches.filter(isPlayed);
  const competition = comp === "all" ? null : snap.compsById.get(comp);
  const scoped = competition ? played.filter((m) => m.competitionId === competition.id) : played;
  const ids = competition ? compPlayers(snap, competition.id) : snap.activePlayerIds;
  const table = standings(scoped, ids, snap.elo.rating, snap.config);

  const rows: RankRow[] = table.map((r) => {
    const own = archetypeStats(
      scoped.filter((m) => m.playerAId === r.playerId || m.playerBId === r.playerId),
      snap.archIndex,
      r.playerId,
    );
    const p = snap.playersById.get(r.playerId);
    return {
      playerId: r.playerId,
      name: p?.name ?? "—",
      color: p?.color ?? "#888",
      played: r.played, wins: r.wins, ties: r.ties, losses: r.losses,
      points: r.points, winRate: r.winRate, resistance: r.resistance,
      diff: r.diff, elo: r.elo,
      streakKind: r.streak.kind, streakN: r.streak.n,
      topArchId: own[0]?.archetype?.id ?? null,
      topArchName: own[0]?.archetype?.name ?? null,
    };
  });

  const withHistory = snap.players.filter((p) => (snap.elo.history[p.id]?.length ?? 0) > 2);

  return (
    <>
      <PageHead
        title="Ranking"
        sub={
          <>
            Puntos: {snap.config.ptsWin} por victoria, {snap.config.ptsTie} por empate.{" "}
            <b>Res.</b> es la resistencia de Play! Pokémon (media del % de victorias de tus rivales,
            con suelo del 25%). <b>Elo</b> es global a toda la liga, no por competición. Pulsa una
            cabecera para reordenar.
          </>
        }
        actions={<CompSelector competitions={snap.competitions} current={comp} basePath="/ranking" />}
      />

      <div className="card"><RankingTable rows={rows} /></div>

      {withHistory.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h2>Evolución del Elo</h2>
            <span className="hint">desde {snap.config.eloStart}</span>
          </div>
          <div className="card-pad grid g-3">
            {withHistory.map((p) => {
              const values = (snap.elo.history[p.id] ?? []).map((h) => h.value);
              const last = Math.round(values[values.length - 1]);
              const delta = last - snap.config.eloStart;
              return (
                <div key={p.id}>
                  <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                    <PlayerTag player={p} size="sm" />
                    <span className="num" style={{ fontWeight: 700 }}>
                      {last}{" "}
                      <span style={{ color: delta >= 0 ? "var(--win)" : "var(--loss)", fontSize: 11 }}>
                        {delta >= 0 ? "+" : ""}{delta}
                      </span>
                    </span>
                  </div>
                  <Sparkline values={values} width={240} height={44} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
