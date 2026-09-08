import Link from "next/link";
import { Suspense } from "react";
import { loadSnapshot } from "@/lib/data";
import { isPlayed } from "@/lib/stats";
import { Empty, MatchCard, MatchList, PageHead } from "@/components/ui";
import { Filters } from "@/components/Filters";
import { Icon } from "@/components/icons";

export const metadata = { title: "Resultados" };

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ comp?: string; player?: string; arch?: string; bo?: string }>;
}) {
  const q = await searchParams;
  const snap = await loadSnapshot();
  const all = snap.matches.filter(isPlayed).slice().reverse();
  const pending = snap.matches.filter((m) => m.status === "scheduled" && (!q.comp || m.competitionId === q.comp));

  const archOf = (m: (typeof all)[number], side: "a" | "b") => {
    if (side === "a") return m.deckAId ? snap.archIndex.get(m.deckAId) : undefined;
    if (m.deckBId) return snap.archIndex.get(m.deckBId);
    return m.opponentArchetypeId ? snap.archById.get(m.opponentArchetypeId) : undefined;
  };

  const rows = all.filter((m) => {
    if (q.comp && m.competitionId !== q.comp) return false;
    if (q.player && m.playerAId !== q.player && m.playerBId !== q.player) return false;
    if (q.bo && String(m.bestOf) !== q.bo) return false;
    if (q.arch && archOf(m, "a")?.id !== q.arch && archOf(m, "b")?.id !== q.arch) return false;
    return true;
  });

  return (
    <>
      <PageHead
        title="Resultados"
        sub={`${rows.length} de ${all.length} partidas.`}
        actions={
          <Link className="btn btn-brand hidden md:inline-flex" href="/partidas/nueva">
            <Icon name="plus" className="size-4" /> Registrar
          </Link>
        }
      />

      <Suspense fallback={<div className="card mb-4 h-20 animate-pulse" />}>
        <Filters
          basePath="/resultados"
          fields={[
            { name: "comp", label: "Competición", placeholder: "Todas", options: snap.competitions.map((c) => ({ value: c.id, label: c.name })) },
            { name: "player", label: "Jugador", placeholder: "Todos", options: snap.players.map((p) => ({ value: p.id, label: p.name })) },
            { name: "arch", label: "Arquetipo", placeholder: "Todos", options: snap.archetypes.map((a) => ({ value: a.id, label: a.name })) },
            { name: "bo", label: "Formato", placeholder: "Todos", options: [{ value: "1", label: "Bo1" }, { value: "3", label: "Bo3" }, { value: "5", label: "Bo5" }] },
          ]}
        />
      </Suspense>

      {pending.length > 0 && (
        <section className="card mb-4">
          <div className="card-head">
            <h2 className="text-lg font-bold">Pendientes</h2>
            <span className="text-xs text-muted">{pending.length}</span>
          </div>
          <ul className="divide-y divide-line-soft">
            {pending.map((m) => (
              <li key={m.id}>
                <Link href={`/partidas/${m.id}`} className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface-2">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {snap.playersById.get(m.playerAId)?.name} <span className="text-muted">vs</span>{" "}
                    {m.playerBId ? snap.playersById.get(m.playerBId)?.name : m.opponentName}
                  </span>
                  <span className="btn btn-brand btn-sm flex-none">Anotar</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="card">
        {rows.length ? (
          <MatchList>
            {rows.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                playerA={snap.playersById.get(m.playerAId)}
                playerB={m.playerBId ? snap.playersById.get(m.playerBId) : undefined}
                archA={archOf(m, "a")}
                archB={archOf(m, "b")}
                context={m.competitionId ? snap.compsById.get(m.competitionId)?.name : m.tournamentId ? snap.toursById.get(m.tournamentId)?.name : undefined}
              />
            ))}
          </MatchList>
        ) : (
          <Empty title="Ninguna partida con estos filtros">Prueba a quitar alguno.</Empty>
        )}
      </div>
    </>
  );
}
