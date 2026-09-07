import Link from "next/link";
import { compPlayers, loadSnapshot } from "@/lib/data";
import { isPlayed, standings } from "@/lib/stats";
import { fmtDate, pct, wrColor } from "@/lib/format";
import { COMPETITION_KINDS, type CompetitionKind } from "@/lib/types";
import { Kpi, PageHead, PlayerTag, Record } from "@/components/ui";
import { CompetitionForm } from "@/components/CompetitionForm";

export default async function CompetitionsPage() {
  const snap = await loadSnapshot();
  const played = snap.matches.filter(isPlayed);

  return (
    <>
      <PageHead
        title="Competiciones"
        sub="Cuatro formatos: liga a una o dos vueltas, torneo suizo con top cut, eliminatoria directa y amistosos sueltos. El emparejamiento suizo usa puntos y evita repetir rival."
      />

      <div className="stack" style={{ marginBottom: 16 }}>
        {snap.competitions.map((c) => {
          const rows = played.filter((m) => m.competitionId === c.id);
          const table = standings(rows, compPlayers(snap, c.id), snap.elo.rating, snap.config);
          const roundsPlayed = Math.max(0, ...rows.map((m) => m.round));
          const leader = table.find((r) => r.played > 0);
          const kind = COMPETITION_KINDS[(c.kind as CompetitionKind)] ?? COMPETITION_KINDS.league;
          return (
            <div className="card" key={c.id}>
              <div className="card-head">
                <div>
                  <div className="eyebrow">{kind.name}</div>
                  <h2>{c.name}</h2>
                </div>
                <div className="row">
                  <span className={`chip ${c.status === "done" ? "" : "w"}`}>{c.status === "done" ? "Cerrada" : "En curso"}</span>
                  <span className="chip">Bo{c.bestOf}</span>
                  <Link className="btn btn-sm" href={`/competiciones/${c.id}`}>Abrir</Link>
                </div>
              </div>
              <div className="card-pad grid g-4" style={{ gap: 12 }}>
                <Kpi label="Jugadores" value={compPlayers(snap, c.id).length} note="inscritos" />
                <Kpi label="Partidas" value={rows.length} note={roundsPlayed ? `${roundsPlayed} jornadas` : "sin jornadas"} />
                <Kpi highlight label="Líder" value={leader ? snap.playersById.get(leader.playerId)?.name ?? "—" : "—"} note={leader ? `${leader.points} pts` : "sin datos"} />
                <Kpi label="Fechas" value={fmtDate(c.start)} note={c.end ? `hasta ${fmtDate(c.end)}` : "sin cierre"} />
              </div>
              {table.some((r) => r.played > 0) && (
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
              )}
            </div>
          );
        })}
      </div>

      <h2 style={{ marginBottom: 12 }}>Nueva competición</h2>
      <CompetitionForm players={snap.players} />
    </>
  );
}
