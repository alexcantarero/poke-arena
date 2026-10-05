import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSnapshot, playerCp } from "@/lib/data";
import { readSession } from "@/lib/auth";
import {
  archetypeStats, headToHead, isPlayed, longestWinStreak, playerMatchups, playerRecord, porRecientes,
  sideOf,
} from "@/lib/stats";
import { cpKindOf, effectiveCp, getSeason, seasonOfDate } from "@/lib/cp";
import type { MatchFull } from "@/lib/types";
import { fmtDate, fmtDateLong, pct, shortName, wrColor } from "@/lib/format";
import {
  ArchTag, Avatar, Empty, Kpi, MatchCard, MatchList, PlayerTag, Record,
  SectionTitle, SplitBar, Sprites,
} from "@/components/ui";
import { ScopeTabs } from "@/components/ScopeTabs";
import { CpBreakdown } from "@/components/CpBreakdown";
import { BadgeCase } from "@/components/BadgeCase";
import { BestFinishes } from "@/components/BestFinishes";
import { bestFinishes, convStats, type PlacementRow } from "@/lib/tournamentStats";
import { Icon } from "@/components/icons";
import { LadderClear, LadderEditor, RankBadge, RankProgress } from "@/components/Ladder";
import { canManageLeague } from "@/lib/auth";
import { setZoneRanks } from "@/actions";
import { eloChartData } from "@/lib/data";
import { LadderChartLazy } from "@/components/statistics/lazy";
import { FavStar } from "@/components/FavStar";
import { estadoMundial } from "@/lib/mundial";
import { getLang } from "@/lib/lang";
import { tr } from "@/lib/i18n";

/* De dónde salen las cifras de arriba.
   Mezclar la liga, los torneos de fuera y los amistosos da un número que no
   responde a ninguna pregunta: el de la liga es el que compite con tus
   compañeros, el de los torneos es el que te dice cómo vas fuera de casa y el
   de los amistosos es ruido de pruebas de mazos. Por eso se separan.

   El ámbito viaja en la URL y no en estado de cliente para que el enlace se
   pueda pasar por el grupo, para que funcione sin JavaScript y para que la
   flecha de volver del móvil haga lo que uno espera. */
const SCOPES = {
  liga: { label: "Liga", test: (m: MatchFull) => m.competitionId !== null },
  torneos: { label: "Torneos", test: (m: MatchFull) => m.tournamentId !== null },
  amistosos: {
    label: "Amistosos",
    test: (m: MatchFull) => m.competitionId === null && m.tournamentId === null,
  },
} as const;

type ScopeKey = keyof typeof SCOPES;

/** Cuántas partidas enseña el perfil antes de mandar a Resultados. */
const ULTIMAS = 8;
const isScope = (s: string): s is ScopeKey => (Object.keys(SCOPES) as string[]).includes(s);

export default async function ProfilePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ambito?: string }>;
}) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const [snap, session, lang] = await Promise.all([loadSnapshot(), readSession(), getLang()]);
  const eloGrafica = eloChartData(snap);
  const player = snap.playersById.get(id);
  if (!player) notFound();

  const scope: ScopeKey | "all" = q.ambito && isScope(q.ambito) ? q.ambito : "all";

  const isMe = session?.playerId === id;
  const all = snap.matches.filter(isPlayed);
  const mine = all.filter((m) => sideOf(m, id));
  // El filtro manda sobre las cifras y sobre el historial. Los cortes por mazo
  // y por rival siguen mirándolo todo: con el ámbito puesto en «amistosos» se
  // quedarían en dos partidas y dejarían de decir nada.
  const scoped = scope === "all" ? mine : mine.filter(SCOPES[scope].test);
  // Cuenta las partidas contra gente de fuera de la liga, que la clasificación
  // deja fuera a propósito pero que para el jugador son suyas igual.
  const rec = playerRecord(scoped, id);
  const elo = snap.elo.rating[id] ?? snap.config.eloStart;
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

  /* v0.17 — puesto en el leaderboard oficial (España y Europa) y a cuánto
     está de las plazas del Mundial de su zona. */
  const plazas = getSeason(cp.season).invites[snap.config.ratingZone] ?? null;
  const mundial = estadoMundial(player.rankEurope, plazas);
  const sigo = Boolean(session && snap.favoritePlayers.get(session.playerId)?.has(id));

  /* --- torneos: conversión, mejores puestos y medallas ---
     Las tres cosas salen de la misma lista de resultados, así que se arma
     una vez. `topCut` y `playerCount` vienen del torneo, no del resultado:
     lo que decide si un 5.º puesto fue entrar en el corte es el tamaño del
     corte de ESE torneo. */
  const placements: PlacementRow[] = myTours.map((t) => {
    const r = t.results.find((x) => x.playerId === id);
    return {
      playerId: id,
      archetypeId: r?.archetypeId
        ?? (r?.deckId ? snap.decksById.get(r.deckId)?.archetypeId ?? null : null),
      placement: r?.placement ?? null,
      date: t.date,
      kind: t.kind,
      playerCount: t.playerCount ?? null,
      topCut: t.topCut ?? null,
    };
  });
  const conv = convStats(placements);
  const mejores = bestFinishes(placements, 4);

  /* Las medallas se calculan sobre TODO, no sobre el ámbito elegido: si al
     tocar la pestaña «Amistosos» se te apagaran las medallas, la vitrina
     dejaría de significar nada. */
  const total = playerRecord(mine, id);

  const badgeInput = {
    played: total.played,
    wins: total.wins,
    bestStreak: longestWinStreak(all, id),
    archetypes: archs.length,
    decksWithList: decks.filter((d) => d.list.trim().length > 0).length,
    tournaments: conv.entries,
    cuts: conv.cut,
    tournamentWins: conv.wins,
    bestPlacement: mejores[0]?.placement ?? null,
    cp: cp.total,
    // `firstTurn` es texto y vacío cuando no se apuntó, no null.
    roundsWithTurn: snap.matches.filter(
      (m) => m.tournamentId && m.playerAId === id && Boolean(m.firstTurn),
    ).length,
  };

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
        {isMe ? (
          <Link className="btn btn-sm" href="/perfil/editar">
            <Icon name="cog" className="size-4" /> Editar perfil
          </Link>
        ) : session ? (
          <FavStar playerId={player.id} on={sigo} back={`/perfil/${player.id}`} lang={lang} withLabel />
        ) : null}
      </div>

      {/* ------------------------------ balance ------------------------------ */}
      <ScopeTabs
        basePath={`/perfil/${player.id}`} param="ambito" current={scope} allLabel="Todo"
        options={Object.entries(SCOPES).map(([value, s]) => ({ value, label: s.label }))}
      />

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Partidas" value={rec.played} note={`juegos ${rec.gameWins}–${rec.gameLosses}`} />
        <Kpi label="Victorias" value={rec.wins} />
        <Kpi label="Derrotas" value={rec.losses} />
        <Kpi label="Empates" value={rec.ties} />
        <Kpi
          label="% victorias" value={pct(rec.winRate, 0)} note="el empate cuenta media"
          highlight={(rec.winRate ?? 0) >= 0.5}
        />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi label="Elo" value={elo}
          note={`${elo - snap.config.eloStart >= 0 ? "+" : ""}${elo - snap.config.eloStart} desde el inicio`} />
        <Kpi label={`CP ${cp.season}`} value={cp.total}
          note={cpTable.confirmed ? `${myTours.length} torneos` : "cifras provisionales"} />
        {/* v0.17 — puesto en los leaderboards oficiales, junto a los CP. */}
        <Kpi label={`Top ${tr(lang, "zone.spain")}`}
          value={player.rankSpain != null ? `${player.rankSpain}.º` : "—"}
          note={player.rankSpain != null ? "leaderboard de CP" : tr(lang, "zone.none")} />
        <Kpi label={`Top ${tr(lang, "zone.europe")}`}
          value={player.rankEurope != null ? `${player.rankEurope}.º` : "—"}
          highlight={mundial.tipo === "dentro"}
          note={mundial.tipo === "dentro"
            ? `${tr(lang, "zone.in")} (Top ${mundial.plazas}) · ${tr(lang, "zone.margin")} ${mundial.margen}`
            : mundial.tipo === "fuera"
              ? `${mundial.faltan} ${tr(lang, "zone.places")} · Top ${mundial.plazas}`
              : player.rankEurope != null ? "leaderboard de CP" : tr(lang, "zone.none")} />
      </div>

      {(canEditLadder || player.rankZoneUpdatedAt) && (
        <details className="card mt-2.5">
          <summary className="tap cursor-pointer justify-between px-4 text-sm font-semibold">
            {canEditLadder ? tr(lang, "zone.edit") : tr(lang, "zone.title")}
            <span className="text-[11px] font-normal text-muted">
              {player.rankZoneUpdatedAt
                ? `${tr(lang, "zone.updated")} ${fmtDate(player.rankZoneUpdatedAt.toISOString().slice(0, 10))}`
                : tr(lang, "zone.none")}
            </span>
          </summary>
          <div className="border-t border-line-soft p-4">
            {canEditLadder && (
              <form action={setZoneRanks} className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <input type="hidden" name="playerId" value={player.id} />
                <label className="flex flex-col gap-1.5">
                  <span className="label">{tr(lang, "zone.spain")}</span>
                  <input className="input tabular" name="rankSpain" type="number" inputMode="numeric"
                    min={1} max={100000} defaultValue={player.rankSpain ?? ""} placeholder="—" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="label">{tr(lang, "zone.europe")}</span>
                  <input className="input tabular" name="rankEurope" type="number" inputMode="numeric"
                    min={1} max={100000} defaultValue={player.rankEurope ?? ""} placeholder="—" />
                </label>
                <button className="btn btn-brand col-span-2 sm:col-span-1" type="submit">{tr(lang, "zone.save")}</button>
              </form>
            )}
            <p className="mt-3 text-xs text-muted">{canEditLadder ? tr(lang, "zone.howto") + " " : ""}{tr(lang, "zone.caveat")}</p>
            <Link href="/ranking#mundial" className="mt-2 inline-block text-xs font-semibold text-info hover:underline">
              {tr(lang, "zone.title")} →
            </Link>
          </div>
        </details>
      )}

      {/* El Elo es de toda la liga y los CP son de toda la temporada: filtrarlos
          por ámbito no querría decir nada, y callárselo dejaría a alguien
          pensando que el filtro no funciona. */}
      <p className="mt-2 mb-5 text-xs text-muted">
        El Elo y los Championship Points no cambian con este filtro: el primero es de toda
        la liga y los segundos, de toda la temporada.
      </p>

      {/* Evolución del Elo, mazos, enfrentamientos directos y emparejamientos
          van primero: son las cifras vivas de cómo juegas. El desglose de CP
          —que no cambia partida a partida— va después, más abajo, para que el
          perfil abra con lo más visual. */}

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        {/* v0.22 — evolución del Elo en el TIEMPO y de todos en la misma
            gráfica (como la del ladder), con este jugador marcado de inicio. */}
        <section className="card lg:col-span-2">
          <div className="card-head">
            <h2 className="text-lg font-bold">Evolución del Elo</h2>
            {history.length > 1 && (
              <span className="text-xs text-muted">
                mín {Math.round(Math.min(...history))} · máx {Math.round(Math.max(...history))} · mejor racha {longestWinStreak(all, id)}
              </span>
            )}
          </div>
          <LadderChartLazy series={eloGrafica.series} resets={eloGrafica.resets} fechas={eloGrafica.fechas} destacados={[id]} inicial={4}
            pie="Un punto por cada partida que mueve el Elo." etiquetaReset="Corte del Elo" />
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="text-lg font-bold">Sus mazos</h2>
            <div className="flex flex-none items-center gap-2">
              {scope !== "all" && <span className="text-xs text-muted">todas las partidas</span>}
              {isMe && <Link className="btn btn-sm" href="/mazos/nuevo">+ Mazo</Link>}
            </div>
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
          <div className="card-head">
            <h2 className="text-lg font-bold">Enfrentamientos directos</h2>
            {scope !== "all" && <span className="text-xs text-muted">todas las partidas</span>}
          </div>
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
            <span className="text-xs text-muted">
              mín. 2 partidas{scope !== "all" ? " · todas las partidas" : ""}
            </span>
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

      {/* ------------------------- torneos: lo que se enseña ------------------------ */}
      {placements.length > 0 && (
        <BestFinishes
          rows={mejores}
          stats={conv}
          season={cp.season}
          nameOf={(k) => cpTable.events[k]?.label ?? k}
          archOf={(a) => (a ? snap.archById.get(a) : undefined)}
          tournamentOf={(d, k) =>
            myTours.find((t) => t.date === d && t.kind === k)?.name ?? "Torneo"}
          hrefOf={(d, k) => {
            const t = myTours.find((x) => x.date === d && x.kind === k);
            return t ? `/torneos/${t.id}` : undefined;
          }}
        />
      )}

      <BadgeCase input={badgeInput} owner={player.name} />

      {/* --------------------------- Championship Points --------------------------- */}
      {cp.rows.length > 0 && <CpBreakdown cp={cp} />}

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
                  {/* Calculado, no leído de la columna: si alguien corrige la
                      asistencia del torneo, esto cambia solo. */}
                  {effectiveCp(t.season ?? seasonOfDate(t.date) ?? cp.season, cpKindOf(t), r, t.playerCount) > 0 && (
                    <span className="chip chip-brand tabular">
                      {effectiveCp(t.season ?? seasonOfDate(t.date) ?? cp.season, cpKindOf(t), r, t.playerCount)} CP
                    </span>
                  )}
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

      {/* v0.15.1 — el historial completo vive en Resultados, que tiene sus
          filtros (persona, torneo, fecha, mazo…). Aquí van las últimas, en
          orden: fecha y, el mismo día, ronda descendente. */}
      <SectionTitle aside={`${Math.min(scoped.length, ULTIMAS)} de ${scoped.length} partidas`}>
        {scope === "all" ? "Últimas partidas" : `Últimas partidas · ${SCOPES[scope].label}`}
      </SectionTitle>
      <div className="card">
        {scoped.length ? (
          <>
          <MatchList>
            {scoped.slice().sort(porRecientes).slice(0, ULTIMAS).map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                playerA={snap.playersById.get(m.playerAId)}
                playerB={m.playerBId ? snap.playersById.get(m.playerBId)
                  : m.opponentPlayerId ? snap.playersById.get(m.opponentPlayerId) : undefined}
                archA={m.deckAId ? snap.archIndex.get(m.deckAId) : undefined}
                archB={m.deckBId ? snap.archIndex.get(m.deckBId) : (m.opponentArchetypeId ? snap.archById.get(m.opponentArchetypeId) : undefined)}
                context={m.competitionId ? snap.compsById.get(m.competitionId)?.name : m.tournamentId ? snap.toursById.get(m.tournamentId)?.name : undefined}
              />
            ))}
          </MatchList>
          <Link
            className="flex min-h-12 items-center justify-center gap-2 border-t border-line-soft text-sm font-semibold text-info hover:bg-surface-2"
            href={`/resultados?jugador=${player.id}${
              scope === "liga" ? "&ambito=league" : scope === "torneos" ? "&ambito=tournament" : scope === "amistosos" ? "&ambito=casual" : ""}`}
          >
            Ver todas en Resultados, con filtros de torneo, fecha y mazo
          </Link>
          </>
        ) : scope === "all" ? (
          <Empty title="Sin partidas" />
        ) : (
          <Empty
            title={`Ninguna partida de ${SCOPES[scope].label.toLowerCase()}`}
            action={<Link className="btn btn-sm" href={`/perfil/${player.id}`}>Ver todas</Link>}
          >
            {mine.length} partidas suyas hay registradas, pero ninguna de este ámbito.
          </Empty>
        )}
      </div>
    </>
  );
}
