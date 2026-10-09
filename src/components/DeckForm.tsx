"use client";

import { useMemo, useState } from "react";
import { deleteDeck, saveDeck } from "@/actions";
import { parseDeckList, suggestArchetype, validateDeck } from "@/lib/decklist";
import { pokeSlug, prettyPokemon, spriteUrl, TYPES, TYPE_KEYS } from "@/lib/pokemon";
import type { Archetype, Deck, PublicPlayer } from "@/lib/types";

export function DeckForm({
  deck, players, archetypes, defaultPlayerId, canPickPlayer, back,
}: {
  deck?: Deck & { archetype?: Archetype };
  players: PublicPlayer[];
  archetypes: Archetype[];
  defaultPlayerId?: string;
  canPickPlayer?: boolean;
  /** A dónde volver al guardar. Crear un mazo suele ser un desvío. */
  back?: string;
}) {
  const [list, setList] = useState(deck?.list ?? "");
  const [main, setMain] = useState(deck?.archetype?.main ?? "");
  const [secondary, setSecondary] = useState(deck?.archetype?.secondary ?? "");
  const [type, setType] = useState(deck?.archetype?.type ?? "colorless");
  const [reuse, setReuse] = useState(deck?.archetypeId ?? "");
  /* De quién es el mazo. Al editar arranca en lo que ya sea la fila: un mazo
     sin dueño es de la biblioteca de la liga, y uno con dueño es de alguien. */
  const [scope, setScope] = useState<"mine" | "shared">(
    deck ? (deck.playerId ? "mine" : "shared") : "mine",
  );

  const parsed = useMemo(() => (list.trim() ? parseDeckList(list) : null), [list]);
  const suggestion = useMemo(() => (parsed ? suggestArchetype(parsed) : null), [parsed]);
  const problems = useMemo(() => (parsed ? validateDeck(parsed) : []), [parsed]);

  const previewName = [main, secondary].filter(Boolean).map((v) => prettyPokemon(pokeSlug(v))).join(" / ");

  function pickExisting(id: string) {
    setReuse(id);
    const a = archetypes.find((x) => x.id === id);
    if (a) { setMain(a.main); setSecondary(a.secondary); setType(a.type); }
  }

  return (
    <form action={saveDeck} className="flex flex-col gap-4">
      {deck && <input type="hidden" name="id" value={deck.id} />}
      {deck && <input type="hidden" name="created" value={deck.created} />}
      {back && <input type="hidden" name="back" value={back} />}
      <input type="hidden" name="scope" value={scope} />

      <section className="card p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="label">De quién es</span>
            <div className="seg w-full">
              <button type="button" data-on={scope === "mine"} onClick={() => setScope("mine")}>Mío</button>
              <button type="button" data-on={scope === "shared"} onClick={() => setScope("shared")}>De la liga</button>
            </div>
            <p className="text-sm text-muted">
              <b>Mío</b> es el mazo que juegas tú; <b>de la liga</b> no es de nadie y lo puede elegir
              cualquiera, que es lo que hace falta para apuntar el mazo que llevaba un rival.
            </p>
          </div>

          {canPickPlayer && scope === "mine" && (
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="playerId">Jugador</label>
              <select className="input" id="playerId" name="playerId" defaultValue={deck?.playerId ?? defaultPlayerId}>
                {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="name">Nombre del mazo</label>
            <input className="input" id="name" name="name" defaultValue={deck?.name ?? ""} placeholder="Dragapult control" />
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-1 text-lg font-bold">Arquetipo</h2>
        <p className="mb-4 text-sm text-muted">Es lo que agrupa todas las estadísticas.</p>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="main">Pokémon principal</label>
              <input className="input" id="main" name="main" value={main}
                onChange={(e) => { setMain(e.target.value); setReuse(""); }}
                placeholder="dragapult" autoCapitalize="none" spellCheck={false} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="secondary">Secundario</label>
              <input className="input" id="secondary" name="secondary" value={secondary}
                onChange={(e) => { setSecondary(e.target.value); setReuse(""); }}
                placeholder="opcional" autoCapitalize="none" spellCheck={false} />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-ground p-3">
            <span className="flex flex-none items-center">
              {[main, secondary].filter(Boolean).length
                ? [main, secondary].filter(Boolean).map((s, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={s} src={spriteUrl(s)} alt="" className={`size-10 object-contain ${i ? "-ml-3" : ""}`} />
                  ))
                : <span className="grid size-10 place-items-center rounded-full bg-surface-3 text-muted">?</span>}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">{previewName || "Sin arquetipo"}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="type">Tipo</label>
              <select className="input" id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPE_KEYS.map((k) => <option key={k} value={k}>{TYPES[k].name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="reuse">O uno existente</label>
              <select className="input" id="reuse" value={reuse} onChange={(e) => pickExisting(e.target.value)}>
                <option value="">— nuevo —</option>
                {archetypes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <input type="hidden" name="archetypeId" value={reuse} />
          <input type="hidden" name="archetypeName" value={previewName} />
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-1 text-lg font-bold">PTCG Live</h2>
        <p className="mb-4 text-sm text-muted">Apunta manualmente cuántas partidas has ganado y perdido con este mazo en el juego online para que salgan en Estadísticas.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="liveWins">Victorias</label>
            <input className="input" id="liveWins" name="liveWins" type="number" min="0" defaultValue={deck?.liveWins ?? 0} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="liveLosses">Derrotas</label>
            <input className="input" id="liveLosses" name="liveLosses" type="number" min="0" defaultValue={deck?.liveLosses ?? 0} />
          </div>
        </div>
      </section>

      <section className="card p-4">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="list">Lista completa</label>
          <p className="text-sm text-muted">
            Pega la exportación de <b>Pokémon TCG Live</b> o de Limitless. También vale el formato antiguo de PTCGO.
          </p>
          <textarea
            className="input mt-1" id="list" name="list" value={list} onChange={(e) => setList(e.target.value)}
            placeholder={"Pokémon: 14\n3 Dragapult ex TWM 130\n…"}
          />
        </div>

        {parsed && (
          <div className="mt-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`chip ${parsed.total === 60 ? "chip-win" : "chip-loss"}`}>{parsed.total} cartas</span>
              {suggestion?.main && (
                <button
                  type="button" className="btn btn-sm"
                  onClick={() => { setMain(suggestion.main); setSecondary(suggestion.secondary); setReuse(""); }}
                >
                  Usar {prettyPokemon(suggestion.main)}{suggestion.secondary ? ` / ${prettyPokemon(suggestion.secondary)}` : ""}
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["pokemon", "trainer", "energy"] as const).map((k) => {
                const cards = parsed[k];
                const n = cards.reduce((a, c) => a + c.n, 0);
                const label = k === "pokemon" ? "Pokémon" : k === "trainer" ? "Entrenador" : "Energía";
                return (
                  <div key={k}>
                    <div className="flex items-baseline justify-between">
                      <b className="font-display">{label}</b>
                      <span className="font-mono text-sm tabular">{n}</span>
                    </div>
                    <div className="mt-1 max-h-40 overflow-auto rounded-lg bg-ground p-2 font-mono text-xs leading-relaxed">
                      {cards.length
                        ? cards.map((c, i) => <div key={i} className="truncate">{c.n} {c.name}</div>)
                        : <span className="text-muted">—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {problems.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-sm text-loss">
                {problems.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            )}
          </div>
        )}
      </section>

      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="retired" className="size-4" defaultChecked={deck?.retired ?? false} />
        Retirado (no aparece al registrar partidas)
      </label>

      <div className="flex gap-2">
        <button className="btn btn-brand flex-1" type="submit">{deck ? "Guardar" : "Crear mazo"}</button>
        {deck && (
          <button className="btn btn-danger" type="submit" formAction={deleteDeck} name="id" value={deck.id}>Borrar</button>
        )}
      </div>
    </form>
  );
}
