import Link from "next/link";
import { loadSnapshot, compPlayers } from "@/lib/data";
import { readSession } from "@/lib/auth";
import { archetypeStats, isPlayed, standings } from "@/lib/stats";
import { MONTHS, pct, relDays, shortName, todayISO, wrColor } from "@/lib/format";
import {
  Avatar, Bars, Empty, Kpi, MatchRow, MatchTable, PageHead, PlayerTag, Record, Sprites, StreakChip,
} from "@/components/ui";

const EVENT_NAMES: Record<string, string> = {
  round: "Jornada", tourney: "Torneo", deadline: "Límite", other: "Evento",
};

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
  const totalGames = played.reduce((a, m) => a + m.games.length, 0);
  const archs = archetypeStats(played, snap.archIndex);
  const upcoming = snap.events.filter((e) => e.date >= todayISO()).slice(0, 4);
  const recent = played.slice(-6).reverse();

  return (
    <>
      <PageHead
        title={snap.config.name}
        sub={`${snap.config.season} · ${snap.activePlayerIds.length} jugadores · ${snap.competitions.length} competiciones`}
        actions={<Link className="btn btn-gold" href="/partidas/nueva">Registrar partida</Link>}
      />

      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <Kpi label="Partidas jugadas" value={played.length} note={`${totalGames} juegos en total`} />
        <Kpi
          highlight
          label={`Líder${mainComp ? ` · ${shortName(mainComp.name, 18)}` : ""}`}
          value={leader ? snap.playersById.get(leader.playerId)?.name ?? "—" : "—"}
          note={leader ? `${leader.points} pts · ${pct(leader.winRate, 0)} victorias` : "sin datos"}
        />
        <Kpi
          label="Arquetipo más jugado"
          value={archs[0]?.archetype?.name ?? "—"}
          note={archs[0] ? `${archs[0].played} usos · ${pct(archs[0].winRate, 0)}` : "sin datos"}
        />
        {mine ? (
          <Kpi
            label="Tú"
            value={pct(mine.winRate, 0)}
            note={`${mine.wins}V ${mine.losses}D · Elo ${mine.elo}`}
            highlight={(mine.winRate ?? 0) >= 0.5}
          />
        ) : (
          <Kpi label="Juegos por partida" value={played.length ? (totalGames / played.length).toFixed(2) : "—"} note="media de la liga" />
        )}
      </div>

      <div className="grid g-2-13" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <h2>Próximas fechas</h2>
            <Link className="btn btn-sm btn-ghost" href="/calendario">Calendario</Link>
          </div>
          {upcoming.length ? (
            <ul className="list-plain">
              {upcoming.map((e) => {
                const d = new Date(`${e.date}T12:00:00`);
                return (
                  <li key={e.id}>
                    <div style={{ width: 44, flex: "none", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--f-display)", fontWeight: 800, fontSize: 19, lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>
                        {MONTHS[d.getMonth()].slice(0, 3)}
                      </div>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{e.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {relDays(e.date)}{e.note ? ` · ${e.note}` : ""}
                      </div>
                    </div>
                    <span className={`chip ${e.kind === "round" ? "g" : e.kind === "tourney" ? "b" : ""}`}>
                      {EVENT_NAMES[e.kind] ?? "Evento"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="empty"><p>No hay fechas próximas. <Link href="/calendario">Añade una</Link>.</p></div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Clasificación{mainComp ? ` · ${shortName(mainComp.name, 24)}` : ""}</h2>
            <Link className="btn btn-sm btn-ghost" href="/ranking">Ver completa</Link>
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th className="rk">#</th><th>Jugador</th><th className="num">PJ</th>
                  <th>Récord</th><th className="num">%V</th><th className="num">Pts</th>
                  <th className="num">Elo</th><th className="num">Racha</th>
                </tr>
              </thead>
              <tbody>
                {table.slice(0, 6).map((r, i) => (
                  <tr key={r.playerId} className={i === 0 ? "r1" : ""}>
                    <td className="rk">{i + 1}</td>
                    <td><PlayerTag player={snap.playersById.get(r.playerId)} /></td>
                    <td className="num">{r.played}</td>
                    <td><Record w={r.wins} d={r.ties} l={r.losses} /></td>
                    <td className="num" style={{ color: wrColor(r.winRate), fontWeight: 600 }}>{pct(r.winRate, 0)}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{r.points}</td>
                    <td className="num">{r.elo}</td>
                    <td className="num"><StreakChip kind={r.streak.kind} n={r.streak.n} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <h2>Partidas pendientes</h2>
            <span className="hint">{pending.length} emparejamientos sin resultado</span>
          </div>
          <ul className="list-plain">
            {pending.map((m) => {
              const A = snap.playersById.get(m.playerAId);
              const B = snap.playersById.get(m.playerBId);
              const c = m.competitionId ? snap.compsById.get(m.competitionId) : undefined;
              return (
                <li key={m.id}>
                  <span className="chip">{c ? shortName(c.name, 16) : "Amistoso"}{m.round ? ` · J${m.round}` : ""}</span>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 9, justifyContent: "center", minWidth: 0 }}>
                    <div className="row" style={{ gap: 7, justifyContent: "flex-end", flex: 1, minWidth: 0 }}>
                      {A?.name}<Avatar player={A} />
                    </div>
                    <span className="hint" style={{ fontFamily: "var(--f-display)", fontWeight: 700 }}>VS</span>
                    <div className="row" style={{ gap: 7, flex: 1, minWidth: 0 }}>
                      <Avatar player={B} />{B?.name}
                    </div>
                  </div>
                  <Link className="btn btn-gold btn-sm" href={`/partidas/${m.id}`}>Anotar resultado</Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h2>Últimos resultados</h2>
          <Link className="btn btn-sm btn-ghost" href="/resultados">Todos</Link>
        </div>
        {recent.length ? (
          <MatchTable>
            {recent.map((m) => (
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
        ) : (
          <Empty
            title="Todavía no hay partidas"
            action={<Link className="btn btn-gold" href="/partidas/nueva">Registrar partida</Link>}
          >
            Registra la primera y el ranking, las estadísticas y la matriz de emparejamientos se construyen solos.
          </Empty>
        )}
      </div>

      {archs.length > 0 && (
        <div className="grid g-2">
          <div className="card">
            <div className="card-head"><h2>Arquetipos más jugados</h2></div>
            <div className="card-pad">
              <Bars
                rows={archs.slice(0, 7).map((a) => ({
                  label: <span className="arch"><Sprites archetype={a.archetype} size="sm" /><span className="an">{a.archetype?.name}</span></span>,
                  value: a.played,
                  right: `${a.played} usos`,
                }))}
              />
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h2>% de victorias por arquetipo</h2><span className="hint">mín. 2 usos</span></div>
            <div className="card-pad">
              <Bars
                max={100}
                rows={archs.filter((a) => a.played >= 2).slice(0, 7).map((a) => ({
                  label: <span className="arch"><Sprites archetype={a.archetype} size="sm" /><span className="an">{a.archetype?.name}</span></span>,
                  value: (a.winRate ?? 0) * 100,
                  right: `${pct(a.winRate, 0)} (${a.played})`,
                  color: wrColor(a.winRate),
                }))}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
