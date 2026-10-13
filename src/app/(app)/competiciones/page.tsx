import Link from "next/link";
import { compPlayers, currentPlayer, loadSnapshot } from "@/lib/data";
import { canManageLeague } from "@/lib/auth";
import { isPlayed, standings } from "@/lib/stats";
import { fmtDate, pct, wrColor } from "@/lib/format";
import { COMPETITION_KINDS, type CompetitionKind } from "@/lib/types";
import { Empty, PageHead, PlayerTag, Record } from "@/components/ui";
import { CompetitionForm } from "@/components/CompetitionForm";

export const metadata = { title: "Liga" };

export default async function CompetitionsPage() {
  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  const played = snap.matches.filter(isPlayed);
  const manager = me ? canManageLeague(me.role) : false;

  return (
    <>
      <PageHead
        title="Liga"
        sub="Vuestras competiciones internas: liga todos contra todos, suizo con top cut o eliminatoria."
      />

      {/* v0.25: sin gráfica de Elo en la Liga (queda en el Ranking). */}

      {snap.competitions.length ? (
        <div className="mb-6 flex flex-col gap-4">
          {snap.competitions.map((c) => {
            const rows = played.filter((m) => m.competitionId === c.id);
            const table = standings(rows, compPlayers(snap, c.id), snap.elo.rating, snap.config);
            const leader = table.find((r) => r.played > 0);
            const kind = COMPETITION_KINDS[c.kind as CompetitionKind] ?? COMPETITION_KINDS.league;
            return (
              <section className="card" key={c.id}>
                <div className="card-head">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{kind.name}</div>
                    <h2 className="truncate text-lg font-bold">{c.name}</h2>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <span className={`chip ${c.status === "done" ? "" : "chip-win"}`}>
                      {c.status === "done" ? "Cerrada" : "En curso"}
                    </span>
                    <Link className="btn btn-sm" href={`/competiciones/${c.id}`}>Abrir</Link>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1 px-4 py-2.5 text-xs text-muted">
                  <span>{compPlayers(snap, c.id).length} jugadores</span>
                  <span>{rows.length} partidas</span>
                  <span>Bo{c.bestOf}</span>
                  <span>desde {fmtDate(c.start)}</span>
                  {leader && <span>líder: <b className="text-ink">{snap.playersById.get(leader.playerId)?.name}</b></span>}
                </div>

                {table.some((r) => r.played) && (
                  <ol className="divide-y divide-line-soft border-t border-line-soft">
                    {table.slice(0, 5).map((r, i) => (
                      <li key={r.playerId} className="flex items-center gap-3 px-4 py-2">
                        <span className={`w-5 flex-none text-center font-display font-extrabold tabular ${i === 0 ? "text-brand" : "text-muted"}`}>{i + 1}</span>
                        <PlayerTag player={snap.playersById.get(r.playerId)} size="sm" className="flex-1" />
                        <Record w={r.wins} d={r.ties} l={r.losses} />
                        <span className="w-11 text-right font-mono text-sm font-semibold tabular" style={{ color: wrColor(r.winRate) }}>
                          {pct(r.winRate, 0)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card mb-6"><Empty title="Sin competiciones">Crea una liga o un torneo para agrupar las partidas.</Empty></div>
      )}

      {/* v0.18 — plegado por defecto (abierto solo si todavía no hay ninguna). */}
      {manager && (
        <details className="mb-6" open={snap.competitions.length === 0}>
          {/* El formulario ya trae sus propias tarjetas: aquí solo la cabecera es tarjeta. */}
          <summary className="card tap mb-3 cursor-pointer justify-between px-4 font-display text-lg font-bold">
            <span className="flex items-center gap-2">
              <span aria-hidden="true">+</span> Nueva competición
            </span>
            <span className="text-xs font-normal text-muted">organizador</span>
          </summary>
          <CompetitionForm players={snap.players} />
        </details>
      )}
    </>
  );
}
