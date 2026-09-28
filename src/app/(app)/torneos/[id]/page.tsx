import Link from "next/link";
import { notFound } from "next/navigation";
import { canManageLeague } from "@/lib/auth";
import {
  archetypeOptions,
  currentPlayer,
  deckOptions,
  loadSnapshot,
} from "@/lib/data";
import { awardsCp, effectiveCp, getSeason, tierFor } from "@/lib/cp";
import { fmtDateLong } from "@/lib/format";
import { firstTurnSeriesStats, recordOf, roundsOf } from "@/lib/stats";
import { TOURNAMENT_FORMATS, archetypeValue, asStatus } from "@/lib/types";
import {
  Empty,
  Kpi,
  PageHead,
  PlayerTag,
  Record,
  SectionTitle,
  Sprites,
} from "@/components/ui";
import { AttendanceForm } from "@/components/AttendanceForm";
import { CaminoAlCorte } from "@/components/CaminoAlCorte";
import { TournamentLifecycle } from "@/components/TournamentLifecycle";
import { TournamentResultForm } from "@/components/TournamentResultForm";
import { RondasDelGrupo } from "@/components/RondasDelGrupo";
import { RoundForm } from "@/components/TournamentRounds";
import { estructuraDe } from "@/lib/estructura";
import { deleteTournament, deleteTournamentResult } from "@/actions";
import { Icon } from "@/components/icons";

/* =========================================================================
   La ficha del torneo, que es donde se hace el trabajo.

   El orden de la página es el orden en que pasan las cosas, no el orden en
   que están los datos en la base:

     1. En qué punto está y qué falta        (TournamentLifecycle)
     2. Rondas del grupo                     ← tú primero y abierto, los demás plegables
     3. Tu resultado final                   ← se rellena una vez, al acabar
     4. Cómo le fue al resto del grupo       (Resultados del grupo)

   Las rondas van casi lo primero porque el caso real es estar de pie en la
   tienda con dos minutos entre rondas. Y el formulario de edición de la
   cabecera ya no está aquí —se fue a /torneos/[id]/editar—: colgando debajo
   de la información parecía parte de ella.
   ========================================================================= */

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  const t = snap.toursById.get(id);
  if (!t) notFound();

  const season = t.season ?? snap.config.cpSeason;
  const table = getSeason(season);
  const status = asStatus(t.status);
  const manager = me ? canManageLeague(me.role) : false;
  // Mover el estado y editar la cabecera: quien lo creó y los organizadores.
  const canManage = Boolean(me && (manager || t.createdBy === me.id));

  const myResult = me ? t.results.find((r) => r.playerId === me.id) : undefined;
  const ordered = [...t.results].sort(
    (a, b) => (a.placement ?? 9e9) - (b.placement ?? 9e9),
  );
  /* Los CP se calculan aquí y NO se leen de la columna `cp_earned`.
     Esa columna es una caché que se rellena al guardar; si la asistencia se
     corrige por cualquier otro camino, se queda vieja y la ficha enseñaba una
     cifra distinta de la del perfil —que sí recalcula—. Con `effectiveCp` las
     dos pantallas no pueden discrepar nunca. */
  const cpDe = (r: {
    placement: number | null;
    cpEarned: number;
    cpManual: boolean;
  }) => effectiveCp(season, t.kind, r, t.playerCount);
  const totalCp = t.results.reduce((a, r) => a + cpDe(r), 0);

  // Mis rondas. El récord sale de ellas, nunca se teclea.
  const myRounds = me ? roundsOf(snap.matches, t.id, me.id) : [];
  const myRecord = recordOf(myRounds);
  const firstTurn = firstTurnSeriesStats(myRounds.map((r) => r.match));

  // Para «con qué jugué yo», los míos y los de la liga. Para «qué llevaba el
  // rival», todo lo que haya, porque el mazo de otra persona es exactamente lo
  // que te cruzas en una ronda.
  const myDecks = me ? deckOptions(snap, me.id, { includeOthers: false }) : [];
  const rivalDecks = me ? deckOptions(snap, me.id) : [];
  const archOptions = archetypeOptions(snap);
  /* El mazo fijado se resuelve aquí, contra la tabla entera: un mazo retirado
     no sale en los selectores pero sigue siendo el que se jugó. Y puede no
     haber mazo en absoluto: "bloquear el mismo mazo para todo el torneo"
     también funciona fijando solo el arquetipo, sin lista de 60 cartas. Las
     dos cosas viajan en el mismo valor —con el prefijo "arch:" cuando es solo
     arquetipo— porque así el mismo campo de formulario (`deckAId`) sirve para
     las dos, sin duplicar el picker ni la Server Action. */
  const lockValueOf = (r?: {
    deckId: string | null;
    archetypeId: string | null;
  }) => r?.deckId ?? (r?.archetypeId ? archetypeValue(r.archetypeId) : null);
  const lockLabelOf = (r?: {
    deckId: string | null;
    archetypeId: string | null;
  }) => {
    if (r?.deckId) return snap.decksById.get(r.deckId)?.name ?? null;
    if (r?.archetypeId) return snap.archById.get(r.archetypeId)?.name ?? null;
    return null;
  };

  const estructura = estructuraDe(t.playerCount, t.kind);

  // Jugadores del grupo con presencia en el torneo (por resultado o por rondas apuntadas, más tú si estás logueado)
  const participantIds = new Set<string>();
  if (me) participantIds.add(me.id);
  for (const r of t.results) participantIds.add(r.playerId);
  for (const m of snap.matches) {
    if (m.tournamentId === t.id && m.playerBId === null) {
      participantIds.add(m.playerAId);
    }
  }

  const participantes = Array.from(participantIds).map((pid) => {
    const p = snap.playersById.get(pid);
    const theirResult = t.results.find((r) => r.playerId === pid);
    const pRounds = roundsOf(snap.matches, t.id, pid);
    const pRecord = recordOf(pRounds);

    const arch = theirResult?.deckId
      ? snap.archIndex.get(theirResult.deckId)
      : theirResult?.archetypeId
        ? snap.archById.get(theirResult.archetypeId)
        : undefined;

    const roundArch =
      !arch && pRounds[0]?.match
        ? pRounds[0].match.archetypeAId
          ? snap.archById.get(pRounds[0].match.archetypeAId)
          : pRounds[0].match.deckAId
            ? snap.archIndex.get(pRounds[0].match.deckAId)
            : undefined
        : undefined;
    const finalArch = arch ?? roundArch;

    const mazoNombre = theirResult?.deckId
      ? (snap.decksById.get(theirResult.deckId)?.name ?? finalArch?.name)
      : finalArch?.name;

    const wins = pRounds.length ? pRecord.wins : (theirResult?.wins ?? 0);
    const losses = pRounds.length ? pRecord.losses : (theirResult?.losses ?? 0);
    const ties = pRounds.length ? pRecord.ties : (theirResult?.ties ?? 0);

    const canEditPlayerRounds = Boolean(
      me && (manager || pid === me.id) && status !== "closed",
    );

    return {
      id: pid,
      name: p?.name ?? "Alguien",
      mazo: mazoNombre,
      main: finalArch?.main,
      wins,
      losses,
      ties,
      puntos: wins * 3 + ties,
      placement: theirResult?.placement ?? null,
      rondas: pRounds.map((r) => {
        const oppArch = r.match.opponentArchetypeId
          ? snap.archById.get(r.match.opponentArchetypeId)
          : r.match.deckBId
            ? snap.archIndex.get(r.match.deckBId)
            : undefined;

        let ganados = r.ga;
        let perdidos = r.gb;
        if (ganados === 0 && perdidos === 0) {
          if (r.result === "w") {
            ganados = 1;
            perdidos = 0;
          } else if (r.result === "l") {
            ganados = 0;
            perdidos = 1;
          } else if (r.result === "d") {
            ganados = 0;
            perdidos = 0;
          }
        }

        const primero =
          r.firstGameOne === true ? "a" : r.firstGameOne === false ? "b" : "";

        return {
          round: r.round,
          rival: r.match.opponentName || "Rival sin nombre",
          mazoRival: oppArch?.name ?? undefined,
          main: oppArch?.main,
          secondary: oppArch?.secondary,
          ganados,
          perdidos,
          primero: primero as "a" | "b" | "",
          nota: r.match.note || undefined,
          editar: canEditPlayerRounds ? (
            <Link
              href={`/partidas/${r.match.id}`}
              className="btn btn-ghost btn-sm text-xs"
              title="Editar ronda"
            >
              Editar
            </Link>
          ) : undefined,
        };
      }),
    };
  });

  const nextRound = myRounds.length
    ? Math.max(...myRounds.map((r) => r.round)) + 1
    : 1;
  const finished = t.rounds != null && t.rounds > 0 && nextRound > t.rounds;

  const roundFormNode =
    me && status !== "closed" && status !== "draft" ? (
      <div className="flex flex-col gap-2">
        {finished && (
          <p className="text-xs text-muted">
            Tienes las {t.rounds} rondas apuntadas. Si hubo top cut, sigue
            añadiendo con el número de ronda que quieras.
          </p>
        )}
        <RoundForm
          tournamentId={t.id}
          playerId={me.id}
          round={nextRound}
          bestOf={t.bestOf}
          rivalDecks={rivalDecks}
          archetypeOptions={archOptions}
          myDecks={myDecks}
          lockedDeckId={lockValueOf(myResult)}
        />
      </div>
    ) : undefined;

  const myTier =
    myResult?.placement != null
      ? tierFor(season, t.kind, myResult.placement, t.playerCount)
      : null;

  /* Lo que falta por hacer. Se deduce de los datos y no del estado: un torneo
     cerrado al que le falte la asistencia sigue teniendo los CP mal. */
  const steps = [
    {
      label: "Falta la asistencia",
      done: t.playerCount != null && t.playerCount > 0,
      hint: awardsCp(season, t.kind)
        ? "Sin ella no se pueden calcular los Championship Points."
        : "Cuánta gente hubo.",
      href: `/torneos/${t.id}/editar`,
    },
    {
      label: "No has apuntado ninguna ronda",
      done: myRounds.length > 0 || !me,
      hint: "Rival, mazo y resultado de cada ronda. Alimenta la matriz de emparejamientos.",
    },
    {
      label: "Falta tu mazo",
      done: Boolean(myResult?.deckId || myResult?.archetypeId) || !me,
      hint: "Con qué jugaste el torneo.",
    },
    {
      label: "Falta tu puesto final",
      done: myResult?.placement != null || !me,
      hint: "Es lo que decide los CP.",
    },
  ];

  return (
    <>
      <PageHead
        title={t.name}
        sub={
          <>
            {table.events[t.kind]?.label ?? t.kind} · {fmtDateLong(t.date)}
            {t.startTime ? ` · ${t.startTime}` : ""} · Bo{t.bestOf} ·{" "}
            {TOURNAMENT_FORMATS[t.format as keyof typeof TOURNAMENT_FORMATS] ??
              t.format}
            {t.venue ? ` · ${t.venue}` : ""}
            {t.city ? `, ${t.city}` : ""}
            {t.entryFeeCents != null
              ? ` · ${(t.entryFeeCents / 100).toFixed(2).replace(".", ",")} €`
              : ""}
          </>
        }
        actions={
          <Link className="btn btn-ghost btn-sm" href="/torneos">
            <Icon name="back" className="size-4" /> Torneos
          </Link>
        }
      />

      <TournamentLifecycle
        id={t.id}
        status={status}
        closedAt={t.closedAt}
        canManage={canManage}
        steps={steps}
        roundsDone={myRounds.length}
        totalRounds={t.rounds ?? null}
      />

      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi
          label="Asistencia"
          value={t.playerCount ?? "—"}
          note={t.rounds ? `${t.rounds} rondas` : "sin dato"}
        />
        <Kpi label="Del grupo" value={t.results.length} note="participaron" />
        <Kpi
          label="CP repartidos"
          value={totalCp}
          note={
            awardsCp(season, t.kind)
              ? `temporada ${season}`
              : "este tipo no da CP"
          }
          highlight={totalCp > 0}
        />
        <Kpi
          label="Mejor puesto"
          value={ordered[0]?.placement ?? "—"}
          note={
            ordered[0]
              ? (snap.playersById.get(ordered[0].playerId)?.name ?? "")
              : "sin resultados"
          }
        />
      </div>

      {myTier?.invite && (
        <p className="card mb-5 flex items-start gap-2.5 border-brand-line bg-brand-soft p-4 text-sm font-semibold text-brand">
          <Icon name="trophy" className="mt-0.5 size-5 flex-none" />
          Ese puesto da invitación directa al Campeonato Mundial, al margen de
          los puntos.
        </p>
      )}

      {/* La asistencia va lo primero cuando falta: es lo que desbloquea los
          CP de todo el mundo, y mientras no esté, el resto de la ficha miente
          por omisión. Cuando está puesta y nadie pierde puntos, no se pinta. */}
      <AttendanceForm
        tournamentId={t.id}
        season={season}
        kind={t.kind}
        playerCount={t.playerCount ?? null}
        rounds={t.rounds ?? null}
        topCut={t.topCut ?? null}
        results={t.results}
        nameOf={(id) => snap.playersById.get(id)?.name ?? "Alguien"}
        canEdit={canManage}
      />

      {/* Entre ronda y ronda, lo que se quiere saber es qué hace falta para
          entrar. Va antes que las rondas y no después: mientras el torneo está
          abierto es lo primero que se mira, y cuando ya está cerrado deja de
          enseñarse solo. */}
      {me && status !== "draft" && (
        <CaminoAlCorte
          kind={t.kind}
          playerCount={t.playerCount}
          rondasTotales={t.rounds} // lo configurado a mano manda sobre la tabla
          topCut={t.topCut}
          storageKey={`torneo-${t.id}`} // para que recuerde el plegado por torneo
          rondas={myRounds.flatMap((m) =>
            m.result
              ? [{ round: m.round, result: m.result === "d" ? "t" : m.result }]
              : [],
          )}
        />
      )}

      {t.url && (
        <a
          className="btn mb-5 w-full sm:w-auto"
          href={t.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="share" className="size-4" /> Ver el torneo en su web
        </a>
      )}

      {/* --------------------- 2. rondas del grupo --------------------------- */}
      {status === "draft" ? (
        me && (
          <div className="card mb-6">
            <Empty title="El torneo todavía no ha empezado">
              Cuando llegue el día, dale a «Empezar el torneo» ahí arriba y
              podrás ir apuntando las rondas.
            </Empty>
          </div>
        )
      ) : (
        <div className="mb-6">
          <RondasDelGrupo
            yoId={me?.id ?? ""}
            fase1={estructura?.fase1 ?? t.rounds ?? 0}
            total={t.rounds ?? 0}
            jugadores={participantes}
            formulario={roundFormNode}
          />

          {firstTurn.n >= 3 && (
            <p className="mt-2 px-1 text-xs text-muted">
              De las {firstTurn.n} rondas en las que apuntaste quién salía
              primero, ganaste el {Math.round((firstTurn.winRate ?? 0) * 100)}%
              de las que empezaste tú.
            </p>
          )}
        </div>
      )}

      {/* ------------------------- 3. tu resultado --------------------------- */}
      {me && status !== "draft" && (
        <details className="card mb-6" open={!myResult?.placement}>
          <summary className="tap cursor-pointer justify-between px-4 font-display text-lg font-bold">
            {myResult?.placement
              ? "Editar tu resultado final"
              : "Poner tu resultado final"}
            <span className="text-xs font-normal text-muted">
              puesto, mazo, CP y premios
            </span>
          </summary>
          <div className="border-t border-line-soft p-4">
            <TournamentResultForm
              season={season}
              tournament={t}
              result={myResult}
              deckOptions={myDecks}
              archetypeOptions={archOptions}
              roundRecord={myRounds.length ? myRecord : null}
            />
          </div>
        </details>
      )}

      {/* ---------------------- 4. el resto del grupo ------------------------ */}
      <SectionTitle aside={`${t.results.length} resultados`}>
        Resultados del grupo
      </SectionTitle>

      {ordered.length ? (
        <div className="card mb-6 divide-y divide-line-soft">
          {ordered.map((r) => {
            const p = snap.playersById.get(r.playerId);
            const arch = r.deckId
              ? snap.archIndex.get(r.deckId)
              : r.archetypeId
                ? snap.archById.get(r.archetypeId)
                : undefined;
            const canEdit = me && (r.playerId === me.id || manager);
            const tier =
              r.placement != null
                ? tierFor(season, t.kind, r.placement, t.playerCount)
                : null;
            return (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 flex-none text-center">
                    <span className="block font-display text-xl font-extrabold tabular leading-none">
                      {r.placement ?? "—"}
                    </span>
                    {t.playerCount && r.placement && (
                      <span className="block text-[10px] text-muted">
                        de {t.playerCount}
                      </span>
                    )}
                  </span>

                  {/* El mazo va con su sprite, no como un texto debajo del
                      nombre: de un vistazo se reconoce antes un Dragapult que
                      la palabra «Dragapult». */}
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <Sprites archetype={arch} size="md" />
                    <span className="min-w-0 flex-1">
                      <PlayerTag player={p} size="sm" />
                      <span className="block truncate text-[11px] text-muted">
                        {arch?.name ?? "Mazo sin anotar"}
                      </span>
                    </span>
                  </span>

                  {r.wins || r.losses || r.ties ? (
                    <Record w={r.wins} d={r.ties} l={r.losses} />
                  ) : null}
                  {cpDe(r) > 0 && (
                    <span className="chip chip-brand tabular">
                      {cpDe(r)} CP{r.cpManual ? "*" : ""}
                    </span>
                  )}
                </div>

                {(r.prizes || r.dropped || tier?.invite) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-12 text-xs">
                    {tier?.invite && (
                      <span className="chip chip-brand">
                        Invitación al Mundial
                      </span>
                    )}
                    {r.dropped && (
                      <span className="chip chip-tie">Se retiró</span>
                    )}
                    {r.prizes && <span className="chip">{r.prizes}</span>}
                  </div>
                )}
                {r.notes && (
                  <p className="mt-2 pl-12 text-sm text-ink-2">{r.notes}</p>
                )}

                {canEdit && (
                  <form action={deleteTournamentResult} className="mt-2 pl-12">
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      className="btn btn-ghost btn-sm btn-danger"
                      type="submit"
                    >
                      Borrar este resultado
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card mb-6">
          <Empty title="Nadie ha puesto su resultado todavía" />
        </div>
      )}

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
          <form
            action={deleteTournament}
            className="flex flex-col gap-3 border-t border-line-soft p-4"
          >
            <input type="hidden" name="id" value={t.id} />
            <p className="text-sm text-ink-2">
              Se van el torneo, los {t.results.length} resultado(s) del grupo y
              todas las rondas apuntadas. No hay deshacer. Escribe el nombre del
              torneo para confirmar:
            </p>
            <input
              className="input"
              name="confirm"
              required
              autoComplete="off"
              placeholder={t.name}
              aria-label={`Escribe «${t.name}» para confirmar`}
            />
            <button className="btn btn-danger" type="submit">
              Borrar «{t.name}»
            </button>
          </form>
        </details>
      )}
    </>
  );
}
