import { roundsOf } from "@/lib/stats";
import Link from "next/link";
import { TOURNAMENT_STATUS, asStatus } from "@/lib/types";
import { loadSnapshot, playerCp } from "@/lib/data";
import { readSession } from "@/lib/auth";
import { awardsCp, cpKindOf, effectiveCp, getSeason, seasonOfDate } from "@/lib/cp";
import { byAgenda, fmtDate, relDays, todayISO } from "@/lib/format";
import { ArchTag, Avatar, Empty, Kpi, PageHead, SectionTitle } from "@/components/ui";
import { ScopeTabs } from "@/components/ScopeTabs";
import { Icon } from "@/components/icons";
import { canManageLeague } from "@/lib/auth";
import { importLocalTournaments } from "@/actions";
import { TORNEOS_ZONA_2026, yaExiste } from "@/data/torneos-zona-2026";

export const metadata = { title: "Torneos" };

const SCOPE_LABEL: Record<string, string> = { onsite: "Presencial", online: "Online" };

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ jugador?: string }>;
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
  const filtered = filterId === "all"
    ? snap.tournaments
    : snap.tournaments.filter((t) => t.results.some((r) => r.playerId === filterId)
        || snap.matches.some((m) => m.tournamentId === t.id && m.playerAId === filterId));
  const filterPlayer = filterId === "all" ? undefined : snap.playersById.get(filterId);

  /* --- el orden ---
     La base los devuelve del más nuevo al más viejo, que para un histórico
     está bien pero para esta pantalla no: lo que se quiere ver arriba es el
     torneo que viene. Primero lo que está por jugar, del más cercano al más
     lejano; detrás lo ya jugado, del más reciente al más antiguo. */
  const today = todayISO();
  const ordenados = [...filtered].sort(byAgenda(today));
  const proximos = ordenados.filter((t) => t.date >= today).length;

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

      {playerOptions.length > 1 && (
        <div className="mb-3">
          <ScopeTabs
            basePath="/torneos" param="jugador" current={filterId}
            options={playerOptions} allLabel="Todos"
          />
        </div>
      )}

      {ordenados.length ? (
        <div className="card divide-y divide-line-soft">
          {ordenados.map((t) => {
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
              <Link key={t.id} href={`/torneos/${t.id}`} className="block px-4 py-3 hover:bg-surface-2">
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
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{t.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {getSeason(t.season ?? season).events[t.kind]?.label ?? t.kind}
                      {t.playerCount ? ` · ${t.playerCount} jugadores` : ""}
                    </span>
                  </span>

                  <span className="flex flex-none items-center gap-2">
                    {results.slice(0, 3).map((r) => (
                      <Avatar key={r.id} player={snap.playersById.get(r.playerId)} size="sm" />
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
              </Link>
            );
          })}
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
