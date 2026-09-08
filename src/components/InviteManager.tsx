"use client";

import { useState } from "react";
import type { Invite } from "@/lib/types";
import { createInvite, revokeInvite } from "@/actions";
import { Icon } from "./icons";

export function InviteManager({ invites }: { invites: Invite[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [open, setOpen] = useState(invites.length === 0);

  const linkFor = (token: string) =>
    typeof window === "undefined" ? `/registro/${token}` : `${window.location.origin}/registro/${token}`;

  async function copy(token: string) {
    const url = linkFor(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      // Sin portapapeles (http, permisos): al menos que se pueda seleccionar.
      window.prompt("Copia este enlace:", url);
    }
  }

  async function share(token: string) {
    const url = linkFor(token);
    if (navigator.share) {
      try { await navigator.share({ title: "Únete a la liga", url }); return; } catch { /* cancelado */ }
    }
    copy(token);
  }

  const live = invites.filter((i) => !i.revoked && (i.maxUses === 0 || i.uses < i.maxUses));
  const dead = invites.filter((i) => !live.includes(i));

  return (
    <section className="card mb-6">
      <div className="card-head">
        <h2 className="text-lg font-bold">Enlaces de invitación</h2>
        <button className="btn btn-sm" type="button" onClick={() => setOpen((o) => !o)}>
          {open ? "Cerrar" : "Nueva"}
        </button>
      </div>

      {open && (
        <form action={createInvite} className="grid gap-3 border-b border-line-soft p-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="label" htmlFor="i-label">Para quién</label>
            <input className="input" id="i-label" name="label" placeholder="Javi" maxLength={40} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="i-uses">Usos</label>
            <select className="input" id="i-uses" name="maxUses" defaultValue="1">
              <option value="1">1 persona</option>
              <option value="5">5 personas</option>
              <option value="0">Sin límite</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="i-days">Caduca en</label>
            <select className="input" id="i-days" name="days" defaultValue="14">
              <option value="1">1 día</option>
              <option value="14">14 días</option>
              <option value="90">90 días</option>
              <option value="0">Nunca</option>
            </select>
          </div>
          <input type="hidden" name="role" value="player" />
          <button className="btn btn-brand sm:col-span-4" type="submit">Crear enlace</button>
        </form>
      )}

      {live.length ? (
        <ul className="divide-y divide-line-soft">
          {live.map((i) => (
            <li key={i.token} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{i.label || "Invitación"}</span>
                <span className="block text-xs text-muted">
                  {i.maxUses === 0 ? "usos ilimitados" : `${i.uses}/${i.maxUses} usos`}
                  {i.expiresAt ? ` · caduca el ${new Date(i.expiresAt).toLocaleDateString("es-ES")}` : " · sin caducidad"}
                </span>
              </span>
              <button className="btn btn-sm" type="button" onClick={() => copy(i.token)}>
                {copied === i.token ? <><Icon name="check" className="size-4" /> Copiado</> : "Copiar"}
              </button>
              <button className="btn btn-brand btn-sm" type="button" onClick={() => share(i.token)}>
                <Icon name="share" className="size-4" /> Enviar
              </button>
              <form action={revokeInvite}>
                <input type="hidden" name="token" value={i.token} />
                <button className="btn btn-ghost btn-sm text-loss" type="submit" title="Anular">×</button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-muted">
          No hay invitaciones activas. Crea una y mándasela a quien quieras que se apunte.
        </p>
      )}

      {dead.length > 0 && (
        <details className="border-t border-line-soft">
          <summary className="tap cursor-pointer justify-start px-4 text-sm text-muted">
            {dead.length} invitaciones usadas o anuladas
          </summary>
          <ul className="divide-y divide-line-soft border-t border-line-soft">
            {dead.map((i) => (
              <li key={i.token} className="px-4 py-2.5 text-sm text-muted">
                {i.label || "Invitación"} · {i.revoked ? "anulada" : "agotada"}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
