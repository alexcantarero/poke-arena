import Link from "next/link";
import { getLang } from "@/lib/lang";
import { ordinal, tr, trf } from "@/lib/i18n";
import { fechaCorta } from "@/lib/format";
import { spriteUrl } from "@/lib/pokemon";
import { fetchMejoresListas } from "@/lib/sources/limitless";
import { totalCartas, type Lista } from "@/lib/listasLimitless";
import { CartaLimitless } from "@/components/CartaLimitless";

/* =========================================================================
   Top Decks → un arquetipo: las mejores listas en los torneos online. v0.51.

   Sale de la API oficial de Limitless (`/tournaments/{id}/standings`), la vía
   legítima. Solo torneos ONLINE: los Regionales presenciales no están en su
   API. Sin nombres de jugador: puesto, récord, torneo y lista.
   ========================================================================= */

type Props = {
  params: Promise<{ mazo: string }>;
  searchParams: Promise<{ n?: string; m?: string; s?: string; dias?: string; formato?: string }>;
};

const SECCIONES: Array<[keyof Lista, string]> = [["pokemon", "td.pokemon"], ["trainer", "td.entrenador"], ["energy", "td.energia"]];

export default async function MazoTopDecks({ params, searchParams }: Props) {
  const lng = await getLang();
  const [{ mazo }, q] = await Promise.all([params, searchParams]);
  const deckId = decodeURIComponent(mazo);
  const dias = [14, 30, 90].includes(Number(q.dias)) ? Number(q.dias) : 30;
  const formato = q.formato === "EXPANDED" ? "EXPANDED" : "STANDARD";
  const nombre = q.n || deckId;
  const loc = lng === "en" ? "en-GB" : "es-ES";

  const { resultados, torneos, fallidos } = await fetchMejoresListas(deckId, {
    days: dias, format: formato, apiKey: process.env.LIMITLESS_API_KEY,
  });
  const volver = `/topdecks?dias=${dias}&formato=${formato}`;

  return (
    <div className="flex flex-col gap-4">
      <Link href={volver} className="w-fit text-sm text-muted hover:text-info">← {tr(lng, "td.volver")}</Link>

      <header className="flex items-center gap-3">
        <span className="flex flex-none items-end">
          {[q.m, q.s].filter(Boolean).map((slug) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={slug} src={spriteUrl(slug!)} alt="" className="size-12 object-contain [image-rendering:pixelated]" />
          ))}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-extrabold">{nombre}</h1>
          <p className="text-sm text-muted">{trf(lng, "td.sub", { dias, torneos })}</p>
        </div>
      </header>

      {fallidos > 0 && <p className="text-xs text-muted">{trf(lng, "td.fallidos", { n: fallidos })}</p>}

      {resultados.length === 0 ? (
        <p className="card p-5 text-sm text-muted">{tr(lng, "td.vacio")}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {resultados.map((r) => (
            <li key={`${r.torneoId}-${r.puesto}`} className="card min-w-0 overflow-hidden">
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                  <span className="grid size-10 flex-none place-items-center rounded-lg bg-brand-soft font-display text-sm font-extrabold text-brand tabular">
                    {ordinal(lng, r.puesto)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.torneo}</span>
                    <span className="block text-xs text-muted tabular">
                      {fechaCorta(r.fecha, loc)} · {trf(lng, "td.jugadores", { n: r.jugadores })}
                      {r.record ? ` · ${r.record.wins}–${r.record.losses}${r.record.ties ? `–${r.record.ties}` : ""}` : ""}
                    </span>
                  </span>
                  <span className="flex-none text-xs text-info">{r.lista ? tr(lng, "td.verLista") : tr(lng, "td.sinLista")}</span>
                </summary>

                <div className="border-t border-line-soft p-4">
                  {r.lista ? (
                    <>
                      {SECCIONES.map(([sec, clave]) => r.lista![sec].length > 0 && (
                        <section key={sec} className="mb-4">
                          <h3 className="label mb-2">{tr(lng, clave)} · {r.lista![sec].reduce((a, c) => a + c.count, 0)}</h3>
                          <div className="grid grid-cols-3 gap-2 xs:grid-cols-4 sm:grid-cols-6">
                            {r.lista![sec].map((c, i) => <CartaLimitless key={`${sec}-${i}`} c={c} />)}
                          </div>
                        </section>
                      ))}
                      <p className="text-xs text-muted tabular">{trf(lng, "td.total", { n: totalCartas(r.lista) })}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted">{tr(lng, "td.listaNoDisponible")}</p>
                  )}
                  <a href={`https://play.limitlesstcg.com/tournament/${r.torneoId}/standings`} target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-block text-xs text-info underline underline-offset-2">{tr(lng, "td.verEnLimitless")}</a>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-muted">{tr(lng, "td.pie")}</p>
    </div>
  );
}
