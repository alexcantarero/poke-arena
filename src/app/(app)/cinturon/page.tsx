import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { registerForBeltTournament, startBeltTournament, finishBeltTournament } from "@/actions";
import { PageHead, PlayerTag } from "@/components/ui";
import { Icon } from "@/components/icons";
import { db } from "@/db";
import { beltRegistrations, players } from "@/db/schema";
import { canManageLeague } from "@/lib/auth";
import { compPlayers, currentPlayer, loadSnapshot } from "@/lib/data";
import {
  CINTURON_CIERRE_INSCRIPCION,
  CINTURON_COMPETITION_ID,
  CINTURON_EVENT_ID,
  incluirDescansosEnClasificacion,
  iniciarCinturonPermitido,
  inscripcionCinturonAbierta,
} from "@/lib/cinturon";
import { suggestedRounds } from "@/lib/sugerencias";
import { standings } from "@/lib/stats";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Torneo del Cinturón" };

export default async function BeltTournamentPage() {
  const lang = await getLang();
  const [snap, me, registrations] = await Promise.all([
    loadSnapshot(),
    currentPlayer(),
    db.select({ playerId: beltRegistrations.playerId })
      .from(beltRegistrations)
      .innerJoin(players, and(
        eq(players.id, beltRegistrations.playerId),
        eq(players.active, true),
      ))
      .where(eq(beltRegistrations.eventId, CINTURON_EVENT_ID))
      .orderBy(asc(beltRegistrations.registeredAt)),
  ]);
  const competition = snap.compsById.get(CINTURON_COMPETITION_ID);
  const ids = competition ? compPlayers(snap, CINTURON_COMPETITION_ID) : registrations.map((r) => r.playerId);
  const enrolled = new Set(registrations.map((r) => r.playerId));
  const signupOpen = inscripcionCinturonAbierta(new Date())
    && (!competition || competition.status === "draft");
  const manager = me ? canManageLeague(me.role) : false;
  const matches = snap.matches.filter((match) => match.competitionId === CINTURON_COMPETITION_ID);
  const roundsPlayed = Math.max(0, ...matches.map((match) => match.round));
  const pending = matches.some((match) => match.status === "scheduled");
  const table = standings(
    incluirDescansosEnClasificacion(matches),
    ids,
    snap.elo.rating,
    snap.config,
  );
  const winner = competition?.status === "done" ? table[0] : undefined;
  const cierre = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "es-ES", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date(CINTURON_CIERRE_INSCRIPCION));
  const startAllowed = iniciarCinturonPermitido(new Date());
  const canFinish = manager && competition?.status === "live"
    && roundsPlayed >= competition.rounds && !pending;

  return (
    <>
      <PageHead
        title={tr(lang, "belt.title")}
        sub={tr(lang, "belt.subtitle")}
        actions={
          competition && competition.status !== "draft" ? (
            <Link className="btn btn-ghost btn-sm" href={`/competiciones/${CINTURON_COMPETITION_ID}`}>
              <Icon name="league" className="size-4" /> {tr(lang, "belt.openCompetition")}
            </Link>
          ) : undefined
        }
      />

      <section className="card mb-4 overflow-hidden">
        <div className="card-head">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold">{tr(lang, "belt.eventName")}</h2>
            <p className="mt-1 text-sm text-muted">{tr(lang, "belt.format")}</p>
          </div>
          <span className="chip chip-brand flex-none">Bo3</span>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <p className="text-sm text-ink-2">
            {trf(lang, "belt.deadline", { date: cierre })}
          </p>
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
          {!competition && (
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
              {registrations.map(({ playerId }, index) => {
                const player = snap.playersById.get(playerId);
                return (
                  <li key={playerId} className="flex min-w-0 items-center gap-2">
                    <span className="w-6 text-center font-mono text-xs tabular text-muted">{index + 1}</span>
                    <PlayerTag player={player} size="sm" className="min-w-0 flex-1" />
                  </li>
                );
              })}
            </ol>
          )}
          {manager && startAllowed && competition?.status === "draft" && (
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
              <button className="btn min-h-11 w-full sm:w-auto" type="submit">
                {tr(lang, "belt.finish")}
              </button>
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

      {competition?.status !== "draft" && competition && (
        <section className="card p-4">
          <p className="text-sm text-muted">{tr(lang, "belt.resultsHint")}</p>
          <Link className="btn btn-brand mt-3 min-h-11" href={`/competiciones/${CINTURON_COMPETITION_ID}`}>
            {tr(lang, "belt.openCompetition")} <Icon name="back" className="size-4 rotate-180" />
          </Link>
        </section>
      )}
    </>
  );
}
