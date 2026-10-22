"use client";

/* v0.47 — RoundForm vivía en `TournamentRounds.tsx`, junto a un componente
   `TournamentRounds` de casi 250 líneas que no se pintaba en ningún sitio y
   que, además, importaba `roundStage` de `lib/stats`: como esto es un
   componente de cliente, eso se llevaba `lib/stats` entero al navegador. El
   componente muerto se ha borrado y este fichero solo tiene lo que se usa. */

import { useMemo, useState } from "react";
import { saveTournamentRound, dropFromTournament } from "@/actions";
import type { DeckOption, PublicPlayer, Side } from "@/lib/types";
import { archetypeValue } from "@/lib/types";
import type { RoundView } from "@/lib/stats";
import { DeckPicker } from "./DeckPicker";
import { PrizePicker } from "@/components/PrizePicker";
import { Avatar } from "./ui";
import { ObjetoSprite } from "@/components/ObjetoSprite";
import { familiaTorneo } from "@/lib/familiaTorneo";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/** Cuántos rivales se enseñan antes de plegar el resto. Seis caben en dos
    filas en un móvil de 360 px sin empujar el formulario. */
const TOPE_RIVALES = 6;

/** Para buscar sin que importen acentos ni mayúsculas: «jimenez» encuentra
    «Francesc Jimenez» y «ivan» encuentra «Iván Fernández». */
const sinAcentos = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Los premios de un juego mientras se edita. */
type PremiosEnEdicion = {
  premiosA: number | null; premiosB: number | null;
  penalizadoA: boolean; penalizadoB: boolean;
};

/* =========================================================================
   Ir apuntando el torneo ronda a ronda.

   Pensado para rellenarse de pie, con una mano, entre rondas: el caso real es
   que acabas la ronda 3 y tienes dos minutos antes de que salgan los
   emparejamientos siguientes. Por eso lo primero que se ve es el modo rápido
   —rival, su mazo, salí 1.º o 2.º, gané o perdí— y el desglose juego a juego
   está detrás de un botón, para cuando hay tiempo.

   Tres cosas que cambiaron y conviene que sigan así:

   · **El mazo del torneo no se pregunta cada ronda.** En un suizo juegas el
     mismo mazo de la primera a la última, así que se elige una vez —en tu
     resultado— y las rondas lo heredan. Preguntarlo siete veces era invitar a
     que la tercera te equivocaras y ensuciar tus propias estadísticas.
   · **Quién sale primero se marca en cada juego.** Antes se deducía («pierde
     un juego, empieza el siguiente») y casi siempre acertaba, pero en la mesa
     pasan concesiones, penalizaciones y reinicios. El dato bueno es el que
     viste, no el que se deduce.
   · **Un torneo cerrado no acepta rondas.** Si no, «cerrado» sería un adorno.

   Todo son formularios normales: se envían a una Server Action y funcionan
   sin JavaScript. El estado de React solo sirve para lo que de verdad es
   interactivo.
   ========================================================================= */

const RESULTS = [
  { v: "a", label: "Gané", cls: "data-[on=true]:bg-win data-[on=true]:text-white" },
  { v: "tie", label: "Empate", cls: "data-[on=true]:bg-tie data-[on=true]:text-white" },
  { v: "b", label: "Perdí", cls: "data-[on=true]:bg-loss data-[on=true]:text-white" },
] as const;

export function RoundForm({
  tournamentId, playerId, round, bestOf, rivalDecks, archetypeOptions, myDecks,
  lockedDeckId, existing, onCancel, maxRound, rivalPlayers = [], tipoTorneo, jugador,
}: {
  /** v0.63 — quien apunta la ronda, para su lado del panel de enfrentamiento. */
  jugador?: PublicPlayer;
  /** v0.62 — el tipo del torneo, para vestir la cinta de la ronda. */
  tipoTorneo?: string;
  tournamentId: string;
  playerId: string;
  round: number;
  bestOf: number;
  rivalDecks: DeckOption[];
  archetypeOptions: DeckOption[];
  myDecks: DeckOption[];
  lockedDeckId: string | null;
  existing?: RoundView;
  onCancel?: () => void;
  /** Última ronda que admite el torneo (v0.13). Nulo = sin tope conocido. */
  maxRound?: number | null;
  /** v0.15 — gente del grupo que puede ser tu rival (todos menos tú). */
  rivalPlayers?: Array<{ id: string; name: string } & Partial<PublicPlayer>>;
}) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const m = existing?.match;
  /* v0.15 — el rival puede ser alguien del grupo o un nombre cualquiera. Si
     tocas un nombre del grupo, se rellena el campo y la ronda queda enlazada
     a su perfil (mapa de enfrentamientos). Si escribes otra cosa, el enlace
     se suelta solo: no puede quedar «Pepe» enlazado a la cuenta de Alex. */
  const [rivalName, setRivalName] = useState<string>(m?.opponentName ?? "");
  const [verTodos, setVerTodos] = useState(false);

  /* v0.34 — rivales filtrados por lo que se escribe, sin acentos ni mayúsculas.
     Con 21 personas en la liga, pintarlas todas eran siete filas de chips. */
  const rivalesFiltrados = useMemo(() => {
    const q = sinAcentos(rivalName);
    if (!q) return rivalPlayers;
    return rivalPlayers.filter((p: { id: string; name: string }) => sinAcentos(p.name).includes(q));
  }, [rivalPlayers, rivalName]);

  const rivalesVisibles = verTodos ? rivalesFiltrados : rivalesFiltrados.slice(0, TOPE_RIVALES);
  const ocultos = verTodos ? 0 : rivalesFiltrados.length - rivalesVisibles.length;
  const [rivalId, setRivalId] = useState<string>(m?.opponentPlayerId ?? "");
  const pickRival = (p: { id: string; name: string }) => {
    if (rivalId === p.id) { setRivalId(""); return; }
    setRivalId(p.id);
    setRivalName(p.name);
  };
  const hasGames = (m?.games.length ?? 0) > 0;

  /* Los mazos registrados primero y los arquetipos después: si tu rival llevaba
     algo que alguien ya tiene apuntado carta por carta, es mejor eso que el
     arquetipo a secas. */
  const rivalOptions = [...rivalDecks, ...archetypeOptions];
  /* Lo mismo para tu propio mazo: si todavía no tienes la lista de 60 cartas
     registrada, puedes fijar el torneo solo con el arquetipo. */
  const ownOptions = [...myDecks, ...archetypeOptions];

  const [mode, setMode] = useState<"quick" | "games">(hasGames ? "games" : "quick");
  const [result, setResult] = useState<string>(
    existing && existing.declared && existing.result
      ? (existing.result === "w" ? "a" : existing.result === "l" ? "b" : "tie")
      : "",
  );
  const [gameWinners, setGameWinners] = useState<string[]>(() => {
    const base = Array.from({ length: bestOf }, () => "");
    m?.games.forEach((g) => { if (g.number - 1 < bestOf) base[g.number - 1] = g.winner; });
    return base;
  });
  /* Quién salió primero, juego a juego. El primero sale de la moneda; los
     siguientes vienen rellenados con «empieza quien perdió el anterior», que
     es la regla, pero se pueden cambiar porque en la mesa no siempre pasa. */
  const [firsts, setFirsts] = useState<Array<Side | "">>(() => {
    const base = Array.from({ length: bestOf }, () => "" as Side | "");
    m?.games.forEach((g) => {
      if (g.number - 1 < bestOf) base[g.number - 1] = (g.first as Side | "") || "";
    });
    if (!base[0] && m?.firstTurn) base[0] = m.firstTurn as Side;
    return base;
  });
  const [timeCalled, setTimeCalled] = useState(false);

  const need = Math.floor(bestOf / 2) + 1;
  const won = gameWinners.filter((w) => w === "a").length;
  const lost = gameWinners.filter((w) => w === "b").length;
  const settled = won >= need || lost >= need;

  // Cuántos juegos tiene sentido enseñar: se acaba en cuanto hay mayoría, o en
  // cuanto un juego se marca como empate —viene del reloj, y del reloj no se
  // juega uno más—.
  const visibleGames = (() => {
    let shown = 0, a = 0, b = 0;
    for (let i = 0; i < bestOf; i++) {
      shown++;
      const w = gameWinners[i];
      if (w === "a") a++;
      else if (w === "b") b++;
      if (w === "tie" || a >= need || b >= need) break;
    }
    return shown;
  })();

  /** ¿Ya hay un juego empatado entre los que se enseñan? Decide la ronda él solo. */
  const decidedByTie = gameWinners.slice(0, visibleGames).includes("tie");

  const setGameWinner = (i: number, v: string) => {
    setGameWinners((prev) => {
      const next = prev.map((w, k) => (k === i ? (w === v ? "" : v) : w));
      // Al marcar un juego, proponemos quién empieza el siguiente: el que lo
      // acaba de perder. Solo si aún no se había tocado a mano.
      setFirsts((f) => {
        const out = [...f];
        const winner = next[i];
        if (winner && i + 1 < bestOf && !out[i + 1]) {
          out[i + 1] = winner === "a" ? "b" : winner === "b" ? "a" : "";
        }
        return out;
      });
      return next;
    });
  };

  /* v0.30 — premios y penalización por juego, igual que en MatchForm.
     Anotado a mano: un literal con `premiosA: null` infiere el tipo `null`
     y después no deja asignarle un número (el fallo de la v0.9.0). */
  const [premios, setPremios] = useState<PremiosEnEdicion[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({
      premiosA: m?.games[i]?.prizesA ?? null,
      premiosB: m?.games[i]?.prizesB ?? null,
      penalizadoA: m?.games[i]?.penaltyA ?? false,
      penalizadoB: m?.games[i]?.penaltyB ?? false,
    })));

  const setPremio = (i: number, patch: Partial<PremiosEnEdicion>) =>
    setPremios((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const setFirst = (i: number, v: Side | "") =>
    setFirsts((prev) => prev.map((x, k) => (k === i ? (x === v ? "" : v) : x)));

  /* v0.63 — el panel de enfrentamiento, como en Registrar partida. El rival es
     alguien del grupo (con su avatar y su color) o un nombre suelto (con su
     inicial). En modo rápido no hay juegos que contar: el centro dice VS y se
     ilumina el lado ganador; juego a juego, sale el marcador. */
  const familia = familiaTorneo(tipoTorneo);
  const rivalDelGrupo = rivalPlayers.find((p) => p.id === rivalId);
  const rivalAvatar = (rivalDelGrupo && "color" in rivalDelGrupo ? rivalDelGrupo : {
    id: "", name: rivalName.trim() || "?", color: "#94a3b8", avatarKind: "initial", avatarValue: null,
  }) as PublicPlayer;
  const ganaPanel = mode === "games"
    ? (won > lost && (settled || decidedByTie || timeCalled) ? "a" : lost > won && (settled || decidedByTie || timeCalled) ? "b" : undefined)
    : result === "a" || result === "b" ? result : undefined;

  return (
    <form action={saveTournamentRound} className="flex flex-col gap-3.5 rounded-xl border border-line-soft bg-ground p-3.5">
      {/* v0.62 — la cinta de la ronda, vestida según el tipo de torneo. */}
      <div className="torneo-cinta" data-familia={familiaTorneo(tipoTorneo)}>
        <span aria-hidden="true">{({ challenge: "🎯", cup: "🏆", major: "👑", online: "🌐", otro: "🃏" } as const)[familiaTorneo(tipoTorneo)]}</span>
        <span className="truncate">{tr(lng, `cinta.${familiaTorneo(tipoTorneo)}`)}</span>
        <span className="ml-auto flex-none tabular opacity-90">{trf(lng, "cinta.ronda", { n: round })} · Bo{bestOf}</span>
      </div>
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="playerId" value={playerId} />
      <input type="hidden" name="mode" value={mode} />
      {/* v0.34 — la lista de rivales era un muro: con 21 personas ocupaba siete
          filas de chips y empujaba el resto del formulario fuera de la pantalla
          del móvil. Ahora se filtra con lo que escribes y solo se enseñan unos
          pocos, con un «+N más» para abrirla entera. */}
      {/* Al editar se manda el id de la fila. Sin él, cambiar el número de
          ronda insertaba una ronda nueva y dejaba la vieja donde estaba. */}
      {m && <input type="hidden" name="matchId" value={m.id} />}

      <div className="grid grid-cols-[5.5rem_1fr] gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor={`round-${round}`}>{tr(lng, "x.0d3a8a99")}</label>
          <input
            className="input px-2 text-center tabular" id={`round-${round}`} name="round"
            type="number" min={1} max={maxRound ?? 50} inputMode="numeric" defaultValue={round}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor={`opp-${round}`}>{tr(lng, "x.dca34e30")}</label>
          <input
            className="input" id={`opp-${round}`} name="opponentName" required maxLength={60}
            autoComplete="off" value={rivalName} placeholder={tr(lng, "x.488edc18")}
            onChange={(e) => {
              setRivalName(e.target.value);
              const elegido = rivalPlayers.find((p) => p.id === rivalId);
              if (elegido && e.target.value.trim() !== elegido.name) setRivalId("");
            }}
          />
          <input type="hidden" name="opponentPlayerId" value={rivalId} />
        </div>
      </div>

      {rivalPlayers.length > 0 && (
        <div className="-mt-1.5 flex flex-col gap-1.5">
          <span className="text-[11px] text-muted">
            {tr(lng, "x.a4246d24")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {rivalesVisibles.map((p) => (
              <button
                key={p.id} type="button" onClick={() => pickRival(p)}
                aria-pressed={rivalId === p.id}
                className={`chip ${rivalId === p.id ? "chip-brand" : ""}`}
              >
                {rivalId === p.id ? "✓ " : ""}{p.name}
              </button>
            ))}
            {ocultos > 0 && (
              <button
                type="button" onClick={() => setVerTodos(true)}
                className="chip text-muted"
              >
                +{ocultos} más
              </button>
            )}
            {verTodos && rivalesFiltrados.length > TOPE_RIVALES && (
              <button type="button" onClick={() => setVerTodos(false)} className="chip text-muted">
                {tr(lng, "x.f83a31bf")}
              </button>
            )}
          </div>
          {rivalName.trim() && rivalesFiltrados.length === 0 && (
            <span className="text-[11px] text-muted">
              {tr(lng, "x.ca3ad430")}
            </span>
          )}
        </div>
      )}

      {/* Contra qué jugó. En la misma lista van los mazos de la biblioteca
          —con su lista de 60 cartas, si alguien la apuntó— y los arquetipos
          sueltos. Es justo para lo que existen los mazos sin dueño: apuntar lo
          que llevaba el rival sin inventarle una cuenta. */}
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor={`arch-${round}`}>{tr(lng, "x.d5d31276")}</label>
        <DeckPicker
          id={`arch-${round}`} name="opponentDeck"
          options={rivalOptions}
          defaultValue={
            m?.deckBId ?? (m?.opponentArchetypeId ? archetypeValue(m.opponentArchetypeId) : "")
          }
          emptyLabel={tr(lng, "x.59787b9a")}
          placeholder={tr(lng, "x.acb9d3fc")}
        />
      </div>

      {/* El mazo del torneo: se elige una vez y se queda. También se puede
          fijar solo el arquetipo, si todavía no tienes la lista registrada:
          el selector ofrece las dos cosas en la misma lista. */}
      {lockedDeckId ? (
        <input type="hidden" name="deckAId" value={lockedDeckId} />
      ) : ownOptions.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor={`deck-${round}`}>{tr(lng, "x.36530283")}</label>
          <DeckPicker
            id={`deck-${round}`} name="deckAId"
            options={ownOptions}
            defaultValue={m?.deckAId ?? (m?.archetypeAId ? archetypeValue(m.archetypeAId) : "")}
            emptyLabel={tr(lng, "x.59787b9a")}
            placeholder={tr(lng, "x.7bc58df3")}
          />
          {/* v0.34 — eran tres líneas en el móvil, justo encima del bloque de
              resultado. Lo que hay que saber antes de tocarlo cabe en una; el
              resto se descubre solo al abrir el selector. */}
          <p className="text-xs text-muted">{tr(lng, "x.daa09444")}</p>
        </div>
      ) : null}

      {/* --- v0.63: el panel de enfrentamiento --- */}
      <div
        className="vs-panel vs-panel-ronda" data-tipo="torneo" data-familia={familia}
        data-gana={ganaPanel}
        style={{ "--ca": jugador?.color ?? "var(--info)", "--cb": rivalDelGrupo?.color ?? "var(--loss)" } as React.CSSProperties}
      >
        <div className="vs-lado vs-a">
          <span className="vs-aro"><Avatar player={jugador} size="lg" /></span>
          <span className="vs-nombre" title={jugador?.name}>{jugador?.name ?? tr(lng, "v63.tu")}</span>
        </div>
        <div className="vs-centro">
          {mode === "games" && gameWinners.some(Boolean) ? (
            <span className="vs-marcador tabular">{won}<span className="vs-dos-puntos">:</span>{lost}</span>
          ) : (
            <span className="vs-marcador">VS</span>
          )}
          <span className="vs-etiqueta">{trf(lng, "cinta.ronda", { n: round })} · Bo{bestOf}</span>
        </div>
        <div className="vs-lado vs-b">
          <span className="vs-aro"><Avatar player={rivalAvatar} size="lg" /></span>
          <span className="vs-nombre" title={rivalName}>{rivalName.trim() || tr(lng, "x.dca34e30")}</span>
        </div>
      </div>

      {/* --- resultado: rápido o juego a juego --- */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="label flex items-center gap-1.5"><ObjetoSprite uso="resultado" className="size-5" />{tr(lng, "x.c7589dbf")}</span>
          <div className="seg">
            <button type="button" data-on={mode === "quick"} onClick={() => setMode("quick")}>{tr(lng, "x.778dc9d0")}</button>
            <button type="button" data-on={mode === "games"} onClick={() => setMode("games")}>{tr(lng, "x.d7d79088")}</button>
          </div>
        </div>

        {mode === "quick" ? (
          <>
            <input type="hidden" name="result" value={result} />
            {/* En modo rápido solo se apunta quién empezó el primer juego, que
                es el que se recuerda: lo decidió la moneda. */}
            <input type="hidden" name="g0_first" value={firsts[0] ?? ""} />
            <div className="seg w-full">
              {RESULTS.map((r) => (
                <button
                  key={r.v} type="button" className={r.cls}
                  data-on={result === r.v}
                  onClick={() => setResult(result === r.v ? "" : r.v)}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="label">{tr(lng, "x.60f320e3")}</span>
              <div className="seg w-full">
                {([["a", "1.º"], ["b", "2.º"], ["", tr(lng, "x.145e7fbe")]] as const).map(([v, label]) => (
                  <button
                    key={v || "none"} type="button"
                    data-on={(firsts[0] ?? "") === v}
                    onClick={() => setFirsts((f) => f.map((x, k) => (k === 0 ? v : x)))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {!result && (
              <p className="text-xs text-muted">
                {tr(lng, "x.ef502bd1")}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3">
            {Array.from({ length: visibleGames }, (_, i) => (
              <div key={i} className="rounded-lg border border-line-soft bg-surface p-2.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="w-14 flex-none font-display text-sm font-bold text-muted">
                    Juego {i + 1}
                  </span>
                  <div className="seg min-w-0 flex-1">
                    {RESULTS.map((r) => (
                      <button
                        key={r.v} type="button" className={r.cls}
                        data-on={gameWinners[i] === r.v}
                        onClick={() => setGameWinner(i, r.v)}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quién salió primero, en este juego. */}
                <div className="flex items-center gap-2">
                  <span className="w-14 flex-none text-[11px] font-semibold text-muted">{tr(lng, "x.60f320e3")}</span>
                  <div className="seg min-w-0 flex-1 text-[13px]">
                    {([["a", "1.º"], ["b", "2.º"], ["", "—"]] as const).map(([v, label]) => (
                      <button
                        key={v || "none"} type="button"
                        data-on={(firsts[i] ?? "") === v}
                        onClick={() => setFirst(i, v)}
                        aria-label={`Juego ${i + 1}: salí ${label}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* v0.30 — premios cogidos y penalización. "a" eres tú:
                    las rondas de torneo se apuntan siempre desde tu lado. */}
                <PrizePicker
                  campo={`g${i}`}
                  nombreA="Tú"
                  nombreB={rivalName || tr(lng, "x.dca34e30")}
                  winner={gameWinners[i]}
                  valor={premios[i]}
                  colorA={jugador?.color}
                  colorB={rivalDelGrupo?.color}
                  onChange={(parcial) => setPremio(i, parcial)}
                />

                <input type="hidden" name={`g${i}_winner`} value={gameWinners[i]} />
                <input type="hidden" name={`g${i}_first`} value={firsts[i] ?? ""} />
              </div>
            ))}

            {!settled && !decidedByTie && gameWinners.some(Boolean) && (
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox" name="timeCalled" className="size-4"
                  checked={timeCalled} onChange={(e) => setTimeCalled(e.target.checked)}
                />
                Se acabó el tiempo: la ronda queda {won > lost ? "ganada" : lost > won ? "perdida" : tr(lng, "x.4b560f59")}
              </label>
            )}
            <p className="text-xs text-muted">
              {settled
                ? `Ronda ${won > lost ? "ganada" : "perdida"} ${won}–${lost}.`
                : decidedByTie
                  ? `Un juego empatado corta la ronda aquí: queda ${won > lost ? "ganada" : lost > won ? "perdida" : tr(lng, "x.4b560f59")} ${won}–${lost}.`
                  : gameWinners.some(Boolean)
                    ? `${won}–${lost} y todavía sin decidir. Marca «se acabó el tiempo» si la ronda terminó así.`
                    : tr(lng, "x.f02bae59")}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor={`note-${round}`}>{tr(lng, "x.1a6b7be7")}</label>
        <input
          className="input" id={`note-${round}`} name="note" maxLength={300}
          defaultValue={m?.note ?? ""} placeholder={tr(lng, "x.63c4669d")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-brand btn-gamer min-w-40 flex-1" type="submit">
          <ObjetoSprite uso="guardar" className="size-5" />
          {existing ? tr(lng, "v63.guardarCambios") : trf(lng, "v63.guardarRonda", { n: round })}
        </button>
        {onCancel && (
          <button className="btn btn-ghost" type="button" onClick={onCancel}>{tr(lng, "x.c111e0ab")}</button>
        )}
      </div>

      {/* v0.15.1 — el drop, aquí mismo: en vez de apuntar la ronda siguiente,
          «me retiro». `formNoValidate` para que no pida el nombre del rival,
          y `formAction` para que vaya a otra acción con el mismo formulario
          (torneo y jugador ya viajan como campos ocultos). */}
      {!existing && (
        <div className="flex items-center gap-3 border-t border-line-soft pt-3">
          <p className="min-w-0 flex-1 text-xs text-muted">
            {tr(lng, "x.08a74cb2")}
          </p>
          <button
            type="submit" formAction={dropFromTournament} formNoValidate
            className="btn btn-sm flex-none border-loss/50 font-bold text-loss hover:bg-loss-soft"
            onClick={(e) => {
              if (!window.confirm(tr(lng, "x.498ac1c5"))) e.preventDefault();
            }}
          >
            {tr(lng, "x.2480c0fe")}
          </button>
        </div>
      )}
    </form>
  );
}
