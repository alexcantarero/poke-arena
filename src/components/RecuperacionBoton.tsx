"use client";

import { useActionState, useState } from "react";
import { crearEnlaceRecuperacion } from "@/actions";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* v0.67 — En Ajustes → Jugadores: crear el enlace de recuperación de una
   persona. El enlace se enseña AQUÍ y una sola vez (en la base solo queda su
   hash), con botones para copiarlo o compartirlo. Ni va en la URL ni en un
   aviso, para que no se quede en el historial. */
export function RecuperacionBoton({ playerId, nombre }: { playerId: string; nombre: string }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const [state, action, pending] = useActionState(crearEnlaceRecuperacion, null);
  const [copiado, setCopiado] = useState(false);
  const enlace = state?.enlace && typeof window !== "undefined" ? `${window.location.origin}${state.enlace}` : null;

  const copiar = async () => {
    if (!enlace) return;
    try { await navigator.clipboard.writeText(enlace); setCopiado(true); } catch { /* sin permiso: queda el texto seleccionable */ }
  };
  const compartir = async () => {
    if (!enlace) return;
    try { await navigator.share({ title: tr(lng, "rec.compartirTitulo"), text: trf(lng, "rec.compartirTexto", { n: nombre }), url: enlace }); }
    catch { /* cancelado o no disponible */ }
  };

  return (
    <div className="w-full">
      {!enlace && (
        <form action={action} className="inline">
          <input type="hidden" name="id" value={playerId} />
          <button className="btn btn-ghost btn-sm" type="submit" disabled={pending}
            onClick={(e) => { if (!window.confirm(trf(lng, "rec.confirmar", { n: nombre }))) e.preventDefault(); }}>
            {pending ? tr(lng, "rec.creando") : tr(lng, "rec.crear")}
          </button>
          {state?.error && <span className="ml-2 text-xs text-loss">{state.error}</span>}
        </form>
      )}
      {enlace && (
        <div className="mt-1 flex flex-col gap-2 rounded-lg border border-info/40 bg-info-soft/40 p-2.5">
          <p className="text-xs text-ink-2">{trf(lng, "rec.listo", { n: nombre })}</p>
          <input className="input font-mono text-xs" readOnly value={enlace} onFocus={(e) => e.currentTarget.select()} aria-label={tr(lng, "rec.enlace")} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-brand btn-sm" onClick={copiar}>{copiado ? tr(lng, "rec.copiado") : tr(lng, "rec.copiar")}</button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button type="button" className="btn btn-sm" onClick={compartir}>{tr(lng, "rec.compartir")}</button>
            )}
          </div>
          <p className="text-[11px] text-muted">{tr(lng, "rec.avisoUnaVez")}</p>
        </div>
      )}
    </div>
  );
}
