import { PlanMundial } from "@/components/PlanMundial";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSnapshot, playerCp, usoDeJugador } from "@/lib/data";
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
import { posicionesDe } from "@/lib/data";
import { FavStar } from "@/components/FavStar";
import { estadoMundial } from "@/lib/mundial";
import { getLang } from "@/lib/lang";
import { tr } from "@/lib/i18n";
import { SeccionPlegable } from "@/components/SeccionPlegable";
import { LOGROS, etiquetasDe, leerLogros, nivelDeUso, urlPokeApi } from "@/lib/logros";
import { urlDeObjeto } from "@/lib/objetos";
import { spriteUrl } from "@/lib/pokemon";

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
  const lng = await getLang(); // v0.49

  const [{ id }, q] = await Promise.all([params, searchParams]);
  const [snap, session, lang] = await Promise.all([loadSnapshot(), readSession(), getLang()]);
  const posiciones = posicionesDe(snap, id);
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
  /* v0.38 — mínimo 5 partidas y no 2. Con dos cruces el porcentaje solo
     puede ser 0, 50 o 100, y una lista llena de «100% (2)» no dice nada:
     parece información y es ruido. A partir de cinco el número empieza a
     significar algo. */
  const MIN_CRUCES = 5;
  const matchups = playerMatchups(all, id, snap.archIndex, MIN_CRUCES, snap.archById);
  const rivals = headToHead(all, id);
  const decks = snap.decks.filter((d) => d.playerId === id);
  const cp = playerCp(snap, id);
  const cpTable = getSeason(cp.season);
  const myTours = snap.tournaments.filter((t) => t.results.some((r) => r.playerId === id));
  const favArch = player.favoriteArchetypeId ? snap.archById.get(player.favoriteArchetypeId) : undefined;
  /* v0.65 — la Ball de uso (mejora con lo que se usa la web), las etiquetas
     (hitos con nombre) y los logros secretos (solo los encontrados). */
  const misLogros = leerLogros(player.logros);
  const uso = usoDeJugador(snap, id); // v0.68: sin el filtro de ámbito, igual que en el inicio
  const ballUso = nivelDeUso(uso);
  const etiquetas = etiquetasDe(uso);

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
    tournaments: conv.entries,
    cuts: conv.cut,
    bestPlacement: mejores[0]?.placement ?? null,
    cp: cp.total,
    winRate: (total.winRate ?? 0) * 100,
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
            {player.role !== "player" && <span className="chip chip-brand">{player.role === "owner" ? "Organizador" : tr(lng, "x.4e7afebc")}</span>}
            {isMe && <span className="chip chip-info">{tr(lng, "x.4dc2088e")}</span>}
            {player.ladderElo != null && <RankBadge elo={player.ladderElo} size="sm" />}
            {/* v0.65 — las etiquetas: hitos conseguidos, como la del ladder. */}
            {etiquetas.map((e) => (
              <span key={e.clave} className="etiqueta" data-tono={e.tono}>{tr(lng, `etq.${e.clave}.${e.tono}`)}</span>
            ))}
            <span>Desde {fmtDateLong(player.joined)}</span>
          </p>
          {player.bio && <p className="mt-2 max-w-prose text-sm text-ink-2">{player.bio}</p>}
          {favArch && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm">
              <span className="text-muted">{tr(lng, "x.72bd1d74")}</span>
              <Sprites archetype={favArch} size="sm" />
              <span className="font-semibold">{favArch.name}</span>
            </p>
          )}
        </div>
        {isMe ? (
          <Link className="btn btn-sm" href="/perfil/editar">
            <Icon name="cog" className="size-4" /> {tr(lng, "x.673d7538")}
          </Link>
        ) : session ? (
          <FavStar playerId={player.id} on={sigo} back={`/perfil/${player.id}`} lang={lang} withLabel />
        ) : null}
      </div>

      {/* v0.65 — la Ball de uso y los logros secretos. */}
      <section className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlDeObjeto(ballUso.nivel.ball)} alt="" width={48} height={48} className="ball-uso-img size-12 flex-none" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{tr(lng, "logro.ballTitulo")}</p>
            <p className="font-display text-lg font-extrabold leading-tight">{ballUso.nivel.nombre}</p>
            {ballUso.siguiente ? (
              <>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar"
                  aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ballUso.progreso * 100)}
                  aria-label={`${ballUso.nivel.nombre} → ${ballUso.siguiente.nombre}`}>
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(ballUso.progreso * 100).toFixed(1)}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {ballUso.faltan} {tr(lng, "logro.puntosPara")} {ballUso.siguiente.nombre} · {tr(lng, "logro.comoSube")}
                </p>
              </>
            ) : (
              <p className="mt-1 text-[11px] text-muted">{tr(lng, "logro.ballMax")}</p>
            )}
          </div>
        </div>
        <div className="min-w-0 sm:w-[55%]">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {tr(lng, "logro.titulo")} · {misLogros.length}/{LOGROS.length}
          </p>
          {misLogros.length ? (
            <ul className="grid grid-cols-1 gap-1.5 xs:grid-cols-2">
              {LOGROS.filter((l) => misLogros.includes(l.clave)).map((l) => (
                /* v0.71 — sin la descripción (ni en el título): cómo se gana es
                   parte del secreto. Solo el Pokémon y el nombre. */
                <li key={l.clave} className="logro-ficha">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.dex ? urlPokeApi(l.dex) : spriteUrl(l.pokemon)} alt="" width={44} height={44} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{tr(lng, `logro.${l.clave}.nombre`)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">{tr(lng, isMe ? "logro.ningunoTu" : "logro.ninguno")}</p>
          )}
          {misLogros.length > 0 && misLogros.length < LOGROS.length && (
            <p className="mt-1.5 text-[11px] text-muted">{LOGROS.length - misLogros.length} {tr(lng, "logro.quedan")}</p>
          )}
        </div>
      </section>

      {/* ------------------------------ balance ------------------------------ */}
      <ScopeTabs
        basePath={`/perfil/${player.id}`} param="ambito" current={scope} allLabel={tr(lng, "x.fdebf667")}
        options={Object.entries(SCOPES).map(([value, s]) => ({ value, label: s.label }))}
      />

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {/* v0.25: sus partidas sobre el total de la liga. */}
        <Kpi label={tr(lng, "x.64f94394")}
          value={<>{rec.played}<span className="text-base font-semibold text-muted"> / {posiciones.partidasTotales}</span></>}
          note={`juegos ${rec.gameWins}–${rec.gameLosses}`} />
        <Kpi label={tr(lng, "x.dce1e265")} value={rec.wins} />
        <Kpi label={tr(lng, "x.a80f28ed")} value={rec.losses} />
        <Kpi label={tr(lng, "x.4975fb9f")} value={rec.ties} />
        {/* v0.25: la tarjeta dorada es el puesto en la liga, con el de Elo a la derecha. */}
        <Kpi
          highlight
          label={posiciones.comp?.name ? posiciones.comp.name.slice(0, 30) /* v0.65: a 18 salía «LIGA REGULAR INVIE» */ : tr(lang, "home.league")}
          value={posiciones.liga
            ? <>{posiciones.liga.pos}.º{posiciones.elo && (
                <span className="ml-2 text-base font-semibold text-ink-2">· Elo {posiciones.elo.pos}.º</span>)}</>
            : "—"}
          note={`${pct(rec.winRate, 0)} ${tr(lang, "home.wins")}`}
        />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi label="Elo" value={elo}
          note={`${elo - snap.config.eloStart >= 0 ? "+" : ""}${elo - snap.config.eloStart} desde el inicio`} />
        <Kpi label={`CP ${cp.season}`} value={cp.total}
          note={cpTable.confirmed ? `${myTours.length} torneos` : tr(lng, "x.b200b9ed")} />
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
        {tr(lng, "x.dba1ee64")}
      </p>

      {/* Evolución del Elo, mazos, enfrentamientos directos y emparejamientos
          van primero: son las cifras vivas de cómo juegas. El desglose de CP
          —que no cambia partida a partida— va después, más abajo, para que el
          perfil abra con lo más visual. */}

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        {/* v0.25: sin gráfica de Elo en el perfil (queda en el Ranking). */}
        <section className="card">
          <div className="card-head">
            <h2 className="text-lg font-bold">{tr(lng, "x.3817d8b2")}</h2>
            <div className="flex flex-none items-center gap-2">
              {scope !== "all" && <span className="text-xs text-muted">{tr(lng, "x.98a3565f")}</span>}
              {isMe && <Link className="btn btn-sm" href="/mazos/nuevo">{tr(lng, "x.736289b0")}</Link>}
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
            <Empty title={tr(lng, "x.c65889c6")}>
              {decks.length ? "Asigna el mazo al registrar la partida y aparecerá aquí." : tr(lng, "x.a7cc628e")}
            </Empty>
          )}
        </section>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <SeccionPlegable
          titulo={tr(lng, "x.55125239")}
          clave="perfil-h2h"
          nota={scope !== "all" ? "todas las partidas" : undefined}
        >
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
          ) : <Empty title={tr(lng, "x.4c15a42e")} />}
        </SeccionPlegable>

        <SeccionPlegable
          titulo={tr(lng, "x.ab10f5e6")}
          clave="perfil-emparejamientos"
          nota={`mín. ${MIN_CRUCES} partidas${scope !== "all" ? " · todas las partidas" : ""}`}
        >
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
            <Empty title={tr(lng, "x.287f41db")}>
              {tr(lng, "x.78df36ea")}
            </Empty>
          )}
        </SeccionPlegable>
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
            myTours.find((t) => t.date === d && t.kind === k)?.name ?? tr(lng, "x.250eff11")}
          hrefOf={(d, k) => {
            const t = myTours.find((x) => x.date === d && x.kind === k);
            return t ? `/torneos/${t.id}` : undefined;
          }}
        />
      )}

      <BadgeCase input={badgeInput} owner={player.name} />

      {/* --------------------------- Championship Points --------------------------- */}
      {cp.rows.length > 0 && <CpBreakdown cp={cp} />}
      {/* v0.73 — qué te falta para el Mundial (~650 CP), de lo más fácil a lo más difícil. */}
      <PlanMundial cp={cp} />

      {myTours.length > 0 && (
        <>
          <SectionTitle aside={`${myTours.length}`}>{tr(lng, "x.f02a0f3c")}</SectionTitle>
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
      <SectionTitle aside={tr(lng, "x.e51af110")}>{tr(lng, "x.65c72323")}</SectionTitle>
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
            {tr(lng, "x.b2765508")}
          </Link>
          </>
        ) : scope === "all" ? (
          <Empty title={tr(lng, "x.4c9f3d8f")} />
        ) : (
          <Empty
            title={`Ninguna partida de ${SCOPES[scope].label.toLowerCase()}`}
            action={<Link className="btn btn-sm" href={`/perfil/${player.id}`}>{tr(lng, "x.3efc403a")}</Link>}
          >
            {mine.length} partidas suyas hay registradas, pero ninguna de este ámbito.
          </Empty>
        )}
      </div>
    </>
  );
}
