import { getLang } from "@/lib/lang";
import { tr } from "@/lib/i18n";
import { posicionesDe } from "@/lib/data";
import Link from "next/link";
import { compPlayers, loadMetaIrl, loadSnapshot, playerCp } from "@/lib/data";
import { readSession } from "@/lib/auth";
import {
  archetypeStats, isInternal, isPlayed, standings,
} from "@/lib/stats";
import { pct, relDays, shortName, todayISO, wrColor } from "@/lib/format";
import {
  Empty, Kpi, PageHead, PlayerTag,
  Record, Sprites, StreakChip,
} from "@/components/ui";
import { cookies } from "next/headers";
import { Icon } from "@/components/icons";
import { HomeCharts } from "@/components/HomeCharts";
import { UltimoRegional, type Vista } from "@/components/UltimoRegional";
import { cpKindOf, effectiveCp, getSeason, seasonOfDate } from "@/lib/cp";
import { estructuraDe, umbralesDe } from "@/lib/estructura";
import { conCuotaOnline, resumenGrupo, type ResultadoGrupo } from "@/lib/metaGrupo";
import { irlMeta, panelDeEvento } from "@/lib/metaIrl";
import { ordenaPorCuota } from "@/lib/metaBadges";
import { fetchMetaSnapshot } from "@/lib/sources/limitless";
import type { Archetype } from "@/lib/types";

/** Los tipos que tienen Día 2 y cuentan como «Regional» en el inicio. */
const KINDS_REGIONAL = new Set(["regional", "special", "international"]);

/**
 * La cuota online, para la insignia de «sobrejugado». Con un tope de tiempo:
 * el inicio no puede quedarse esperando a Limitless. Si no llega, la
 * insignia dice que no hay con qué comparar y ya está.
 */
async function cuotaOnline(): Promise<Array<{ name: string; share: number }>> {
  try {
    const snap = await Promise.race([
      fetchMetaSnapshot({ days: 14, limit: 20, minPlayers: 32, apiKey: process.env.LIMITLESS_API_KEY }),
      new Promise<null>((r) => setTimeout(() => r(null), 2500)),
    ]);
    return snap ? snap.rows.map((r) => ({ name: r.name, share: r.share })) : [];
  } catch {
    return [];
  }
}

/** «18 sept.» — la fecha corta de las listas. */
const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`));

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const q = await searchParams;
  const vista: Vista = q.vista === "grupo" ? "grupo" : "global";
  const [snap, session, irl, online] = await Promise.all([
    loadSnapshot(), readSession(), loadMetaIrl(), cuotaOnline(),
  ]);
  const played = snap.matches.filter(isPlayed);

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
  // v0.25: puestos (liga y Elo) y tus partidas, para las tarjetas de arriba.
  const posiciones = session ? posicionesDe(snap, session.playerId) : null;
  const misPartidas = session
    ? played.filter((m) => m.playerAId === session.playerId || m.playerBId === session.playerId).length
    : 0;
  const lang = await getLang();
  const myCp = session ? playerCp(snap, session.playerId) : null;
  const archs = archetypeStats(played, snap.archIndex, undefined, snap.archById);
  const upcoming = snap.events.filter((e) => e.date >= todayISO()).slice(0, 3);
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
      points: (snap.elo.history[p.id] ?? []).map((h) => ({ date: h.date, value: Math.round(h.value), matchId: h.matchId, delta: h.delta ? Math.round(h.delta) : undefined })),
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



  /* -------------------------------------------- el último Regional --- */
  const hoy = todayISO();
  const temporada = seasonOfDate(hoy) ?? snap.config.cpSeason;
  const etiquetaTipo = (kind: string) => getSeason(temporada).events[kind]?.label ?? kind;
  const archDe = (r: { deckId: string | null; archetypeId: string | null }): Archetype | undefined =>
    r.deckId ? snap.archIndex.get(r.deckId) : r.archetypeId ? snap.archById.get(r.archetypeId) : undefined;

  // Vuestros resultados en forma de metagame, torneo a torneo.
  const resultadosDe = (t: (typeof snap.tournaments)[number]): ResultadoGrupo[] => {
    const umbral = umbralesDe(t.playerCount, t.kind)?.diaDos?.puntos ?? null;
    const corte = t.topCut ?? estructuraDe(t.playerCount, t.kind)?.topCut ?? null;
    return t.results.map((r) => {
      const a = archDe(r);
      return {
        playerId: r.playerId, tournamentId: t.id, umbralDiaDos: umbral, topCut: corte,
        archetypeId: a?.id ?? null, archetypeName: a?.name ?? "Mazo sin anotar",
        main: a?.main ?? "", secondary: a?.secondary ?? "",
        placement: r.placement, wins: r.wins, losses: r.losses, ties: r.ties,
      };
    });
  };
  const jugados = snap.tournaments
    .filter((t) => t.date <= hoy && t.results.length > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  let panel: Parameters<typeof UltimoRegional>[0];
  const hrefs = { global: "/#ultimo-regional", grupo: "/?vista=grupo#ultimo-regional" };

    const personalId = (await cookies()).get("personalRegional")?.value;
  if (vista === "global") {
      const elegido = personalId ? irl.events.find((e) => e.id === personalId) : undefined;
    const ev = elegido ?? irl.events.find((e) => KINDS_REGIONAL.has(e.kind)) ?? irl.events[0];
    const entries = ev ? irl.entries.filter((e) => e.eventId === ev.id) : [];
    const p = panelDeEvento(entries, ev?.topCut, online);
    const deTemporada = irl.events.filter((e) => KINDS_REGIONAL.has(e.kind) && (e.season ?? seasonOfDate(e.date)) === temporada);
    const top = irlMeta(deTemporada, irl.entries.filter((e) => deTemporada.some((d) => d.id === e.eventId)));
    panel = {
      vista, hrefs,
      evento: ev ? {
        id: ev.id,
        name: ev.name, date: fechaCorta(ev.date), location: ev.location || null,
        playerCount: ev.playerCount,
        muestra: ev.coverage ? `top ${ev.coverage} importado (${p.campo.decks} listas)` : `${p.campo.decks} listas importadas`,
        href: "/topdecks?fuente=presencial",
      } : null,
      filas: p.filas, campo: p.campo,
      etiquetaConversion: "al top cut",
      corte: p.corte.map((c) => ({ placement: c.placement, titulo: c.name, main: c.main, secondary: c.secondary })),
      corteTitulo: "Top cut", corteTamano: p.campo.topCut,
      top: top.rows.slice(0, 10).map((r) => ({
        key: r.key, name: r.name, main: r.main || undefined, secondary: r.secondary || undefined,
        share: r.share, decks: r.entries,
      })),
      topNota: `${top.events} eventos · temporada ${temporada} · lo importado`,
      recientes: irl.events.filter((e) => e.kind !== "city_league").slice(0, 6).map((e) => ({
        key: e.id, date: fechaCorta(e.date), name: e.name, tipo: etiquetaTipo(e.kind),
        aside: e.playerCount ? `${e.playerCount.toLocaleString("es")} jugadores` : undefined,
        href: "/topdecks?fuente=presencial",
      })),
      regionales: irl.events
        .filter((e) => KINDS_REGIONAL.has(e.kind))
        .map((e) => ({ id: e.id, name: e.name, date: e.date })),
      vacio: (
        <>
          Todavía no hay ningún Regional importado. Se importa en{" "}
          <Link className="underline" href="/ajustes">Ajustes → Metagame presencial</Link>, pegando la
          clasificación del top 32 o 64: solo se guardan puesto y mazo, ningún nombre.
        </>
      ),
    };
  } else {
      const fechaElegida = personalId ? irl.events.find((e) => e.id === personalId)?.date : undefined;
    const t = (fechaElegida && jugados.find((x) => KINDS_REGIONAL.has(x.kind)
        && x.date <= fechaElegida && (x.endDate ?? x.date) >= fechaElegida))
      || jugados.find((x) => KINDS_REGIONAL.has(x.kind));
    const res = t ? resultadosDe(t) : [];
    const r = resumenGrupo(res);
    const temporadaT = jugados.filter((x) => (x.season ?? seasonOfDate(x.date)) === temporada);
    const rTemp = resumenGrupo(temporadaT.flatMap(resultadosDe));
    const decksTemp = rTemp.campo.decks || 1;
    const topT = t ? (t.topCut ?? estructuraDe(t.playerCount, t.kind)?.topCut ?? 0) : 0;
    const temporadaEv = t?.season ?? seasonOfDate(t?.date) ?? temporada;
    panel = {
      vista, hrefs,
      evento: t ? {
        name: t.name, date: fechaCorta(t.date), location: t.city || t.venue || null,
        playerCount: t.playerCount,
        muestra: `${r.resultados} del grupo`,
        href: `/torneos/${t.id}`,
      } : null,
      filas: ordenaPorCuota(conCuotaOnline(r.filas, online)), campo: r.campo,
      etiquetaConversion: "a Día 2",
      corte: [...t?.results ?? []]
        .sort((a, b) => (a.placement ?? 9e9) - (b.placement ?? 9e9))
        .map((x) => {
          const a = archDe(x);
          const cp = t ? effectiveCp(temporadaEv, cpKindOf(t), x, t.playerCount) : 0;
          return {
            placement: x.placement ?? 0,
            titulo: snap.playersById.get(x.playerId)?.name ?? "Alguien",
            sub: a?.name ?? "Mazo sin anotar",
            main: a?.main || undefined, secondary: a?.secondary || undefined,
            extra: (
              <span className="flex flex-none items-center gap-1.5 text-xs tabular">
                <span><span className="text-win">{x.wins}</span>–<span className="text-loss">{x.losses}</span>–<span className="text-tie">{x.ties}</span></span>
                {cp > 0 && <span className="chip chip-brand text-[10px]">{cp} CP</span>}
              </span>
            ),
          };
        }),
      corteTitulo: "Vuestros resultados", corteTamano: topT,
      top: ordenaPorCuota(rTemp.filas).slice(0, 10).map((f) => ({
        key: f.key, name: f.name, main: f.main || undefined, secondary: f.secondary || undefined,
        share: f.field / decksTemp, decks: f.field,
      })),
      topNota: `${rTemp.resultados} resultados en ${rTemp.torneos} torneos · temporada ${temporada}`,
      recientes: jugados.slice(0, 6).map((x) => {
        const mejor = Math.min(...x.results.map((r) => r.placement ?? 9e9));
        return {
          key: x.id, date: fechaCorta(x.date), name: x.name, tipo: etiquetaTipo(x.kind),
          href: `/torneos/${x.id}`,
          aside: `${x.results.length} del grupo${Number.isFinite(mejor) && mejor < 9e9 ? ` · mejor ${mejor}.º` : ""}`,
        };
      }),
      vacio: <>Nadie del grupo tiene todavía un Regional apuntado con resultado.</>,
    };
  }

  return (
    <>
      <PageHead
        gradient
        title={snap.config.name}
        sub={`${snap.config.season} · ${snap.activePlayerIds.length} jugadores · ${played.length} partidas`}
      />

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {/* v0.25 — tus partidas sobre el total de la liga, y en la tarjeta dorada
            tu puesto en la liga con tu puesto de Elo a la derecha. Sin sesión
            (o si no juegas la liga), se queda como antes: total y líder. */}
        {posiciones ? (
          <Kpi icon="results" tone="local" label={tr(lang, "home.yourMatches")}
            value={<>{misPartidas}<span className="text-base font-semibold text-muted"> / {played.length}</span></>}
            note={tr(lang, "home.ofLeague")} />
        ) : (
          <Kpi icon="results" tone="local" label="Partidas" value={played.length} note={`${played.filter((m) => !isInternal(m)).length} contra gente de fuera`} />
        )}
        {posiciones?.liga ? (
          <Kpi
            tone="brand"
            icon="trophy"
            label={mainComp ? shortName(mainComp.name, 16) : tr(lang, "home.league")}
            value={<>
              {posiciones.liga.pos}.º
              {posiciones.elo && (
                <span className="ml-2 text-base font-semibold text-ink-2" title={tr(lang, "home.eloRank")}>
                  · Elo {posiciones.elo.pos}.º
                </span>
              )}
            </>}
            note={`${tr(lang, "home.of")} ${posiciones.liga.total} · ${tr(lang, "home.eloRankShort")} ${posiciones.elo ? `${posiciones.elo.pos}/${posiciones.elo.total}` : "—"}`}
          />
        ) : (
          <Kpi
            tone="brand"
            icon="trophy"
            label={mainComp ? shortName(mainComp.name, 16) : "Líder"}
            value={leader ? snap.playersById.get(leader.playerId)?.name ?? "—" : "—"}
            note={leader ? `${leader.points} pts · ${pct(leader.winRate, 0)}` : "sin datos"}
          />
        )}
        {mine
          ? <Kpi
              icon="user"
              tone={mine.winRate != null && mine.winRate >= 0.5 ? "win" : "neutral"}
              label="Tú" value={pct(mine.winRate, 0)} note={`${mine.wins}V ${mine.losses}D · Elo ${mine.elo}`}
            />
          : <Kpi icon="deck" tone="global" label="Arquetipos" value={archs.length} note="vistos en la liga" />}
        <Kpi
          icon="star"
          tone="diff"
          label="Tus CP"
          value={myCp ? myCp.total : "—"}
          note={myCp ? `temporada ${myCp.season}${myCp.confirmed ? "" : " · provisional"}` : "sin torneos"}
        />
      </div>



      {/* Lo primero tras las cifras: es lo que se viene a mirar el lunes. */}
      <UltimoRegional {...panel} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="card-head">
            <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">Clasificación</h2>
            <Link className="btn btn-ghost btn-sm" href="/ranking">Ver toda</Link>
          </div>
          {table.some((r) => r.played) ? (
            <ol className="divide-y divide-line-soft">
              {table.slice(0, 6).map((r, i) => {
                const isTop1 = i === 0;
                const isTop2 = i === 1;
                const isTop3 = i === 2;
                const winRate = mainComp?.kind === "league"
                  ? (r.wins + r.losses ? r.wins / (r.wins + r.losses) : null)
                  : r.winRate;
                const rowBg = isTop1
                  ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--brand-soft)_60%,transparent),transparent_85%)] border-l-[3px] border-l-brand"
                  : isTop2
                  ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--surface-3)_70%,transparent),transparent_85%)] border-l-[3px] border-l-line"
                  : isTop3
                  ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--tier-bronce)_25%,transparent),transparent_85%)] border-l-[3px] border-l-tier-bronce"
                  : "border-l-[3px] border-l-transparent hover:bg-surface-2/60";

                return (
                  <li key={r.playerId} className={`flex items-center gap-3 px-3.5 py-2.5 transition-colors ${rowBg}`}>
                    {isTop1 ? (
                      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-brand/20 font-display text-xs font-black text-brand ring-1 ring-brand/40 shadow-xs">
                        1
                      </span>
                    ) : isTop2 ? (
                      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-surface-3 font-display text-xs font-black text-ink-2 ring-1 ring-line shadow-xs">
                        2
                      </span>
                    ) : isTop3 ? (
                      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-tier-bronce/20 font-display text-xs font-black text-tier-bronce ring-1 ring-tier-bronce/40 shadow-xs">
                        3
                      </span>
                    ) : (
                      <span className="flex size-6 flex-none items-center justify-center font-display text-xs font-bold tabular text-muted">
                        {i + 1}
                      </span>
                    )}
                    <PlayerTag player={snap.playersById.get(r.playerId)} size="sm" className="min-w-0 flex-1 font-semibold text-ink" />
                    <span className="font-mono text-xs font-bold tabular text-ink-2 bg-surface-2/80 px-1.5 py-0.5 rounded">
                      {r.points} <span className="text-[10px] text-muted font-normal">pts</span>
                    </span>
                    {/* El récord se esconde en pantallas estrechas: con el
                        nombre, el %V y la racha no cabe, y es lo que menos se
                        mira de los cuatro. Está entero en Ranking. */}
                    <span className="hidden xs:inline">
                      {mainComp?.kind === "league"
                        ? <span className="font-mono text-xs font-bold tabular"><span className="text-win">{r.wins}</span>–<span className="text-loss">{r.losses}</span></span>
                        : <Record w={r.wins} d={r.ties} l={r.losses} />}
                    </span>
                    <span className="w-11 flex-none text-right font-mono text-xs font-bold tabular" style={{ color: wrColor(winRate) }}>
                      {pct(winRate, 0)}
                    </span>
                    <StreakChip kind={r.streak.kind} n={r.streak.n} />
                  </li>
                );
              })}
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
