"use client";

import { useActionState, useState } from "react";
import { enterLeague } from "@/actions";
import type { Player } from "@/lib/types";
import { Avatar } from "./ui";

export function EnterForm({ players, needsCode }: { players: Player[]; needsCode: boolean }) {
  const [state, action, pending] = useActionState(enterLeague, null);
  const [picked, setPicked] = useState(players[0]?.id ?? "");
  const player = players.find((p) => p.id === picked);

  return (
    <form action={action} className="formgrid">
      {needsCode && (
        <div className="field">
          <label htmlFor="code">Código de invitación</label>
          <input className="inp" id="code" name="code" autoComplete="off" placeholder="El que os habéis repartido" />
        </div>
      )}

      <div className="field">
        <label>¿Quién eres?</label>
        <div className="row" style={{ gap: 8 }}>
          {players.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setPicked(p.id)}
              className="chip"
              style={{
                padding: "6px 11px",
                cursor: "pointer",
                borderColor: picked === p.id ? "var(--gold-line)" : "var(--line)",
                background: picked === p.id ? "var(--gold-bg)" : "var(--surface-2)",
                color: picked === p.id ? "var(--gold)" : "var(--text-2)",
              }}
            >
              <Avatar player={p} size="sm" />
              {p.name}
            </button>
          ))}
        </div>
        <input type="hidden" name="playerId" value={picked} />
      </div>

      {player?.pin && (
        <div className="field">
          <label htmlFor="pin">PIN de {player.name}</label>
          <input className="inp" id="pin" name="pin" type="password" autoComplete="off" inputMode="numeric" />
        </div>
      )}

      {state?.error && <div className="err">{state.error}</div>}

      <button className="btn btn-gold" type="submit" disabled={pending || !picked}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
