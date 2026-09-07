import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSnapshot } from "@/lib/data";
import {
  archetypeStats, headToHead, isPlayed, longestWinStreak, playerMatchups, sideOf, standings, outcome,
} from "@/lib/stats";
import { fmtDateLong, pct, shortName, wrColor } from "@/lib/format";
import {
  ArchTag, Avatar, Empty, Kpi, MatchRow, MatchTable, PlayerTag, Record, Sparkline, Sprites,
} from "@/components/ui";
import { readSession } from "@/lib/auth";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  const player = snap.playersById.get(id);
  if (!player) notFound();

  const all = snap.matches.filter(isPlayed);
  const mine = all.filter((m) => sideOf(m, id));
  const row = standings(all, snap.activePlayerIds, snap.elo.rating, snap.config)
    .find((r) => r.playerId === id);
  const history = (snap.elo.history[id] ?? []).map((h) => h.value);
  const archs = archetypeStats(mine, snap.archIndex, id);
  const matchups = playerMatchups(all, id, snap.archIndex, 2);
  const rivals = headToHead(all, id);
  const decks = snap.decks.filter((d) => d.playerId === id);

  let gw = 0, gl = 0;
  for (const m of mine) {
    const o = outcome(m);
    const side = sideOf(m, id);
    gw += side === "a" ? o.ga : o.gb;
    gl += side === "a" ? o.gb : o.ga;
  }
  const best = matchups[0];
  const worst = matchups.length > 1 ? matchups[matchups.length - 1] : null;
  const elo = snap.elo.rating[id] ?? snap.config.eloStart;

  return (
    <>
      <div className="page-head">
        <div className="row" style={{ gap: 14 }}>
          <Avatar player={player} size="lg" />
          <div>
            <h1>{player.name}</h1>
            <div className="page-sub">
              {player.isAdmin && <span className="chip g">Organizador</span>}{" "}
              Desde {fmtDateLong(player.joined)} · {decks.length} mazos registrados
              {session?.playerId === id && <> · <span className="chip b">eres tú</span></>}
            </div>
          </div>
        </div>
        <div className="row">
          {snap.players.map((p) => (
            <Link key={p.id} href={`/perfil/${p.id}`} className={`chip ${p.id === id ? "g" : ""}`} style={{ padding: "5px 10px" }}>
              {p.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <Kpi label="Partidas" value={mine.length} note={row ? `${row.wins}V ${row.ties ? `${row.ties}E ` : ""}${row.losses}D` : "—"} />
        <Kpi
          label="% victorias"
          value={pct(row?.winRate, 1)}
          note={`juegos ${gw}–${gl} (${pct(gw + gl ? gw / (gw + gl) : null, 0)})`}
          highlight={(row?.winRate ?? 0) >= 0.5}
        />
        <Kpi label="Elo" value={elo} note={`${elo - snap.config.eloStart >= 0 ? "+" : ""}${elo - snap.config.eloStart} desde el inicio`} />
        <Kpi
          label="Racha actual"
          value={
            row?.streak.n
              ? row.streak.kind === "w" ? `${row.streak.n} victorias`
              : row.streak.kind === "l" ? `${row.streak.n} derrotas`
              : `${row.streak.n} empates`
              : "—"
          }
          note={`mejor racha: ${longestWinStreak(all, id)} victorias`}
        />
      </div>

      <div className="grid g-2-13" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head"><h2>Evolución del Elo</h2></div>
          <div className="card-pad">
            <Sparkline values={history} width={320} height={90} />
            {history.length > 1 && (
              <div className="hint" style={{ marginTop: 8 }}>
                {history.length} puntos · mín {Math.round(Math.min(...history))} · máx {Math.round(Math.max(...history))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Tus mazos</h2>
            <Link className="btn btn-sm" href={`/mazos/nuevo?player=${id}`}>+ Mazo</Link>
          </div>
          {archs.length ? (
            <div className="tw">
              <table>
                <thead>
                  <tr><th>Arquetipo</th><th className="num">Usos</th><th>Récord</th><th className="num">%V</th><th className="num">Juegos</th></tr>
                </thead>
                <tbody>
                  {archs.map((a) => (
                    <tr key={a.archetypeId}>
                      <td><ArchTag archetype={a.archetype} /></td>
                      <td className="num">{a.played}</td>
                      <td><Record w={a.wins} d={a.ties} l={a.losses} /></td>
                      <td className="num" style={{ color: wrColor(a.winRate), fontWeight: 600 }}>{pct(a.winRate, 0)}</td>
                      <td className="num" style={{ color: "var(--muted)" }}>{a.gameWins}–{a.gameLosses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty"><p>Sin partidas con mazo asignado.</p></div>}
        </div>
      </div>

      <div className="grid g-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head"><h2>Enfrentamientos directos</h2></div>
          {rivals.length ? (
            <div className="tw">
              <table>
                <thead><tr><th>Rival</th><th className="num">PJ</th><th>Récord</th><th className="num">%V</th><th>Balance</th></tr></thead>
                <tbody>
                  {rivals.map((t) => {
                    const w = (t.winRate ?? 0) * 100;
                    return (
                      <tr key={t.opponentId}>
                        <td><PlayerTag player={snap.playersById.get(t.opponentId)} /></td>
                        <td className="num">{t.played}</td>
                        <td><Record w={t.wins} d={t.ties} l={t.losses} /></td>
                        <td className="num" style={{ color: wrColor(t.winRate), fontWeight: 600 }}>{pct(t.winRate, 0)}</td>
                        <td style={{ minWidth: 110 }}>
                          <div className="split">
                            <i style={{ width: `${w.toFixed(0)}%`, background: "var(--win)" }} />
                            <i style={{ width: `${(100 - w).toFixed(0)}%`, background: "var(--loss)" }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty title="Sin partidas registradas" />}
        </div>

        <div className="card">
          <div className="card-head"><h2>Emparejamientos que te van</h2><span className="hint">mín. 2 partidas</span></div>
          <div className="card-pad">
            {matchups.length ? (
              <>
                <div className="stack" style={{ gap: 10 }}>
                  {matchups.slice(0, 7).map((t) => (
                    <div
                      key={`${t.mine.id}|${t.theirs.id}`}
                      className="row"
                      style={{ justifyContent: "space-between", gap: 10, borderBottom: "1px solid var(--line-soft)", paddingBottom: 9 }}
                    >
                      <div className="row" style={{ gap: 6, minWidth: 0 }}>
                        <Sprites archetype={t.mine} size="sm" />
                        <span style={{ fontSize: 12.5 }}>{shortName(t.mine.name, 15)}</span>
                        <span style={{ color: "var(--muted)", fontSize: 11 }}>vs</span>
                        <Sprites archetype={t.theirs} size="sm" />
                        <span style={{ fontSize: 12.5 }}>{shortName(t.theirs.name, 15)}</span>
                      </div>
                      <span className="num" style={{ fontWeight: 700, color: wrColor(t.winRate) }}>
                        {pct(t.winRate, 0)} <span className="hint">({t.n})</span>
                      </span>
                    </div>
                  ))}
                </div>
                {best && worst && best !== worst && (
                  <div className="hint" style={{ marginTop: 12 }}>
                    Mejor: <b>{best.mine.name}</b> contra <b>{best.theirs.name}</b>. Peor:{" "}
                    <b>{worst.mine.name}</b> contra <b>{worst.theirs.name}</b>.
                  </div>
                )}
              </>
            ) : (
              <div className="hint">
                Cuando repitas un mismo cruce de arquetipos al menos dos veces, aparecerá aquí.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Historial</h2><span className="hint">{mine.length} partidas</span></div>
        {mine.length ? (
          <MatchTable>
            {mine.slice().reverse().map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                playerA={snap.playersById.get(m.playerAId)}
                playerB={snap.playersById.get(m.playerBId)}
                archA={m.deckAId ? snap.archIndex.get(m.deckAId) : undefined}
                archB={m.deckBId ? snap.archIndex.get(m.deckBId) : undefined}
                compName={m.competitionId ? snap.compsById.get(m.competitionId)?.name : undefined}
              />
            ))}
          </MatchTable>
        ) : <Empty title="Sin partidas" />}
      </div>
    </>
  );
}
