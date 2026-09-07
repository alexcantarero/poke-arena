"use client";

import { useState } from "react";
import { savePlayer, deletePlayer } from "@/actions";
import type { Deck, Player } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { Avatar } from "./ui";

const COLORS = ["#f0b429", "#4aa8e8", "#63bd5a", "#e987b8", "#b271c9", "#f0803c", "#9aa6b4", "#c8a94a", "#5c9ea8", "#d4675f"];

export function PlayerEditor({
  players, counts, decks,
}: { players: Player[]; counts: Record<string, number>; decks: Deck[] }) {
  const [editing, setEditing] = useState<Player | null>(null);
  const [creating, setCreating] = useState(false);
  const target = editing ?? null;
  const [color, setColor] = useState(COLORS[0]);

  function startEdit(p: Player) {
    setEditing(p); setCreating(false); setColor(p.color);
  }
  function startCreate() {
    setEditing(null); setCreating(true); setColor(COLORS[players.length % COLORS.length]);
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Jugadores</h2>
        <button className="btn btn-sm" type="button" onClick={startCreate}>+ Jugador</button>
      </div>

      <ul className="list-plain">
        {players.map((p) => (
          <li key={p.id}>
            <Avatar player={p} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>
                {p.name} {p.isAdmin && <span className="chip g">org.</span>}{" "}
                {!p.active && <span className="chip">inactivo</span>}
                {p.pin && <span className="chip b">PIN</span>}
              </div>
              <div className="hint">
                {counts[p.id] ?? 0} partidas · {decks.filter((d) => d.playerId === p.id).length} mazos
              </div>
            </div>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => startEdit(p)}>Editar</button>
          </li>
        ))}
        {players.length === 0 && <li><span className="hint">Añade a tus amigos.</span></li>}
      </ul>

      {(creating || target) && (
        <div className="card-pad" style={{ borderTop: "1px solid var(--line)" }}>
          <form action={savePlayer} className="stack" style={{ gap: 12 }}>
            {target && <input type="hidden" name="id" value={target.id} />}
            <div className="eyebrow">{target ? `Editando a ${target.name}` : "Nuevo jugador"}</div>
            <div className="grid g-2" style={{ gap: 10 }}>
              <div className="field">
                <label htmlFor="p-name">Nombre</label>
                <input className="inp" id="p-name" name="name" required defaultValue={target?.name ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="p-joined">Alta</label>
                <input className="inp" id="p-joined" name="joined" type="date" defaultValue={target?.joined ?? todayISO()} />
              </div>
            </div>
            <div className="field">
              <label>Color</label>
              <div className="row" style={{ gap: 6 }}>
                {COLORS.map((c) => (
                  <button
                    key={c} type="button" aria-label={c} onClick={() => setColor(c)}
                    className="btn btn-sm"
                    style={{ background: c, width: 30, height: 26, padding: 0, borderColor: color === c ? "var(--text)" : c }}
                  />
                ))}
              </div>
              <input type="hidden" name="color" value={color} />
            </div>
            <div className="field">
              <label htmlFor="p-pin">PIN (opcional)</label>
              <input className="inp" id="p-pin" name="pin" defaultValue={target?.pin ?? ""} placeholder="Déjalo vacío si no hace falta" />
              <div className="hint">Si lo pones, habrá que teclearlo para entrar como este jugador.</div>
            </div>
            <div className="row" style={{ gap: 16 }}>
              <label className="check">
                <input type="checkbox" name="isAdmin" defaultChecked={target?.isAdmin ?? false} /> Organizador
              </label>
              <label className="check">
                <input type="checkbox" name="active" defaultChecked={target?.active ?? true} /> Activo en el ranking
              </label>
            </div>
            <div className="row">
              <button className="btn btn-gold" type="submit">Guardar</button>
              <button className="btn" type="button" onClick={() => { setEditing(null); setCreating(false); }}>Cancelar</button>
              {target && (
                <button className="btn btn-danger" type="submit" formAction={deletePlayer} name="id" value={target.id}>
                  Borrar
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
