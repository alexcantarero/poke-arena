import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSnapshot, playerCp } from "@/lib/data";
import { readSession } from "@/lib/auth";
import {
  archetypeStats, headToHead, isPlayed, longestWinStreak, outcome, playerMatchups, sideOf, standings,
} from "@/lib/stats";
import { getSeason } from "@/lib/cp";
import { fmtDate, fmtDateLong, pct, shortName, wrColor } from "@/lib/format";
import {
  ArchTag, Avatar, Empty, Kpi, MatchCard, MatchList, PageHead, PlayerTag, Record,
  SectionTitle, Sparkline, SplitBar, Sprites,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { LadderClear, LadderEditor, RankBadge, RankProgress } from "@/components/Ladder";
import { canManageLeague } from "@/lib/auth";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  const player = snap.playersById.get(id);
  if (!player) notFound();

  const isMe = session?.playerId === id;
  const all = snap.matches.filter(isPlayed);
  const mine = all.filter((m) => sideOf(m, id));
  const row = standings(all, snap.activePlayerIds, snap.elo.rating, snap.config).find((r) => r.playerId === id);
  const history = (snap.elo.history[id] ?? []).map((h) => h.value);
  const archs = archetypeStats(mine, snap.archIndex, id, snap.archById);
  const matchups = playerMatchups(all, id, snap.archIndex, 2, snap.archById);
  const rivals = headToHead(all, id);
  const decks = snap.decks.filter((d) => d.playerId === id);
  const cp = playerCp(snap, id);
  const cpTable = getSeason(cp.season);
  const myTours = snap.tournaments.filter((t) => t.results.some((r) => r.playerId === id));
  const favArch = player.favoriteArchetypeId ? snap.archById.get(player.favoriteArchetypeId) : undefined;

  // El rango del ladder lo cambia cada uno; el de otra persona, un
  // organizador. La comprobación de verdad está dentro de la Server Action.
  const me = session ? snap.playersById.get(session.playerId) : undefined;
  const canEditLadder = Boolean(me && (isMe || canManageLeague(me.role)));

  let gw = 0, gl = 0;
  for (const m of mine) {
    const o = outcome(m);
    const side = sideOf(m, id);
    gw += side === "a" ? o.ga : o.gb;
    gl += side === "a" ? o.gb : o.ga;
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start gap-4">
        <Avatar player={player} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold leading-none">{player.name}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            {player.role !== "player" && <span className="chip chip-brand">{player.role === "owner" ? "Organizador" : "Admin"}</span>}
            {isMe && <span className="chip chip-info">eres tú</span>}
            {player.ladderElo != null && <RankBadge elo={player.ladderElo} size="sm" />}
            <span>Desde {fmtDateLong(player.joined)}</span>
          </p>
          {player.bio && <p className="mt-2 max-w-prose text-sm text-ink-2">{player.bio}</p>}
          {favArch && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm">
              <span className="text-muted">Mazo favorito:</span>
              <Sprites archetype={favArch} size="sm" />
              <span className="font-semibold">{favArch.name}</span>
            </p>
          )}
        </div>
        {isMe && (
          <Link className="btn btn-sm" href="/perfil/editar">
            <Icon name="cog" className="size-4" /> Editar perfil
          </Link>
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi label="Partidas" value={mine.length} note={row ? `${row.wins}V ${row.ties ? `${row.ties}E ` : ""}${row.losses}D` : "—"} />
        <Kpi label="% victorias" value={pct(row?.winRate, 0)} note={`juegos ${gw}–${gl}`} highlight={(row?.winRate ?? 0) >= 0.5} />
        <Kpi label="Elo" value={row?.elo ?? snap.config.eloStart}
          note={`${(row?.elo ?? snap.config.eloStart) - snap.config.eloStart >= 0 ? "+" : ""}${(row?.elo ?? snap.config.eloStart) - snap.config.eloStart} desde el inicio`} />
        <Kpi label={`CP ${cp.season}`} value={cp.total} note={cpTable.confirmed ? `${myTours.length} torneos` : "cifras provisionales"} />
      </div>

      {/* --------------------------- Championship Points --------------------------- */}
      {cp.rows.length > 0 && (
        <section className="card mb-5">
          <div className="card-head">
            <h2 className="text-lg font-bold">Championship Points</h2>
            <Link className="btn btn-ghost btn-sm" href="/torneos">Torneos</Link>
          </div>

          <div className="grid gap-3 border-b border-line-soft p-4 sm:grid-cols-2 lg:grid-cols-3">
            {cp.buckets.map((b) => (
              <div key={b.bucket} className="rounded-lg border border-line-soft bg-ground p-3">
                <div className="truncate text-xs font-semibold text-muted">{b.label}</div>
                <div className="font-display text-2xl font-extrabold tabular">{b.total}</div>
                <div className="text-xs text-muted">
                  {b.bfl > 0 ? `${b.counting}/${b.bfl} huecos` : "sin límite"}
                </div>
              </div>
            ))}
          </div>

          <ul className="divide-y divide-line-soft">
            {cp.rows.map((r) => (
              <li key={r.id} className={`flex items-center gap-3 px-4 py-2.5 ${r.excluded ? "opacity-45" : ""}`}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.tournamentName}</span>
                  <span className="block text-xs text-muted">
                    {fmtDate(r.date)}{r.placement ? ` · puesto ${r.placement}` : ""}
                    {r.excluded ? " · fuera por Best Finish Limit" : ""}
                  </span>
                </span>
                <span className="font-mono text-sm font-semibold tabular">
                  {r.excluded ? <s>{r.cpEarned || 0}</s> : r.counted}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="card-head"><h2 className="text-lg font-bold">Evolución del Elo</h2></div>
          <div className="p-4">
            <Sparkline values={history} width={320} height={90} />
            {history.length > 1 && (
              <p className="mt-2 text-xs text-muted">
                {history.length} puntos · mín {Math.round(Math.min(...history))} · máx {Math.round(Math.max(...history))}
                · mejor racha {longestWinStreak(all, id)} victorias
              </p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="text-lg font-bold">Sus mazos</h2>
            {isMe && <Link className="btn btn-sm" href="/mazos/nuevo">+ Mazo</Link>}
          </div>
          {archs.length ? (
            <ul className="divide-y divide-line-soft">
              {archs.map((a) => (
                <li key={a.archetypeId} className="flex items-center gap-3 px-4 py-2.5">
                  <ArchTag archetype={a.archetype} className="min-w-0 flex-1" />
                  <Record w={a.wins} d={a.ties} l={a.losses} />
                  <span className="w-11 text-right font-mono text-sm font-semibold tabular" style={{ color: wrColor(a.winRate) }}>
                    {pct(a.winRate, 0)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Sin partidas con mazo asignado">
              {decks.length ? "Asigna el mazo al registrar la partida y aparecerá aquí." : "Aún no ha registrado ningún mazo."}
            </Empty>
          )}
        </section>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="card-head"><h2 className="text-lg font-bold">Enfrentamientos directos</h2></div>
          {rivals.length ? (
            <ul className="divide-y divide-line-soft">
              {rivals.map((t) => (
                <li key={t.opponentId} className="flex items-center gap-3 px-4 py-2.5">
                  <PlayerTag player={snap.playersById.get(t.opponentId)} size="sm" className="min-w-0 flex-1" />
                  <Record w={t.wins} d={t.ties} l={t.losses} />
                  <span className="w-24 flex-none"><SplitBar ratio={t.winRate ?? 0} /></span>
                  <span className="w-11 text-right font-mono text-sm font-semibold tabular" style={{ color: wrColor(t.winRate) }}>
                    {pct(t.winRate, 0)}
                  </span>
                </li>
              ))}
            </ul>
          ) : <Empty title="Sin partidas registradas" />}
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="text-lg font-bold">Emparejamientos</h2>
            <span className="text-xs text-muted">mín. 2 partidas</span>
          </div>
          {matchups.length ? (
            <ul className="divide-y divide-line-soft">
              {matchups.slice(0, 8).map((t) => (
                <li key={`${t.mine.id}|${t.theirs.id}`} className="flex items-center gap-2 px-4 py-2.5">
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <Sprites archetype={t.mine} size="sm" />
                    <span className="truncate text-[13px]">{shortName(t.mine.name, 14)}</span>
                    <span className="flex-none text-[11px] text-muted">vs</span>
                    <Sprites archetype={t.theirs} size="sm" />
                    <span className="truncate text-[13px]">{shortName(t.theirs.name, 14)}</span>
                  </span>
                  <span className="flex-none font-mono text-sm font-bold tabular" style={{ color: wrColor(t.winRate) }}>
                    {pct(t.winRate, 0)} <span className="text-xs font-normal text-muted">({t.n})</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Todavía no hay cruces repetidos">
              Cuando el mismo cruce de arquetipos se repita dos veces, aparecerá aquí.
            </Empty>
          )}
        </section>
      </div>

      {myTours.length > 0 && (
        <>
          <SectionTitle aside={`${myTours.length}`}>Torneos</SectionTitle>
          <div className="card mb-5 divide-y divide-line-soft">
            {myTours.map((t) => {
              const r = t.results.find((x) => x.playerId === id)!;
              return (
                <Link key={t.id} href={`/torneos/${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="w-9 flex-none text-center font-display text-lg font-extrabold tabular">
                    {r.placement ?? "—"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{t.name}</span>
                    <span className="block text-xs text-muted">
                      {fmtDate(t.date)}{t.playerCount ? ` · ${t.playerCount} jugadores` : ""}
                    </span>
                  </span>
                  {r.cpEarned > 0 && <span className="chip chip-brand tabular">{r.cpEarned} CP</span>}
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* --- rango del ladder ---
          Va justo antes del historial y no arriba a propósito: lo de arriba
          son los números que la app calcula sola, y esto es un número que se
          pone a mano. Mezclarlos invitaba a confundir el Elo de la liga con el
          rango, que es el primer malentendido que iba a haber. */}
      <SectionTitle aside="lo pones tú">Rango del ladder</SectionTitle>
      <div className="card mb-6 p-4">
        {canEditLadder ? (
          <div className="flex flex-col gap-4">
            <LadderEditor
              playerId={player.id}
              currentElo={player.ladderElo}
              currentNote={player.ladderNote}
            />
            {player.ladderElo != null && <LadderClear playerId={player.id} />}
          </div>
        ) : player.ladderElo != null ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <RankBadge elo={player.ladderElo} size="lg" />
              {player.ladderEloUpdatedAt && (
                <span className="text-xs text-muted">
                  actualizado el {fmtDate(player.ladderEloUpdatedAt.toISOString().slice(0, 10))}
                </span>
              )}
            </div>
            <RankProgress elo={player.ladderElo} />
            {player.ladderNote && <p className="text-sm text-ink-2">{player.ladderNote}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted">
            {player.name} no ha puesto su rango todavía.
          </p>
        )}
      </div>

      <SectionTitle aside={`${mine.length} partidas`}>Historial</SectionTitle>
      <div className="card">
        {mine.length ? (
          <MatchList>
            {mine.slice().reverse().slice(0, 40).map((m) => (
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
        ) : <Empty title="Sin partidas" />}
      </div>
    </>
  );
}
