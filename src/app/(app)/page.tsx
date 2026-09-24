import Link from "next/link";
import { compPlayers, loadSnapshot, playerCp } from "@/lib/data";
import { byPlayer, type PlacementRow } from "@/lib/tournamentStats";
import { getSeason } from "@/lib/cp";
import { ConversionTable, type ConvRow } from "@/components/ConversionTable";
import { SortToggle, sortRows, type SortDir } from "@/components/statistics/SortToggle";
import { readSession } from "@/lib/auth";
import { archetypeStats, isInternal, isPlayed, outcome, standings } from "@/lib/stats";
import { pct, relDays, shortName, todayISO, wrColor } from "@/lib/format";
import {
  Avatar, Empty, Kpi, MatchCard, MatchList, PageHead, PlayerTag,
  Record, Sprites, StreakChip,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { HomeCharts } from "@/components/HomeCharts";

export default async function HomePage({
  searchParams,
}: { searchParams: Promise<{ tipo?: string | string[]; orden?: string }> }) {
  const [q, snap, session] = await Promise.all([searchParams, loadSnapshot(), readSession()]);
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

  /* ---------------------------------------------------------------
     Datos de los gráficos. Se preparan aquí, en el servidor, para que el
     componente cliente solo dibuje: así el motor de estadísticas sigue siendo
     puro y no hay que llevárselo al navegador.
     --------------------------------------------------------------- */

  // Solo quien ha jugado algo: una línea plana en 1000 no dice nada y encima
  // gasta un color de la paleta.
  const eloSeries = snap.players
    .filter((p) => p.active && (snap.elo.history[p.id]?.length ?? 0) > 1)
    .map((p) => ({
      id: p.id,
      label: p.name,
      // El color del perfil manda; si es el dorado de marca se deja que la
      // paleta de series decida, porque la marca no es un dato.
      color: p.color && p.color.toLowerCase() !== "#f0b429" ? p.color : null,
      points: (snap.elo.history[p.id] ?? []).map((h) => ({ date: h.date, value: Math.round(h.value) })),
    }));

  const metaRows = archs.slice(0, 8).map((a) => ({
    id: a.archetypeId,
    label: a.archetype?.name ?? a.archetypeId,
    played: a.played,
    wins: a.wins,
    ties: a.ties,
    losses: a.losses,
  }));
  // Los sprites se pintan en el servidor y viajan como nodos ya listos: el
  // componente cliente no necesita conocer los arquetipos.
  const metaSprites = Object.fromEntries(
    archs.slice(0, 8).map((a) => [a.archetypeId, <Sprites key={a.archetypeId} archetype={a.archetype} size="sm" />]),
  );

  const cpBars = (myCp?.buckets ?? []).map((b) => {
    const rows = myCp!.rows.filter((r) => r.bucket === b.bucket);
    return {
      bucket: b.bucket,
      label: b.label,
      total: b.total,
      dropped: rows.filter((r) => r.excluded).reduce((a, r) => a + r.value, 0),
      bfl: b.bfl,
      counting: b.counting,
      entries: rows.length,
    };
  });

  /* --------------------------------------------------------------
     Conversión en torneos: de cada diez veces que vas, cuántas llegas.

     Es otra pregunta distinta a la del ranking. El ranking dice quién gana
     más partidas; esto dice quién convierte. Hay gente que gana muchas
     rondas y se queda en la burbuja.

     El filtro por tipo de torneo va por URL, como el resto de la app: el
     enlace se comparte y la vuelta atrás funciona.
     -------------------------------------------------------------- */
  const tiposConTorneos = [...new Set(snap.tournaments.map((t) => t.kind))];

  /* --- varios tipos a la vez ---
     `?tipo=regional&tipo=league_cup`. Dentro de la MISMA dimensión los
     valores se suman (o uno u otro), que es lo que uno espera al marcar dos
     casillas: pedir «regional Y cup» a la vez no devolvería nunca nada,
     porque un torneo tiene un solo tipo. El «y» entre dimensiones distintas
     —tipo y fecha, por ejemplo— sí se cumple, y es como funcionan también
     los filtros de Resultados y Estadísticas. */
  const tipos = (Array.isArray(q.tipo) ? q.tipo : q.tipo ? [q.tipo] : [])
    .filter((t) => tiposConTorneos.includes(t));
  const activo = (k: string) => tipos.includes(k);
  const cpTable = getSeason(snap.config.cpSeason);

  const placements: PlacementRow[] = snap.tournaments
    .filter((t) => !tipos.length || tipos.includes(t.kind))
    .flatMap((t) => t.results.map((r) => ({
      playerId: r.playerId,
      archetypeId: r.archetypeId
        ?? (r.deckId ? snap.decksById.get(r.deckId)?.archetypeId ?? null : null),
      placement: r.placement ?? null,
      date: t.date,
      kind: t.kind,
      playerCount: t.playerCount ?? null,
      topCut: t.topCut ?? null,
    })));

  /* El %V y las victorias de partidas salen de las rondas de torneo, no de
     los puestos: son dos cosas distintas y conviene verlas juntas. */
  const rondas = played.filter((m) => m.tournamentId)
    .filter((m) => {
      if (!tipos.length) return true;
      const k = snap.toursById.get(m.tournamentId as string)?.kind;
      return Boolean(k && tipos.includes(k));
    });

  const orden: SortDir = q.orden === "asc" ? "asc" : "desc";

  const conversion: ConvRow[] = [...byPlayer(placements).entries()]
    .map(([playerId, stats]) => {
      const p = snap.playersById.get(playerId);
      const mias = rondas.filter((m) => m.playerAId === playerId);
      const ganadas = mias.filter((m) => outcome(m).winner === "a").length;
      const perdidas = mias.filter((m) => outcome(m).winner === "b").length;
      const empatadas = mias.length - ganadas - perdidas;
      return {
        ...stats,
        id: playerId,
        label: p?.name ?? "—",
        icon: <Avatar player={p} size="sm" />,
        href: `/perfil/${playerId}`,
        matchWins: ganadas,
        matchWinRate: mias.length ? (ganadas + empatadas / 2) / mias.length : null,
      };
    })
    .sort((a, b) => b.entries - a.entries);

  /** La URL con un tipo añadido o quitado, conservando los demás y el orden. */
  const urlCon = (lista: string[], dir: SortDir) => {
    const sp = new URLSearchParams();
    for (const t of lista) sp.append("tipo", t);
    if (dir === "asc") sp.set("orden", "asc");
    const qs = sp.toString();
    return qs ? `/?${qs}` : "/";
  };
  const alternar = (k: string) =>
    urlCon(activo(k) ? tipos.filter((x) => x !== k) : [...tipos, k], orden);
  const ordenHref = (d: SortDir) => urlCon(tipos, d);

  return (
    <>
      <PageHead
        gradient
        title={snap.config.name}
        sub={`${snap.config.season} · ${snap.activePlayerIds.length} jugadores · ${played.length} partidas`}
        actions={
          <Link className="btn btn-brand hidden md:inline-flex" href="/partidas/nueva">
            <Icon name="plus" className="size-4" /> Registrar partida
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Kpi icon="results" label="Partidas" value={played.length} note={`${played.filter((m) => !isInternal(m)).length} contra gente de fuera`} />
        <Kpi
          highlight
          icon="trophy"
          label={mainComp ? shortName(mainComp.name, 16) : "Líder"}
          value={leader ? snap.playersById.get(leader.playerId)?.name ?? "—" : "—"}
          note={leader ? `${leader.points} pts · ${pct(leader.winRate, 0)}` : "sin datos"}
        />
        {mine
          ? <Kpi
              icon="user"
              tone={mine.winRate != null && mine.winRate >= 0.5 ? "win" : "neutral"}
              label="Tú" value={pct(mine.winRate, 0)} note={`${mine.wins}V ${mine.losses}D · Elo ${mine.elo}`}
            />
          : <Kpi icon="deck" label="Arquetipos" value={archs.length} note="vistos en la liga" />}
        <Kpi
          icon="star"
          label="Tus CP"
          value={myCp ? myCp.total : "—"}
          note={myCp ? `temporada ${myCp.season}${myCp.confirmed ? "" : " · provisional"}` : "sin torneos"}
        />
      </div>

      {/* --------------------- conversión en torneos --------------------- */}
      {conversion.length > 0 && (
        <section className="card mb-4">
          <div className="card-head">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Conversión en torneos</h2>
              <p className="text-xs text-muted">
                De cada vez que vais, cuántas llegáis al corte. No es lo mismo que ganar
                rondas.
              </p>
            </div>
            <SortToggle dir={orden} href={ordenHref} />
          </div>

          {tiposConTorneos.length > 1 && (
            <div className="px-4 pt-3">
              {/* Se pueden marcar varios. Cada chip encendido lleva una × que
                  lo quita, que es la única forma de que se entienda que no es
                  un selector de uno solo. */}
              <div className="scroll-x flex gap-2">
                <Link href={urlCon([], orden)} aria-current={!tipos.length ? "page" : undefined}
                  className={`chip flex-none ${!tipos.length ? "chip-brand" : ""}`}>
                  Todos
                </Link>
                {tiposConTorneos.map((k) => (
                  <Link key={k} href={alternar(k)}
                    aria-pressed={activo(k)}
                    className={`chip flex-none ${activo(k) ? "chip-brand" : ""}`}>
                    {cpTable.events[k]?.label ?? k}
                    {activo(k) && <Icon name="close" className="size-3" />}
                  </Link>
                ))}
              </div>
              {tipos.length > 1 && (
                <p className="mt-1.5 text-[11px] text-muted">
                  Se suman: salen los torneos de cualquiera de los {tipos.length} tipos
                  marcados.
                </p>
              )}
            </div>
          )}

          <div className="mt-2">
            <ConversionTable
              rows={sortRows(conversion, (r) => r.cutRate ?? r.top4Rate, orden)}
              matchColumns
              empty="Nadie tiene todavía un puesto apuntado en un torneo de este tipo."
            />
          </div>

          <p className="border-t border-line-soft px-4 py-3 text-[11px] text-muted">
            <b>%Cut</b> se calcula solo sobre los torneos que tenían top cut: un Challenge sin
            corte no cuenta como corte fallado, y por eso a veces sale un guion en vez de un
            cero. <b>%V</b> y <b>V</b> son de partidas, no de torneos.
          </p>
        </section>
      )}

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
                  <PlayerTag player={snap.playersById.get(r.playerId)} size="sm" className="min-w-0 flex-1" />
                  {/* El récord se esconde en pantallas estrechas: con el
                      nombre, el %V y la racha no cabe, y es lo que menos se
                      mira de los cuatro. Está entero en Ranking. */}
                  <span className="hidden xs:inline"><Record w={r.wins} d={r.ties} l={r.losses} /></span>
                  <span className="w-11 flex-none text-right font-mono text-sm font-semibold tabular" style={{ color: wrColor(r.winRate) }}>
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

      {(eloSeries.length > 0 || metaRows.length > 0 || cpBars.length > 0) && (
        <HomeCharts
          elo={eloSeries}
          eloStart={snap.config.eloStart}
          meta={metaRows}
          cp={cpBars}
          season={myCp?.season ?? snap.config.cpSeason}
          sprites={metaSprites}
        />
      )}
    </>
  );
}
