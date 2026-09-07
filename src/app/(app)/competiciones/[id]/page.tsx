import Link from "next/link";
import { notFound } from "next/navigation";
import { compPlayers, loadSnapshot } from "@/lib/data";
import { isPlayed, pairRound, standings, suggestedRounds } from "@/lib/stats";
import { pct, wrColor } from "@/lib/format";
import { COMPETITION_KINDS, type CompetitionKind } from "@/lib/types";
import { Avatar, MatchRow, MatchTable, PageHead, PlayerTag, Record } from "@/components/ui";
import { CompetitionForm } from "@/components/CompetitionForm";
import { createPairings } from "@/actions";

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snap = await loadSnapshot();
  const comp = snap.compsById.get(id);
  if (!comp) notFound();

  const ids = compPlayers(snap, id);
  const inComp = snap.matches.filter((m) => m.competitionId === id);
  const played = inComp.filter(isPlayed);
  const pending = inComp.filter((m) => m.status === "scheduled");
  const table = standings(played, ids, snap.elo.rating, snap.config);
  const nextRound = Math.max(0, ...inComp.map((m) => m.round)) + 1;
  const preview = pairRound(comp.kind, ids, played, snap.elo.rating, snap.config);
  const kind = COMPETITION_KINDS[(comp.kind as CompetitionKind)] ?? COMPETITION_KINDS.league;

  return (
    <>
      <PageHead
        title={comp.name}
        sub={`${kind.name} · Bo${comp.bestOf} · ${ids.length} jugadores${comp.kind === "swiss" ? ` · ${comp.rounds || suggestedRounds(ids.length)} rondas` : ""}`}
        actions={<Link className="btn btn-sm btn-ghost" href="/competiciones">Todas</Link>}
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><h2>Clasificación</h2><span className="hint">{played.length} partidas jugadas</span></div>
        {table.some((r) => r.played > 0) ? (
          <div className="tw">
            <table>
              <thead>
                <tr><th className="rk">#</th><th>Jugador</th><th className="num">PJ</th><th>Récord</th><th className="num">%V</th><th className="num">Pts</th><th className="num">Res.</th><th className="num">Dif.</th></tr>
              </thead>
              <tbody>
                {table.map((r, i) => (
                  <tr key={r.playerId} className={i === 0 ? "r1" : ""}>
                    <td className="rk">{i + 1}</td>
                    <td><PlayerTag player={snap.playersById.get(r.playerId)} /></td>
                    <td className="num">{r.played}</td>
                    <td><Record w={r.wins} d={r.ties} l={r.losses} /></td>
                    <td className="num" style={{ color: wrColor(r.winRate), fontWeight: 600 }}>{pct(r.winRate, 0)}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{r.points}</td>
                    <td className="num" style={{ color: "var(--muted)" }}>{pct(r.resistance, 1)}</td>
                    <td className="num">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty"><p>Sin partidas todavía.</p></div>}
      </div>

      <div className="grid g-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head"><h2>Jornada {nextRound}</h2><span className="hint">{kind.hint}</span></div>
          <div className="card-pad">
            {preview.pairs.length ? (
              <>
                <ul className="list-plain" style={{ border: "1px solid var(--line)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
                  {preview.pairs.map(([a, b], i) => {
                    const A = snap.playersById.get(a), B = snap.playersById.get(b);
                    return (
                      <li key={`${a}-${b}`}>
                        <span className="rk">{i + 1}</span>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                          <div className="row" style={{ gap: 7, justifyContent: "flex-end", flex: 1 }}>{A?.name}<Avatar player={A} /></div>
                          <span className="hint" style={{ fontFamily: "var(--f-display)", fontWeight: 700 }}>VS</span>
                          <div className="row" style={{ gap: 7, flex: 1 }}><Avatar player={B} />{B?.name}</div>
                        </div>
                      </li>
                    );
                  })}
                  {preview.bye && (
                    <li><span className="rk">—</span><div style={{ flex: 1 }}><PlayerTag player={snap.playersById.get(preview.bye)} /></div><span className="chip g">descansa</span></li>
                  )}
                </ul>
                <form action={createPairings} style={{ marginTop: 12 }}>
                  <input type="hidden" name="competitionId" value={comp.id} />
                  <button className="btn btn-gold" type="submit">Crear {preview.pairs.length} partidas pendientes</button>
                </form>
              </>
            ) : <div className="hint">No quedan cruces por generar con estos participantes.</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>Partidas pendientes</h2><span className="hint">{pending.length}</span></div>
          {pending.length ? (
            <ul className="list-plain">
              {pending.map((m) => (
                <li key={m.id}>
                  <span className="chip">J{m.round}</span>
                  <div style={{ flex: 1 }}>
                    {snap.playersById.get(m.playerAId)?.name} <span className="hint">vs</span>{" "}
                    {snap.playersById.get(m.playerBId)?.name}
                  </div>
                  <Link className="btn btn-gold btn-sm" href={`/partidas/${m.id}`}>Anotar</Link>
                </li>
              ))}
            </ul>
          ) : <div className="empty"><p>Nada pendiente.</p></div>}
        </div>
      </div>

      {played.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head"><h2>Partidas de la competición</h2></div>
          <MatchTable>
            {played.slice().reverse().map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                playerA={snap.playersById.get(m.playerAId)}
                playerB={snap.playersById.get(m.playerBId)}
                archA={m.deckAId ? snap.archIndex.get(m.deckAId) : undefined}
                archB={m.deckBId ? snap.archIndex.get(m.deckBId) : undefined}
                compName={undefined}
              />
            ))}
          </MatchTable>
        </div>
      )}

      <h2 style={{ marginBottom: 12 }}>Editar competición</h2>
      <CompetitionForm competition={comp} players={snap.players} selectedPlayerIds={snap.playersOfComp.get(id) ?? []} />
    </>
  );
}
