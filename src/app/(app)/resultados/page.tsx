import Link from "next/link";
import { Suspense } from "react";
import { loadSnapshot } from "@/lib/data";
import { isPlayed } from "@/lib/stats";
import { Empty, MatchRow, MatchTable, PageHead } from "@/components/ui";
import { Filters } from "@/components/Filters";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ comp?: string; player?: string; arch?: string; bo?: string }>;
}) {
  const q = await searchParams;
  const snap = await loadSnapshot();
  const all = snap.matches.filter(isPlayed).slice().reverse();

  const rows = all.filter((m) => {
    if (q.comp && m.competitionId !== q.comp) return false;
    if (q.player && m.playerAId !== q.player && m.playerBId !== q.player) return false;
    if (q.bo && String(m.bestOf) !== q.bo) return false;
    if (q.arch) {
      const a = m.deckAId ? snap.archIndex.get(m.deckAId) : undefined;
      const b = m.deckBId ? snap.archIndex.get(m.deckBId) : undefined;
      if (a?.id !== q.arch && b?.id !== q.arch) return false;
    }
    return true;
  });

  const pending = snap.matches.filter(
    (m) => m.status === "scheduled" && (!q.comp || m.competitionId === q.comp),
  );

  return (
    <>
      <PageHead
        title="Resultados"
        sub={<>{rows.length} de {all.length} partidas registradas. Pulsa <b>Ver</b> en cualquier fila para el detalle juego a juego.</>}
        actions={<Link className="btn btn-gold" href="/partidas/nueva">Registrar partida</Link>}
      />

      <Suspense fallback={<div className="card card-pad" style={{ marginBottom: 16 }}><span className="hint">Cargando filtros…</span></div>}>
      <Filters
        basePath="/resultados"
        fields={[
          { name: "comp", label: "Competición", placeholder: "Todas", options: snap.competitions.map((c) => ({ value: c.id, label: c.name })) },
          { name: "player", label: "Jugador", placeholder: "Todos", options: snap.players.map((p) => ({ value: p.id, label: p.name })) },
          { name: "arch", label: "Arquetipo", placeholder: "Todos", options: snap.archetypes.map((a) => ({ value: a.id, label: a.name })) },
          { name: "bo", label: "Formato", placeholder: "Todos", options: [
            { value: "1", label: "Bo1" }, { value: "3", label: "Bo3" }, { value: "5", label: "Bo5" },
          ] },
        ]}
      />
      </Suspense>

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <h2>Partidas pendientes</h2>
            <span className="hint">{pending.length} sin resultado</span>
          </div>
          <ul className="list-plain">
            {pending.map((m) => (
              <li key={m.id}>
                <span className="chip">
                  {m.competitionId ? snap.compsById.get(m.competitionId)?.name : "Amistoso"}
                  {m.round ? ` · J${m.round}` : ""}
                </span>
                <div style={{ flex: 1 }}>
                  {snap.playersById.get(m.playerAId)?.name} <span className="hint">vs</span>{" "}
                  {snap.playersById.get(m.playerBId)?.name}
                </div>
                <Link className="btn btn-gold btn-sm" href={`/partidas/${m.id}`}>Anotar resultado</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        {rows.length ? (
          <MatchTable>
            {rows.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                playerA={snap.playersById.get(m.playerAId)}
                playerB={snap.playersById.get(m.playerBId)}
                archA={m.deckAId ? snap.archIndex.get(m.deckAId) : undefined}
                archB={m.deckBId ? snap.archIndex.get(m.deckBId) : undefined}
                compName={m.competitionId ? snap.compsById.get(m.competitionId)?.name : undefined}
              />
            ))}
          </MatchTable>
        ) : (
          <Empty title="Ninguna partida con estos filtros">Prueba a quitar algún filtro.</Empty>
        )}
      </div>
    </>
  );
}
