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
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

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
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

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
  // v0.44 — grupo «arch» («Solo el arquetipo»), no «shared»: antes los
  // arquetipos salían bajo «De la liga», que no lo son.
  const archOpts: DeckOption[] = useMemo(() => [...archetypes].map((a) => ({ id: a.id, name: a.name, archetypeId: a.id, archetypeName: a.name, main: a.main, secondary: a.secondary, type: a.type, group: 'arch' as const, hasList: false })).sort((x, y) => x.name.localeCompare(y.name, 'es')), [archetypes]);

  /* v0.44 — el buscador del mazo de la SERIE, con los Pokémon de cada
     arquetipo y búsqueda. En la v0.43 se restauraron los selectores tal y
     como eran antes del 9 de octubre, con un `<select>` nativo: una lista de
     cien nombres sin un solo icono. Ahora es el mismo `DeckPicker` que ya
     usaban los mazos por juego.

     El orden de los grupos es el orden en que se pintan: los mazos de ese
     jugador, los de la liga, y al final los arquetipos sueltos, en su propio
     grupo («Solo el arquetipo») en vez de mezclados con los de la liga. */
  const archPorId = useMemo(() => new Map(archetypes.map((a) => [a.id, a])), [archetypes]);
  const opcionesSerie = (playerId: string): DeckOption[] => {
    const dueno = players.find((p) => p.id === playerId);
    const esMio = playerId === meId;
    const deMazo = (d: Deck, group: DeckOption["group"], ownerName?: string): DeckOption => {
      const a = archPorId.get(d.archetypeId);
      return {
        id: d.id, name: d.name, archetypeId: d.archetypeId, archetypeName: a?.name ?? "",
        main: a?.main ?? "", secondary: a?.secondary ?? "", type: a?.type ?? "colorless",
        group, ownerName, hasList: Boolean(d.list.trim()),
      };
    };
    const propios = decks.filter((d) => d.playerId === playerId && !d.retired)
      .map((d) => deMazo(d, esMio ? "mine" : "other", esMio ? undefined : dueno?.name));
    const deLaLiga = decks.filter((d) => d.playerId == null && !d.retired).map((d) => deMazo(d, "shared"));
    const soloArquetipo = archOpts.map((o) => ({ ...o, id: `arch:${o.archetypeId}` }));
    return [...propios, ...deLaLiga, ...soloArquetipo];
  };
  /** El rival de fuera solo tiene arquetipo, y el servidor lo lee sin prefijo. */
  const opcionesRivalFuera: DeckOption[] = archOpts;

  const juegosMazos = games.map((g) => ({ winner: g.winner, archA: g.archA || null, archB: g.archB || null }));

  const need = Math.ceil(bestOf / 2);

  /* v0.53 — MODO RÁPIDO por defecto. El resultado se mete con un toque
     (2-0, 2-1, 1-2, 0-2, o empate por tiempo); el juego a juego, con premios,
     quién empezó y mulligans, solo si se pide con «Detallar juegos». Al editar
     una partida que ya tiene detalle apuntado, se abre en detalle para no
     esconderlo. */
  const [modo, setModo] = useState<"rapido" | "detalle">(() =>
    games.some((g) => g.first || g.archA || g.archB || g.premiosA != null || g.premiosB != null || g.penalizadoA || g.penalizadoB)
      ? "detalle" : "rapido");
  /* El empate por tiempo es un estado de la PARTIDA (se guarda como
     `seriesResult = "tie"`), no «1-1 y un juego empatado». */
  const [empateTiempo, setEmpateTiempo] = useState<boolean>(match?.seriesResult === "tie" && !(match?.games.length));

  /* Los marcadores posibles para el formato: del que más gana el de la
     izquierda al que más pierde. */
  const marcadores: Array<[number, number]> = [];
  for (let l = 0; l < need; l++) marcadores.push([need, l]);
  for (let w = need - 1; w >= 0; w--) marcadores.push([w, need]);

  /** Rellena los juegos para un marcador. El orden real no se apunta en modo
      rápido: se alternan y el último lo gana quien gana la serie. */
  const elegirMarcador = (a: number, b: number) => {
    const gana = a > b ? "a" : "b", pierde = a > b ? "b" : "a";
    const seq: string[] = [];
    for (let k = 0; k < Math.min(a, b); k++) seq.push(gana, pierde);
    for (let ganados = Math.min(a, b); ganados < Math.max(a, b); ganados++) seq.push(gana);
    setEmpateTiempo(false);
    setGames((gs) => gs.map((g, i) => ({ ...g, winner: seq[i] ?? "" })));
  };
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
  const decided = empateTiempo || score.a >= need || score.b >= need || played === bestOf;
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
          <h2 className="text-lg font-bold">{tr(lng, "x.ec039ecb")}</h2>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox" className="size-4" checked={external}
              onChange={(e) => setExternal(e.target.checked)}
            />
            {tr(lng, "x.814556e6")}
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            {canPickPlayer ? (<>
              <label className="label" htmlFor="pa">{tr(lng, "x.588eb828")}</label>
              <select className="input" id="pa" value={aId} onChange={(e) => { setAId(e.target.value); setADeckId(""); }}>
                {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </>) : (<>
              {/* Sin permisos de organizador la partida es tuya: fijar el lado A
                  evita ofrecer algo que el servidor va a rechazar. */}
              <span className="label">{tr(lng, "x.588eb828")}</span>
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
              <label className="label" htmlFor="deckAId">{tr(lng, "x.3f62cf84")}</label>
              {/* `key` con el jugador: al cambiar de jugador se vacía, porque los
                  mazos de uno no son los del otro. */}
              <DeckPicker
                key={`a-${aId}`} id="deckAId" name="deckAId"
                options={opcionesSerie(aId)} defaultValue={aDeckId}
                emptyLabel={tr(lng, "x.b1b5a61d")} placeholder={tr(lng, "x.fb8cc3fa")}
                searchFrom={1} onChange={setADeckId}
              />
            </div>
          )}

          <hr className="border-line-soft" />

          {external ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="opponentName">{tr(lng, "x.dca34e30")}</label>
                <input
                  className="input" id="opponentName" name="opponentName" required maxLength={60}
                  defaultValue={match?.opponentName ?? ""} placeholder={tr(lng, "x.e8b90f28")}
                />
                <p className="text-xs text-muted">
                  {tr(lng, "x.01ffc556")}
                </p>
              </div>
              {mazoFijo && (
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="opponentArchetypeId">{tr(lng, "x.6205beb8")}</label>
                  <DeckPicker
                    key="rival-fuera" id="opponentArchetypeId" name="opponentArchetypeId"
                    options={opcionesRivalFuera} defaultValue={oppArch}
                    emptyLabel={tr(lng, "x.42ec8535")} placeholder={tr(lng, "x.7cd1828c")}
                    searchFrom={1} onChange={setOppArch}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="pb">{tr(lng, "x.dca34e30")}</label>
                <select className="input" id="pb" name="playerBId" value={bId} onChange={(e) => { setBId(e.target.value); setBDeckId(""); }}>
                  {active.filter((p) => canPickPlayer || p.id !== aId)
                    .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {mazoFijo && (
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="deckBId">{tr(lng, "x.3f62cf84")}</label>
                  <DeckPicker
                    key={`b-${bId}`} id="deckBId" name="deckBId"
                    options={opcionesSerie(bId)} defaultValue={bDeckId}
                    emptyLabel={tr(lng, "x.b1b5a61d")} placeholder={tr(lng, "x.fb8cc3fa")}
                    searchFrom={1} onChange={setBDeckId}
                  />
                </div>
              )}
            </>
          )}

          {sameTwice && <p className="text-sm font-medium text-loss">{tr(lng, "x.015e83e1")}</p>}
        </div>
      </section>

      {/* ----------------------------- resultado ----------------------------- */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{tr(lng, "x.c7589dbf")}</h2>
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
            {mazoFijo ? "✓ Mismo mazo toda la serie" : tr(lng, "x.2860c708")}
          </button>
          <span className="text-xs text-muted">
            {mazoFijo
              ? tr(lng, "x.2f3564d7")
              : esLiga
                ? tr(lng, "x.b9b9a770")
                : tr(lng, "x.9f47a827")}
          </span>
          <input type="hidden" name="mazo_fijo" value={mazoFijo ? "1" : ""} />
        </div>

        {/* v0.58 — PANTALLA DE ENFRENTAMIENTO. Cada jugador en su lado con su
            color de perfil (el fondo se parte en diagonal en los dos), el avatar
            con un aro que brilla, y el marcador en grande en el centro. Cuando
            hay ganador, su lado se ilumina y el otro se apaga un poco. */}
        <div
          className="vs-panel mb-4"
          style={{ "--ca": A?.color ?? "var(--info)", "--cb": B?.color ?? "var(--loss)" } as React.CSSProperties}
          data-gana={decided && !empateTiempo && score.a !== score.b ? (score.a > score.b ? "a" : "b") : undefined}
        >
          <div className="vs-lado vs-a">
            <span className="vs-aro"><Avatar player={A} size="lg" /></span>
            <span className="vs-nombre" title={A?.name}>{A?.name}</span>
          </div>
          <div className="vs-centro">
            <span className="vs-marcador tabular">{score.a}<span className="vs-dos-puntos">:</span>{score.b}</span>
            <span className="vs-etiqueta">VS · Bo{bestOf}</span>
          </div>
          <div className="vs-lado vs-b">
            <span className="vs-aro"><Avatar player={B} size="lg" /></span>
            <span className="vs-nombre" title={bLabel}>{bLabel}</span>
          </div>
        </div>
        {/* v0.53 — el resultado dicho, antes de guardar */}
        {decided && (
          <p className={`-mt-2 mb-4 text-center text-sm font-semibold ${empateTiempo || score.a === score.b ? "text-tie" : score.a > score.b ? "text-win" : "text-loss"}`}>
            {empateTiempo ? tr(lng, "rr.resEmpateTiempo")
              : score.a === score.b ? tr(lng, "rr.resEmpate")
              : trf(lng, "rr.resGana", { n: score.a > score.b ? (A?.name ?? "A") : bLabel })}
          </p>
        )}

        {/* v0.53 — modo rápido / detallar juegos */}
        <div className="mb-3 flex gap-1.5" role="group" aria-label={tr(lng, "rr.modo")}>
          <button type="button" aria-pressed={modo === "rapido"} onClick={() => setModo("rapido")}
            className={`chip ${modo === "rapido" ? "chip-brand" : ""}`}>{tr(lng, "rr.rapido")}</button>
          <button type="button" aria-pressed={modo === "detalle"} onClick={() => setModo("detalle")}
            className={`chip ${modo === "detalle" ? "chip-brand" : ""}`}>{tr(lng, "rr.detallar")}</button>
        </div>

        {modo === "rapido" ? (
          <>
            <div className="grid grid-cols-2 gap-2 xs:grid-cols-4">
              {marcadores.map(([a, b]) => {
                const activo = !empateTiempo && score.a === a && score.b === b;
                const gana = a > b;
                return (
                  <button key={`${a}-${b}`} type="button" aria-pressed={activo} onClick={() => elegirMarcador(a, b)}
                    className="marcador-btn" data-tono={gana ? "win" : "loss"}>
                    <span className="marcador-palabra">{gana ? tr(lng, "rr.victoria") : tr(lng, "rr.derrota")}</span>
                    <span className={`font-display text-2xl font-extrabold tabular ${gana ? "text-win" : "text-loss"}`}>{a}–{b}</span>
                    <span className="max-w-full truncate text-[10px] leading-tight text-muted" title={gana ? (A?.name ?? "") : bLabel}>{gana ? A?.name : bLabel}</span>
                  </button>
                );
              })}
            </div>
            <button type="button" aria-pressed={empateTiempo} onClick={() => setEmpateTiempo((v) => !v)}
              className="marcador-btn mt-2 w-full !min-h-11 !flex-row" data-tono="tie">
              {tr(lng, "rr.empateTiempo")}
            </button>
            {/* Lo que viaja: los juegos del marcador elegido, sin más detalle. */}
            {!empateTiempo && games.slice(0, bestOf).map((g, i) => g.winner && (
              <input key={i} type="hidden" name={`g${i}_winner`} value={g.winner} />
            ))}
            <p className="mt-2 text-xs text-muted">{tr(lng, "rr.notaRapido")}</p>
          </>
        ) : (
          <>
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
                    { v: "tie", l: tr(lng, "x.09d03513") },
                    { v: "b", l: bLabel },
                  ].map((o) => (
                    <button
                      key={o.v} type="button" disabled={over}
                      data-on={games[i].winner === o.v}
                      onClick={() => setGame(i, { winner: games[i].winner === o.v ? "" : o.v })}
                      className="truncate text-xs"
                      title={o.l}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
                <input type="hidden" name={`g${i}_winner`} value={games[i].winner} />

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted">{tr(lng, "x.04e97451")}</span>
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
                        title={o.l}
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <input type="hidden" name={`g${i}_first`} value={games[i].first} />

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted w-14">{tr(lng, "x.0dc0ab48")}</span>
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
  emptyLabel={tr(lng, "x.5f9b8c84")}
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
            <button type="button" aria-pressed={empateTiempo} onClick={() => setEmpateTiempo((v) => !v)}
              className={`mt-3 w-full rounded-xl border-2 px-3 py-2.5 text-sm font-semibold
                ${empateTiempo ? "border-tie bg-tie/15 text-ink" : "border-line-soft bg-surface-2 text-muted"}`}>
              {tr(lng, "rr.empateTiempo")}
            </button>
          </>
        )}
        <input type="hidden" name="empate_tiempo" value={empateTiempo ? "1" : ""} />

        {/* v0.61 — solo en el modo detallado: en el rápido confundía, porque ahí
            no se apuntan juegos sino el marcador. */}
        {!decided && modo === "detalle" && (
          <p className="mt-3 text-sm text-muted">
            Faltan juegos: nadie llega a {need}.
          </p>
        )}
      </section>

      {/* ------------------------------ contexto ------------------------------ */}
      <details className="card p-4" open={Boolean(match?.competitionId || match?.tournamentId || match?.note)}>
        <summary className="cursor-pointer text-lg font-bold">{tr(lng, "x.998fd670")}</summary>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="competitionId">{tr(lng, "x.c28ef3fd")}</label>
            <select className="input" id="competitionId" name="competitionId" value={compId} onChange={(e) => setCompId(e.target.value)}>
              {/* v0.19 — una sola categoría «Amistoso»: sin competición. Las
                  competiciones de tipo «Amistosos» ya no se ofrecen (la
                  migración 0012 las funde aquí). */}
              <option value="">{tr(lng, "x.566dd541")}</option>
              {competitions.filter((c) => c.kind !== "casual").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="tournamentId">¿Fue en un torneo?</label>
            <select className="input" id="tournamentId" name="tournamentId" defaultValue={match?.tournamentId ?? ""}>
              <option value="">{tr(lng, "x.816c52fd")}</option>
              {tournaments.slice(0, 30).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="date">{tr(lng, "x.bcc47609")}</label>
              <input className="input" id="date" name="date" type="date" defaultValue={match?.date ?? todayISO()} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="round">{tr(lng, "x.74d2b97e")}</label>
              <input className="input" id="round" name="round" type="number" min={0} inputMode="numeric" defaultValue={match?.round ?? 0} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="note">{tr(lng, "x.73035e47")}</label>
            <textarea className="input" id="note" name="note" rows={2} defaultValue={match?.note ?? ""}
              placeholder={tr(lng, "x.5fe027b2")} />
          </div>
        </div>
      </details>

      {/* v0.53 — barra OPACA: antes el botón desactivado era translúcido y el
          Juego 2 se veía a través, como si estuviera roto. Y dice qué falta. */}
      <div className="sticky bottom-nav z-20 -mx-3 flex flex-col gap-1.5 border-t border-line bg-ground px-3 pb-2 pt-2 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        {!canSave && (
          <p className="text-center text-xs text-muted">{!aId ? tr(lng, "rr.faltaJugador") : sameTwice ? tr(lng, "rr.mismoJugador") : tr(lng, "rr.faltaResultadoCorto")}</p>
        )}
        <div className="flex gap-2">
        <button className="btn btn-brand btn-gamer flex-1 text-base disabled:opacity-100 disabled:bg-surface-2 disabled:text-muted" type="submit" disabled={!canSave}>
          {match ? "Guardar cambios" : tr(lng, "x.46ee46f3")}
        </button>
        {match && (
          <button className="btn btn-danger" type="submit" formAction={deleteMatch} name="id" value={match.id}>
            {tr(lng, "x.d7b82b21")}
          </button>
        )}
        </div>
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
