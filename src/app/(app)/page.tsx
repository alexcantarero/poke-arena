import { getLang } from "@/lib/lang";
import { diasRelativos, ordinal, tr, trf } from "@/lib/i18n";
import { posicionesDe, usoDeJugador } from "@/lib/data";
import Link from "next/link";
import { urlDeObjeto } from "@/lib/objetos";
import { nivelDeUso } from "@/lib/logros";
import { compPlayers, loadMetaIrl, loadSnapshot, playerCp } from "@/lib/data";
import { readSession } from "@/lib/auth";
import { resultadoRapido } from "@/actions";
import { Bienvenida } from "@/components/Bienvenida";
import { marcadoresDe } from "@/lib/marcador";
import {
  archetypeStats, isInternal, isPlayed, standings,
} from "@/lib/stats";
import { byAgenda, fechaCorta, num, pct, shortName, todayISO, wrColor } from "@/lib/format";
import { toneOf } from "@/lib/calendar";
import {
  Empty, Kpi, PageHead, PlayerTag, TournamentEmblem,
  Record, StreakChip,
} from "@/components/ui";
import { cookies } from "next/headers";
import { Icon } from "@/components/icons";
import { UltimoRegional, type Vista } from "@/components/UltimoRegional";
import { cpKindOf, effectiveCp, getSeason, seasonOfDate } from "@/lib/cp";
import { estructuraDe, umbralesDe } from "@/lib/estructura";
import { conCuotaOnline, resumenGrupo, type ResultadoGrupo } from "@/lib/metaGrupo";
import { irlMeta, panelDeEvento } from "@/lib/metaIrl";
import { ordenaPorCuota } from "@/lib/metaBadges";
import { fetchMetaSnapshot } from "@/lib/sources/limitless";
import type { Archetype } from "@/lib/types";
import { asModoResultados, mayoresConCp, ultimosConCp, type EntradaCp } from "@/lib/ultimosCp";

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
/** v0.48 — por debajo de esto, tu %V en Inicio sale como guion. */
const MIN_PARTIDAS_PCT = 5;
/** Días desde hoy hasta una fecha (negativo si ya pasó). */
const diasHasta = (iso: string) =>
  Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${todayISO()}T12:00:00Z`)) / 86_400_000);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; resultados?: string; rk?: string }>;
}) {
  const q = await searchParams;
  const vista: Vista = q.vista === "grupo" ? "grupo" : "global";
  /* v0.65 — el ranking del inicio se elige: Elo (por defecto), CP o la liga. */
  const rk: "elo" | "cp" | "liga" = q.rk === "cp" || q.rk === "liga" ? q.rk : "elo";
  const rkHref = (v: "elo" | "cp" | "liga") => {
    const u = new URLSearchParams();
    if (q.vista) u.set("vista", q.vista);
    if (q.resultados) u.set("resultados", q.resultados);
    if (v !== "elo") u.set("rk", v);
    const t = u.toString();
    return t ? `/?${t}` : "/";
  };
  const [snap, session, irl, online] = await Promise.all([
    loadSnapshot(), readSession(), loadMetaIrl(), cuotaOnline(),
  ]);
  const played = snap.matches.filter(isPlayed);
  /* v0.68 — la Ball de uso de cada uno, pequeña, junto a su nombre en el ranking. */
  const ballDe = (pid: string) => {
    const n = nivelDeUso(usoDeJugador(snap, pid)).nivel;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={urlDeObjeto(n.ball)} alt={n.nombre} title={`${tr(lang, "home.ballDe")}: ${n.nombre}`}
        width={20} height={20} className="ball-ranking" loading="lazy" />
    );
  };
  // v0.56 — ¿jugador nuevo? Alta en los últimos 30 días: le sale la bienvenida.
  const yo = session ? snap.playersById.get(session.playerId) : undefined;
  const esNuevo = Boolean(yo?.joined && Date.parse(`${yo.joined}T00:00:00Z`) > Date.now() - 30 * 86400000);
  // v0.54 — mis partidas pendientes, lo PRIMERO que se ve: es lo único que corre prisa.
  const misPendientes = session ? snap.matches.filter((m) => m.status === "pending"
    && (m.playerAId === session.playerId || m.playerBId === session.playerId)).slice(0, 6) : [];

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
  // v0.48 — el día de la semana en su idioma: «lun» / «Mon».
  const diaCorto = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "es-ES", { weekday: "short", timeZone: "UTC" });
  const myCp = session ? playerCp(snap, session.playerId) : null;
  const archs = archetypeStats(played, snap.archIndex, undefined, snap.archById);
  const today = todayISO();
  const upcoming = [
    ...snap.events
      .filter((e) => e.date >= today && !(e.tournamentId && snap.toursById.has(e.tournamentId)))
      .map((e) => {
        const tone = toneOf(e.tournamentKind, e.kind === "deadline" ? "deadline" : e.kind === "round" ? "round" : "event");
        return {
          id: `event-${e.id}`, date: e.date, endDate: e.endDate, title: e.title,
          sub: [e.location, e.note].filter(Boolean).join(" · "),
          type: "event" as const, kind: e.tournamentKind, scope: null,
          kindLabel: tone.label, color: tone.color,
          href: undefined as string | undefined, url: e.url || undefined,
        };
      }),
    ...snap.tournaments
      .filter((t) => t.date >= today)
      .map((t) => {
        const tone = toneOf(t.kind, "event");
        return {
          id: `tournament-${t.id}`, date: t.date, endDate: t.endDate,
          title: t.name, sub: [t.city, t.venue].filter(Boolean).join(" · "),
          type: "tournament" as const, kind: t.kind, scope: t.scope,
          kindLabel: tone.label, color: tone.color,
          href: `/torneos/${t.id}`, url: undefined as string | undefined,
        };
      }),
  ].sort(byAgenda(today)).slice(0, 6);

  /* -------------------------------------------- el último Regional --- */
  const hoy = todayISO();
  const temporada = seasonOfDate(hoy) ?? snap.config.cpSeason;
  const etiquetaTipo = (kind: string) => getSeason(temporada).events[kind]?.label ?? kind;
  const archDe = (r: { deckId: string | null; archetypeId: string | null }): Archetype | undefined =>
    r.deckId ? snap.archIndex.get(r.deckId) : r.archetypeId ? snap.archById.get(r.archetypeId) : undefined;

  const cfgSeason = snap.config.cpSeason;

  /* v0.41 — los resultados que DIERON CP, en dos órdenes a elegir:

       · «Más CP»: los grandes resultados de la temporada.
       · «Recientes»: lo que acaba de pasar.

     Antes era «mejores puestos», ordenado por puesto, y un 1.º en un
     Challenge de doce personas salía por encima de un top 16 en un Regional
     que vale diez veces más. Ordenar por CP pone cada resultado en su sitio.

     Los CP salen de `effectiveCp()`, la misma función que el perfil y la
     ficha del torneo (v0.40). NUNCA de la columna `cp_earned` en crudo: ese
     fue el fallo de la v0.9.0. Un CP metido a mano sigue mandando. */
  const modoResultados = asModoResultados(q.resultados);
  const entradasCp: EntradaCp[] = snap.tournaments
    .filter((t) => t.status === "closed")
    .flatMap((t) => {
      const temporada = t.season ?? seasonOfDate(t.date) ?? cfgSeason;
      const tipo = cpKindOf(t);
      const tipoLabel = getSeason(temporada).events[tipo]?.label ?? t.kind;
      return t.results.flatMap((r) => {
        const player = snap.playersById.get(r.playerId);
        if (!player) return [];
        return [{
          id: `${t.id}-${r.playerId}`,
          torneoId: t.id, torneo: t.name, fecha: t.date, tipo: tipoLabel,
          jugadorId: r.playerId, jugador: player.name, puesto: r.placement,
          cp: effectiveCp(temporada, tipo, r, t.playerCount),
        }];
      });
    });
  const mejoresResultados = modoResultados === "recientes"
    ? ultimosConCp(entradasCp, 5)
    : mayoresConCp(entradasCp, 5);

  // Vuestros resultados en forma de metagame, torneo a torneo.
  const resultadosDe = (t: (typeof snap.tournaments)[number]): ResultadoGrupo[] => {
    const umbral = umbralesDe(t.playerCount, t.kind)?.diaDos?.puntos ?? null;
    const corte = t.topCut ?? estructuraDe(t.playerCount, t.kind)?.topCut ?? null;
    return t.results.map((r) => {
      const a = archDe(r);
      return {
        playerId: r.playerId, tournamentId: t.id, umbralDiaDos: umbral, topCut: corte,
        archetypeId: a?.id ?? null, archetypeName: a?.name ?? tr(lang, "home.deckUnknown"),
        main: a?.main ?? "", secondary: a?.secondary ?? "",
        placement: r.placement, wins: r.wins, losses: r.losses, ties: r.ties,
      };
    });
  };
  const jugados = snap.tournaments
    .filter((t) => t.date <= hoy && t.results.length > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  let panel: Parameters<typeof UltimoRegional>[0];
  // v0.41 — conserva el orden de «Mejores resultados» al cambiar de vista.
  const rq = q.resultados === "recientes" ? "resultados=recientes" : "";
  const hrefs = {
    global: `/${rq ? `?${rq}` : ""}#ultimo-regional`,
    grupo: `/?vista=grupo${rq ? `&${rq}` : ""}#ultimo-regional`,
  };

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
        name: ev.name, date: fechaCorta(ev.date, lang === "en" ? "en-GB" : "es-ES"), location: ev.location || null,
        playerCount: ev.playerCount,
        muestra: ev.coverage ? trf(lang, "home.importedTop", { top: ev.coverage, decks: p.campo.decks }) : trf(lang, "home.importedDecks", { decks: p.campo.decks }),
        href: "/topdecks?fuente=presencial",
      } : null,
      filas: p.filas, campo: p.campo,
      etiquetaConversion: tr(lang, "home.toTopCut"),
      corte: p.corte.map((c) => ({ placement: c.placement, titulo: c.name, main: c.main, secondary: c.secondary })),
      corteTitulo: tr(lang, "home.topCut"), corteTamano: p.campo.topCut,
      corteEnlace: ev.sourceUrl, // v0.51 — cada puesto lleva a la lista en Limitless
      top: top.rows.slice(0, 10).map((r) => ({
        key: r.key, name: r.name, main: r.main || undefined, secondary: r.secondary || undefined,
        share: r.share, decks: r.entries,
      })),
      topNota: trf(lang, "home.importedNote", { events: top.events, season: temporada }),
      recientes: irl.events.filter((e) => e.kind !== "city_league").slice(0, 6).map((e) => ({
        key: e.id, date: fechaCorta(e.date), name: e.name, tipo: etiquetaTipo(e.kind),
        aside: e.playerCount ? trf(lang, "home.players", { n: num(e.playerCount) }) : undefined,
        href: "/topdecks?fuente=presencial",
      })),
      regionales: irl.events
        .filter((e) => KINDS_REGIONAL.has(e.kind))
        .map((e) => ({ id: e.id, name: e.name, date: e.date })),
      vacio: (
        <>
          {tr(lang, "home.noRegionalA")}{" "}
          <Link className="underline" href="/ajustes">{tr(lang, "home.noRegionalLink")}</Link>
          {tr(lang, "home.noRegionalB")}
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
        muestra: trf(lang, "home.fromGroup", { n: r.resultados }),
        href: `/torneos/${t.id}`,
      } : null,
      filas: ordenaPorCuota(conCuotaOnline(r.filas, online)), campo: r.campo,
      etiquetaConversion: tr(lang, "home.toDay2"),
      corte: [...t?.results ?? []]
        .sort((a, b) => (a.placement ?? 9e9) - (b.placement ?? 9e9))
        .map((x) => {
          const a = archDe(x);
          const cp = t ? effectiveCp(temporadaEv, cpKindOf(t), x, t.playerCount) : 0;
          return {
            placement: x.placement ?? 0,
            titulo: snap.playersById.get(x.playerId)?.name ?? tr(lang, "home.someone"),
            sub: a?.name ?? tr(lang, "home.deckUnknown"),
            main: a?.main || undefined, secondary: a?.secondary || undefined,
            extra: (
              <span className="flex flex-none items-center gap-1.5 text-xs tabular">
                <span><span className="text-win">{x.wins}</span>–<span className="text-loss">{x.losses}</span>–<span className="text-tie">{x.ties}</span></span>
                {cp > 0 && <span className="chip chip-brand text-[10px]">{cp} CP</span>}
              </span>
            ),
          };
        }),
      corteTitulo: tr(lang, "home.yourResults"), corteTamano: topT,
      top: ordenaPorCuota(rTemp.filas).slice(0, 10).map((f) => ({
        key: f.key, name: f.name, main: f.main || undefined, secondary: f.secondary || undefined,
        share: f.field / decksTemp, decks: f.field,
      })),
      topNota: trf(lang, "home.groupNote", { results: rTemp.resultados, tournaments: rTemp.torneos, season: temporada }),
      recientes: jugados.slice(0, 6).map((x) => {
        const mejor = Math.min(...x.results.map((r) => r.placement ?? 9e9));
        return {
          key: x.id, date: fechaCorta(x.date), name: x.name, tipo: etiquetaTipo(x.kind),
          href: `/torneos/${x.id}`,
          aside: `${trf(lang, "home.fromGroup", { n: x.results.length })}${Number.isFinite(mejor) && mejor < 9e9 ? ` · ${trf(lang, "home.bestPlace", { n: ordinal(lang, mejor) })}` : ""}`,
        };
      }),
      vacio: <>{tr(lang, "home.noGroupRegional")}</>,
    };
  }

  return (
    <>
      <PageHead
        gradient
        title={snap.config.name}
        sub={trf(lang, "home.sub", { season: snap.config.season, players: snap.activePlayerIds.length, matches: played.length })}
      />

      {/* v0.56 — bienvenida para quien se dio de alta hace menos de 30 días. */}
      <Bienvenida nuevo={esNuevo} />

      {/* v0.54 — tus partidas pendientes, con el resultado a un toque. */}
      {misPendientes.length > 0 && (
        <section className="card mb-4 border-brand/40" aria-labelledby="pendientes-titulo">
          <div className="card-head">
            <h2 id="pendientes-titulo" className="text-lg font-bold">{tr(lang, "home.pendientes")}</h2>
            <span className="chip chip-brand tabular">{misPendientes.length}</span>
          </div>
          <ul className="divide-y divide-line-soft">
            {misPendientes.map((m) => {
              const nA = snap.playersById.get(m.playerAId)?.name ?? "A";
              const nB = m.playerBId ? snap.playersById.get(m.playerBId)?.name ?? "B" : m.opponentName ?? "?";
              const comp = m.competitionId ? snap.compsById.get(m.competitionId) : null;
              return (
                <li key={m.id} className="px-3 py-2 xs:px-4">
                  <details>
                    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 xs:gap-3">
                      <span className="chip flex-none">J{m.round}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{nA} <span className="text-muted">vs</span> {nB}</span>
                        {comp && <span className="block truncate text-[11px] text-muted">{comp.name} · Bo{m.bestOf}</span>}
                      </span>
                      <span className="btn btn-brand btn-sm flex-none px-3">{tr(lang, "rr.apuntar")}</span>
                    </summary>
                    <form action={resultadoRapido} className="mt-2 flex flex-col gap-2 pb-1">
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="volver" value="/" />
                      <div className="grid grid-cols-2 gap-2 xs:grid-cols-4">
                        {marcadoresDe(m.bestOf).map(([a, b]) => (
                          <button key={`${a}-${b}`} type="submit" name="marcador" value={`${a}-${b}`}
                            className={`flex min-h-12 flex-col items-center justify-center rounded-xl border-2 border-line-soft bg-surface-2 px-2 py-1.5 ${a > b ? "hover:border-win" : "hover:border-loss"}`}>
                            <span className={`font-display text-xl font-extrabold tabular ${a > b ? "text-win" : "text-loss"}`}>{a}–{b}</span>
                            <span className="max-w-full truncate text-[11px] text-muted">{a > b ? nA : nB}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" name="marcador" value="empate"
                          className="flex-1 rounded-xl border-2 border-line-soft bg-surface-2 px-3 py-2 text-sm font-semibold text-muted hover:border-tie">
                          {tr(lang, "rr.empateTiempo")}
                        </button>
                        <Link href={`/partidas/${m.id}`} className="btn btn-sm flex-none self-center">{tr(lang, "rr.formulario")}</Link>
                      </div>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {/* v0.25 — tus partidas sobre el total de la liga, y en la tarjeta dorada
            tu puesto en la liga con tu puesto de Elo a la derecha. Sin sesión
            (o si no juegas la liga), se queda como antes: total y líder. */}
        {posiciones ? (
          <Kpi icon="results" tone="local" label={tr(lang, "home.yourMatches")}
            value={<>{misPartidas}<span className="text-base font-semibold text-muted"> / {played.length}</span></>}
            note={tr(lang, "home.ofLeague")} />
        ) : (
          <Kpi icon="results" tone="local" label={tr(lang, "home.matches")} value={played.length} note={trf(lang, "home.vsOutside", { n: played.filter((m) => !isInternal(m)).length })} />
        )}
        {posiciones?.liga ? (
          <Kpi
            tone="brand"
            icon="trophy"
            label={mainComp ? shortName(mainComp.name, 30) /* v0.65: la etiqueta ya cabe en dos líneas; a 16 salía «LIGA REGULAR IN…» */ : tr(lang, "home.league")}
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
            label={mainComp ? shortName(mainComp.name, 30) /* v0.65: la etiqueta ya cabe en dos líneas; a 16 salía «LIGA REGULAR IN…» */ : tr(lang, "home.leader")}
            value={leader ? snap.playersById.get(leader.playerId)?.name ?? "—" : "—"}
            note={leader ? pct(leader.winRate, 0) : tr(lang, "home.noData")}
          />
        )}
        {mine
          ? <Kpi
              icon="user"
              tone={mine.winRate != null && mine.winRate >= 0.5 ? "win" : "neutral"}
              label={tr(lang, "home.you")}
              /* v0.48 — un porcentaje sobre una o dos partidas no dice nada: un
                 0 % tras una derrota se leía igual que un 0 % sobre cien. Por
                 debajo de MIN_PARTIDAS_PCT se enseña el guion y cuántas faltan. */
              value={mine.played >= MIN_PARTIDAS_PCT ? pct(mine.winRate, 0) : "—"}
              note={mine.played >= MIN_PARTIDAS_PCT
                ? trf(lang, "home.youNote", { w: mine.wins, l: mine.losses, elo: mine.elo })
                : `${trf(lang, "home.youFew", { n: mine.played, min: MIN_PARTIDAS_PCT })} · Elo ${mine.elo}`}
            />
          : <Kpi icon="deck" tone="global" label={tr(lang, "home.archetypes")} value={archs.length} note={tr(lang, "home.seenInLeague")} />}
        <Kpi
          icon="star"
          tone="diff"
          label={tr(lang, "home.yourCp")}
          value={myCp ? myCp.total : "—"}
          /* v0.54 — un solo nombre de temporada en toda la app: el de la liga
                 («Temporada 1»). Por dentro, los CP siguen contándose por la temporada
                 oficial de Play! Pokémon (2027), que es la de sus tablas. */
              note={myCp ? `${snap.config.season}${myCp.confirmed ? "" : ` · ${tr(lang, "home.provisional")}`}` : tr(lang, "home.noTournaments")}
        />
      </div>



      {/* Lo primero tras las cifras: es lo que se viene a mirar el lunes. */}
      <UltimoRegional {...panel} lang={lang} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="card-head flex-wrap gap-y-2">
            <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
              {tr(lang, rk === "elo" ? "home.rkElo" : rk === "cp" ? "home.rkCp" : "home.leagueRanking")}
            </h2>
            <div className="flex items-center gap-2">
              {/* v0.65 — qué ranking: Elo, CP o liga. Enlaces: funcionan sin JavaScript. */}
              <nav className="seg" aria-label={tr(lang, "home.rkElegir")}>
                {(["elo", "cp", "liga"] as const).map((v) => (
                  <Link key={v} href={rkHref(v)} scroll={false} data-on={rk === v} aria-current={rk === v ? "page" : undefined}>
                    {v === "elo" ? "Elo" : v === "cp" ? "CP" : tr(lang, "home.league")}
                  </Link>
                ))}
              </nav>
              <Link className="btn btn-ghost btn-sm" href={rk === "liga" && mainComp ? `/competiciones/${mainComp.id}` : "/ranking"}>{tr(lang, "home.seeAll")}</Link>
            </div>
          </div>
          {rk !== "liga" ? (() => {
            /* Elo: los activos con alguna partida, por rating. CP: los que tienen
               CP esta temporada. Mismo aspecto que la tabla de la liga. */
            const conPartidas = new Set(played.flatMap((m) => [m.playerAId, m.playerBId ?? ""]));
            const filas = rk === "elo"
              ? snap.activePlayerIds.filter((id) => conPartidas.has(id))
                  .map((id) => ({ id, valor: Math.round(snap.elo.rating[id] ?? snap.config.eloStart) }))
              : snap.players.filter((p) => p.active)
                  .map((p) => ({ id: p.id, valor: playerCp(snap, p.id).total })).filter((f) => f.valor > 0);
            filas.sort((x, y) => y.valor - x.valor);
            if (!filas.length) return <Empty title={tr(lang, rk === "cp" ? "home.rkSinCp" : "home.noMatchesYet")}>{rk === "cp" ? null : tr(lang, "home.noMatchesHint")}</Empty>;
            return (
              <ol className="divide-y divide-line-soft">
                {filas.slice(0, 6).map((f, i) => (
                  <li key={f.id} className={`flex items-center gap-3 px-3.5 py-2.5 ${session?.playerId === f.id ? "bg-surface-2/70" : ""}`}>
                    <span className={`flex size-6 flex-none items-center justify-center rounded-full font-display text-xs font-black tabular ${
                      i === 0 ? "bg-brand/20 text-brand ring-1 ring-brand/40" : i === 1 ? "bg-surface-3 text-ink-2 ring-1 ring-line" : i === 2 ? "bg-tier-bronce/20 text-tier-bronce ring-1 ring-tier-bronce/40" : "text-muted"}`}>
                      {i + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      <PlayerTag player={snap.playersById.get(f.id)} size="sm" className="min-w-0 font-semibold text-ink" />
                      {ballDe(f.id)}
                    </span>
                    <span className="flex-none font-mono text-sm font-bold tabular">
                      {f.valor}<span className="ml-1 text-[10px] font-semibold text-muted">{rk === "elo" ? "Elo" : "CP"}</span>
                    </span>
                  </li>
                ))}
              </ol>
            );
          })() : table.some((r) => r.played) ? (
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
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      <PlayerTag player={snap.playersById.get(r.playerId)} size="sm" className="min-w-0 font-semibold text-ink" />
                      {ballDe(r.playerId)}
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
          ) : <Empty title={tr(lang, "home.noMatchesYet")}>{tr(lang, "home.noMatchesHint")}</Empty>}
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="text-lg font-bold">{tr(lang, "home.upcoming")}</h2>
            <Link className="btn btn-ghost btn-sm" href="/calendario">{tr(lang, "nav./calendario")}</Link>
          </div>
          {upcoming.length ? (
            <ul className="divide-y divide-line-soft">
              {upcoming.map((item) => {
                const varios = item.endDate && item.endDate !== item.date;
                const contenido = (
                  <>
                    <span
                      className="flex w-12 flex-none flex-col items-center rounded-lg border py-1 text-center"
                      style={{ borderColor: `color-mix(in oklab, ${item.color} 45%, transparent)`, background: `color-mix(in oklab, ${item.color} 10%, transparent)` }}
                    >
                      <span className="font-display text-2xl font-extrabold leading-none tabular">
                        {Number(item.date.slice(8, 10))}
                        {varios ? <span className="text-sm">–{Number(item.endDate!.slice(8, 10))}</span> : null}
                      </span>
                      <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-2">
                        {diaCorto.format(new Date(`${item.date}T12:00:00Z`)).replace(".", "")}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <TournamentEmblem kind={item.kind} scope={item.scope} size="xs" />
                        <span className="block truncate text-sm font-semibold">{item.title}</span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted">
                        <span
                          className="rounded-full px-1.5 py-px text-[10px] font-semibold"
                          style={{ background: `color-mix(in oklab, ${item.color} 16%, transparent)`, color: item.color }}
                        >
                          {item.kindLabel}
                        </span>
                        <span>{diasRelativos(lang, diasHasta(item.date))}</span>
                        {item.sub && <span className="truncate">· {item.sub}</span>}
                      </span>
                    </span>
                    {(item.href || item.url) && <Icon name="back" className="size-4 flex-none rotate-180 text-muted" />}
                  </>
                );
                const clase = "flex items-center gap-2.5 px-3 py-2 hover:bg-surface-2";
                return (
                  <li key={item.id}>
                    {item.href
                      ? <Link href={item.href} className={clase}>{contenido}</Link>
                      : item.url
                        ? <a href={item.url} target="_blank" rel="noopener noreferrer" className={clase}>{contenido}</a>
                        : <div className={`${clase} hover:bg-transparent`}>{contenido}</div>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty title={tr(lang, "home.emptyAgenda")}>
              {tr(lang, "home.emptyAgendaHint")}
            </Empty>
          )}
        </section>
      </div>

      <section className="card mt-4 overflow-hidden">
        <div className="card-head flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{tr(lang, "home.bestTournamentResults")}</h2>
          <Link className="btn btn-ghost btn-sm" href="/torneos">{tr(lang, "home.viewTournaments")}</Link>
        </div>

        {/* v0.41 — dos órdenes. Son enlaces y no un interruptor de JavaScript:
            funcionan sin él, la URL se comparte, y `scroll={false}` evita que
            la página salte arriba al cambiar. */}
        <div className="flex gap-1.5 border-b border-line-soft px-3.5 py-2.5">
          {([["cp", tr(lang, "home.moreCp")], ["recientes", tr(lang, "home.recent")]] as const).map(([v, label]) => (
            <Link
              key={v}
              // Conserva `vista` (el selector de «El último Regional»): sin esto,
              // cambiar el orden de aquí te devolvía la otra vista a su valor por defecto.
              href={(() => {
                const p = new URLSearchParams();
                if (q.vista) p.set("vista", q.vista);
                if (v === "recientes") p.set("resultados", "recientes");
                const t = p.toString();
                return t ? `/?${t}` : "/";
              })()}
              scroll={false}
              aria-current={modoResultados === v ? "true" : undefined}
              className={`chip ${modoResultados === v ? "chip-brand" : ""}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {mejoresResultados.length ? (
          <ol className="divide-y divide-line-soft">
            {mejoresResultados.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3.5 py-3">
                <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-brand-soft font-display text-sm font-extrabold tabular text-brand">
                  {r.puesto ? `#${r.puesto}` : "—"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <PlayerTag player={snap.playersById.get(r.jugadorId)} size="xs" className="text-sm" />
                    <span className="flex-none text-xs text-muted">{fechaCorta(r.fecha, lang === "en" ? "en-GB" : "es-ES")}</span>
                  </span>
                  <Link href={`/torneos/${r.torneoId}`} className="mt-1 block truncate text-sm text-muted hover:text-info">
                    {r.torneo}
                  </Link>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="chip text-[11px]">{r.tipo}</span>
                    {r.puesto ? <span className="chip text-[11px] tabular">{trf(lang, "home.place", { n: ordinal(lang, r.puesto) })}</span> : null}
                  </span>
                </span>
                {/* Aquí todos tienen CP: los ceros ya no entran en la lista. */}
                <span className="flex flex-none flex-col items-end">
                  <span className="font-display text-lg font-extrabold tabular text-brand">+{r.cp}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted">CP</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="p-4">
            <Empty title={tr(lang, "home.noFinalPlacements")}>
              {tr(lang, "home.noFinalPlacementsHint")}
            </Empty>
          </div>
        )}
      </section>
    </>
  );
}
