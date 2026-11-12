import { causasDePartidas } from "@/lib/causasDb";
import { contarCausas } from "@/lib/causasDerrota";
import { tr, trf, type Lang } from "@/lib/i18n";

/* =========================================================================
   v0.123 — Por qué se pierde: las causas de derrota que más se repiten,
   sobre las partidas que se están viendo (respeta los filtros de la página).
   Barras horizontales en la misma escala, con el número y el % de derrotas
   etiquetadas en las que sale cada causa. Server Component, sin JavaScript.
   ========================================================================= */
export async function GraficoCausas({ matchIds, lang }: { matchIds: string[]; lang: Lang }) {
  const filas = await causasDePartidas(matchIds);
  const conteo = contarCausas(filas);
  const etiquetadas = filas.filter((f) => f.causas.length).length;
  if (!conteo.length) {
    return <p className="card p-4 text-sm text-muted">{tr(lang, "v123.graficoVacio")}</p>;
  }
  const max = conteo[0].n;
  return (
    <section className="card">
      <div className="card-head flex-wrap gap-y-1">
        <h2 className="text-lg font-bold">{tr(lang, "v123.graficoTitulo")}</h2>
        <span className="text-xs text-muted">{trf(lang, "v123.graficoMuestra", { n: etiquetadas })}</span>
      </div>
      <ul className="flex flex-col gap-2 p-4">
        {conteo.map((c) => (
          <li key={c.causa} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 xs:grid-cols-[minmax(0,12rem)_1fr_auto]">
            <span className="truncate text-sm font-semibold">{tr(lang, `v123.causa.${c.causa}`)}</span>
            <span className="causas-barra" aria-hidden="true"><i style={{ width: `${Math.max(3, Math.round((c.n / max) * 100))}%` }} /></span>
            <span className="font-mono text-xs tabular text-muted">{c.n} · {Math.round(c.pct * 100)}%</span>
          </li>
        ))}
      </ul>
      <p className="border-t border-line-soft px-4 py-2 text-xs text-muted">{tr(lang, "v123.graficoNota")}</p>
    </section>
  );
}
