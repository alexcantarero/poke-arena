"use client";

import { useMemo, useState } from "react";
import { deleteDeck, saveDeck } from "@/actions";
import { parseDeckList, suggestArchetype, validateDeck } from "@/lib/decklist";
import { pokeSlug, prettyPokemon, spriteUrl, TYPES, TYPE_KEYS } from "@/lib/pokemon";
import type { Archetype, Deck, PublicPlayer } from "@/lib/types";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

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
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

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

  const allPokemon = useMemo(() => {
    const set = new Set<string>();
    for (const a of archetypes) {
      if (a.main) set.add(a.main);
      if (a.secondary) set.add(a.secondary);
    }
    return Array.from(set).sort();
  }, [archetypes]);

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
            <span className="label">{tr(lng, "x.b58a509a")}</span>
            <div className="seg w-full">
              <button type="button" data-on={scope === "mine"} onClick={() => setScope("mine")}>{tr(lng, "x.a46e13bd")}</button>
              <button type="button" data-on={scope === "shared"} onClick={() => setScope("shared")}>{tr(lng, "x.3d779469")}</button>
            </div>
            <p className="text-sm text-muted">
              <b>{tr(lng, "x.a46e13bd")}</b> es el mazo que juegas tú; <b>{tr(lng, "x.2dfa04f2")}</b> {tr(lng, "x.f6e1613f")}
            </p>
          </div>

          {canPickPlayer && scope === "mine" && (
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="playerId">{tr(lng, "x.588eb828")}</label>
              <select className="input" id="playerId" name="playerId" defaultValue={deck?.playerId ?? defaultPlayerId}>
                {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="name">{tr(lng, "x.4de20b4b")}</label>
            <input className="input" id="name" name="name" defaultValue={deck?.name ?? ""} placeholder={tr(lng, "x.59a6e309")} />
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-1 text-lg font-bold">{tr(lng, "x.92fdb4c1")}</h2>
        <p className="mb-4 text-sm text-muted">{tr(lng, "x.128a3c0d")}</p>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="main">{tr(lng, "x.e31f5d45")}</label>
              <input className="input" id="main" name="main" value={main}
                onChange={(e) => { setMain(e.target.value); setReuse(""); }}
                list="pkmn-list"
                placeholder={tr(lng, "x.19a607ba")} autoCapitalize="none" spellCheck={false} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="secondary">{tr(lng, "x.ed30ea2b")}</label>
              <input className="input" id="secondary" name="secondary" value={secondary}
                onChange={(e) => { setSecondary(e.target.value); setReuse(""); }}
                list="pkmn-list"
                placeholder={tr(lng, "x.f85ebde6")} autoCapitalize="none" spellCheck={false} />
            </div>

            <datalist id="pkmn-list">
              {allPokemon.map(p => <option key={p} value={p}>{prettyPokemon(p)}</option>)}
            </datalist>
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
            <span className="min-w-0 flex-1 truncate font-semibold">{previewName || tr(lng, "x.f8e80533")}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="type">{tr(lng, "x.6cc6198d")}</label>
              <select className="input" id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPE_KEYS.map((k) => <option key={k} value={k}>{TYPES[k].name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="reuse">{tr(lng, "x.6b97f816")}</label>
              <select className="input" id="reuse" value={reuse} onChange={(e) => pickExisting(e.target.value)}>
                <option value="">{tr(lng, "x.fc6e5740")}</option>
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
        <p className="mb-4 text-sm text-muted">{tr(lng, "x.51e75e90")}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="liveWins">{tr(lng, "x.dce1e265")}</label>
            <input className="input" id="liveWins" name="liveWins" type="number" min="0" defaultValue={deck?.liveWins ?? 0} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="liveLosses">{tr(lng, "x.a80f28ed")}</label>
            <input className="input" id="liveLosses" name="liveLosses" type="number" min="0" defaultValue={deck?.liveLosses ?? 0} />
          </div>
        </div>
      </section>

      <section className="card p-4">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="list">{tr(lng, "x.334344b7")}</label>
          <p className="text-sm text-muted">
            {tr(lng, "x.1efd3453")} <b>{tr(lng, "x.5e7dd13b")}</b> {tr(lng, "x.8f71907a")}
          </p>
          <textarea
            className="input mt-1" id="list" name="list" value={list} onChange={(e) => setList(e.target.value)}
            placeholder={"Pokémon: 14\n3 Dragapult ex TWM 130\n…"}
          />
        </div>

        {/* v0.59 — comentarios de la lista */}
        <div className="mt-4">
          <label className="label" htmlFor="notes">{tr(lng, "dk.notas")}</label>
          <p className="text-xs text-muted">{tr(lng, "dk.notasAyuda")}</p>
          <textarea className="input mt-1 min-h-24" id="notes" name="notes" maxLength={2000}
            defaultValue={deck?.notes ?? ""} placeholder={tr(lng, "dk.notasEjemplo")} />
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
                const label = k === "pokemon" ? "Pokémon" : k === "trainer" ? "Entrenador" : tr(lng, "x.0ac5b9db");
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
        {tr(lng, "x.0c77e31c")}
      </label>

      <div className="flex gap-2">
        <button className="btn btn-brand flex-1" type="submit">{deck ? "Guardar" : tr(lng, "x.38545810")}</button>
        {deck && (
          <button className="btn btn-danger" type="submit" formAction={deleteDeck} name="id" value={deck.id}>{tr(lng, "x.d7b82b21")}</button>
        )}
      </div>
    </form>
  );
}
