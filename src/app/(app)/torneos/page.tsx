import { roundsOf } from "@/lib/stats";
import Link from "next/link";
import { TOURNAMENT_STATUS, asStatus } from "@/lib/types";
import { loadTorneosPantalla, playerCp } from "@/lib/data";
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
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { toneOf } from "@/lib/calendar";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Torneos" };

const SCOPE_LABEL: Record<string, string> = { onsite: "Presencial", online: "Online" };

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ jugador?: string; tipo?: string; estado?: string; desde?: string; hasta?: string }>;
}) {
  const lng = await getLang(); // v0.49

  /* v0.47 — Fase B: `snap` NO es el snapshot entero. Son torneos, resultados,
     jugadores y solo las rondas de torneo (`loadTorneosPantalla`), sin las
     jornadas de liga ni los amistosos, que aquí no se enseñan. */
  const [snap, session, sp] = await Promise.all([loadTorneosPantalla(), readSession(), searchParams]);
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

  /* v0.41 — la URL de un chip: los filtros que ya hay, con uno cambiado.
     Sin esto, pulsar «Regional» borraría la persona y las fechas elegidas. */
  const urlFiltro = (cambio: Partial<Record<"estado" | "tipo", string>>) => {
    const q = new URLSearchParams();
    const actual: Record<string, string> = {
      jugador: filterId === "all" ? "" : filterId,
      tipo: fTipo, estado: fEstado, desde: fDesde, hasta: fHasta,
      ...cambio,
    };
    for (const [k, v] of Object.entries(actual)) if (v) q.set(k, v);
    const t = q.toString();
    return t ? `/torneos?${t}` : "/torneos";
  };

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
        title={tr(lng, "x.f02a0f3c")}
        sub={tr(lng, "x.9a0b7d24")}
        actions={
          <Link className="btn btn-brand" href="/torneos/nuevo">
            <Icon name="plus" className="size-4" /> {tr(lng, "x.fca27f06")}
          </Link>
        }
      />

      {!table.confirmed && (
        <p className="mb-4 rounded-lg border border-brand-line bg-brand-soft px-3 py-2 text-sm text-ink-2">
          <b>Las cifras de CP de la temporada {season} son provisionales.</b>{" "}
          Play! Pokémon anunció que cambian pero aún no las ha publicado en un sitio consultable.
          Están en <code className="font-mono text-xs">src/lib/cp.ts</code>{tr(lng, "x.c849f3b9")}
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi label={tr(lng, "x.f02a0f3c")} value={snap.tournaments.length} note={`${mine.length} tuyos`} />
        <Kpi label={tr(lng, "x.75c2f3d0")} value={myCp?.total ?? 0} note={snap.config.season} highlight />
        <Kpi label={tr(lng, "x.6296c540")} value={cpTotalGroup} note={tr(lng, "x.bb13ec73")} />
        <Kpi
          label={tr(lng, "x.af459507")}
          value={snap.tournaments.filter((t) => awardsCp(season, cpKindOf(t))).length}
          note={tr(lng, "x.cacdbb19")}
        />
      </div>

      {myCp && myCp.buckets.length > 0 && (
        <section className="card mb-5">
          <div className="card-head">
            <h2 className="text-lg font-bold">{tr(lng, "x.d3ce56ba")}</h2>
            <Link className="btn btn-ghost btn-sm" href={`/perfil/${me!.id}`}>{tr(lng, "x.3c5d7a3a")}</Link>
          </div>
          <ul className="divide-y divide-line-soft">
            {myCp.buckets.map((b) => (
              <li key={b.bucket} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{b.label}</span>
                  <span className="block text-xs text-muted">
                    {b.bfl > 0
                      ? `${b.counting} de ${b.bfl} huecos usados${b.spare ? ` · te quedan ${b.spare}` : " · lleno"}`
                      : tr(lng, "x.c82bbe0b")}
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
              <h2 className="text-lg font-bold">{tr(lng, "x.0b260139")}</h2>
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
        {filterPlayer ? `Torneos de ${filterPlayer.name}` : tr(lng, "x.5f64bc1d")}
      </SectionTitle>

      {/* v0.16 — filtros: persona, tipo, estado y fechas.

          v0.41 — rediseñados. Antes eran cinco controles del mismo tamaño en
          fila y un botón «Filtrar»: para ver los Regionales había que abrir
          un desplegable, elegir y pulsar otro botón. Ahora:

            · Lo que tiene pocas opciones (estado, tipo) son CHIPS: un toque y
              filtrado. Son enlaces, así que funcionan sin JavaScript y la URL
              se puede compartir. Los tipos llevan el mismo color que en el
              calendario, para que «Regional» se lea igual en las dos pantallas.
            · Lo que tiene muchas (persona) y las fechas se aplican solos al
              cambiar (`AutoSubmitForm`), sin botón. Sin JavaScript, ese
              componente ya enseña su propio botón de aplicar. */}
      <div className="card mb-4 flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="label w-14 flex-none">{tr(lng, "x.87cf2a84")}</span>
          <div className="scroll-fade flex min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5">
            {[["", tr(lng, "x.a4114a83")], ...Object.entries(TOURNAMENT_STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
              <Link
                key={k || tr(lng, "x.a9010807")}
                href={urlFiltro({ estado: k })}
                scroll={false}
                aria-current={fEstado === k ? "true" : undefined}
                className={`chip flex-none ${fEstado === k ? "chip-brand" : ""}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {tiposPresentes.length > 1 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="label w-14 flex-none">{tr(lng, "x.6cc6198d")}</span>
            <div className="scroll-fade flex min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5">
              <Link
                href={urlFiltro({ tipo: "" })} scroll={false}
                aria-current={!fTipo ? "true" : undefined}
                className={`chip flex-none ${!fTipo ? "chip-brand" : ""}`}
              >
                {tr(lng, "x.a4114a83")}
              </Link>
              {tiposPresentes.map((k) => (
                <Link
                  key={k}
                  href={urlFiltro({ tipo: k })} scroll={false}
                  aria-current={fTipo === k ? "true" : undefined}
                  className={`chip flex-none items-center gap-1.5 ${fTipo === k ? "chip-brand" : ""}`}
                >
                  <i className="size-2 flex-none rounded-full" style={{ background: toneOf(k).color }} aria-hidden="true" />
                  {table.events[k]?.label ?? toneOf(k).label}
                </Link>
              ))}
            </div>
          </div>
        )}

        <AutoSubmitForm action="/torneos" className="grid grid-cols-1 gap-2 border-t border-line-soft pt-3 xs:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {/* Lo que ya está puesto con chips viaja oculto: si no, cambiar la
              persona borraría el estado y el tipo elegidos. */}
          {fEstado && <input type="hidden" name="estado" value={fEstado} />}
          {fTipo && <input type="hidden" name="tipo" value={fTipo} />}
          <label className="flex min-w-0 flex-col gap-1">
            <span className="label">{tr(lng, "x.05568bf8")}</span>
            <select className="input" name="jugador" defaultValue={filterId === "all" ? "" : filterId}>
              <option value="">{tr(lng, "x.8a3c3440")}</option>
              {playerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="label">{tr(lng, "x.966c7c4c")}</span>
            <input className="input" type="date" name="desde" defaultValue={fDesde} />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="label">{tr(lng, "x.ccdaad85")}</span>
            <input className="input" type="date" name="hasta" defaultValue={fHasta} />
          </label>
        </AutoSubmitForm>

        {conFiltros && (
          <Link href="/torneos" scroll={false} className="w-fit text-xs text-muted underline-offset-2 hover:underline">
            {tr(lng, "x.22d52f4a")}
          </Link>
        )}
      </div>

      {ordenados.length ? (
        <div className="flex flex-col gap-5">
          {([
            ["Hoy", tr(lng, "x.30315f64"), grupos.hoy],
            ["Próximos", tr(lng, "x.de4aba3d"), grupos.proximos],
            ["Pasados", tr(lng, "x.2764a725"), grupos.pasados],
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
              <div key={t.id}
                /* v0.22: franja de estado a la izquierda, como los «tiles» de Argo CD. */
                className="tile-status relative block px-4 py-3 transition-colors hover:bg-surface-2"
                style={{ ["--status" as string]: asStatus(t.status) === "open" ? "var(--info)"
                  : asStatus(t.status) === "draft" ? "var(--brand-line)" : "var(--line)" }}>
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
                  <span className={`chip chip-dot ${TOURNAMENT_STATUS[asStatus(t.status)].chip}`}>
                    {TOURNAMENT_STATUS[asStatus(t.status)].short}
                  </span>
                  <span className="chip">Bo{t.bestOf}</span>
                  {awardsCp(season, cpKindOf(t)) && <span className="chip chip-brand">CP</span>}
                </div>

                <div className="flex items-start gap-3">
                  <TournamentEmblem kind={t.kind} scope={t.scope} size="md" />
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
                        {tr(lng, "x.7f57e400")} <b className="tabular">{own.placement}</b>
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
                        {tr(lng, "x.a9247dfc")} <b className="tabular">{best.placement}</b>
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
          <Empty title={tr(lng, "x.fcaaef23")}>
            <Link className="underline" href="/torneos">{tr(lng, "x.b605ff08")}</Link> {tr(lng, "x.b2639653")}
          </Empty>
        </div>
      ) : filterPlayer ? (
        <div className="card">
          <Empty title={`${filterPlayer.name} no ha ido a ningún torneo todavía`}>
            {tr(lng, "x.f64e4290")}
          </Empty>
        </div>
      ) : (
        <div className="card">
          <Empty
            title={tr(lng, "x.743546c5")}
            action={<Link className="btn btn-brand" href="/torneos/nuevo">{tr(lng, "x.b0630859")}</Link>}
          >
            {tr(lng, "x.1afe85b3")}
          </Empty>
        </div>
      )}
    </>
  );
}
