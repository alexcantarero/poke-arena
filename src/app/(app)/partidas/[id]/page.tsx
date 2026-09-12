import { notFound } from "next/navigation";
import Link from "next/link";
import { currentPlayer, loadSnapshot } from "@/lib/data";
import { canManageLeague } from "@/lib/auth";
import { outcome } from "@/lib/stats";
import { fmtDateLong } from "@/lib/format";
import { Avatar, PageHead, Sprites } from "@/components/ui";
import { MatchForm } from "@/components/MatchForm";
import { DeckList } from "@/components/DeckList";
import { Icon } from "@/components/icons";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  const match = snap.matches.find((m) => m.id === id);
  if (!match) notFound();

  const A = snap.playersById.get(match.playerAId);
  const B = match.playerBId ? snap.playersById.get(match.playerBId) : undefined;
  const archA = match.deckAId ? snap.archIndex.get(match.deckAId) : undefined;
  const archB = match.deckBId
    ? snap.archIndex.get(match.deckBId)
    : match.opponentArchetypeId ? snap.archById.get(match.opponentArchetypeId) : undefined;
  const deckA = match.deckAId ? snap.decksById.get(match.deckAId) : undefined;

  /* La lista del rival.
     Que en «Ibai vs. Sara» solo se viera la de Ibai no era un fallo de esta
     pantalla: era que esa partida tiene `deckBId` a nulo porque nadie eligió
     el mazo de Sara al registrarla. Aquí se busca un respaldo — el mazo de
     Sara del mismo arquetipo — y se avisa de que es una suposición, en vez de
     dejar el hueco vacío sin explicar por qué. */
  const deckBExact = match.deckBId ? snap.decksById.get(match.deckBId) : undefined;
  const deckBGuess = !deckBExact && match.playerBId && archB
    ? snap.decks.find((d) => d.playerId === match.playerBId && d.archetypeId === archB.id && d.list)
    : undefined;
  const deckB = deckBExact ?? deckBGuess;
  const o = outcome(match);
  const pending = match.status === "scheduled";
  const context = match.competitionId
    ? snap.compsById.get(match.competitionId)?.name
    : match.tournamentId ? snap.toursById.get(match.tournamentId)?.name : null;

  return (
    <>
      <PageHead
        title={pending ? "Anotar resultado" : "Partida"}
        sub={`${fmtDateLong(match.date)}${context ? ` · ${context}` : ""}${match.round ? ` · Jornada ${match.round}` : ""}`}
        actions={<Link className="btn btn-ghost btn-sm" href="/resultados"><Icon name="back" className="size-4" /> Resultados</Link>}
      />

      {!pending && (
        <section className="card mb-6 p-4">
          <div className="flex items-start justify-between gap-3">
            {[
              { p: A, arch: archA, name: A?.name, win: o.winner === "a" },
              { p: B, arch: archB, name: B?.name ?? match.opponentName, win: o.winner === "b" },
            ].map((s, i) => (
              <div key={i} className={`flex flex-1 flex-col items-center gap-1.5 text-center ${i === 1 ? "order-3" : ""}`}>
                <Avatar player={s.p} size="lg" />
                <span className={`text-sm ${s.win ? "font-bold" : "font-medium"}`}>{s.name ?? "—"}</span>
                {s.arch && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Sprites archetype={s.arch} size="sm" />
                    <span className="max-w-24 truncate">{s.arch.name}</span>
                  </span>
                )}
              </div>
            ))}
            <div className="order-2 flex-none pt-3 text-center">
              <div className="font-display text-4xl font-extrabold tabular leading-none">
                {o.declared
                  ? (o.winner === "a" ? "V" : o.winner === "b" ? "D" : "E")
                  : <>{o.ga}–{o.gb}</>}
              </div>
              <div className="mt-1 text-xs text-muted">
                Bo{match.bestOf}
                {match.tournamentId && match.round > 0 ? ` · ronda ${match.round}` : ""}
              </div>
            </div>
          </div>

          {o.declared && (
            <p className="mt-5 rounded-lg bg-ground p-3 text-sm text-ink-2">
              De esta ronda solo se apuntó el resultado, no el juego a juego.
              {match.firstTurn ? ` Salió primero ${match.firstTurn === "a" ? (A?.name ?? "el jugador") : (B?.name ?? match.opponentName ?? "el rival")}.` : ""}
            </p>
          )}

          <ul className="mt-5 divide-y divide-line-soft border-t border-line-soft">
            {match.games.map((g) => (
              <li key={g.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-16 flex-none font-display font-bold text-muted">Juego {g.number}</span>
                <span className={`chip flex-none ${g.winner === "tie" ? "chip-tie" : "chip-win"}`}>
                  {g.winner === "a" ? A?.name : g.winner === "b" ? (B?.name ?? match.opponentName) : "Empate"}
                </span>
                <span className="flex-1" />
                {g.first && (
                  <span className="text-xs text-muted">
                    empezó {g.first === "a" ? A?.name : (B?.name ?? match.opponentName)}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {match.note && (
            <p className="mt-4 rounded-lg bg-ground p-3 text-sm text-ink-2">{match.note}</p>
          )}

          {[deckA, deckB].map((d, i) => d?.list ? (
            <details key={d.id} className="mt-3 rounded-lg border border-line-soft px-3">
              <summary className="tap cursor-pointer justify-start text-sm font-semibold">
                Lista de {i === 0 ? A?.name : (B?.name ?? match.opponentName)}
                {i === 1 && deckBGuess && (
                  <span className="text-xs font-normal text-muted">· su mazo de ese arquetipo</span>
                )}
              </summary>
              <div className="border-t border-line-soft py-3">
                {i === 1 && deckBGuess && (
                  <p className="mb-3 rounded-lg bg-ground px-3 py-2 text-xs text-ink-2">
                    En esta partida no se anotó qué mazo llevaba. Esto es «{d.name}», el suyo de
                    ese arquetipo. Para que salga el de verdad, elígelo abajo al editar la partida.
                  </p>
                )}
                <DeckList list={d.list} listJson={d.listJson} />
              </div>
            </details>
          ) : null)}
        </section>
      )}

      {/* El formulario ya no cuelga justo debajo de la información, que era el
          otro punto de Alex: en una partida ya cerrada lo que quieres es
          leerla, y editarla es la excepción. Si está pendiente de anotar, se
          abre solo, porque entonces es justo para lo que has entrado. */}
      <details className="card" open={pending}>
        <summary className="tap cursor-pointer justify-between px-4 font-display text-lg font-bold">
          {pending ? "Anotar el resultado" : "Editar la partida"}
          {!pending && <span className="text-xs font-normal text-muted">mazos, juegos y fecha</span>}
        </summary>
        <div className="border-t border-line-soft p-4">
          <MatchForm
            match={match}
            players={snap.players}
            decks={snap.decks}
            archetypes={snap.archetypes}
            competitions={snap.competitions}
            tournaments={snap.tournaments}
            meId={me?.id}
            canPickPlayer={me ? canManageLeague(me.role) : false}
          />
        </div>
      </details>
    </>
  );
}
