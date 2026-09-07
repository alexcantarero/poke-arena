import { notFound } from "next/navigation";
import { loadSnapshot } from "@/lib/data";
import { outcome } from "@/lib/stats";
import { fmtDateLong } from "@/lib/format";
import { Avatar, PageHead, Sprites } from "@/components/ui";
import { MatchForm } from "@/components/MatchForm";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snap = await loadSnapshot();
  const match = snap.matches.find((m) => m.id === id);
  if (!match) notFound();

  const A = snap.playersById.get(match.playerAId);
  const B = snap.playersById.get(match.playerBId);
  const archA = match.deckAId ? snap.archIndex.get(match.deckAId) : undefined;
  const archB = match.deckBId ? snap.archIndex.get(match.deckBId) : undefined;
  const comp = match.competitionId ? snap.compsById.get(match.competitionId) : undefined;
  const deckA = match.deckAId ? snap.decksById.get(match.deckAId) : undefined;
  const deckB = match.deckBId ? snap.decksById.get(match.deckBId) : undefined;
  const o = outcome(match);
  const isPending = match.status === "scheduled";

  return (
    <>
      <PageHead
        title={isPending ? "Anotar resultado" : "Detalle de la partida"}
        sub={`${fmtDateLong(match.date)}${comp ? ` · ${comp.name}` : ""}${match.round ? ` · Jornada ${match.round}` : ""}`}
      />

      {!isPending && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 16 }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <Avatar player={A} size="lg" />
              <div style={{ fontWeight: 700, marginTop: 6 }}>{A?.name}</div>
              {archA && (
                <div className="row" style={{ justifyContent: "center", gap: 5, marginTop: 3 }}>
                  <Sprites archetype={archA} size="sm" /><span className="hint">{archA.name}</span>
                </div>
              )}
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="score" style={{ fontSize: 40 }}>{o.ga}–{o.gb}</div>
              <div className="hint">Bo{match.bestOf}</div>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <Avatar player={B} size="lg" />
              <div style={{ fontWeight: 700, marginTop: 6 }}>{B?.name}</div>
              {archB && (
                <div className="row" style={{ justifyContent: "center", gap: 5, marginTop: 3 }}>
                  <Sprites archetype={archB} size="sm" /><span className="hint">{archB.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="tw" style={{ marginTop: 16 }}>
            <table>
              <thead><tr><th>Juego</th><th>Ganador</th><th>Empezó</th></tr></thead>
              <tbody>
                {match.games.map((g) => (
                  <tr key={g.id}>
                    <td style={{ fontFamily: "var(--f-display)", fontWeight: 700 }}>Juego {g.number}</td>
                    <td>
                      <span className={`chip ${g.winner === "tie" ? "t" : "w"}`}>
                        {g.winner === "a" ? A?.name : g.winner === "b" ? B?.name : "Empate"}
                      </span>
                    </td>
                    <td className="hint">
                      {g.first === "a" ? A?.name : g.first === "b" ? B?.name : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {match.note && <div className="banner" style={{ marginTop: 14 }}><div>📝</div><div>{match.note}</div></div>}

          {[deckA, deckB].map((d, i) =>
            d?.list ? (
              <details className="deck" key={d.id}>
                <summary>Lista de {i === 0 ? A?.name : B?.name}</summary>
                <div className="dl">{d.list}</div>
              </details>
            ) : null,
          )}
        </div>
      )}

      <h2 style={{ marginBottom: 12 }}>{isPending ? "Resultado" : "Editar"}</h2>
      <MatchForm
        match={match}
        players={snap.players}
        decks={snap.decks}
        archetypes={snap.archetypes}
        competitions={snap.competitions}
      />
    </>
  );
}
