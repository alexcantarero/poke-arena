import Link from "next/link";
import { loadSnapshot, playerCp } from "@/lib/data";
import { readSession } from "@/lib/auth";
import { awardsCp, getSeason } from "@/lib/cp";
import { fmtDate } from "@/lib/format";
import { ArchTag, Avatar, Empty, Kpi, PageHead, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/icons";

export const metadata = { title: "Torneos" };

const SCOPE_LABEL: Record<string, string> = { onsite: "Presencial", online: "Online" };

export default async function TournamentsPage() {
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  const season = snap.config.cpSeason;
  const table = getSeason(season);
  const me = session ? snap.playersById.get(session.playerId) : undefined;
  const myCp = me ? playerCp(snap, me.id, season) : null;

  const mine = me ? snap.tournaments.filter((t) => t.results.some((r) => r.playerId === me.id)) : [];
  const cpTotalGroup = snap.players.reduce((a, p) => a + playerCp(snap, p.id, season).total, 0);

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
          value={snap.tournaments.filter((t) => awardsCp(season, t.kind)).length}
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

      <SectionTitle aside={`${snap.tournaments.length} en total`}>Todos los torneos</SectionTitle>

      {snap.tournaments.length ? (
        <div className="card divide-y divide-line-soft">
          {snap.tournaments.map((t) => {
            const results = t.results;
            const best = results.filter((r) => r.placement != null)
              .sort((a, b) => (a.placement ?? 9e9) - (b.placement ?? 9e9))[0];
            const cp = results.reduce((a, r) => a + r.cpEarned, 0);
            return (
              <Link key={t.id} href={`/torneos/${t.id}`} className="block px-4 py-3 hover:bg-surface-2">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                  <span className="font-mono">{fmtDate(t.date)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{SCOPE_LABEL[t.scope] ?? t.scope}</span>
                  {t.city && <><span aria-hidden="true">·</span><span className="truncate">{t.city}</span></>}
                  <span className="flex-1" />
                  <span className="chip">Bo{t.bestOf}</span>
                  {awardsCp(season, t.kind) && <span className="chip chip-brand">CP</span>}
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

                {(best || cp > 0) && (
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
                )}
              </Link>
            );
          })}
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
