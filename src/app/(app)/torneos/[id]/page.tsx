import Link from "next/link";
import { notFound } from "next/navigation";
import { readSession } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { awardsCp, getSeason } from "@/lib/cp";
import { fmtDateLong } from "@/lib/format";
import { TOURNAMENT_FORMATS } from "@/lib/types";
import { ArchTag, Avatar, Empty, Kpi, PageHead, PlayerTag, Record, SectionTitle } from "@/components/ui";
import { TournamentForm } from "@/components/TournamentForm";
import { deleteTournamentResult } from "@/actions";
import { Icon } from "@/components/icons";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  const t = snap.toursById.get(id);
  if (!t) notFound();

  const season = t.season ?? snap.config.cpSeason;
  const table = getSeason(season);
  const me = session ? snap.playersById.get(session.playerId) : undefined;
  const myResult = me ? t.results.find((r) => r.playerId === me.id) : undefined;
  const myDecks = me ? snap.decks.filter((d) => d.playerId === me.id) : [];

  const ordered = [...t.results].sort((a, b) => (a.placement ?? 9e9) - (b.placement ?? 9e9));
  const totalCp = t.results.reduce((a, r) => a + r.cpEarned, 0);

  return (
    <>
      <PageHead
        title={t.name}
        sub={
          <>
            {table.events[t.kind]?.label ?? t.kind} · {fmtDateLong(t.date)} · Bo{t.bestOf} ·{" "}
            {TOURNAMENT_FORMATS[t.format as keyof typeof TOURNAMENT_FORMATS] ?? t.format}
            {t.venue ? ` · ${t.venue}` : ""}{t.city ? `, ${t.city}` : ""}
          </>
        }
        actions={<Link className="btn btn-ghost btn-sm" href="/torneos"><Icon name="back" className="size-4" /> Torneos</Link>}
      />

      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi label="Asistencia" value={t.playerCount ?? "—"} note={t.rounds ? `${t.rounds} rondas` : "sin dato"} />
        <Kpi label="Del grupo" value={t.results.length} note="participaron" />
        <Kpi label="CP repartidos" value={totalCp} note={awardsCp(season, t.kind) ? `temporada ${season}` : "este tipo no da CP"} highlight={totalCp > 0} />
        <Kpi
          label="Mejor puesto"
          value={ordered[0]?.placement ?? "—"}
          note={ordered[0] ? snap.playersById.get(ordered[0].playerId)?.name ?? "" : "sin resultados"}
        />
      </div>

      {t.url && (
        <a className="btn mb-5 w-full sm:w-auto" href={t.url} target="_blank" rel="noopener noreferrer">
          <Icon name="share" className="size-4" /> Ver el torneo en su web
        </a>
      )}

      <SectionTitle aside={`${t.results.length} resultados`}>Resultados del grupo</SectionTitle>

      {ordered.length ? (
        <div className="card mb-6 divide-y divide-line-soft">
          {ordered.map((r) => {
            const p = snap.playersById.get(r.playerId);
            const arch = r.deckId ? snap.archIndex.get(r.deckId) : (r.archetypeId ? snap.archById.get(r.archetypeId) : undefined);
            const canEdit = me && (r.playerId === me.id || me.role === "owner" || me.role === "admin");
            return (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 flex-none text-center">
                    <span className="block font-display text-xl font-extrabold tabular leading-none">
                      {r.placement ?? "—"}
                    </span>
                    {t.playerCount && r.placement && (
                      <span className="block text-[10px] text-muted">de {t.playerCount}</span>
                    )}
                  </span>
                  <PlayerTag player={p} size="sm" className="min-w-0 flex-1" />
                  {(r.wins || r.losses || r.ties) ? <Record w={r.wins} d={r.ties} l={r.losses} /> : null}
                  {r.cpEarned > 0 && (
                    <span className="chip chip-brand tabular">
                      {r.cpEarned} CP{r.cpManual ? "*" : ""}
                    </span>
                  )}
                </div>

                {(arch || r.prizes || r.notes || r.dropped) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-12 text-xs">
                    {arch && <ArchTag archetype={arch} />}
                    {r.dropped && <span className="chip chip-tie">Se retiró</span>}
                    {r.prizes && <span className="chip">🎁 {r.prizes}</span>}
                  </div>
                )}
                {r.notes && <p className="mt-2 pl-12 text-sm text-ink-2">{r.notes}</p>}

                {canEdit && (
                  <form action={deleteTournamentResult} className="mt-2 pl-12">
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn btn-ghost btn-sm text-loss" type="submit">Borrar este resultado</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card mb-6"><Empty title="Nadie ha puesto su resultado todavía" /></div>
      )}

      <SectionTitle>{myResult ? "Editar tu resultado" : "Añadir tu resultado"}</SectionTitle>
      <TournamentForm
        season={season}
        decks={myDecks}
        archetypes={snap.archetypes}
        tournament={t}
        result={myResult}
        resultOnly
      />

      {t.notes && (
        <div className="card mt-6 p-4">
          <h3 className="mb-1 font-bold">Notas del torneo</h3>
          <p className="text-sm text-ink-2">{t.notes}</p>
        </div>
      )}
    </>
  );
}
