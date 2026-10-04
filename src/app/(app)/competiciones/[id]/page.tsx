import Link from "next/link";
import { notFound } from "next/navigation";
import { canManageLeague, readSession } from "@/lib/auth";
import { compPlayers, deckOptions, archetypeOptions, leagueDecksOf, leagueDeckSubmitters, loadSnapshot } from "@/lib/data";
import { DeckPicker } from "@/components/DeckPicker";
import { submitLeagueDeck, unlockLeagueDeck } from "@/actions";
import { fmtDate } from "@/lib/format";
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
import { Sprites } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ConfirmButton } from "@/components/ConfirmButton";

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

  /* v0.18 — Mazo de liga bloqueado. `leagueDecksOf` ya devuelve solo lo que
     quien mira puede ver: todo si es organizador, el suyo si no. Del resto
     solo se sabe SI lo han entregado, nunca cuál. */
  const participo = Boolean(me && ids.includes(me.id));
  const [visibles, entregados] = await Promise.all([
    leagueDecksOf(id, me ? { id: me.id, manager } : null),
    leagueDeckSubmitters(id),
  ]);
  const miMazo = me ? visibles.find((d) => d.playerId === me.id) : undefined;
  const archDe = (d: { deckId: string | null; archetypeId: string | null }) =>
    d.deckId ? snap.archIndex.get(d.deckId) : d.archetypeId ? snap.archById.get(d.archetypeId) : undefined;
  const nombreMazo = (d: { deckId: string | null; archetypeId: string | null }) =>
    (d.deckId && snap.decksById.get(d.deckId)?.name) || archDe(d)?.name || "Mazo sin nombre";
  const opcionesMazo = me
    ? [...deckOptions(snap, me.id, { includeOthers: false }), ...archetypeOptions(snap)]
    : [];

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

      {/* ------------------- v0.18: mazo de liga bloqueado ------------------- */}
      {(participo || manager) && (
        <section className="card mb-4 min-w-0">
          <div className="card-head">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Mazo de liga</h2>
              <p className="text-xs text-muted">
                Se entrega una vez y queda bloqueado. Solo lo ven su dueño y los organizadores.
              </p>
            </div>
            <span className="flex-none text-xs text-muted tabular">{entregados.size}/{ids.length}</span>
          </div>

          {participo && me && (
            <div className="border-b border-line-soft p-4">
              {miMazo ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Icon name="lock" className="size-5 flex-none text-brand" />
                  {archDe(miMazo) ? <Sprites archetype={archDe(miMazo)!} size="md" /> : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{nombreMazo(miMazo)}</span>
                    <span className="block text-xs text-muted">
                      Bloqueado el {fmtDate(miMazo.lockedAt.toISOString().slice(0, 10))}. Para cambiarlo, habla con un organizador.
                    </span>
                  </span>
                </div>
              ) : (
                <form action={submitLeagueDeck} className="flex flex-col gap-3">
                  <input type="hidden" name="competitionId" value={comp.id} />
                  <label className="label" htmlFor="league-deck">Con qué mazo juegas esta liga</label>
                  <DeckPicker
                    id="league-deck" name="deck" options={opcionesMazo}
                    emptyLabel={null} placeholder="Elige tu mazo, o solo el arquetipo"
                  />
                  <p className="text-xs text-muted">
                    Al enviarlo se bloquea: no podrás cambiarlo tú. El resto de jugadores solo verá
                    que lo has entregado, no cuál es.
                  </p>
                  <ConfirmButton
                    className="btn btn-brand w-full sm:w-auto"
                    message="¿Entregar este mazo? Quedará bloqueado para toda la liga."
                  >
                    <Icon name="lock" className="size-4" /> Entregar y bloquear
                  </ConfirmButton>
                </form>
              )}
            </div>
          )}

          {manager ? (
            <ul className="divide-y divide-line-soft">
              {ids.map((pid) => {
                const d = visibles.find((x) => x.playerId === pid);
                const p = snap.playersById.get(pid);
                return (
                  <li key={pid} className="flex items-center gap-2 px-3 py-2.5 xs:gap-3 xs:px-4">
                    <PlayerTag player={p} size="sm" className="min-w-0 flex-1" />
                    {d ? (
                      <>
                        <span className="flex min-w-0 max-w-[45%] items-center gap-1.5 text-xs">
                          {archDe(d) ? <Sprites archetype={archDe(d)!} size="sm" /> : null}
                          <span className="truncate">{nombreMazo(d)}</span>
                        </span>
                        <form action={unlockLeagueDeck} className="flex-none">
                          <input type="hidden" name="competitionId" value={comp.id} />
                          <input type="hidden" name="playerId" value={pid} />
                          <ConfirmButton
                            className="btn btn-ghost btn-sm px-2 text-xs"
                            title="Desbloquear"
                            message={`¿Desbloquear el mazo de ${p?.name ?? "esta persona"}? Tendrá que entregarlo otra vez.`}
                          >
                            <Icon name="refresh" className="size-4" />
                          </ConfirmButton>
                        </form>
                      </>
                    ) : (
                      <span className="chip flex-none text-[11px]">pendiente</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-3 text-xs text-muted">
              {entregados.size} de {ids.length} participantes han entregado su mazo.
            </p>
          )}
        </section>
      )}

      {/* v0.18 — `grid-cols-1` explícito y `min-w-0` en cada tarjeta: sin ellos,
          en el móvil la columna implícita se ensanchaba con el contenido (la
          pista «Round robin…», los nombres largos) y la tarjeta se salía de la
          pantalla por la derecha, cortando «Crear partidas» y «Anotar». */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card min-w-0">
          <div className="card-head">
            <h2 className="flex-none text-lg font-bold">Jornada {nextRound}</h2>
            <span className="min-w-0 truncate text-right text-xs text-muted" title={kind.hint}>{kind.hint}</span>
          </div>
          <div className="p-3 xs:p-4">
            {preview.pairs.length ? (
              <>
                <ul className="mb-3 divide-y divide-line-soft rounded-xl border border-line">
                  {preview.pairs.map(([a, b], i) => {
                    const A = snap.playersById.get(a),
                      B = snap.playersById.get(b);
                    return (
                      <li
                        key={`${a}-${b}`}
                        className="flex items-center gap-1.5 px-2 py-2.5 xs:gap-2 xs:px-3"
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

        <section className="card min-w-0">
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
                    className="flex min-h-14 items-center gap-2 px-3 hover:bg-surface-2 xs:gap-3 xs:px-4"
                  >
                    <span className="chip flex-none">J{m.round}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {snap.playersById.get(m.playerAId)?.name}{" "}
                      <span className="text-muted">vs</span>{" "}
                      {m.playerBId
                        ? snap.playersById.get(m.playerBId)?.name
                        : m.opponentName}
                    </span>
                    <span className="btn btn-brand btn-sm flex-none px-3">
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

      {/* v0.18 — plegado por defecto: es una herramienta de vez en cuando y
          ocupaba media pantalla al final de cada liga. */}
      {manager && (
        <details className="mb-6">
          <summary className="card tap mb-3 cursor-pointer justify-between px-4 font-display text-lg font-bold">
            Editar competición
            <span className="text-xs font-normal text-muted">organizador</span>
          </summary>
          <CompetitionForm
            competition={comp}
            players={snap.players}
            selectedPlayerIds={snap.playersOfComp.get(id) ?? []}
            canDelete={manager}
          />
        </details>
      )}
    </>
  );
}
