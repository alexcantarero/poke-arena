"use client";

import { useMemo, useState } from "react";
import { deleteMatch, saveMatch } from "@/actions";
import type { Archetype, Competition, Deck, MatchFull, PublicPlayer, Tournament } from "@/lib/types";
import { bloqueados } from "@/lib/juegosMazos";
import { todayISO } from "@/lib/format";
import { Avatar } from "./ui";
import { PrizePicker } from "@/components/PrizePicker";
import { DeckPicker } from "./DeckPicker";
import type { DeckOption } from "@/lib/types";

/** Un juego mientras se edita en el formulario. */
type JuegoEnEdicion = {
  winner: string; first: string; archA: string; archB: string;
  premiosA: number | null; premiosB: number | null;
  penalizadoA: boolean; penalizadoB: boolean;
};

type Props = {
  match?: MatchFull;
  players: PublicPlayer[];
  decks: Deck[];
  archetypes: Archetype[];
  competitions: Competition[];
  tournaments: Tournament[];
  meId?: string;
  /** Los organizadores pueden registrar partidas de otros; los demás, no. */
  canPickPlayer?: boolean;
  initialP1?: string;
  initialP2?: string;
  initialBestOf?: number;
  initialGames?: Array<{
    winner: string; first: string; archA: string; archB: string;
    premiosA?: number | null; premiosB?: number | null;
    penalizadoA?: boolean; penalizadoB?: boolean;
  }>;
};

/**
 * Registro de partida, pensado para el móvil durante el torneo.
 *
 * El orden de los campos sigue el orden en que se conocen los datos: primero
 * contra quién, luego qué llevabais, y solo entonces el resultado. Lo demás
 * (competición, fecha, notas) está plegado, porque casi nunca hay que tocarlo.
 */
export function MatchForm({
  match, players, decks, archetypes, competitions, tournaments, meId, canPickPlayer = false,
  initialP1, initialP2, initialBestOf, initialGames
}: Props) {
  const active = players.filter((p) => p.active || match);
  const [aId, setAId] = useState(match?.playerAId ?? initialP1 ?? meId ?? active[0]?.id ?? "");
  const [external, setExternal] = useState(Boolean(match && !match.playerBId));
  const [bId, setBId] = useState(match?.playerBId ?? initialP2 ?? active.find((p) => p.id !== (meId ?? active[0]?.id))?.id ?? "");
  /* El valor de partida: el de la serie si lo hay; si no, el de los juegos
     cuando es el mismo en todos los juegos de ese lado. */
  const aDesdeJuegos = (() => {
    const ids = new Set((match?.games ?? []).map((g) => g.archetypeAId).filter(Boolean));
    return ids.size === 1 ? `arch:${[...ids][0]}` : "";
  })();
  const bDesdeJuegos = (() => {
    const ids = new Set((match?.games ?? []).map((g) => g.archetypeBId).filter(Boolean));
    return ids.size === 1 ? [...ids][0] as string : "";
  })();
  const [aDeckId, setADeckId] = useState(
    match?.deckAId ?? (match?.archetypeAId ? `arch:${match.archetypeAId}` : aDesdeJuegos));
  const [bDeckId, setBDeckId] = useState(
    match?.deckBId ?? (match?.playerBId && match.opponentArchetypeId
      ? `arch:${match.opponentArchetypeId}`
      : match?.playerBId && bDesdeJuegos ? `arch:${bDesdeJuegos}` : ""));
  const [oppArch, setOppArch] = useState(
    match?.opponentArchetypeId ?? (match && !match.playerBId ? bDesdeJuegos : ""));
  const [bestOf, setBestOf] = useState(match?.bestOf ?? initialBestOf ?? 3);
  // v0.25: cada juego lleva además el arquetipo de cada lado (opcional).
  /* v0.41 — de liga o amistoso. La regla de mazos es distinta en cada una:

       · Liga: cada juego lleva su mazo, y uno con el que ya ganaste un juego
         de la serie no se puede repetir (v0.25). El servidor también lo
         comprueba, y solo cuando hay competición.
       · Amistoso (sin competición): se fija UN mazo y se juega toda la
         serie con él, sea Bo1, Bo3 o Bo5. No hay nada que elegir por juego
         ni nada que bloquear.

     Antes el formulario enseñaba el selector por juego y el «1 bloqueado»
     también en los amistosos: el servidor ya los trataba bien, pero la
     pantalla pedía un dato que no tocaba y aplicaba una regla que no era. */
  const [compId, setCompId] = useState<string>(match?.competitionId ?? "");
  const esLiga = Boolean(compId);

  /* v0.43 — ¿se juega toda la serie con el mismo mazo, o se puede cambiar
     entre juegos? Es un botón y no una regla fija, porque las dos cosas
     pasan en amistosos y en liga.

     Al EDITAR se deduce de lo guardado:
       · con mazo de la serie, fijo;
       · sin él, pero con el mismo mazo en todos los juegos de cada lado,
         también fijo, y se preselecciona ese arriba (así se arreglan solas
         las partidas guardadas desde el 9 de octubre al volver a abrirlas);
       · con mazos distintos entre juegos, por juego.
     Se calcula a mano y no con `arquetipoPorJuegos` de `lib/stats` a
     propósito: importar `lib/stats` desde un componente de cliente se lleva
     el módulo entero al navegador (la lección de la v0.7). */
  const juegosConMazo = (match?.games ?? []).some((g) => g.archetypeAId || g.archetypeBId);
  const [mazoFijo, setMazoFijo] = useState<boolean>(() => {
    if (!juegosConMazo) return true;
    const variaA = new Set((match?.games ?? []).map((g) => g.archetypeAId).filter(Boolean)).size > 1;
    const variaB = new Set((match?.games ?? []).map((g) => g.archetypeBId).filter(Boolean)).size > 1;
    return !variaA && !variaB;
  });

  const [games, setGames] = useState<JuegoEnEdicion[]>(() => {
    /* Anotado a mano, y no inferido del literal: un objeto con `premiosA:
       null` infiere el tipo `null` a secas y después no deja asignarle un
       número. Es el fallo que se coló en la v0.9.0. */
    const base: JuegoEnEdicion[] = Array.from({ length: 5 }, () => ({
      winner: "", first: "", archA: "", archB: "",
      premiosA: null, premiosB: null, penalizadoA: false, penalizadoB: false,
    }));
    if (match) {
      match.games.forEach((g, i) => {
        if (i < 5) base[i] = {
          winner: g.winner, first: g.first,
          archA: g.archetypeAId ?? "", archB: g.archetypeBId ?? "",
          premiosA: g.prizesA, premiosB: g.prizesB,
          penalizadoA: g.penaltyA, penalizadoB: g.penaltyB,
        };
      });
    } else if (initialGames) {
      initialGames.forEach((g, i) => {
        if (i < 5) base[i] = { ...base[i], ...g };
      });
    }
    return base;
  });
  const archOpts: DeckOption[] = useMemo(() => [...archetypes].map((a) => ({ id: a.id, name: a.name, archetypeId: a.id, archetypeName: a.name, main: a.main, secondary: a.secondary, type: a.type, group: 'shared' as const, hasList: false })).sort((x, y) => x.name.localeCompare(y.name, 'es')), [archetypes]);
  const juegosMazos = games.map((g) => ({ winner: g.winner, archA: g.archA || null, archB: g.archB || null }));

  const need = Math.ceil(bestOf / 2);
  const A = players.find((p) => p.id === aId);
  const B = external ? undefined : players.find((p) => p.id === bId);
  const bLabel = external ? "Rival" : B?.name ?? "B";

  const score = useMemo(() => {
    let a = 0, b = 0;
    games.slice(0, bestOf).forEach((g) => { if (g.winner === "a") a++; else if (g.winner === "b") b++; });
    return { a, b };
  }, [games, bestOf]);

  /** Juegos que ya tienen resultado, empates incluidos. */
  const played = games.slice(0, bestOf).filter((g) => g.winner).length;
  // Una serie vale cuando alguien llega a la mayoría, o cuando se han jugado
  // todos los juegos: un Bo3 que acaba 1-1 con el tercero empatado por tiempo
  // es un resultado normal y tiene que poder guardarse.
  const decided = score.a >= need || score.b >= need || played === bestOf;
  const sameTwice = !external && aId === bId;
  const canSave = !sameTwice && aId && decided;

  const setGame = (i: number, patch: Partial<JuegoEnEdicion>) =>
    setGames((g) => g.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  /** Un juego se apaga cuando la serie ya estaba decidida antes de llegar a él. */
  const isOver = (i: number) => {
    let a = 0, b = 0;
    for (let k = 0; k < i; k++) {
      if (games[k].winner === "a") a++;
      else if (games[k].winner === "b") b++;
    }
    return a >= need || b >= need;
  };

  return (
    <form action={saveMatch} className="flex flex-col gap-4">
      {match && <input type="hidden" name="id" value={match.id} />}
      <input type="hidden" name="bestOf" value={bestOf} />
      <input type="hidden" name="playerAId" value={aId} />

      {/* ------------------------------ quién ------------------------------ */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Quién juega</h2>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox" className="size-4" checked={external}
              onChange={(e) => setExternal(e.target.checked)}
            />
            Rival de fuera
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            {canPickPlayer ? (<>
              <label className="label" htmlFor="pa">Jugador</label>
              <select className="input" id="pa" value={aId} onChange={(e) => { setAId(e.target.value); setADeckId(""); }}>
                {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </>) : (<>
              {/* Sin permisos de organizador la partida es tuya: fijar el lado A
                  evita ofrecer algo que el servidor va a rechazar. */}
              <span className="label">Jugador</span>
              <div className="input justify-start gap-2 bg-surface-2">
                <Avatar player={A} size="sm" />
                <span className="truncate font-semibold">{A?.name ?? "Tú"}</span>
              </div>
            </>)}
          </div>

          {/* v0.43 — el mazo de la SERIE, de vuelta. Se borró en el commit
              «V0.25.3» (9 de octubre) y dejó estas líneas en blanco; desde
              entonces ninguna partida guardaba su mazo de serie. Solo se pinta
              con el mazo fijado: si se cambia entre juegos, va en cada juego. */}
          {mazoFijo && (
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="deckAId">Su mazo</label>
              <select className="input" id="deckAId" name="deckAId" value={aDeckId} onChange={(e) => setADeckId(e.target.value)}>
                <option value="">— sin asignar —</option>
                <DeckOptions decks={decks} playerId={aId} archetypes={archetypes} />
              </select>
            </div>
          )}

          <hr className="border-line-soft" />

          {external ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="opponentName">Rival</label>
                <input
                  className="input" id="opponentName" name="opponentName" required maxLength={60}
                  defaultValue={match?.opponentName ?? ""} placeholder="Nombre o apodo"
                />
                <p className="text-xs text-muted">
                  No cuenta para el ranking ni para el Elo, pero sí para tus estadísticas de arquetipo
                  y para la matriz de emparejamientos.
                </p>
              </div>
              {mazoFijo && (
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="opponentArchetypeId">Qué llevaba</label>
                  <select
                    className="input" id="opponentArchetypeId" name="opponentArchetypeId"
                    value={oppArch} onChange={(e) => setOppArch(e.target.value)}
                  >
                    <option value="">— no lo sé —</option>
                    {archetypes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="pb">Rival</label>
                <select className="input" id="pb" name="playerBId" value={bId} onChange={(e) => { setBId(e.target.value); setBDeckId(""); }}>
                  {active.filter((p) => canPickPlayer || p.id !== aId)
                    .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {mazoFijo && (
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="deckBId">Su mazo</label>
                  <select className="input" id="deckBId" name="deckBId" value={bDeckId} onChange={(e) => setBDeckId(e.target.value)}>
                    <option value="">— sin asignar —</option>
                    <DeckOptions decks={decks} playerId={bId} archetypes={archetypes} />
                  </select>
                </div>
              )}
            </>
          )}

          {sameTwice && <p className="text-sm font-medium text-loss">Elige dos jugadores distintos.</p>}
        </div>
      </section>

      {/* ----------------------------- resultado ----------------------------- */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Resultado</h2>
          <div className="seg seg-brand">
            {[1, 3, 5].map((n) => (
              <button key={n} type="button" data-on={bestOf === n} onClick={() => setBestOf(n)}>Bo{n}</button>
            ))}
          </div>
        </div>

        {/* v0.43 — fijar el mazo o no. Un botón con `aria-pressed`, no una
            casilla escondida: es una decisión que cambia el formulario entero
            y tiene que verse. Viaja al servidor en `mazo_fijo`. */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={mazoFijo}
            onClick={() => setMazoFijo((v) => !v)}
            className={`chip ${mazoFijo ? "chip-brand" : ""}`}
          >
            {mazoFijo ? "✓ Mismo mazo toda la serie" : "Mazo distinto en cada juego"}
          </button>
          <span className="text-xs text-muted">
            {mazoFijo
              ? "El mazo se elige arriba, junto a cada jugador. Tócalo para cambiar entre juegos."
              : esLiga
                ? "Cada juego lleva su mazo. Liga: no se repite uno con el que ya ganaste un juego."
                : "Cada juego lleva su mazo."}
          </span>
          <input type="hidden" name="mazo_fijo" value={mazoFijo ? "1" : ""} />
        </div>

        <div className="mb-4 flex items-center justify-center gap-4 rounded-xl bg-ground py-3">
          <div className="flex flex-col items-center gap-1">
            <Avatar player={A} size="sm" />
            <span className="max-w-20 truncate text-xs text-muted">{A?.name}</span>
          </div>
          <span className={`font-display text-4xl font-extrabold tabular leading-none
            ${score.a > score.b ? "text-win" : score.b > score.a ? "text-loss" : "text-tie"}`}>
            {score.a}–{score.b}
          </span>
          <div className="flex flex-col items-center gap-1">
            <Avatar player={B} size="sm" />
            <span className="max-w-20 truncate text-xs text-muted">{bLabel}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {Array.from({ length: bestOf }, (_, i) => {
            const over = isOver(i);
            return (
              <div key={i} className={`rounded-xl border border-line-soft p-3 ${over ? "opacity-40" : ""}`}>
                <div className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-muted">
                  Juego {i + 1}
                </div>

                {/* Botones grandes: en el móvil esto se pulsa con el pulgar. */}
                <div className="seg w-full" role="group" aria-label={`Ganador del juego ${i + 1}`}>
                  {[
                    { v: "a", l: A?.name ?? "A" },
                    { v: "tie", l: "Empate" },
                    { v: "b", l: bLabel },
                  ].map((o) => (
                    <button
                      key={o.v} type="button" disabled={over}
                      data-on={games[i].winner === o.v}
                      onClick={() => setGame(i, { winner: games[i].winner === o.v ? "" : o.v })}
                      className="truncate"
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
                <input type="hidden" name={`g${i}_winner`} value={games[i].winner} />

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted">Empezó</span>
                  <div className="seg flex-1" role="group" aria-label={`Quién empezó el juego ${i + 1}`}>
                    {[
                      { v: "", l: "—" },
                      { v: "a", l: A?.name ?? "A" },
                      { v: "b", l: bLabel },
                    ].map((o) => (
                      <button
                        key={o.v || "none"} type="button" disabled={over}
                        data-on={games[i].first === o.v}
                        onClick={() => setGame(i, { first: o.v })}
                        className="truncate text-xs"
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <input type="hidden" name={`g${i}_first`} value={games[i].first} />

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted w-14">Mulligans</span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="flex flex-1 items-center gap-1.5">
                      <label htmlFor={`g${i}_mulligans_a`} className="sr-only">Mulligans {A?.name ?? "A"}</label>
                      <span className="truncate text-xs text-muted max-w-[60px]" title={A?.name ?? "A"}>{A?.name ?? "A"}</span>
                      <input 
                        type="number" id={`g${i}_mulligans_a`} name={`g${i}_mulligans_a`} 
                        className="input input-sm w-12 text-center p-1" 
                        min={0} max={99} disabled={over} 
                        defaultValue={match?.games[i]?.mulligansA ?? 0}
                      />
                    </div>
                    <div className="flex flex-1 items-center gap-1.5">
                      <label htmlFor={`g${i}_mulligans_b`} className="sr-only">Mulligans {bLabel}</label>
                      <span className="truncate text-xs text-muted max-w-[60px]" title={bLabel}>{bLabel}</span>
                      <input 
                        type="number" id={`g${i}_mulligans_b`} name={`g${i}_mulligans_b`} 
                        className="input input-sm w-12 text-center p-1" 
                        min={0} max={99} disabled={over} 
                        defaultValue={match?.games[i]?.mulligansB ?? 0}
                      />
                    </div>
                  </div>
                </div>

                {/* v0.30 — premios cogidos por cada uno y penalización. */}
                <PrizePicker
                  campo={`g${i}`}
                  nombreA={A?.name ?? "A"}
                  nombreB={bLabel}
                  winner={games[i].winner}
                  disabled={over}
                  valor={{
                    premiosA: games[i].premiosA, premiosB: games[i].premiosB,
                    penalizadoA: games[i].penalizadoA, penalizadoB: games[i].penalizadoB,
                  }}
                  onChange={(parcial) => setGame(i, parcial)}
                />

                {/* v0.25 — mazo de cada uno en ESTE juego. Lo que alguien ya ganó
                    en un juego anterior de la serie no se ofrece (regla de liga;
                    el servidor también lo comprueba).

                    v0.41 — SOLO en liga. En un amistoso no se pinta: el mazo de
                    la serie vale para todos los juegos, y al no enviarse los
                    `g{i}_arch*` el servidor los guarda vacíos, que significa
                    exactamente eso («el de la serie»). */}
                {!mazoFijo && (
                <div className="mt-2 grid grid-cols-1 gap-2 xs:grid-cols-2">
                  {(["a", "b"] as const).map((lado) => {
                    // El bloqueo es la regla de LIGA; en un amistoso se puede
                    // repetir el mazo que se quiera.
                    const fuera = esLiga ? bloqueados(juegosMazos, i, lado) : new Set<string>();
                    const campo = lado === "a" ? "archA" : "archB";
                    return (
                      <label key={lado} className="flex min-w-0 flex-col gap-1">
                        <span className="text-[11px] text-muted">
                          Mazo de {lado === "a" ? (A?.name ?? "A") : bLabel}
                          {fuera.size > 0 && <span className="text-loss"> · {fuera.size} bloqueado{fuera.size > 1 ? "s" : ""}</span>}
                        </span>
                        <DeckPicker
  name={`g${i}_arch${lado.toUpperCase()}`}
  options={archOpts.filter((x) => !fuera.has(x.id) || games[i][campo] === x.id)}
  defaultValue={games[i][campo]}
  onChange={(val) => setGame(i, { [campo]: val })}
  locked={over}
  emptyLabel="— selecciona mazo —"
/>
                      </label>
                    );
                  })}
                </div>
                )}
              </div>
            );
          })}
        </div>

        {!decided && (
          <p className="mt-3 text-sm text-muted">
            Faltan juegos: nadie llega a {need}.
          </p>
        )}
      </section>

      {/* ------------------------------ contexto ------------------------------ */}
      <details className="card p-4" open={Boolean(match?.competitionId || match?.tournamentId || match?.note)}>
        <summary className="cursor-pointer text-lg font-bold">Contexto y notas</summary>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="competitionId">Competición</label>
            <select className="input" id="competitionId" name="competitionId" value={compId} onChange={(e) => setCompId(e.target.value)}>
              {/* v0.19 — una sola categoría «Amistoso»: sin competición. Las
                  competiciones de tipo «Amistosos» ya no se ofrecen (la
                  migración 0012 las funde aquí). */}
              <option value="">Amistoso</option>
              {competitions.filter((c) => c.kind !== "casual").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="tournamentId">¿Fue en un torneo?</label>
            <select className="input" id="tournamentId" name="tournamentId" defaultValue={match?.tournamentId ?? ""}>
              <option value="">No</option>
              {tournaments.slice(0, 30).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="date">Fecha</label>
              <input className="input" id="date" name="date" type="date" defaultValue={match?.date ?? todayISO()} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="round">Jornada</label>
              <input className="input" id="round" name="round" type="number" min={0} inputMode="numeric" defaultValue={match?.round ?? 0} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="note">Notas</label>
            <textarea className="input" id="note" name="note" rows={2} defaultValue={match?.note ?? ""}
              placeholder="Mulligans, la jugada que lo decidió, algo que cambiar de la lista…" />
          </div>
        </div>
      </details>

      <div className="sticky bottom-nav z-20 flex gap-2 md:static">
        <button className="btn btn-brand flex-1 text-base" type="submit" disabled={!canSave}>
          {match ? "Guardar cambios" : "Guardar partida"}
        </button>
        {match && (
          <button className="btn btn-danger" type="submit" formAction={deleteMatch} name="id" value={match.id}>
            Borrar
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * Los mazos que se le pueden asignar a un jugador.
 *
 * Los suyos primero y, en un grupo aparte, los de la biblioteca compartida
 * —los de `playerId` nulo—. Estos últimos no son de nadie y existen justo
 * para esto: poder decir qué llevaba alguien sin tener que apropiarse el mazo
 * ni inventarle una cuenta al rival.
 */
function DeckOptions({ decks, playerId, archetypes = [] }: { decks: Deck[]; playerId: string; archetypes?: Archetype[] }) {
  const own = decks.filter((d) => d.playerId === playerId && !d.retired);
  const shared = decks.filter((d) => d.playerId == null && !d.retired);
  return (
    <>
      {own.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      {shared.length > 0 && (
        <optgroup label="De la liga">
          {shared.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </optgroup>
      )}
      {/* v0.24: cualquier arquetipo, sin tener el mazo registrado. */}
      {archetypes.length > 0 && (
        <optgroup label="Solo el arquetipo">
          {[...archetypes].sort((x, y) => x.name.localeCompare(y.name, "es")).map((a) => (
            <option key={a.id} value={`arch:${a.id}`}>{a.name}</option>
          ))}
        </optgroup>
      )}
    </>
  );
}






