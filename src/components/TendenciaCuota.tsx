import { tendenciaDe } from "@/lib/metaTendencia";
import { tr, trf, type Lang } from "@/lib/i18n";

/* v0.120 — la cuota de un mazo en los tres últimos meses: tres barritas (del
   más viejo al de ahora) y una flecha. La flecha lleva texto para lectores de
   pantalla, y el título dice las tres cifras. */
export function TendenciaCuota({ serie, lang }: { serie: Array<number | null>; lang: Lang }) {
  const [ahora, pasado, anterior] = serie;
  const t = tendenciaDe(serie);
  const max = Math.max(0.0001, ...serie.map((x) => x ?? 0));
  const p = (x: number | null) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
  const titulo = trf(lang, "v120.tendTitulo", { a: p(anterior ?? null), b: p(pasado ?? null), c: p(ahora ?? null) });
  return (
    <span className="tendencia hidden xs:flex" title={titulo} data-t={t}>
      <span className="tendencia-barras" aria-hidden="true">
        {[anterior, pasado, ahora].map((x, i) => (
          <span key={i} style={{ height: `${Math.max(8, Math.round(((x ?? 0) / max) * 100))}%` }} data-vacio={x == null || undefined} />
        ))}
      </span>
      <span className="tendencia-flecha">
        <span aria-hidden="true">{t === "sube" ? "▲" : t === "baja" ? "▼" : t === "nuevo" ? "★" : "▬"}</span>
        <span className="sr-only">{tr(lang, `v120.tend.${t}`)}</span>
      </span>
    </span>
  );
}
