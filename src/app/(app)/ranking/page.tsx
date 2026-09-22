import Link from "next/link";
import { compPlayers, loadSnapshot, playerCp } from "@/lib/data";
import { archetypeStats, isPlayed, standings } from "@/lib/stats";
import { applyMatchFilter, EMPTY_FILTER, MATCH_SCOPES, type FilterIndex, type MatchScope } from "@/lib/filters";
import { seasonOfDate } from "@/lib/cp";
import { PageHead, PlayerTag, Sparkline } from "@/components/ui";
import { RankingTable, type RankRow } from "@/components/RankingTable";
import { ScopeTabs } from "@/components/ScopeTabs";
import { LadderTable } from "@/components/Ladder";
import { ladderStandings } from "@/lib/rank";
import { readSession } from "@/lib/auth";

export const metadata = { title: "Ranking" };

/* Lo que se puede mirar por separado, en el orden en que se ofrece. `all`
   sale aparte, como los demás «todo» de la app. */
const AMBITOS: MatchScope[] = ["league", "onsite", "online", "casual"];

export default async function RankingPage({
  searchParams,
}: { searchParams: Promise<{ comp?: string; ambito?: string; temporada?: string }> }) {
  const q = await searchParams;
  const comp = q.comp ?? "all";
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  const played = snap.matches.filter(isPlayed);

  /* --- ámbito ---
     Petición del 19/09: poder mirar el ranking contando solo los amistosos,
     solo los torneos presenciales de la temporada, solo los online o solo la
     liga interna. Las reglas son las mismas que en Resultados y Estadísticas
     —`src/lib/filters.ts`—, así que un ámbito quiere decir lo mismo en las
     tres pantallas. */
  const ambito: MatchScope = (AMBITOS as string[]).includes(q.ambito ?? "")
    ? (q.ambito as MatchScope)
    : "all";
  const soloTemporada = q.temporada === "1";

  const index: FilterIndex = {
    tournamentKind: new Map(snap.tournaments.map((t) => [t.id, t.kind])),
    tournamentFormat: new Map(snap.tournaments.map((t) => [t.id, t.format])),
    tournamentScope: new Map(snap.tournaments.map((t) => [t.id, t.scope])),
    competitionKind: new Map(snap.competitions.map((c) => [c.id, c.kind])),
    // Aquí no se filtra por arquetipo, así que esto no llega a llamarse
    // nunca. Va vacío en vez de montar el índice de arquetipos entero para
    // nada.
    archetypesOf: () => [],
  };

  const competition = comp === "all" ? null : snap.compsById.get(comp);
  let scoped = competition ? played.filter((m) => m.competitionId === competition.id) : played;
  if (ambito !== "all") {
    scoped = applyMatchFilter(scoped, { ...EMPTY_FILTER, scope: ambito }, index);
  }

  /* La temporada de Play! Pokémon no es el año natural: empieza en julio y se
     nombra por el año en que termina, y eso ya lo sabe `seasonOfDate`. Se
     filtra por la fecha de la partida y no por `tournaments.season`, para que
     el corte valga también para las de liga y las amistosas, que no tienen
     torneo del que sacar la temporada. */
  if (soloTemporada) {
    scoped = scoped.filter((m) => seasonOfDate(m.date) === snap.config.cpSeason);
  }

  const ids = competition ? compPlayers(snap, competition.id) : snap.activePlayerIds;
  const table = standings(scoped, ids, snap.elo.rating, snap.config);

  const rows: RankRow[] = table.map((r) => {
    const own = archetypeStats(
      scoped.filter((m) => m.playerAId === r.playerId || m.playerBId === r.playerId),
      snap.archIndex, r.playerId, snap.archById,
    );
    const p = snap.playersById.get(r.playerId);
    return {
      playerId: r.playerId,
      name: p?.name ?? "—",
      color: p?.color ?? "#888",
      avatarKind: p?.avatarKind ?? "none",
      avatarValue: p?.avatarValue ?? "",
      played: r.played, wins: r.wins, ties: r.ties, losses: r.losses,
      points: r.points, winRate: r.winRate, resistance: r.resistance,
      diff: r.diff, elo: r.elo,
      cp: playerCp(snap, r.playerId).total,
      streakKind: r.streak.kind, streakN: r.streak.n,
      topArchId: own[0]?.archetype?.id ?? null,
      topArchName: own[0]?.archetype?.name ?? null,
    };
  });

  const ladder = ladderStandings(snap.players.filter((p) => p.active));

  const withHistory = snap.players.filter((p) => (snap.elo.history[p.id]?.length ?? 0) > 2);

  /** La URL de ahora con un parámetro cambiado. `null` lo quita. */
  const hrefCon = (cambios: Record<string, string | null>) => {
    const sp = new URLSearchParams();
    const base: Record<string, string | null> = {
      comp: comp === "all" ? null : comp,
      ambito: ambito === "all" ? null : ambito,
      temporada: soloTemporada ? "1" : null,
      ...cambios,
    };
    for (const [k, v] of Object.entries(base)) if (v) sp.set(k, v);
    const qs = sp.toString();
    return qs ? `/ranking?${qs}` : "/ranking";
  };

  return (
    <>
      <PageHead
        title="Ranking"
        sub={
          <>
            {snap.config.ptsWin} puntos por victoria y {snap.config.ptsTie} por empate.
            La <b>resistencia</b> es la media del % de victorias de tus rivales, con suelo del 25%,
            como en los torneos oficiales. El <b>Elo</b> es global a toda la liga.
          </>
        }
      />

      <ScopeTabs
        basePath="/ranking"
        param="comp"
        current={comp}
        options={snap.competitions.map((c) => ({ value: c.id, label: c.name }))}
        keep={{ ambito: ambito === "all" ? null : ambito, temporada: soloTemporada ? "1" : null }}
      />

      {/* Segunda fila: de dónde salen las partidas que cuentan. Son enlaces y
          no un desplegable, por lo mismo que el resto de filtros de la app:
          el estado va en la URL, se puede compartir y funciona sin JS. */}
      <div className="scroll-x mt-2 flex gap-2 pb-1">
        {(["all", ...AMBITOS] as MatchScope[]).map((v) => (
          <Link
            key={v}
            href={hrefCon({ ambito: v === "all" ? null : v })}
            aria-current={ambito === v ? "page" : undefined}
            className={`chip flex-none ${ambito === v ? "chip-brand" : ""}`}
          >
            {MATCH_SCOPES[v]}
          </Link>
        ))}
        <Link
          href={hrefCon({ temporada: soloTemporada ? null : "1" })}
          aria-current={soloTemporada ? "page" : undefined}
          className={`chip flex-none ${soloTemporada ? "chip-info" : ""}`}
        >
          Temporada {snap.config.cpSeason}
        </Link>
      </div>

      {(ambito !== "all" || soloTemporada) && (
        <p className="mt-2 text-xs text-muted">
          {scoped.length === 0
            ? "Con este filtro no queda ninguna partida, así que la tabla sale a cero."
            : `${scoped.length} partida${scoped.length === 1 ? "" : "s"}: ${
                ambito === "all" ? "todas" : MATCH_SCOPES[ambito].toLowerCase()
              }${soloTemporada ? `, temporada ${snap.config.cpSeason}` : ""}. El Elo y los CP no cambian con este filtro: son globales.`}
        </p>
      )}

      <div className="mt-4">
        <RankingTable rows={rows} />
      </div>

      {withHistory.length > 0 && (
        <section className="card mt-4">
          <div className="card-head">
            <h2 className="text-lg font-bold">Evolución del Elo</h2>
            <span className="text-xs text-muted">desde {snap.config.eloStart}</span>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {withHistory.map((p) => {
              const values = (snap.elo.history[p.id] ?? []).map((h) => h.value);
              const last = Math.round(values[values.length - 1]);
              const delta = last - snap.config.eloStart;
              return (
                <div key={p.id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <PlayerTag player={p} size="sm" />
                    <span className="font-mono text-sm font-bold tabular">
                      {last}{" "}
                      <span className={`text-xs ${delta >= 0 ? "text-win" : "text-loss"}`}>
                        {delta >= 0 ? "+" : ""}{delta}
                      </span>
                    </span>
                  </div>
                  <Sparkline values={values} width={240} height={44} />
                </div>
              );
            })}
          </div>
        </section>
      )}
      {/* --- el ladder ---
          Es otra clasificación y va aparte de la de arriba, no en una columna
          más: la de arriba sale de vuestras partidas y esta la escribís
          vosotros. Meterlas en la misma tabla habría hecho parecer que el
          rango también se calcula. */}
      <section className="card mt-4">
        <div className="card-head">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">Ladder</h2>
            <p className="text-xs text-muted">
              El rango que cada uno se pone a mano. No sale de las partidas.
            </p>
          </div>
          <span className="text-xs text-muted">{ladder.length} con rango</span>
        </div>
        <LadderTable rows={ladder} meId={session?.playerId} />
      </section>
    </>
  );
}
