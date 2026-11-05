import type { ReactNode } from "react";
import Link from "next/link";
import { ordenarCruce, resumenCruce, type PartidaCruce } from "@/lib/cruces";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/* =========================================================================
   v0.108 — El panel del cruce: las partidas concretas de una celda de la
   matriz. Lo pinta el servidor debajo de la matriz cuando hay `?cruce=`.
   ========================================================================= */

const TONO = { w: "text-win", l: "text-loss", t: "text-tie" } as const;

export async function CrucePanel({ titulo, filas, cerrar, vacio }: {
  titulo: ReactNode; filas: PartidaCruce[]; cerrar: string; vacio?: string;
}) {
  const lng = await getLang();
  const r = resumenCruce(filas);
  const lista = ordenarCruce(filas);
  return (
    <section id="cruce" className="scroll-mt-20 border-t border-line-soft bg-surface-2/50 p-3 xs:p-4" aria-live="polite">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 font-display text-base font-bold">{titulo}</h3>
        <span className="font-mono text-sm tabular">
          <b className="text-win">{r.w}</b>–<span className="text-loss">{r.l}</span>{r.t ? <>–<span className="text-tie">{r.t}</span></> : null}
        </span>
        <Link href={cerrar} scroll={false} className="btn btn-ghost btn-sm" aria-label={tr(lng, "cruce.cerrar")}>✕</Link>
      </div>
      {lista.length ? (
        <ol className="card divide-y divide-line-soft">
          {lista.map((p) => {
            const cuerpo = (
              <>
                <span className={`grid size-7 flex-none place-items-center rounded-full bg-surface-2 font-display text-xs font-black ${p.resultado ? TONO[p.resultado] : "text-muted"}`}>
                  {p.resultado ? tr(lng, `cruce.r.${p.resultado}`) : "·"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.contexto}</span>
                  {p.detalle && <span className="block truncate text-xs text-muted">{p.detalle}</span>}
                </span>
                {p.marcador && <span className="flex-none font-mono text-sm tabular">{p.marcador}</span>}
                <span className="flex-none font-mono text-[11px] tabular text-muted">{p.fecha}</span>
              </>
            );
            return (
              <li key={p.id}>
                {p.href
                  ? <Link href={p.href} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2">{cuerpo}</Link>
                  : <div className="flex items-center gap-3 px-3 py-2.5">{cuerpo}</div>}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted">{vacio ?? tr(lng, "cruce.vacio")}</p>
      )}
      <p className="mt-2 text-[11px] text-muted">{trf(lng, "cruce.pie", { n: r.total })}</p>
    </section>
  );
}
