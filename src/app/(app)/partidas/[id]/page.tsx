import { notFound } from "next/navigation";
import Link from "next/link";
import { archetypeOptions, currentPlayer, deckOptions, loadSnapshot } from "@/lib/data";
import { canManageLeague } from "@/lib/auth";
import { archetypesOfMatch, outcome, toRoundView } from "@/lib/stats";
import { archetypeValue } from "@/lib/types";
import { maxRondasDe } from "@/lib/estructura";
import { margenDe } from "@/lib/premios";
import { RoundForm } from "@/components/RoundForm";
import { fechaCorta, fmtDateLong } from "@/lib/format";
import { Avatar, PageHead, Sprites } from "@/components/ui";
import { MatchForm } from "@/components/MatchForm";
import { DeckList } from "@/components/DeckList";
import { Icon } from "@/components/icons";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const lng = await getLang(); // v0.49

  const { id } = await params;
  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  const match = snap.matches.find((m) => m.id === id);
  if (!match) notFound();

  const A = snap.playersById.get(match.playerAId);
  /* v0.15.1 — en una ronda de torneo el rival puede ser alguien del grupo
     (`opponentPlayerId`) aunque `playerBId` siga nulo. Antes esta pantalla
     solo miraba `playerBId` y lo pintaba como un desconocido. */
  const B = match.playerBId ? snap.playersById.get(match.playerBId)
    : match.opponentPlayerId ? snap.playersById.get(match.opponentPlayerId) : undefined;
  /** Es una ronda de torneo (rival de fuera o enlazado), no una partida interna. */
  const esRonda = Boolean(match.tournamentId && !match.playerBId);
  const tour = match.tournamentId ? snap.toursById.get(match.tournamentId) : undefined;
  const { a: archA, b: archB } = archetypesOfMatch(match, snap.archIndex, snap.archById);
  const deckA = match.deckAId ? snap.decksById.get(match.deckAId) : undefined;

  /* La lista del rival.
     Que en «Ibai vs. Sara» solo se viera la de Ibai no era un fallo de esta
     pantalla: era que esa partida tiene `deckBId` a nulo porque nadie eligió
     el mazo de Sara al registrarla. Aquí se busca un respaldo — el mazo de
     Sara del mismo arquetipo — y se avisa de que es una suposición, en vez de
     dejar el hueco vacío sin explicar por qué. */
  const deckBExact = match.deckBId ? snap.decksById.get(match.deckBId) : undefined;
  const rivalId = match.playerBId ?? match.opponentPlayerId;
  const deckBGuess = !deckBExact && rivalId && archB
    ? snap.decks.find((d) => d.playerId === rivalId && d.archetypeId === archB.id && d.list)
    : undefined;
  const deckB = deckBExact ?? deckBGuess;
  const nameB = B?.name ?? match.opponentName ?? tr(lng, "x.f21ea765");

  const eloHistoryA = snap.elo.history[match.playerAId]?.find((h) => h.matchId === match.id);
  const deltaA = eloHistoryA?.delta ? Math.round(eloHistoryA.delta) : null;
  const eloHistoryB = match.playerBId ? snap.elo.history[match.playerBId]?.find((h) => h.matchId === match.id) : null;
  const deltaB = eloHistoryB?.delta ? Math.round(eloHistoryB.delta) : null;

  /* Los dos lados del enfrentamiento, con su lista y —esto es lo que faltaba—
     con el motivo cuando no la hay. Un desplegable que se abre vacío parece
     una pantalla rota; uno que dice «es de fuera de la liga, de esas partidas
     se anota el arquetipo y no las 60 cartas» es un dato. */
  const sides = [
    {
      key: "a",
      name: A?.name ?? tr(lng, "x.1530a422"),
      deck: deckA,
      guess: false,
      missing: deckA
        ? `«${deckA.name}» no tiene guardada la lista de 60 cartas. Se añade desde la ficha del mazo.`
        : tr(lng, "x.4b1d0924"),
    },
    {
      key: "b",
      name: nameB,
      deck: deckB,
      guess: Boolean(deckBGuess),
      missing: !rivalId
        ? `${nameB} es de fuera de la liga: de esas partidas se anota el arquetipo, no la lista. No hay ninguna guardada.`
        : deckB
          ? `«${deckB.name}» no tiene guardada la lista de 60 cartas.`
          : tr(lng, "x.cd9ebd78"),
    },
  ];

  const o = outcome(match);
  const canEditRound = Boolean(me && (me.id === match.playerAId || canManageLeague(me.role)));
  const resultadoRonda = tour?.results.find((x) => x.playerId === match.playerAId);
  const lockedRound = resultadoRonda?.deckId
    ?? (resultadoRonda?.archetypeId ? archetypeValue(resultadoRonda.archetypeId) : null);
  const pending = match.status === "scheduled";
  const context = match.competitionId
    ? snap.compsById.get(match.competitionId)?.name
    : match.tournamentId ? snap.toursById.get(match.tournamentId)?.name : null;

  return (
    <>
      <PageHead
        title={pending ? "Anotar resultado" : "Partida"}
        sub={`ID: ${match.id} · ${fmtDateLong(match.date)}${context ? ` · ${context}` : ""}${match.round ? ` · Jornada ${match.round}` : ""}`}
        actions={match.tournamentId
          // v0.16 — si la partida es de un torneo, se vuelve al torneo.
          ? <Link className="btn btn-ghost btn-sm" href={`/torneos/${match.tournamentId}`}><Icon name="back" className="size-4" /> {tr(lng, "x.a44bc5ae")}</Link>
          : match.competitionId
            ? <Link className="btn btn-ghost btn-sm" href={`/competiciones/${match.competitionId}`}><Icon name="back" className="size-4" /> {tr(lng, "x.0582c003")}</Link>
            : <Link className="btn btn-ghost btn-sm" href="/resultados"><Icon name="back" className="size-4" /> {tr(lng, "x.b164a1ab")}</Link>}
      />
      {/* v0.54 — el rastro: si alguien corrigió el resultado, quién y cuándo. */}
      {match.updatedAt && (
        <p className="-mt-2 mb-3 text-xs text-muted">
          {trf(lng, "rr.corregidoPor", {
            n: (match.updatedBy && snap.playersById.get(match.updatedBy)?.name) || "—",
            f: fechaCorta(new Date(match.updatedAt).toISOString(), lng === "en" ? "en-GB" : "es-ES"),
          })}
        </p>
      )}

      {!pending && (
        <section className="card mb-6 p-4">
          <div className="flex items-start justify-between gap-3">
            {[
              { p: A, arch: archA, name: A?.name, win: o.winner === "a", delta: deltaA },
              { p: B, arch: archB, name: B?.name ?? match.opponentName, win: o.winner === "b", delta: deltaB },
            ].map((s, i) => (
              /* `min-w-0` en la columna: sin él, el nombre del mazo con
                 `truncate` no se recortaba y empujaba el lado derecho fuera
                 de la pantalla («Slowking / Kyur…» cortado en el borde). */
              <div key={i} className={`flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center ${i === 1 ? "order-3" : ""}`}>
                {/* v0.17: avatar y nombre llevan al perfil cuando es alguien del grupo. */}
                {s.p ? (
                  <Link href={`/perfil/${s.p.id}`} className="flex max-w-full min-w-0 flex-col items-center gap-1.5 hover:text-info">
                    <Avatar player={s.p} size="lg" />
                    <span className={`max-w-full truncate text-sm ${s.win ? "font-bold" : "font-medium"}`}>{s.name ?? "—"}</span>
                  </Link>
                ) : (
                  <>
                    <Avatar player={s.p} size="lg" />
                    <span className={`max-w-full truncate text-sm ${s.win ? "font-bold" : "font-medium"}`}>{s.name ?? "—"}</span>
                  </>
                )}
                {s.arch && (
                  <span className="flex max-w-full min-w-0 items-center justify-center gap-1 text-xs text-muted">
                    <Sprites archetype={s.arch} size="sm" />
                    <span className="min-w-0 truncate">{s.arch.name}</span>
                  </span>
                )}
                {s.delta != null && (
                  <span className={`mt-0.5 text-xs font-bold ${s.delta > 0 ? "text-win" : s.delta < 0 ? "text-loss" : "text-muted"}`}>
                    {s.delta > 0 ? "+" : ""}{s.delta} Elo
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
              {match.firstTurn ? ` Salió primero ${match.firstTurn === "a" ? (A?.name ?? tr(lng, "x.1530a422")) : (B?.name ?? match.opponentName ?? tr(lng, "x.f21ea765"))}.` : ""}
            </p>
          )}

          <ul className="mt-5 divide-y divide-line-soft border-t border-line-soft">
            {match.games.map((g) => {
                /* v0.58 — EL FALLO DEL Bo3 DE LIGA: aquí se pintaba el mazo de la
                   SERIE en todos los juegos. En la liga, con «mazo distinto en cada
                   juego», cada juego guarda el suyo, y la ficha enseñaba el mismo
                   en los tres aunque se jugaran con mazos distintos (el formulario
                   de editar sí los enseñaba bien, y por eso no cuadraban). Ahora,
                   el mazo de ese juego; si no lo tiene, el de la serie. */
                const archJuegoA = (g.archetypeAId && snap.archById.get(g.archetypeAId)) || archA;
                const archJuegoB = (g.archetypeBId && snap.archById.get(g.archetypeBId)) || archB;
                const winnerArch = g.winner === "a" ? archJuegoA : g.winner === "b" ? archJuegoB : undefined;
                /* v0.30 — el marcador de premios, si se apuntó. Nulo no es
                   cero: cuando no hay dato, no se pinta nada. */
                const margen = margenDe({
                  premiosA: g.prizesA, premiosB: g.prizesB,
                  penalizadoA: g.penaltyA, penalizadoB: g.penaltyB,
                  winner: g.winner,
                });
                return (
                <li key={g.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-16 flex-none font-display font-bold text-muted">Juego {g.number}</span>
                  <span className={`chip flex-none items-center gap-1.5 ${g.winner === "tie" ? "chip-tie" : "chip-win"}`}>
                    {winnerArch && <Sprites archetype={winnerArch} size="sm" />}
                    {g.winner === "a" ? A?.name : g.winner === "b" ? (B?.name ?? match.opponentName) : tr(lng, "x.09d03513")}
                  </span>
                  {margen && (
                    <span
                      className="chip flex-none tabular"
                      title={margen.conPenalizacion
                        ? tr(lng, "x.76bbb827")
                        : `Al perdedor le faltaban ${margen.faltaban} premios`}
                    >
                      {margen.marcador}
                      {margen.conPenalizacion && <span className="text-loss"> {tr(lng, "x.df61ef44")}</span>}
                    </span>
                  )}
                  <span className="flex-1" />
                  {g.first && (
                    <span className="text-xs text-muted">
                      empezó {g.first === "a" ? A?.name : (B?.name ?? match.opponentName)}
                    </span>
                  )}
                </li>
              )})}
          </ul>

          {match.note && (
            <p className="mt-4 rounded-lg bg-ground p-3 text-sm text-ink-2">{match.note}</p>
          )}

          {/* Las dos listas, cada una detrás de su propio `details`.
              Que en «Ibai vs. Sara» solo se abriera la de Ibai dejaba a medias
              justo lo que se mira dos días después: qué llevaba el otro. Van
              plegadas porque dos listas de sesenta cartas abiertas convierten
              esta pantalla en un rollo de papel. */}
          <div className="mt-5 flex flex-col gap-2">
            {sides.map((s) => (
              <details key={s.key} className="rounded-lg border border-line-soft px-3">
                <summary className="tap cursor-pointer justify-start gap-2 text-sm font-semibold">
                  <span className="truncate">Lista de {s.name}</span>
                  {s.guess && (
                    <span className="flex-none text-xs font-normal text-muted">{tr(lng, "x.4c9de4a7")}</span>
                  )}
                  {!s.deck?.list && (
                    <span className="flex-none text-xs font-normal text-muted">{tr(lng, "x.084860cc")}</span>
                  )}
                </summary>
                <div className="border-t border-line-soft py-3">
                  {s.deck?.list ? (
                    <>
                      {s.guess && (
                        <p className="mb-3 rounded-lg bg-ground px-3 py-2 text-xs text-ink-2">
                          En esta partida no se anotó qué mazo llevaba. Esto es «{s.deck.name}», el
                          suyo de ese arquetipo. Para que salga el de verdad, elígelo abajo al
                          editar la partida.
                        </p>
                      )}
                      <DeckList list={s.deck.list} listJson={s.deck.listJson} />
                    </>
                  ) : (
                    <p className="text-sm text-muted">{s.missing}</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* El formulario ya no cuelga justo debajo de la información, que era el
          otro punto de Alex: en una partida ya cerrada lo que quieres es
          leerla, y editarla es la excepción. Si está pendiente de anotar, se
          abre solo, porque entonces es justo para lo que has entrado. */}
      {esRonda && tour ? (
        /* v0.15.1 — una ronda de torneo se edita con el formulario de RONDA.
           Con el de partida genérica, elegir al rival del grupo la convertía
           en partida interna: desaparecía del torneo y salía como amistoso. */
        canEditRound ? (
          <details className="card" open={pending}>
            <summary className="tap cursor-pointer justify-between px-4 font-display text-lg font-bold">
              Editar la ronda {match.round}
              <span className="text-xs font-normal text-muted">{tour.name}</span>
            </summary>
            <div className="border-t border-line-soft p-4">
              <RoundForm
                tournamentId={tour.id}
                playerId={match.playerAId}
                round={match.round}
                bestOf={tour.bestOf}
                rivalDecks={deckOptions(snap, match.playerAId)}
                archetypeOptions={archetypeOptions(snap)}
                myDecks={deckOptions(snap, match.playerAId, { includeOthers: false })}
                lockedDeckId={lockedRound}
                existing={toRoundView(match)}
                maxRound={maxRondasDe({ kind: tour.kind, playerCount: tour.playerCount, rounds: tour.rounds, topCut: tour.topCut })}
                rivalPlayers={snap.players
                  .filter((p) => p.active && p.id !== match.playerAId)
                  .map((p) => ({ id: p.id, name: p.name }))}
              />
              <p className="mt-3 text-xs text-muted">
                {tr(lng, "x.21de2799")} <Link className="underline" href={`/torneos/${tour.id}`}>{tour.name}</Link>:
                se queda en el torneo aunque el rival sea alguien del grupo.
              </p>
            </div>
          </details>
        ) : null
      ) : (
      <details className="card" open={pending}>
        <summary className="tap cursor-pointer justify-between px-4 font-display text-lg font-bold">
          {pending ? "Anotar el resultado" : tr(lng, "x.2aafe5e4")}
          {!pending && <span className="text-xs font-normal text-muted">{tr(lng, "x.fcc38db1")}</span>}
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
      )}
    </>
  );
}
