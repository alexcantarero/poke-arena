import Link from "next/link";
import { getLang } from "@/lib/lang";
import { tr, trf } from "@/lib/i18n";
import { loadConfig } from "@/lib/data";
import { PageHead } from "@/components/ui";

/* v0.55 — Reglas y puntuación.

   Antes era «Cómo se calcula todo», al final de Ajustes: documentación metida
   donde se configuran cosas, y donde nadie la buscaba. Ahora tiene su página,
   enlazada desde el Ranking, que es donde surge la duda. Arriba, la
   puntuación ACTUAL de la liga, leída de los ajustes. */

export default async function Reglas() {
  const lng = await getLang(); // v0.49
  const cfg = await loadConfig();
  return (
    <div className="flex flex-col gap-4">
      <PageHead title={tr(lng, "reg.titulo")} sub={tr(lng, "reg.sub")} />

      <section className="card p-4">
        <h2 className="mb-3 text-lg font-bold">{tr(lng, "reg.ahora")}</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          {([["reg.victoria", cfg.ptsWin, "text-win"], ["reg.empate", cfg.ptsTie, "text-tie"], ["reg.derrota", cfg.ptsLoss, "text-loss"]] as const).map(([k, v, c]) => (
            <div key={k} className="rounded-xl bg-surface-2 p-3">
              <div className={`font-display text-3xl font-extrabold tabular ${c}`}>{v}</div>
              <div className="text-xs text-muted">{tr(lng, k)}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">{trf(lng, "reg.elo", { n: cfg.eloStart })}</p>
      </section>

      <section className="card p-4">
        <h2 className="mb-2 text-lg font-bold">{tr(lng, "x.63e756e7")}</h2>
        <div className="flex flex-col gap-2 text-sm text-ink-2">
          <p><b>{tr(lng, "x.eae20e39")}</b> {tr(lng, "x.6bfeb8d9")}</p>
          <p><b>{tr(lng, "x.56cd9fa0")}</b> {tr(lng, "x.c9464cf3")}</p>
          <p><b>{tr(lng, "x.96c49ed4")}</b> {tr(lng, "x.ef2d792d")}</p>
          <p><b>{tr(lng, "x.0f13be28")}</b> {tr(lng, "x.e1a501fe")} <i>{tr(lng, "x.b86482a4")}</i> {tr(lng, "x.2d3a90ec")}</p>
          <p><b>{tr(lng, "x.e2512704")}</b> {tr(lng, "x.a65d97ec")} <b>{tr(lng, "x.7b1651eb")}</b>{tr(lng, "x.01dea602")} <code className="rounded bg-surface-2 px-1 font-mono text-xs">src/lib/cp.ts</code>.</p>
          <p><b>{tr(lng, "x.4ef9dc50")}</b> {tr(lng, "x.965abe45")}</p>
          <p><b>{tr(lng, "x.e9da2f4c")}</b> <i>{tr(lng, "x.588eb828")}</i> {tr(lng, "x.b8be999f")} <i>{tr(lng, "x.4e7afebc")}</i> {tr(lng, "x.ed60392e")} <i>{tr(lng, "x.0961a6d8")}</i> {tr(lng, "x.1979d8b3")}</p>
        </div>
      </section>

      <Link href="/ranking" className="w-fit text-sm text-info underline underline-offset-2">← {tr(lng, "reg.volverRanking")}</Link>
    </div>
  );
}
