"use client";

import { useMemo, useState } from "react";
import { cartasDe } from "@/lib/versiones";
import { desconocidasDe, probPremios } from "@/lib/premiosProb";
import { pct } from "@/lib/format";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   v0.136 — PREMIOS EN PARTIDA. La calculadora de premios de siempre responde
   «antes de empezar»; esta, «ahora mismo»: eliges tu lista, vas marcando las
   copias que has visto de cada carta (mano, banca, descarte, premios ya
   cogidos) y dice, para cada carta, la probabilidad de que lo que te falta
   esté en los premios que quedan boca abajo (`lib/premiosProb.ts`).
   ========================================================================= */
export function PremiosEnPartida({ mazos }: { mazos: Array<{ id: string; name: string; listJson: unknown }> }) {
  const lng = useLang();
  const [mazoId, setMazoId] = useState(mazos[0]?.id ?? "");
  const [vistas, setVistas] = useState<Record<string, number>>({});
  const [premios, setPremios] = useState(6);
  const mazo = mazos.find((m) => m.id === mazoId);
  const cartas = useMemo(
    () => [...cartasDe(mazo?.listJson as Parameters<typeof cartasDe>[0]).entries()].map(([name, n]) => ({ name, n })),
    [mazo],
  );
  const total = cartas.reduce((a, c) => a + c.n, 0);
  const vistasTotales = cartas.reduce((a, c) => a + Math.min(c.n, vistas[c.name] ?? 0), 0);
  const U = desconocidasDe(total, vistasTotales);
  const P = Math.min(premios, U);
  const filas = cartas
    .map((c) => ({ ...c, v: Math.min(c.n, vistas[c.name] ?? 0), r: probPremios(c.n, vistas[c.name] ?? 0, U, P) }))
    .sort((a, b) => b.r.alguna - a.r.alguna || a.name.localeCompare(b.name, "es"));

  if (!mazos.length) return <p className="card mt-4 p-4 text-sm text-muted">{tr(lng, "v136.pp.sinMazos")}</p>;
  const cambiar = (nombre: string, d: number, max: number) =>
    setVistas((x) => ({ ...x, [nombre]: Math.max(0, Math.min(max, (x[nombre] ?? 0) + d)) }));

  return (
    <section className="card mt-4 p-4" aria-labelledby="pp-titulo">
      <h3 id="pp-titulo" className="font-display text-lg font-bold">{tr(lng, "v136.pp.titulo")}</h3>
      <p className="mb-3 text-sm text-muted">{tr(lng, "v136.pp.explica")}</p>
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <select className="input" value={mazoId} onChange={(e) => { setMazoId(e.target.value); setVistas({}); setPremios(6); }} aria-label={tr(lng, "v136.pp.mazo")}>
          {mazos.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="label">{tr(lng, "v136.pp.premios")}</span>
          <div className="mt-contador w-36">
            <button type="button" disabled={premios <= 0} onClick={() => setPremios((p) => Math.max(0, p - 1))} aria-label="−">−</button>
            <output>{premios}</output>
            <button type="button" disabled={premios >= 6} onClick={() => setPremios((p) => Math.min(6, p + 1))} aria-label="+">+</button>
          </div>
        </div>
      </div>
      <p className="mb-2 text-xs text-muted tabular">
        {trf(lng, "v136.pp.estado", { t: total, v: vistasTotales, u: U, p: P })}
        {vistasTotales > 0 && <button type="button" className="ml-2 underline" onClick={() => setVistas({})}>{tr(lng, "v136.pp.reiniciar")}</button>}
      </p>
      <ul className="divide-y divide-line-soft">
        {filas.map((c) => (
          <li key={c.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.n}× {c.name}</span>
            <div className="mt-contador w-28" role="group" aria-label={trf(lng, "v136.pp.vistasDe", { n: c.name })}>
              <button type="button" disabled={c.v <= 0} onClick={() => cambiar(c.name, -1, c.n)} aria-label="−">−</button>
              <output>{c.v}</output>
              <button type="button" disabled={c.v >= c.n} onClick={() => cambiar(c.name, 1, c.n)} aria-label="+">+</button>
            </div>
            <span className={`w-16 flex-none text-right font-display text-lg font-black tabular ${c.r.alguna >= 0.5 ? "text-loss" : c.r.alguna >= 0.25 ? "text-brand-strong" : ""}`}>
              {c.r.sinVer === 0 ? "—" : pct(c.r.alguna, 0)}
            </span>
            {c.r.sinVer > 0 && c.r.todas >= 0.05 && (
              <span className="basis-full text-xs text-loss">{trf(lng, "v136.pp.muerta", { p: pct(c.r.todas, 0) })}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">{tr(lng, "v136.pp.supuesto")}</p>
    </section>
  );
}
