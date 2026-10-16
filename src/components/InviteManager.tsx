"use client";

import { useState } from "react";
import type { Invite } from "@/lib/types";
import { createInvite, revokeInvite } from "@/actions";
import { Icon } from "./icons";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

export function InviteManager({ invites }: { invites: Invite[] }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

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
      window.prompt(tr(lng, "x.5b5a829d"), url);
    }
  }

  async function share(token: string) {
    const url = linkFor(token);
    if (navigator.share) {
      try { await navigator.share({ title: tr(lng, "x.a7a823a6"), url }); return; } catch { /* cancelado */ }
    }
    copy(token);
  }

  const live = invites.filter((i) => !i.revoked && (i.maxUses === 0 || i.uses < i.maxUses));
  const dead = invites.filter((i) => !live.includes(i));

  return (
    <section className="card mb-6">
      <div className="card-head">
        <h2 className="text-lg font-bold">{tr(lng, "x.31090bbf")}</h2>
        <button className="btn btn-sm" type="button" onClick={() => setOpen((o) => !o)}>
          {open ? "Cerrar" : tr(lng, "x.47a1ddc9")}
        </button>
      </div>

      {open && (
        <form action={createInvite} className="grid gap-3 border-b border-line-soft p-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="label" htmlFor="i-label">{tr(lng, "x.e3eda04c")}</label>
            <input className="input" id="i-label" name="label" placeholder={tr(lng, "x.5a7dd05a")} maxLength={40} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="i-uses">{tr(lng, "x.09ad1a3e")}</label>
            <select className="input" id="i-uses" name="maxUses" defaultValue="1">
              <option value="1">{tr(lng, "x.a5932ae1")}</option>
              <option value="5">{tr(lng, "x.7f857837")}</option>
              <option value="0">{tr(lng, "x.a3920279")}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="i-days">{tr(lng, "x.e7855eeb")}</label>
            <select className="input" id="i-days" name="days" defaultValue="14">
              <option value="1">{tr(lng, "x.35cec753")}</option>
              <option value="14">{tr(lng, "x.28310dfa")}</option>
              <option value="90">{tr(lng, "x.a64b09d3")}</option>
              <option value="0">{tr(lng, "x.f951a995")}</option>
            </select>
          </div>
          <input type="hidden" name="role" value="player" />
          <button className="btn btn-brand sm:col-span-4" type="submit">{tr(lng, "x.8a26b573")}</button>
        </form>
      )}

      {live.length ? (
        <ul className="divide-y divide-line-soft">
          {live.map((i) => (
            <li key={i.token} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{i.label || tr(lng, "x.73422bb2")}</span>
                <span className="block text-xs text-muted">
                  {i.maxUses === 0 ? "usos ilimitados" : `${i.uses}/${i.maxUses} usos`}
                  {i.expiresAt ? ` · caduca el ${new Date(i.expiresAt).toLocaleDateString("es-ES")}` : " · sin caducidad"}
                </span>
              </span>
              <button className="btn btn-sm" type="button" onClick={() => copy(i.token)}>
                {copied === i.token ? <><Icon name="check" className="size-4" /> {tr(lng, "x.9e417050")}</> : "Copiar"}
              </button>
              <button className="btn btn-brand btn-sm" type="button" onClick={() => share(i.token)}>
                <Icon name="share" className="size-4" /> {tr(lng, "x.a91a9551")}
              </button>
              <form action={revokeInvite}>
                <input type="hidden" name="token" value={i.token} />
                <button className="btn btn-ghost btn-sm text-loss" type="submit" title={tr(lng, "x.5b4de74e")}>×</button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-muted">
          {tr(lng, "x.4460df97")}
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
                {i.label || tr(lng, "x.73422bb2")} · {i.revoked ? "anulada" : "agotada"}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
