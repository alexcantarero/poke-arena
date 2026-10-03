import Link from "next/link";
import { notFound } from "next/navigation";
import { canManageLeague, readSession } from "@/lib/auth";
import { compPlayers, loadSnapshot } from "@/lib/data";
import {
  isPlayed,
  pairRound,
  standings,
  suggestedRounds,
} from "@/lib/stats";
import { pct, wrColor } from "@/lib/format";
import { COMPETITION_KINDS, type CompetitionKind } from "@/lib/types";
import {
  Avatar,
  Empty,
  MatchCard,
  MatchList,
  PageHead,
  PlayerTag,
  Record,
  SectionTitle,
} from "@/components/ui";
import { CompetitionForm } from "@/components/CompetitionForm";
import { createPairings } from "@/actions";
import { Icon } from "@/components/icons";

export default async function CompetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  const comp = snap.compsById.get(id);
  if (!comp) notFound();

  const me = session ? snap.playersById.get(session.playerId) : undefined;
  const manager = me ? canManageLeague(me.role) : false;

  const ids = compPlayers(snap, id);
  const inComp = snap.matches.filter((m) => m.competitionId === id);
  const played = inComp.filter(isPlayed);
  const pending = inComp.filter((m) => m.status === "scheduled");
  const table = standings(played, ids, snap.elo.rating, snap.config);
  const nextRound = Math.max(0, ...inComp.map((m) => m.round)) + 1;
  const preview = pairRound(comp.kind, ids, played, snap.elo.rating, snap.config);
  const kind =
    COMPETITION_KINDS[comp.kind as CompetitionKind] ?? COMPETITION_KINDS.league;

  return (
    <>
      <PageHead
        title={comp.name}
        sub={`${kind.name} · Bo${comp.bestOf} · ${ids.length} jugadores${comp.kind === "swiss" ? ` · ${comp.rounds || suggestedRounds(ids.length)} rondas` : ""}`}
        actions={
          <Link className="btn btn-ghost btn-sm" href="/competiciones">
            <Icon name="back" className="size-4" /> Todas
          </Link>
        }
      />

      <section className="card mb-4">
        <div className="card-head">
          <h2 className="text-lg font-bold">Clasificación</h2>
          <span className="text-xs text-muted">{played.length} partidas</span>
        </div>
        {table.some((r) => r.played) ? (
          <ol className="divide-y divide-line-soft">
            {table.map((r, i) => (
              <li
                key={r.playerId}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span
                  className={`w-6 flex-none text-center font-display text-lg font-extrabold tabular ${i === 0 ? "text-brand" : "text-muted"}`}
                >
                  {i + 1}
                </span>
                <PlayerTag
                  player={snap.playersById.get(r.playerId)}
                  size="sm"
                  className="min-w-0 flex-1"
                />
                <Record w={r.wins} d={r.ties} l={r.losses} />
                <span className="hidden w-14 text-right font-mono text-xs tabular text-muted sm:block">
                  {pct(r.resistance, 0)}
                </span>
                <span
                  className="w-11 text-right font-mono text-sm font-semibold tabular"
                  style={{ color: wrColor(r.winRate) }}
                >
                  {pct(r.winRate, 0)}
                </span>
                <span className="w-8 text-right font-mono text-sm font-bold tabular">
                  {r.points}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty title="Sin partidas todavía" />
        )}
      </section>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="card-head">
            <h2 className="text-lg font-bold">Jornada {nextRound}</h2>
            <span className="text-xs text-muted">{kind.hint}</span>
          </div>
          <div className="p-4">
            {preview.pairs.length ? (
              <>
                <ul className="mb-3 divide-y divide-line-soft rounded-xl border border-line">
                  {preview.pairs.map(([a, b], i) => {
                    const A = snap.playersById.get(a),
                      B = snap.playersById.get(b);
                    return (
                      <li
                        key={`${a}-${b}`}
                        className="flex items-center gap-2 px-3 py-2.5"
                      >
                        <span className="w-5 flex-none text-center font-mono text-xs text-muted">
                          {i + 1}
                        </span>
                        <Link href={`/perfil/${a}`} className="flex min-w-0 flex-1 items-center justify-end gap-2 hover:text-info">
                          <span className="truncate text-sm">{A?.name}</span>
                          <Avatar player={A} size="sm" />
                        </Link>
                        <span className="flex-none font-display text-xs font-bold text-muted">
                          VS
                        </span>
                        <Link href={`/perfil/${b}`} className="flex min-w-0 flex-1 items-center gap-2 hover:text-info">
                          <Avatar player={B} size="sm" />
                          <span className="truncate text-sm">{B?.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                  {preview.bye && (
                    <li className="flex items-center gap-2 px-3 py-2.5">
                      <span className="w-5 flex-none text-center text-xs text-muted">
                        —
                      </span>
                      <PlayerTag
                        player={snap.playersById.get(preview.bye)}
                        size="sm"
                        className="flex-1"
                      />
                      <span className="chip chip-brand">descansa</span>
                    </li>
                  )}
                </ul>
                {manager ? (
                  <form action={createPairings}>
                    <input type="hidden" name="competitionId" value={comp.id} />
                    <button className="btn btn-brand w-full" type="submit">
                      Crear {preview.pairs.length} partidas pendientes
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-muted">
                    Los cruces los genera el organizador.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">
                No quedan cruces por generar con estos participantes.
              </p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="text-lg font-bold">Pendientes</h2>
            <span className="text-xs text-muted">{pending.length}</span>
          </div>
          {pending.length ? (
            <ul className="divide-y divide-line-soft">
              {pending.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/partidas/${m.id}`}
                    className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface-2"
                  >
                    <span className="chip flex-none">J{m.round}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {snap.playersById.get(m.playerAId)?.name}{" "}
                      <span className="text-muted">vs</span>{" "}
                      {m.playerBId
                        ? snap.playersById.get(m.playerBId)?.name
                        : m.opponentName}
                    </span>
                    <span className="btn btn-brand btn-sm flex-none">
                      Anotar
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Nada pendiente" />
          )}
        </section>
      </div>

      {played.length > 0 && (
        <>
          <SectionTitle aside={`${played.length}`}>Partidas</SectionTitle>
          <div className="card mb-6">
            <MatchList>
              {played
                .slice()
                .reverse()
                .map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    playerA={snap.playersById.get(m.playerAId)}
                    playerB={
                      m.playerBId
                        ? snap.playersById.get(m.playerBId)
                        : undefined
                    }
                    archA={
                      m.deckAId ? snap.archIndex.get(m.deckAId) : undefined
                    }
                    archB={
                      m.deckBId ? snap.archIndex.get(m.deckBId) : undefined
                    }
                    context={m.round ? `Jornada ${m.round}` : undefined}
                  />
                ))}
            </MatchList>
          </div>
        </>
      )}

      {manager && (
        <>
          <SectionTitle>Editar competición</SectionTitle>
          <CompetitionForm
            competition={comp}
            players={snap.players}
            selectedPlayerIds={snap.playersOfComp.get(id) ?? []}
            canDelete={manager}
          />
        </>
      )}
    </>
  );
}
