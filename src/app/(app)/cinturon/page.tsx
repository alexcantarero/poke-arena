import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import {
  answerBeltChallenge, confirmBeltResult, finishBeltTournament, openVacantBeltSwiss,
  registerForBeltTournament, reportBeltResult, requestBeltChallenge, startBeltTournament,
} from "@/actions";
import { Icon } from "@/components/icons";
import { PageHead, PlayerTag } from "@/components/ui";
import { db } from "@/db";
import { beltRegistrations, players } from "@/db/schema";
import { canManageLeague } from "@/lib/auth";
import { compPlayers, currentPlayer, loadSnapshot, mainCompetition } from "@/lib/data";
import {
  CINTURON_CIERRE_INSCRIPCION, CINTURON_COMPETITION_ID,
  cumpleRequisitoReto, incluirDescansosEnClasificacion, iniciarCinturonPermitido, inscripcionCinturonAbierta,
} from "@/lib/cinturon";
import { leerEstadoCinturon } from "@/lib/cinturonDb";
import { suggestedRounds } from "@/lib/sugerencias";
import { standings } from "@/lib/stats";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Torneo del Cinturón" };

const RETOS_ABIERTOS = new Set(["pending", "accepted", "result_pending"]);

export default async function BeltTournamentPage() {
  const lang = await getLang();
  const [snap, me, belt] = await Promise.all([
    loadSnapshot(),
    currentPlayer(),
    leerEstadoCinturon(),
  ]);
  const eventId = belt.state?.currentEventId ?? CINTURON_COMPETITION_ID;
  const [registrations] = await Promise.all([
    db.select({ playerId: beltRegistrations.playerId })
      .from(beltRegistrations)
      .innerJoin(players, and(
        eq(players.id, beltRegistrations.playerId),
        eq(players.active, true),
      ))
      .where(eq(beltRegistrations.eventId, eventId))
      .orderBy(asc(beltRegistrations.registeredAt)),
  ]);
  const competition = snap.compsById.get(eventId);
  const ids = competition ? compPlayers(snap, eventId) : registrations.map((r) => r.playerId);
  const enrolled = new Set(registrations.map((r) => r.playerId));
  const holder = belt.holderId ? snap.playersById.get(belt.holderId) : undefined;
  const signupOpen = !holder
    && (!competition || competition.status === "draft")
    && (eventId !== CINTURON_COMPETITION_ID || inscripcionCinturonAbierta(new Date()));
  const manager = me ? canManageLeague(me.role) : false;
  const eventMatches = snap.matches.filter((match) => match.competitionId === eventId);
  const matches = incluirDescansosEnClasificacion(eventMatches);
  const roundsPlayed = Math.max(0, ...eventMatches.map((match) => match.round));
  const pending = eventMatches.some((match) => match.status !== "done");
  const table = standings(matches, ids, snap.elo.rating, snap.config);
  const winner = competition?.status === "done" ? table[0] : undefined;
  const startAllowed = eventId !== CINTURON_COMPETITION_ID || iniciarCinturonPermitido(new Date());
  const canFinish = manager && !holder && competition?.status === "live"
    && roundsPlayed >= competition.rounds && !pending;
  const vacancyCanStart = manager && !holder && Boolean(belt.state?.vacantSince)
    && (!competition || competition.status === "done");
  const candidateMain = mainCompetition(snap);
  const main = candidateMain?.status === "done" ? undefined : candidateMain;
  const active = new Set(snap.activePlayerIds);
  const leagueIds = (main ? compPlayers(snap, main.id) : snap.activePlayerIds).filter((id) => active.has(id));
  const leagueMatches = main ? snap.matches.filter((match) => match.competitionId === main.id) : [];
  const leagueTable = standings(leagueMatches, leagueIds, snap.elo.rating, snap.config);
  const positionIndex = me ? leagueTable.findIndex((row) => row.playerId === me.id) : -1;
  const position = positionIndex >= 0 ? positionIndex + 1 : null;
  const elo = me ? snap.elo.rating[me.id] ?? snap.config.eloStart : null;
  const eligible = me && cumpleRequisitoReto(position, elo);
  const activeChallenge = belt.challenges.find((challenge) => RETOS_ABIERTOS.has(challenge.status));
  const recentLoss = me && holder ? belt.challenges.find((challenge) =>
    challenge.challengerId === me.id
      && challenge.championId === holder.id
      && challenge.status === "completed"
      && challenge.resultWinnerId === holder.id
      && challenge.resultConfirmedAt !== null
      && Date.now() < challenge.resultConfirmedAt.getTime() + 30 * 86400000) : undefined;
  const cooldownUntil = recentLoss?.resultConfirmedAt
    ? new Date(recentLoss.resultConfirmedAt.getTime() + 30 * 86400000)
    : null;
  const canChallenge = Boolean(me && holder && me.id !== holder.id && eligible && !activeChallenge && !recentLoss);
  const cierre = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "es-ES", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date(CINTURON_CIERRE_INSCRIPCION));
  const fecha = (date: Date) => new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "es-ES", {
    dateStyle: "long",
    timeZone: "Europe/Madrid",
  }).format(date);
  const getPlayer = (id: string) => snap.playersById.get(id);
  const statusLabel = (status: string) => {
    if (status === "pending") return tr(lang, "belt.statusPending");
    if (status === "accepted") return tr(lang, "belt.statusAccepted");
    if (status === "result_pending") return tr(lang, "belt.statusResultPending");
    if (status === "completed") return tr(lang, "belt.statusCompleted");
    if (status === "declined") return tr(lang, "belt.statusDeclined");
    if (status === "expired") return tr(lang, "belt.statusExpired");
    return tr(lang, "belt.statusCancelled");
  };

  return (
    <>
      <PageHead
        title={tr(lang, "belt.title")}
        sub={tr(lang, "belt.subtitle")}
        actions={
          competition && competition.status !== "draft" ? (
            <Link className="btn btn-ghost btn-sm" href={`/competiciones/${eventId}`}>
              <Icon name="league" className="size-4" /> {tr(lang, "belt.openCompetition")}
            </Link>
          ) : undefined
        }
      />

      <section className="card mb-4 overflow-hidden">
        <div className="card-head">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold">{tr(lang, "belt.currentHolder")}</h2>
            <p className="mt-1 text-sm text-muted">
              {holder ? <PlayerTag player={holder} size="sm" /> : tr(lang, "belt.vacant")}
            </p>
            {holder && belt.state?.lastDefendedAt && (
              <p className="mt-1 text-xs text-muted">
                {trf(lang, "belt.lastDefense", { date: fecha(belt.state.lastDefendedAt) })}
              </p>
            )}
            {!holder && belt.state?.vacantSince && (
              <p className="mt-1 text-xs text-muted">
                {trf(lang, "belt.vacantSince", { date: fecha(belt.state.vacantSince) })}
              </p>
            )}
          </div>
          {holder && <span className="chip chip-brand flex-none">🏆 {tr(lang, "belt.holderLabel")}</span>}
        </div>

        {holder && (
          <div className="flex flex-col gap-3 border-t border-line-soft p-4">
            <p className="text-sm text-muted">{tr(lang, "belt.challengeEligibility")}</p>
            {canChallenge && (
              <form action={requestBeltChallenge}>
                <button className="btn btn-brand min-h-11 w-full sm:w-auto" type="submit">
                  {tr(lang, "belt.challenge")}
                </button>
              </form>
            )}
            {me && me.id !== holder.id && !eligible && (
              <p className="text-sm text-muted">{tr(lang, "belt.challengeIneligible")}</p>
            )}
            {cooldownUntil && (
              <p className="text-sm text-muted">
                {trf(lang, "belt.cooldown", {
                  date: fecha(cooldownUntil),
                })}
              </p>
            )}
          </div>
        )}

        {vacancyCanStart && (
          <form action={openVacantBeltSwiss} className="border-t border-line-soft p-4">
            <p className="mb-3 text-sm text-muted">{tr(lang, "belt.noHolder")}</p>
            <button className="btn btn-brand min-h-11 w-full sm:w-auto" type="submit">
              {tr(lang, "belt.openVacantSwiss")}
            </button>
          </form>
        )}
      </section>

      {activeChallenge && (
        <section className="card mb-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">{tr(lang, "belt.challengeHistory")}</h2>
            <span className="chip chip-brand">{statusLabel(activeChallenge.status)}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <PlayerTag player={getPlayer(activeChallenge.challengerId)} size="sm" />
            <span className="text-muted">vs</span>
            <PlayerTag player={getPlayer(activeChallenge.championId)} size="sm" />
          </div>
          {activeChallenge.status === "pending" && (
            <p className="mt-2 text-sm text-muted">
              {trf(lang, "belt.respondBy", {
                date: fecha(new Date(activeChallenge.requestedAt.getTime() + 10 * 86400000)),
              })}
            </p>
          )}
          {activeChallenge.status === "pending" && me?.id === activeChallenge.championId && (
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={answerBeltChallenge}>
                <input type="hidden" name="challengeId" value={activeChallenge.id} />
                <input type="hidden" name="decision" value="accept" />
                <button className="btn btn-brand min-h-11" type="submit">{tr(lang, "belt.accept")}</button>
              </form>
              <form action={answerBeltChallenge}>
                <input type="hidden" name="challengeId" value={activeChallenge.id} />
                <input type="hidden" name="decision" value="decline" />
                <button className="btn min-h-11" type="submit">{tr(lang, "belt.decline")}</button>
              </form>
            </div>
          )}
          {activeChallenge.status === "accepted" && me
              && [activeChallenge.challengerId, activeChallenge.championId].includes(me.id) && (
            <form action={reportBeltResult} className="mt-4 flex flex-col gap-2 sm:max-w-sm">
              <input type="hidden" name="challengeId" value={activeChallenge.id} />
              <label className="label" htmlFor="beltWinner">{tr(lang, "belt.winnerSelect")}</label>
              <select className="input min-h-11" id="beltWinner" name="winnerId" required>
                <option value="">{tr(lang, "belt.winnerSelect")}</option>
                <option value={activeChallenge.challengerId}>{getPlayer(activeChallenge.challengerId)?.name}</option>
                <option value={activeChallenge.championId}>{getPlayer(activeChallenge.championId)?.name}</option>
              </select>
              <button className="btn btn-brand min-h-11" type="submit">{tr(lang, "belt.reportResult")}</button>
            </form>
          )}
          {activeChallenge.status === "result_pending" && activeChallenge.resultWinnerId && (
            <>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                {tr(lang, "belt.reportedWinner")}
                <PlayerTag player={getPlayer(activeChallenge.resultWinnerId)} size="sm" />
              </p>
              {me && activeChallenge.resultReportedBy !== me.id
                  && [activeChallenge.challengerId, activeChallenge.championId].includes(me.id) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={confirmBeltResult}>
                    <input type="hidden" name="challengeId" value={activeChallenge.id} />
                    <input type="hidden" name="decision" value="confirm" />
                    <button className="btn btn-brand min-h-11" type="submit">{tr(lang, "belt.confirmResult")}</button>
                  </form>
                  <form action={confirmBeltResult}>
                    <input type="hidden" name="challengeId" value={activeChallenge.id} />
                    <input type="hidden" name="decision" value="dispute" />
                    <button className="btn min-h-11" type="submit">{tr(lang, "belt.disputeResult")}</button>
                  </form>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <section className="card mb-4 overflow-hidden">
        <div className="card-head">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold">{tr(lang, "belt.eventName")}</h2>
            <p className="mt-1 text-sm text-muted">{tr(lang, "belt.format")}</p>
          </div>
          <span className="chip chip-brand flex-none">Bo3</span>
        </div>
        <div className="flex flex-col gap-3 p-4">
          {eventId === CINTURON_COMPETITION_ID && (
            <p className="text-sm text-ink-2">{trf(lang, "belt.deadline", { date: cierre })}</p>
          )}
          {signupOpen && me && !enrolled.has(me.id) && (
            <form action={registerForBeltTournament}>
              <button className="btn btn-brand min-h-11 w-full sm:w-auto" type="submit">
                {tr(lang, "belt.register")}
              </button>
            </form>
          )}
          {signupOpen && me && enrolled.has(me.id) && (
            <p className="chip chip-win w-fit">{tr(lang, "belt.registered")}</p>
          )}
          {!signupOpen && competition?.status === "draft" && (
            <p className="text-sm font-semibold text-muted">{tr(lang, "belt.registrationClosed")}</p>
          )}
          {!competition && registrations.length === 0 && (
            <p className="text-sm text-muted">{tr(lang, "belt.noSignups")}</p>
          )}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line-soft pt-3">
            <span className="font-mono text-lg font-bold tabular">{registrations.length}</span>
            <span className="text-sm text-muted">{tr(lang, "belt.playersRegistered")}</span>
            {registrations.length >= 2 && (
              <span className="text-xs text-muted">
                {trf(lang, "belt.roundCount", { n: suggestedRounds(registrations.length) })}
              </span>
            )}
          </div>
          {registrations.length > 0 && (
            <ol className="grid gap-2 border-t border-line-soft pt-3 sm:grid-cols-2">
              {registrations.map(({ playerId }, index) => (
                <li key={playerId} className="flex min-w-0 items-center gap-2">
                  <span className="w-6 text-center font-mono text-xs tabular text-muted">{index + 1}</span>
                  <PlayerTag player={snap.playersById.get(playerId)} size="sm" className="min-w-0 flex-1" />
                </li>
              ))}
            </ol>
          )}
          {manager && startAllowed && !holder && competition?.status === "draft" && (
            <form action={startBeltTournament} className="border-t border-line-soft pt-3">
              <button className="btn btn-brand min-h-11 w-full sm:w-auto" type="submit" disabled={registrations.length < 2}>
                {tr(lang, "belt.startSwiss")}
              </button>
              {registrations.length < 2 && (
                <p className="mt-2 text-xs text-muted">{tr(lang, "belt.needsTwoHint")}</p>
              )}
            </form>
          )}
          {competition?.status === "live" && (
            <p className="border-t border-line-soft pt-3 text-sm text-muted">
              {trf(lang, "belt.progress", { round: roundsPlayed, total: competition.rounds })}
            </p>
          )}
          {canFinish && (
            <form action={finishBeltTournament}>
              <input type="hidden" name="eventId" value={eventId} />
              <button className="btn min-h-11 w-full sm:w-auto" type="submit">{tr(lang, "belt.finish")}</button>
            </form>
          )}
          {winner && (
            <div className="flex items-center gap-3 rounded-xl border border-brand-line bg-brand-soft p-3">
              <span className="text-2xl" aria-hidden="true">🏆</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{tr(lang, "belt.winner")}</p>
                <PlayerTag player={snap.playersById.get(winner.playerId)} size="sm" />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-display text-lg font-bold">{tr(lang, "belt.challengeHistory")}</h2>
        {belt.challenges.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{tr(lang, "belt.noChallenges")}</p>
        ) : (
          <ol className="mt-3 divide-y divide-line-soft">
            {belt.challenges.map((challenge) => (
              <li key={challenge.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                  <PlayerTag player={getPlayer(challenge.challengerId)} size="xs" />
                  <span className="text-muted">vs</span>
                  <PlayerTag player={getPlayer(challenge.championId)} size="xs" />
                  {challenge.status === "completed" && challenge.resultWinnerId && (
                    <span className="text-xs text-muted">
                      · <PlayerTag player={getPlayer(challenge.resultWinnerId)} size="xs" />
                    </span>
                  )}
                </div>
                <span className="chip">{statusLabel(challenge.status)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
