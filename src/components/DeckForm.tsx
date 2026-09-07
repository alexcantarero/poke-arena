"use client";

import { useMemo, useState } from "react";
import { saveDeck, deleteDeck } from "@/actions";
import { parseDeckList, suggestArchetype, validateDeck } from "@/lib/decklist";
import { TYPE_KEYS, TYPES, pokeSlug, prettyPokemon } from "@/lib/pokemon";
import type { Archetype, Deck, Player } from "@/lib/types";
import { Sprites } from "./ui";

export function DeckForm({
  deck, players, archetypes, defaultPlayerId,
}: {
  deck?: Deck & { archetype?: Archetype };
  players: Player[];
  archetypes: Archetype[];
  defaultPlayerId?: string;
}) {
  const [list, setList] = useState(deck?.list ?? "");
  const [main, setMain] = useState(deck?.archetype?.main ?? "");
  const [secondary, setSecondary] = useState(deck?.archetype?.secondary ?? "");
  const [type, setType] = useState(deck?.archetype?.type ?? "colorless");
  const [reuse, setReuse] = useState(deck?.archetypeId ?? "");

  const parsed = useMemo(() => (list.trim() ? parseDeckList(list) : null), [list]);
  const suggestion = useMemo(() => (parsed ? suggestArchetype(parsed) : null), [parsed]);
  const problems = useMemo(() => (parsed ? validateDeck(parsed) : []), [parsed]);

  const preview: Archetype = {
    id: "preview",
    name: [main, secondary].filter(Boolean).map((v) => prettyPokemon(pokeSlug(v))).join(" / ") || "Sin arquetipo",
    main, secondary, type, limitlessId: null,
  };

  function applySuggestion() {
    if (!suggestion) return;
    setMain(suggestion.main);
    setSecondary(suggestion.secondary);
    setReuse("");
  }

  function pickExisting(id: string) {
    setReuse(id);
    const a = archetypes.find((x) => x.id === id);
    if (a) { setMain(a.main); setSecondary(a.secondary); setType(a.type); }
  }

  return (
    <form action={saveDeck} className="stack">
      {deck && <input type="hidden" name="id" value={deck.id} />}
      {deck && <input type="hidden" name="created" value={deck.created} />}

      <div className="card card-pad">
        <div className="grid g-2" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="playerId">Jugador</label>
            <select className="inp" id="playerId" name="playerId" defaultValue={deck?.playerId ?? defaultPlayerId ?? players[0]?.id}>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="name">Nombre del mazo</label>
            <input className="inp" id="name" name="name" defaultValue={deck?.name ?? ""} placeholder="Dragapult control" />
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="eyebrow" style={{ marginBottom: 9 }}>
          Arquetipo — es lo que agrupa las estadísticas
        </div>
        <div className="grid g-3" style={{ gap: 10 }}>
          <div className="field">
            <label htmlFor="main">Pokémon principal</label>
            <input className="inp" id="main" name="main" value={main} onChange={(e) => { setMain(e.target.value); setReuse(""); }} placeholder="dragapult" list="pklist" />
          </div>
          <div className="field">
            <label htmlFor="secondary">Pokémon secundario</label>
            <input className="inp" id="secondary" name="secondary" value={secondary} onChange={(e) => { setSecondary(e.target.value); setReuse(""); }} placeholder="opcional" list="pklist" />
          </div>
          <div className="field">
            <label htmlFor="type">Tipo (color)</label>
            <select className="inp" id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPE_KEYS.map((k) => <option key={k} value={k}>{TYPES[k].name}</option>)}
            </select>
          </div>
        </div>

        <datalist id="pklist">
          {archetypes.flatMap((a) => [a.main, a.secondary]).filter(Boolean)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .map((v) => <option key={v} value={v} />)}
        </datalist>

        <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <div className="row" style={{ gap: 8 }}>
            <Sprites archetype={preview} />
            <b>{preview.name}</b>
          </div>
          <div className="field" style={{ minWidth: 220 }}>
            <label htmlFor="reuse">O reutiliza uno existente</label>
            <select className="inp" id="reuse" value={reuse} onChange={(e) => pickExisting(e.target.value)}>
              <option value="">— crear arquetipo nuevo —</option>
              {archetypes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <input type="hidden" name="archetypeId" value={reuse} />
        <input type="hidden" name="archetypeName" value={preview.name} />
      </div>

      <div className="card card-pad">
        <div className="field">
          <label htmlFor="list">Lista completa (opcional)</label>
          <div className="hint" style={{ marginBottom: 5 }}>
            Pega la exportación de <b>Pokémon TCG Live</b> (botón Exportar) o de Limitless
            (Compartir → Copiar como texto). También se entiende el formato antiguo de PTCGO.
          </div>
          <textarea
            className="inp"
            id="list"
            name="list"
            value={list}
            onChange={(e) => setList(e.target.value)}
            placeholder={"Pokémon: 14\n3 Dragapult ex TWM 130\n…"}
          />
        </div>

        {parsed && (
          <div style={{ marginTop: 14 }}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 9 }}>
              <div className="eyebrow">Lista interpretada</div>
              <div className="row">
                <span className={`chip ${parsed.total === 60 ? "w" : "l"}`}>{parsed.total} cartas</span>
                {suggestion?.main && (
                  <button type="button" className="btn btn-sm" onClick={applySuggestion}>
                    Usar {prettyPokemon(suggestion.main)}
                    {suggestion.secondary ? ` / ${prettyPokemon(suggestion.secondary)}` : ""}
                  </button>
                )}
              </div>
            </div>
            <div className="grid g-3" style={{ gap: 10 }}>
              {(["pokemon", "trainer", "energy"] as const).map((k) => {
                const cards = parsed[k];
                const n = cards.reduce((a, c) => a + c.n, 0);
                const label = k === "pokemon" ? "Pokémon" : k === "trainer" ? "Entrenador" : "Energía";
                return (
                  <div key={k}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <b style={{ fontFamily: "var(--f-display)", fontSize: 15 }}>{label}</b>
                      <span className="num">{n}</span>
                    </div>
                    <div className="dl" style={{ maxHeight: 170, marginTop: 5 }}>
                      {cards.length
                        ? cards.map((c, i) => (
                            <div key={i}>{c.n} {c.name}{c.set ? `  ${c.set} ${c.number}` : ""}</div>
                          ))
                        : <span style={{ color: "var(--muted)" }}>—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {problems.length > 0 && (
              <ul className="hint" style={{ marginTop: 10, paddingLeft: 18, color: "var(--loss)" }}>
                {problems.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="row">
        <button className="btn btn-gold" type="submit">{deck ? "Guardar cambios" : "Crear mazo"}</button>
        {deck && (
          <button className="btn btn-danger" type="submit" formAction={deleteDeck} name="id" value={deck.id}>
            Borrar mazo
          </button>
        )}
      </div>
    </form>
  );
}
