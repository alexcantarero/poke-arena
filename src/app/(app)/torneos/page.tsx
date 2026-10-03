import { roundsOf } from "@/lib/stats";
import Link from "next/link";
import { TOURNAMENT_STATUS, asStatus } from "@/lib/types";
import { loadSnapshot, playerCp } from "@/lib/data";
import { readSession } from "@/lib/auth";
import { awardsCp, cpKindOf, effectiveCp, getSeason, seasonOfDate } from "@/lib/cp";
import { byAgenda, fmtDate, relDays, todayISO } from "@/lib/format";
import { ArchTag, Avatar, Empty, Kpi, PageHead, SectionTitle, TournamentEmblem } from "@/components/ui";
import { agruparTorneos, filtrarTorneos } from "@/lib/torneosLista";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { canManageLeague } from "@/lib/auth";
import { importLocalTournaments } from "@/actions";
import { TORNEOS_ZONA_2026, yaExiste } from "@/data/torneos-zona-2026";

export const metadata = { title: "Torneos" };

const SCOPE_LABEL: Record<string, string> = { onsite: "Presencial", online: "Online" };

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ jugador?: string; tipo?: string; estado?: string; desde?: string; hasta?: string }>;
}) {
  const [snap, session, sp] = await Promise.all([loadSnapshot(), readSession(), searchParams]);
  const season = snap.config.cpSeason;
  const table = getSeason(season);
  const me = session ? snap.playersById.get(session.playerId) : undefined;
  const myCp = me ? playerCp(snap, me.id, season) : null;

  /* v0.15 — los torneos de la zona de oct–nov que aún no están en la app. */
  const zonaPendientes = me && canManageLeague(me.role)
    ? TORNEOS_ZONA_2026.filter((z) => !yaExiste(z, snap.tournaments))
    : [];

  const mine = me ? snap.tournaments.filter((t) => t.results.some((r) => r.playerId === me.id)) : [];
  const cpTotalGroup = snap.players.reduce((a, p) => a + playerCp(snap, p.id, season).total, 0);

  /* --- filtro por persona ---
     Cada uno va a torneos distintos, así que la lista completa mezcla cosas
     que no te tocan. Es un parámetro de la URL y no un estado de React para
     que el filtro se pueda compartir por WhatsApp y para que la vuelta atrás
     del navegador funcione. Lo pedía Alex. */
  const filterId = sp.jugador && snap.playersById.has(sp.jugador) ? sp.jugador : "all";
  const filterPlayer = filterId === "all" ? undefined : snap.playersById.get(filterId);

  /* v0.16 — filtros de fecha, tipo y estado, además de persona. Todo por URL
     (formulario GET): compartible y funciona sin JavaScript. */
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const tiposPresentes = [...new Set(snap.tournaments.map((t) => t.kind))];
  const fTipo = sp.tipo && tiposPresentes.includes(sp.tipo) ? sp.tipo : "";
  const fEstado = sp.estado && sp.estado in TOURNAMENT_STATUS ? sp.estado : "";
  const fDesde = sp.desde && ISO.test(sp.desde) ? sp.desde : "";
  const fHasta = sp.hasta && ISO.test(sp.hasta) ? sp.hasta : "";
  const conFiltros = Boolean(filterPlayer || fTipo || fEstado || fDesde || fHasta);

  const filtered = filtrarTorneos(snap.tournaments, {
    dePersona: filterPlayer
      ? new Set(snap.tournaments
        .filter((t) => t.results.some((r) => r.playerId === filterId)
          || snap.matches.some((m) => m.tournamentId === t.id && m.playerAId === filterId))
        .map((t) => t.id))
      : null,
    tipo: fTipo, estado: fEstado, desde: fDesde, hasta: fHasta,
  });

  /* --- el orden ---
     La base los devuelve del más nuevo al más viejo, que para un histórico
     está bien pero para esta pantalla no: lo que se quiere ver arriba es el
     torneo que viene. Primero lo que está por jugar, del más cercano al más
     lejano; detrás lo ya jugado, del más reciente al más antiguo. */
  const today = todayISO();
  const ordenados = [...filtered].sort(byAgenda(today));
  // v0.16: tres grupos en orden estricto — hoy, próximos, pasados.
  const grupos = agruparTorneos(filtered, today);
  const proximos = grupos.hoy.length + grupos.proximos.length;

  // Solo se ofrece filtrar por quien de verdad ha ido a algo: una lista de
  // chips con gente que no tiene torneos es ruido.
  const playerOptions = snap.players
    .filter((p) => snap.tournaments.some((t) => t.results.some((r) => r.playerId === p.id))
      || snap.matches.some((m) => m.tournamentId && m.playerAId === p.id))
    .map((p) => ({ value: p.id, label: p.name }));

  return (
    <>
      <PageHead
        title="Torneos"
        sub="Los torneos de fuera a los que vais: oficiales, de tienda y online. Con el mazo que llevaste, el puesto, los CP y los premios."
        actions={
          <Link className="btn btn-brand" href="/torneos/nuevo">
            <Icon name="plus" className="size-4" /> Nuevo torneo
          </Link>
        }
      />

      {!table.confirmed && (
        <p className="mb-4 rounded-lg border border-brand-line bg-brand-soft px-3 py-2 text-sm text-ink-2">
          <b>Las cifras de CP de la temporada {season} son provisionales.</b>{" "}
          Play! Pokémon anunció que cambian pero aún no las ha publicado en un sitio consultable.
          Están en <code className="font-mono text-xs">src/lib/cp.ts</code>, listas para corregir a mano.
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi label="Torneos" value={snap.tournaments.length} note={`${mine.length} tuyos`} />
        <Kpi label="Tus CP" value={myCp?.total ?? 0} note={`temporada ${season}`} highlight />
        <Kpi label="CP del grupo" value={cpTotalGroup} note="sumando a todos" />
        <Kpi
          label="Con CP"
          value={snap.tournaments.filter((t) => awardsCp(season, cpKindOf(t))).length}
          note="dan puntos oficiales"
        />
      </div>

      {myCp && myCp.buckets.length > 0 && (
        <section className="card mb-5">
          <div className="card-head">
            <h2 className="text-lg font-bold">Tus huecos de Best Finish Limit</h2>
            <Link className="btn btn-ghost btn-sm" href={`/perfil/${me!.id}`}>Ver detalle</Link>
          </div>
          <ul className="divide-y divide-line-soft">
            {myCp.buckets.map((b) => (
              <li key={b.bucket} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{b.label}</span>
                  <span className="block text-xs text-muted">
                    {b.bfl > 0
                      ? `${b.counting} de ${b.bfl} huecos usados${b.spare ? ` · te quedan ${b.spare}` : " · lleno"}`
                      : "sin límite: cuentan todos"}
                  </span>
                </span>
                <span className="font-display text-xl font-extrabold tabular">{b.total}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {zonaPendientes.length > 0 && (
        <section className="card mb-5">
          <div className="card-head">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Torneos de la zona · octubre y noviembre</h2>
              <p className="text-xs text-muted">
                {zonaPendientes.length} por añadir: Challenges y Cups de Catalunya, y los Regionales
                de Niza y Gdansk. Entran como borrador; los que ya estén se saltan.
              </p>
            </div>
          </div>
          <form action={importLocalTournaments} className="p-4">
            <button className="btn btn-brand w-full sm:w-auto" type="submit">
              <Icon name="plus" className="size-4" /> Añadir {zonaPendientes.length} torneos
            </button>
          </form>
        </section>
      )}

      <SectionTitle
        aside={proximos > 0
          ? `${proximos} por delante · ${filtered.length} de ${snap.tournaments.length}`
          : `${filtered.length} de ${snap.tournaments.length}`}
      >
        {filterPlayer ? `Torneos de ${filterPlayer.name}` : "Todos los torneos"}
      </SectionTitle>

      {/* v0.16 — filtros: persona, tipo, estado y fechas. */}
      <form method="get" action="/torneos" className="card mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="label">Persona</span>
          <select className="input" name="jugador" defaultValue={filterId === "all" ? "" : filterId}>
            <option value="">Todas</option>
            {playerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="label">Tipo</span>
          <select className="input" name="tipo" defaultValue={fTipo}>
            <option value="">Todos</option>
            {tiposPresentes.map((k) => (
              <option key={k} value={k}>{table.events[k]?.label ?? k}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="label">Estado</span>
          <select className="input" name="estado" defaultValue={fEstado}>
            <option value="">Todos</option>
            {Object.entries(TOURNAMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="label">Desde</span>
          <input className="input" type="date" name="desde" defaultValue={fDesde} />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="label">Hasta</span>
          <input className="input" type="date" name="hasta" defaultValue={fHasta} />
        </label>
        <div className="flex items-end gap-2">
          <button className="btn btn-brand flex-1" type="submit">Filtrar</button>
          {conFiltros && <Link className="btn btn-ghost" href="/torneos">Quitar</Link>}
        </div>
      </form>

      {ordenados.length ? (
        <div className="flex flex-col gap-5">
          {([
            ["Hoy", "Sucediendo ahora", grupos.hoy],
            ["Próximos", "Del más cercano al más lejano", grupos.proximos],
            ["Pasados", "Del más reciente al más antiguo", grupos.pasados],
          ] as const).filter(([, , lista]) => lista.length > 0).map(([titulo, nota, lista]) => (
          <section key={titulo}>
            <h3 className="mb-2 flex items-baseline justify-between gap-2 px-1">
              <span className={`font-display text-lg font-bold ${titulo === "Hoy" ? "text-brand" : ""}`}>
                {titulo === "Hoy" && <span className="mr-1.5 inline-block size-2 animate-pulse rounded-full bg-brand align-middle" />}
                {titulo} <span className="text-sm font-normal text-muted tabular">· {lista.length}</span>
              </span>
              <span className="text-[11px] text-muted">{nota}</span>
            </h3>
        <div className={`card divide-y divide-line-soft ${titulo === "Hoy" ? "border-brand-line" : ""}`}>
          {lista.map((t): ReactNode => {
            const results = t.results;
            const best = results.filter((r) => r.placement != null)
              .sort((a, b) => (a.placement ?? 9e9) - (b.placement ?? 9e9))[0];
            /* Calculado del tipo, el puesto y la asistencia de ahora, no
               leído de `cp_earned`. Esa columna es una caché y puede
               quedarse vieja; así la lista, la ficha y el perfil dicen
               siempre lo mismo. */
            const tSeason = t.season ?? seasonOfDate(t.date) ?? season;
            const cpDe = (r: typeof results[number]) => effectiveCp(tSeason, cpKindOf(t), r, t.playerCount);
            const cp = results.reduce((a, r) => a + cpDe(r), 0);
            // Con el filtro puesto interesa el resultado de esa persona, no el
            // mejor del grupo: es la pregunta que se está haciendo.
            const own = filterPlayer ? results.find((r) => r.playerId === filterPlayer.id) : undefined;
            const ownRounds = filterPlayer ? roundsOf(snap.matches, t.id, filterPlayer.id) : [];
            return (
              /* v0.17 — la fila ya no es un <a> entero: dentro van los avatares,
                 que llevan cada uno a su perfil, y un enlace no puede ir dentro
                 de otro. El nombre del torneo estira su zona de toque a toda la
                 fila (`after:inset-0`) y los avatares quedan por encima (`z-10`). */
              <div key={t.id} className="relative block px-4 py-3 hover:bg-surface-2">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                  <span className="font-mono">{fmtDate(t.date)}</span>
                  {/* «en 3 días» / «hace 2 semanas»: con el orden de agenda es
                      lo que de verdad sitúa cada fila. */}
                  <span aria-hidden="true">·</span>
                  <span className={t.date >= today ? "font-semibold text-brand" : ""}>
                    {relDays(t.date)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{SCOPE_LABEL[t.scope] ?? t.scope}</span>
                  {t.city && <><span aria-hidden="true">·</span><span className="truncate">{t.city}</span></>}
                  <span className="flex-1" />
                  {/* El estado, lo primero: un borrador y un torneo en curso
                      se veían exactamente igual, y saber si a un torneo sin
                      puesto le falta jugarse o le falta rellenarse es justo
                      para lo que existe el ciclo. */}
                  <span className={`chip ${TOURNAMENT_STATUS[asStatus(t.status)].chip}`}>
                    {TOURNAMENT_STATUS[asStatus(t.status)].short}
                  </span>
                  <span className="chip">Bo{t.bestOf}</span>
                  {awardsCp(season, cpKindOf(t)) && <span className="chip chip-brand">CP</span>}
                </div>

                <div className="flex items-start gap-3">
                  <TournamentEmblem kind={t.kind} size="md" />
                  <span className="min-w-0 flex-1">
                    <Link href={`/torneos/${t.id}`}
                      className="block truncate font-semibold after:absolute after:inset-0 after:content-['']">
                      {t.name}
                    </Link>
                    <span className="block truncate text-xs text-muted">
                      {getSeason(t.season ?? season).events[t.kind]?.label ?? t.kind}
                      {t.playerCount ? ` · ${t.playerCount} jugadores` : ""}
                    </span>
                  </span>

                  <span className="flex flex-none items-center gap-2">
                    {results.slice(0, 3).map((r) => (
                      <Link key={r.id} href={`/perfil/${r.playerId}`} className="relative z-10 rounded-full"
                        title={snap.playersById.get(r.playerId)?.name}>
                        <Avatar player={snap.playersById.get(r.playerId)} size="sm" />
                      </Link>
                    ))}
                    {results.length > 3 && <span className="text-xs text-muted">+{results.length - 3}</span>}
                  </span>
                </div>

                {filterPlayer ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {own?.placement && (
                      <span className="chip">
                        Puesto <b className="tabular">{own.placement}</b>
                        {t.playerCount ? <span className="text-muted">/{t.playerCount}</span> : null}
                      </span>
                    )}
                    {own && (own.wins || own.losses || own.ties) ? (
                      <span className="chip font-mono tabular">
                        {own.wins}–{own.losses}{own.ties ? `–${own.ties}` : ""}
                      </span>
                    ) : null}
                    {ownRounds.length > 0 && (
                      <span className="chip">{ownRounds.length} ronda(s) apuntada(s)</span>
                    )}
                    {own && cpDe(own) > 0 && <span className="chip chip-brand tabular">{cpDe(own)} CP</span>}
                    {own?.deckId && <ArchTag archetype={snap.archIndex.get(own.deckId)} />}
                    {own?.prizes && <span className="chip">🎁 {own.prizes}</span>}
                  </div>
                ) : (best || cp > 0) ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {best?.placement && (
                      <span className="chip">
                        Mejor puesto: <b className="tabular">{best.placement}</b>
                        {t.playerCount ? <span className="text-muted">/{t.playerCount}</span> : null}
                      </span>
                    )}
                    {cp > 0 && <span className="chip chip-brand tabular">{cp} CP</span>}
                    {best?.deckId && <ArchTag archetype={snap.archIndex.get(best.deckId)} />}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
          </section>
          ))}
        </div>
      ) : conFiltros ? (
        <div className="card">
          <Empty title="Ningún torneo con estos filtros">
            <Link className="underline" href="/torneos">Quítalos</Link> y vuelve a mirar.
          </Empty>
        </div>
      ) : filterPlayer ? (
        <div className="card">
          <Empty title={`${filterPlayer.name} no ha ido a ningún torneo todavía`}>
            En cuanto apunte uno aparecerá aquí.
          </Empty>
        </div>
      ) : (
        <div className="card">
          <Empty
            title="Aún no hay torneos"
            action={<Link className="btn btn-brand" href="/torneos/nuevo">Apuntar el primero</Link>}
          >
            Apunta cualquier torneo al que vayáis: una League Cup, uno de tienda o uno online.
            Los CP se calculan solos con el puesto y la asistencia.
          </Empty>
        </div>
      )}
    </>
  );
}
