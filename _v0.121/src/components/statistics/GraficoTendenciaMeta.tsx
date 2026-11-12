import Link from "next/link";
import { fetchMetaConTendencia } from "@/lib/sources/limitless";
import { spriteUrl } from "@/lib/pokemon";
import { tendenciaDe } from "@/lib/metaTendencia";
import { tr, trf, type Lang } from "@/lib/i18n";

/* =========================================================================
   v0.121 — Gráfico: cómo ha cambiado la cuota de los mazos más jugados en
   los tres últimos meses (meta online de Limitless).

   Estadísticas se queda con gráficos (v0.120): la lista entera, con su
   tendencia, está en Top Decks. Aquí, los 8 que más pesan ahora, cada uno con
   tres barras horizontales (hace dos meses, el mes pasado, este mes) en la
   misma escala, para comparar de un vistazo. Server Component: sin
   JavaScript y la misma caché de 6 h que Top Decks.
   ========================================================================= */
export async function GraficoTendenciaMeta({ formato, lang }: { formato: string; lang: Lang }) {
  let datos: Awaited<ReturnType<typeof fetchMetaConTendencia>> | null = null;
  try {
    datos = await fetchMetaConTendencia({ days: 30, format: formato, apiKey: process.env.LIMITLESS_API_KEY });
  } catch {
    datos = null;
  }
  if (!datos || !datos.snapshot.rows.length) {
    return <p className="card p-4 text-sm text-muted">{tr(lang, "v121.tendSinDatos")}</p>;
  }
  const top = datos.snapshot.rows.slice(0, 8);
  const serie = (id: string, share: number) => datos!.tendencia[id] ?? [share, null, null];
  const max = Math.max(0.01, ...top.flatMap((r) => serie(r.identifier, r.share).map((x) => x ?? 0)));
  const etiquetas = [tr(lang, "v121.hace2"), tr(lang, "v121.mesPasado"), tr(lang, "v121.esteMes")];
  return (
    <section className="card">
      <div className="card-head flex-wrap gap-y-1">
        <h2 className="text-lg font-bold">{tr(lang, "v121.tendTitulo")}</h2>
        <span className="text-xs text-muted">
          {trf(lang, "v121.tendMuestra", { a: datos.periodos[0]?.torneos ?? 0, b: datos.periodos[1]?.torneos ?? 0, c: datos.periodos[2]?.torneos ?? 0 })}
        </span>
      </div>
      <div className="grafico-tendencia-leyenda px-4 pt-3" aria-hidden="true">
        {[2, 1, 0].map((p) => <span key={p} data-p={p}><i />{etiquetas[2 - p]}</span>)}
      </div>
      <ul className="divide-y divide-line-soft">
        {top.map((r) => {
          const s = serie(r.identifier, r.share);
          const t = tendenciaDe(s);
          return (
            <li key={r.identifier} className="grid grid-cols-[2rem_minmax(0,8rem)_1fr_1.25rem] items-center gap-2 px-4 py-2.5 xs:grid-cols-[2rem_minmax(0,11rem)_1fr_1.25rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={spriteUrl(r.main)} alt="" aria-hidden="true" className="size-8 object-contain" loading="lazy" />
              <span className="truncate text-sm font-semibold">{r.name}</span>
              <span className="grafico-tendencia-barras" role="img"
                aria-label={trf(lang, "v120.tendTitulo", {
                  a: s[2] == null ? "—" : `${(s[2]! * 100).toFixed(1)}%`,
                  b: s[1] == null ? "—" : `${(s[1]! * 100).toFixed(1)}%`,
                  c: s[0] == null ? "—" : `${(s[0]! * 100).toFixed(1)}%`,
                })}>
                {[2, 1, 0].map((p) => (
                  <span key={p} data-p={p}>
                    <i style={{ width: `${Math.max(1, Math.round(((s[p] ?? 0) / max) * 100))}%` }} />
                    <b>{s[p] == null ? "—" : `${(s[p]! * 100).toFixed(1)}%`}</b>
                  </span>
                ))}
              </span>
              <span className="text-center text-xs" data-t={t} aria-hidden="true">
                {t === "sube" ? "▲" : t === "baja" ? "▼" : t === "nuevo" ? "★" : "▬"}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line-soft px-4 py-2 text-xs text-muted">
        {tr(lang, "v121.tendNota")} <Link className="underline" href="/topdecks">{tr(lang, "v121.verTopDecks")}</Link>
      </p>
    </section>
  );
}
