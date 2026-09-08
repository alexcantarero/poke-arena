"use client";

import type { PublicPlayer } from "@/lib/types";
import { deletePlayer, setPlayerActive, setPlayerRole } from "@/actions";
import { Avatar } from "./ui";

const ROLE_LABEL: Record<string, string> = { owner: "Organizador", admin: "Admin", player: "Jugador" };

export function PlayerAdmin({
  players, counts, emails, meId, meRole,
}: {
  players: PublicPlayer[];
  counts: Record<string, number>;
  emails: Record<string, string>;
  meId: string;
  meRole: string;
}) {
  // Tocar al organizador solo puede el organizador. La acción lo comprueba
  // igualmente; aquí es para que el botón no prometa algo que no va a pasar.
  const locked = (p: PublicPlayer) =>
    p.id === meId || (p.role === "owner" && meRole !== "owner");
  return (
    <section className="card mb-6 divide-y divide-line-soft">
      {players.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Avatar player={p} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">
              {p.name}
              {p.id === meId && <span className="ml-1.5 chip chip-info">tú</span>}
              {!p.active && <span className="ml-1.5 chip">inactivo</span>}
            </span>
            <span className="block truncate text-xs text-muted">
              {emails[p.id] ?? "sin correo"} · {counts[p.id] ?? 0} partidas
            </span>
          </span>

          <form action={setPlayerRole} className="flex-none">
            <input type="hidden" name="id" value={p.id} />
            <select
              name="role" defaultValue={p.role} disabled={locked(p)}
              className="input min-h-9 w-auto py-1 text-sm disabled:opacity-50"
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              aria-label={`Papel de ${p.name}`}
            >
              {Object.entries(ROLE_LABEL)
                .filter(([v]) => v !== "owner" || meRole === "owner")
                .map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </form>

          <form action={setPlayerActive} className="flex-none">
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="active" value={p.active ? "false" : "true"} />
            <button className="btn btn-sm" type="submit" disabled={locked(p)}>
              {p.active ? "Desactivar" : "Activar"}
            </button>
          </form>

          {counts[p.id] === 0 && !locked(p) && p.role !== "owner" && (
            <form action={deletePlayer} className="flex-none">
              <input type="hidden" name="id" value={p.id} />
              <button className="btn btn-ghost btn-sm text-loss" type="submit" title="Borrar">×</button>
            </form>
          )}
        </div>
      ))}
      <p className="px-4 py-3 text-xs text-muted">
        Un jugador con partidas no se puede borrar: se desactiva, para no dejar el historial huérfano.
      </p>
    </section>
  );
}
