import Link from "next/link";
import { notFound } from "next/navigation";
import { readSession, canManageLeague } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { awardsCp, getSeason } from "@/lib/cp";
import { fmtDateLong } from "@/lib/format";
import { firstTurnSeriesStats, recordOf, roundsOf } from "@/lib/stats";
import { TOURNAMENT_FORMATS } from "@/lib/types";
import { Empty, Kpi, PageHead, PlayerTag, Record, SectionTitle, Sprites } from "@/components/ui";
import { TournamentForm } from "@/components/TournamentForm";
import { TournamentRounds } from "@/components/TournamentRounds";
import { deleteTournament, deleteTournamentResult } from "@/actions";
import { Icon } from "@/components/icons";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  const t = snap.toursById.get(id);
  if (!t) notFound();

  const season = t.season ?? snap.config.cpSeason;
  const table = getSeason(season);
  const me = session ? snap.playersById.get(session.playerId) : undefined;
  const myResult = me ? t.results.find((r) => r.playerId === me.id) : undefined;
  const myDecks = me ? snap.decks.filter((d) => d.playerId === me.id && !d.retired) : [];
  const manager = me ? canManageLeague(me.role) : false;

  const ordered = [...t.results].sort((a, b) => (a.placement ?? 9e9) - (b.placement ?? 9e9));
  const totalCp = t.results.reduce((a, r) => a + r.cpEarned, 0);

  // Mis rondas de este torneo. El récord sale de ellas, nunca se teclea.
  const myRounds = me ? roundsOf(snap.matches, t.id, me.id) : [];
  const myRecord = recordOf(myRounds);
  const firstTurn = firstTurnSeriesStats(myRounds.map((r) => r.match));

  // Quién más ha apuntado rondas, para poder verlas sin poder editarlas.
  const othersWithRounds = snap.matches
    .filter((m) => m.tournamentId === t.id && m.playerBId === null && m.playerAId !== me?.id)
    .reduce<string[]>((acc, m) => (acc.includes(m.playerAId) ? acc : [...acc, m.playerAId]), []);

  return (
    <>
      <PageHead
        title={t.name}
        sub={
          <>
            {table.events[t.kind]?.label ?? t.kind} · {fmtDateLong(t.date)} · Bo{t.bestOf} ·{" "}
            {TOURNAMENT_FORMATS[t.format as keyof typeof TOURNAMENT_FORMATS] ?? t.format}
            {t.venue ? ` · ${t.venue}` : ""}{t.city ? `, ${t.city}` : ""}
          </>
        }
        actions={<Link className="btn btn-ghost btn-sm" href="/torneos"><Icon name="back" className="size-4" /> Torneos</Link>}
      />

      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi label="Asistencia" value={t.playerCount ?? "—"} note={t.rounds ? `${t.rounds} rondas` : "sin dato"} />
        <Kpi label="Del grupo" value={t.results.length} note="participaron" />
        <Kpi label="CP repartidos" value={totalCp} note={awardsCp(season, t.kind) ? `temporada ${season}` : "este tipo no da CP"} highlight={totalCp > 0} />
        <Kpi
          label="Mejor puesto"
          value={ordered[0]?.placement ?? "—"}
          note={ordered[0] ? snap.playersById.get(ordered[0].playerId)?.name ?? "" : "sin resultados"}
        />
      </div>

      {t.url && (
        <a className="btn mb-5 w-full sm:w-auto" href={t.url} target="_blank" rel="noopener noreferrer">
          <Icon name="share" className="size-4" /> Ver el torneo en su web
        </a>
      )}

      {/* ---------------------------------------------------------------
          Las rondas van PRIMERO, antes de los resultados y del formulario.
          Es lo que se abre estando en el evento: llegas, acabas la ronda 3 y
          quieres apuntarla sin bajar por toda la página. El puesto final y los
          premios se rellenan una vez, al terminar, y por eso van al final.
          --------------------------------------------------------------- */}
      {me && (
        <div className="mb-6">
          <TournamentRounds
            tournamentId={t.id}
            playerId={me.id}
            playerName={me.name}
            bestOf={t.bestOf}
            rounds={myRounds}
            record={myRecord}
            archetypes={snap.archetypes}
            decks={myDecks}
            totalRounds={t.rounds ?? null}
            archById={snap.archById}
            archIndex={snap.archIndex}
            canEdit
          />

          {firstTurn.n >= 3 && (
            <p className="mt-2 px-1 text-xs text-muted">
              De las {firstTurn.n} rondas en las que apuntaste quién salía primero, ganaste el{" "}
              {Math.round((firstTurn.winRate ?? 0) * 100)}% de las que empezaste tú.
            </p>
          )}
        </div>
      )}

      {othersWithRounds.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {othersWithRounds.map((pid) => {
            const p = snap.playersById.get(pid);
            const rounds = roundsOf(snap.matches, t.id, pid);
            return (
              <TournamentRounds
                key={pid}
                tournamentId={t.id}
                playerId={pid}
                playerName={p?.name ?? "Alguien"}
                bestOf={t.bestOf}
                rounds={rounds}
                record={recordOf(rounds)}
                archetypes={snap.archetypes}
                decks={[]}
                totalRounds={t.rounds ?? null}
                archById={snap.archById}
                archIndex={snap.archIndex}
                canEdit={manager}
              />
            );
          })}
        </div>
      )}

      <SectionTitle aside={`${t.results.length} resultados`}>Resultados del grupo</SectionTitle>

      {ordered.length ? (
        <div className="card mb-6 divide-y divide-line-soft">
          {ordered.map((r) => {
            const p = snap.playersById.get(r.playerId);
            const arch = r.deckId ? snap.archIndex.get(r.deckId) : (r.archetypeId ? snap.archById.get(r.archetypeId) : undefined);
            const canEdit = me && (r.playerId === me.id || manager);
            return (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 flex-none text-center">
                    <span className="block font-display text-xl font-extrabold tabular leading-none">
                      {r.placement ?? "—"}
                    </span>
                    {t.playerCount && r.placement && (
                      <span className="block text-[10px] text-muted">de {t.playerCount}</span>
                    )}
                  </span>

                  {/* El mazo va con su sprite, no como un texto debajo del
                      nombre: es lo que pedía Alex, y de un vistazo se reconoce
                      antes un Dragapult que la palabra «Dragapult». */}
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <Sprites archetype={arch} size="md" />
                    <span className="min-w-0 flex-1">
                      <PlayerTag player={p} size="sm" />
                      <span className="block truncate text-[11px] text-muted">
                        {arch?.name ?? "Mazo sin anotar"}
                      </span>
                    </span>
                  </span>

                  {(r.wins || r.losses || r.ties) ? <Record w={r.wins} d={r.ties} l={r.losses} /> : null}
                  {r.cpEarned > 0 && (
                    <span className="chip chip-brand tabular">
                      {r.cpEarned} CP{r.cpManual ? "*" : ""}
                    </span>
                  )}
                </div>

                {(r.prizes || r.dropped) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-12 text-xs">
                    {r.dropped && <span className="chip chip-tie">Se retiró</span>}
                    {r.prizes && <span className="chip">🎁 {r.prizes}</span>}
                  </div>
                )}
                {r.notes && <p className="mt-2 pl-12 text-sm text-ink-2">{r.notes}</p>}

                {canEdit && (
                  <form action={deleteTournamentResult} className="mt-2 pl-12">
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn btn-ghost btn-sm btn-danger" type="submit">Borrar este resultado</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card mb-6"><Empty title="Nadie ha puesto su resultado todavía" /></div>
      )}

      {/* El resultado final va dentro de un `details`: es de rellenar una vez,
          y desplegado empujaba las rondas fuera de la pantalla en el móvil. */}
      <details className="card mb-6" open={!myResult}>
        <summary className="tap cursor-pointer justify-between px-4 font-display text-lg font-bold">
          {myResult ? "Editar tu resultado final" : "Poner tu resultado final"}
          <span className="text-xs font-normal text-muted">puesto, CP y premios</span>
        </summary>
        <div className="border-t border-line-soft p-4">
          {myRecord.wins + myRecord.losses + myRecord.ties > 0 && (
            <p className="mb-4 rounded-lg bg-ground px-3 py-2 text-sm text-ink-2">
              Tus rondas dan <b className="font-mono tabular">{myRecord.label}</b>, y el récord se
              recalcula solo desde ahí. Aquí solo hacen falta el puesto, los CP y los premios.
            </p>
          )}
          <TournamentForm
            season={season}
            decks={myDecks}
            archetypes={snap.archetypes}
            tournament={t}
            result={myResult}
            resultOnly
          />
        </div>
      </details>

      {t.notes && (
        <div className="card mb-6 p-4">
          <h3 className="mb-1 font-bold">Notas del torneo</h3>
          <p className="text-sm text-ink-2">{t.notes}</p>
        </div>
      )}

      {manager && (
        <details className="card border-loss/40">
          <summary className="tap cursor-pointer justify-start px-4 text-sm font-semibold text-loss">
            Borrar este torneo
          </summary>
          <form action={deleteTournament} className="flex flex-col gap-3 border-t border-line-soft p-4">
            <input type="hidden" name="id" value={t.id} />
            <p className="text-sm text-ink-2">
              Se van el torneo, los {t.results.length} resultado(s) del grupo y todas las rondas
              apuntadas. No hay deshacer. Escribe el nombre del torneo para confirmar:
            </p>
            <input
              className="input" name="confirm" required autoComplete="off"
              placeholder={t.name} aria-label={`Escribe «${t.name}» para confirmar`}
            />
            <button className="btn btn-danger" type="submit">Borrar «{t.name}»</button>
          </form>
        </details>
      )}
    </>
  );
}
