import Link from "next/link";
import { compPlayers, loadSnapshot, playerCp } from "@/lib/data";
import { readSession } from "@/lib/auth";
import { archetypeStats, isInternal, isPlayed, standings } from "@/lib/stats";
import { pct, relDays, shortName, todayISO, wrColor } from "@/lib/format";
import {
  ArchTag, Avatar, Bars, Empty, Kpi, MatchCard, MatchList, PageHead, PlayerTag,
  Record, SectionTitle, Sprites, StreakChip,
} from "@/components/ui";
import { Icon } from "@/components/icons";

export default async function HomePage() {
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  const played = snap.matches.filter(isPlayed);
  const pending = snap.matches.filter((m) => m.status === "scheduled");

  const mainComp =
    snap.competitions.find((c) => c.status === "live" && c.kind === "league") ??
    snap.competitions.find((c) => c.status === "live") ??
    snap.competitions[0];

  const scoped = mainComp ? played.filter((m) => m.competitionId === mainComp.id) : played;
  const table = standings(
    scoped,
    mainComp ? compPlayers(snap, mainComp.id) : snap.activePlayerIds,
    snap.elo.rating,
    snap.config,
  );
  const leader = table.find((r) => r.played > 0);
  const mine = session ? table.find((r) => r.playerId === session.playerId) : undefined;
  const myCp = session ? playerCp(snap, session.playerId) : null;
  const archs = archetypeStats(played, snap.archIndex, undefined, snap.archById);
  const upcoming = snap.events.filter((e) => e.date >= todayISO()).slice(0, 3);
  const recent = played.slice(-6).reverse();
  const nextTournaments = snap.tournaments.filter((t) => t.date >= todayISO()).slice(-3).reverse();

  return (
    <>
      <PageHead
        title={snap.config.name}
        sub={`${snap.config.season} · ${snap.activePlayerIds.length} jugadores · ${played.length} partidas`}
        actions={
          <Link className="btn btn-brand hidden md:inline-flex" href="/partidas/nueva">
            <Icon name="plus" className="size-4" /> Registrar partida
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Kpi label="Partidas" value={played.length} note={`${played.filter((m) => !isInternal(m)).length} contra gente de fuera`} />
        <Kpi
          highlight
          label={mainComp ? shortName(mainComp.name, 16) : "Líder"}
          value={leader ? snap.playersById.get(leader.playerId)?.name ?? "—" : "—"}
          note={leader ? `${leader.points} pts · ${pct(leader.winRate, 0)}` : "sin datos"}
        />
        {mine
          ? <Kpi label="Tú" value={pct(mine.winRate, 0)} note={`${mine.wins}V ${mine.losses}D · Elo ${mine.elo}`} />
          : <Kpi label="Arquetipos" value={archs.length} note="vistos en la liga" />}
        <Kpi
          label="Tus CP"
          value={myCp ? myCp.total : "—"}
          note={myCp ? `temporada ${myCp.season}${myCp.confirmed ? "" : " · provisional"}` : "sin torneos"}
        />
      </div>

      {pending.length > 0 && (
        <section className="card mb-4">
          <div className="card-head">
            <h2 className="text-lg font-bold">Partidas pendientes</h2>
            <span className="text-xs text-muted">{pending.length}</span>
          </div>
          <ul className="divide-y divide-line-soft">
            {pending.slice(0, 5).map((m) => {
              const A = snap.playersById.get(m.playerAId);
              const B = m.playerBId ? snap.playersById.get(m.playerBId) : undefined;
              return (
                <li key={m.id}>
                  <Link href={`/partidas/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Avatar player={A} size="sm" />
                      <span className="truncate text-sm font-medium">{A?.name}</span>
                    </div>
                    <span className="flex-none font-display text-xs font-bold text-muted">VS</span>
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                      <span className="truncate text-right text-sm font-medium">{B?.name ?? m.opponentName}</span>
                      <Avatar player={B} size="sm" />
                    </div>
                    <span className="btn btn-brand btn-sm flex-none">Anotar</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="card-head">
            <h2 className="text-lg font-bold">Clasificación</h2>
            <Link className="btn btn-ghost btn-sm" href="/ranking">Ver toda</Link>
          </div>
          {table.some((r) => r.played) ? (
            <ol className="divide-y divide-line-soft">
              {table.slice(0, 6).map((r, i) => (
                <li key={r.playerId} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`w-5 flex-none text-center font-display text-lg font-extrabold tabular
                    ${i === 0 ? "text-brand" : "text-muted"}`}>{i + 1}</span>
                  <PlayerTag player={snap.playersById.get(r.playerId)} size="sm" className="flex-1" />
                  <Record w={r.wins} d={r.ties} l={r.losses} />
                  <span className="w-11 text-right font-mono text-sm font-semibold tabular" style={{ color: wrColor(r.winRate) }}>
                    {pct(r.winRate, 0)}
                  </span>
                  <StreakChip kind={r.streak.kind} n={r.streak.n} />
                </li>
              ))}
            </ol>
          ) : <Empty title="Sin partidas todavía">Registra la primera y esto se llena solo.</Empty>}
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="text-lg font-bold">Próximo</h2>
            <Link className="btn btn-ghost btn-sm" href="/calendario">Calendario</Link>
          </div>
          {upcoming.length || nextTournaments.length ? (
            <ul className="divide-y divide-line-soft">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <Icon name="calendar" className="size-5 flex-none text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{e.title}</span>
                    <span className="block text-xs text-muted">{relDays(e.date)}{e.note ? ` · ${e.note}` : ""}</span>
                  </span>
                </li>
              ))}
              {nextTournaments.map((t) => (
                <li key={t.id}>
                  <Link href={`/torneos/${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <Icon name="trophy" className="size-5 flex-none text-brand" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{t.name}</span>
                      <span className="block text-xs text-muted">{relDays(t.date)}{t.city ? ` · ${t.city}` : ""}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Nada en la agenda">
              Añade una jornada o apunta el próximo torneo al que vayáis.
            </Empty>
          )}
        </section>
      </div>

      <section className="card mt-4">
        <div className="card-head">
          <h2 className="text-lg font-bold">Últimos resultados</h2>
          <Link className="btn btn-ghost btn-sm" href="/resultados">Todos</Link>
        </div>
        {recent.length ? (
          <MatchList>
            {recent.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                playerA={snap.playersById.get(m.playerAId)}
                playerB={m.playerBId ? snap.playersById.get(m.playerBId) : undefined}
                archA={m.deckAId ? snap.archIndex.get(m.deckAId) : undefined}
                archB={m.deckBId ? snap.archIndex.get(m.deckBId) : (m.opponentArchetypeId ? snap.archById.get(m.opponentArchetypeId) : undefined)}
                context={m.competitionId ? snap.compsById.get(m.competitionId)?.name : m.tournamentId ? snap.toursById.get(m.tournamentId)?.name : undefined}
              />
            ))}
          </MatchList>
        ) : (
          <Empty
            title="Todavía no hay partidas"
            action={<Link className="btn btn-brand" href="/partidas/nueva">Registrar la primera</Link>}
          >
            En cuanto registréis unas cuantas, el ranking y las estadísticas se construyen solos.
          </Empty>
        )}
      </section>

      {archs.length > 0 && (
        <section className="card mt-4">
          <div className="card-head">
            <h2 className="text-lg font-bold">Mazos más jugados</h2>
            <Link className="btn btn-ghost btn-sm" href="/estadisticas">Estadísticas</Link>
          </div>
          <div className="p-4">
            <Bars
              rows={archs.slice(0, 6).map((a) => ({
                label: (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Sprites archetype={a.archetype} size="sm" />
                    <span className="truncate text-[13px]">{a.archetype?.name}</span>
                  </span>
                ),
                value: a.played,
                right: `${a.played} · ${pct(a.winRate, 0)}`,
                color: wrColor(a.winRate),
              }))}
            />
          </div>
        </section>
      )}
    </>
  );
}
