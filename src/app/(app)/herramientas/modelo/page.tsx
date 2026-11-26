import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPlayer, loadSnapshot } from "@/lib/data";
import { ajustar, backtest, PARAMETROS_POR_DEFECTO, PESO_TORNEO } from "@/lib/recommender/modelo";
import { aciertoRegistrado, partidasDelGrupo } from "@/lib/recommender/datos";
import { pct } from "@/lib/format";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "El modelo de cruces" };

/* =========================================================================
   v0.138 — EL MODELO DE CRUCES, VALIDADO (`/herramientas/modelo`).

   El backtest del modelo nuevo (`lib/recommender/modelo.ts`) sobre vuestras
   partidas: cada una predicha solo con las anteriores. Brier y log-loss
   frente a decir siempre 50 %, una rejilla de τ y prior para ver qué funciona
   mejor, y el acierto de las predicciones registradas por el cron.
   `?ventana=30|60|90` limita a las partidas de los últimos N días antes de
   cada una.
   ========================================================================= */
const TAUS = [30, 45, 60, 90, 120, Infinity];
const PRIORS = [2, 4, 8, 16];

export default async function ModeloPage({ searchParams }: { searchParams: Promise<{ ventana?: string }> }) {
  const [q, snap, me, lng] = await Promise.all([searchParams, loadSnapshot(), currentPlayer(), getLang()]);
  if (!me) redirect("/entrar");
  const v = Number(q.ventana);
  const ventana = [30, 60, 90].includes(v) ? v : Infinity;
  const partidas = partidasDelGrupo(snap);
  const actual = backtest(partidas, { ...PARAMETROS_POR_DEFECTO, ventana });
  const rejilla = ajustar(partidas, TAUS, PRIORS, ventana);
  const mejor = rejilla[0];
  const registrado = await aciertoRegistrado();
  const num = (x: number | null, d = 3) => (x == null ? "—" : x.toFixed(d));
  const tauTxt = (t: number) => (Number.isFinite(t) ? `${t} d` : "∞");

  return (
    <>
      <div className="mb-3"><Link href="/herramientas" className="btn btn-ghost btn-sm">← {tr(lng, "hr.titulo")}</Link></div>
      <h1 className="mb-1 font-display text-2xl font-black">{tr(lng, "v138.titulo")}</h1>
      <p className="mb-4 text-sm text-muted">{trf(lng, "v138.sub", { n: partidas.length })}</p>

      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label={tr(lng, "v138.ventana")}>
        <span className="mr-1 self-center text-xs text-muted">{tr(lng, "v138.ventana")}:</span>
        {[["", "v138.todo"], ["30", "v138.d30"], ["60", "v138.d60"], ["90", "v138.d90"]].map(([val, k]) => (
          <Link key={k} href={`/herramientas/modelo${val ? `?ventana=${val}` : ""}`} className={`chip ${(val ? Number(val) : Infinity) === ventana ? "chip-brand" : ""}`}>{tr(lng, k)}</Link>
        ))}
      </nav>

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          ["v138.brier", num(actual.brier), trf(lng, "v138.base", { b: num(actual.brierBase) })],
          ["v138.logloss", num(actual.logloss), trf(lng, "v138.baseLog", { b: "0,693" })],
          ["v138.acierto", actual.acierto != null ? pct(actual.acierto, 0) : "—", trf(lng, "v138.predichas", { n: actual.n })],
          ["v138.registrado", registrado?.brier != null ? num(registrado.brier) : "—",
            registrado?.n ? trf(lng, "v138.registradoN", { n: registrado.n, a: registrado.acierto != null ? pct(registrado.acierto, 0) : "—" }) : tr(lng, "v138.registradoVacio")],
        ] as const).map(([k, val, sub]) => (
          <div key={k} className="card p-4">
            <p className="label">{tr(lng, k)}</p>
            <p className="font-display text-3xl font-black tabular">{val}</p>
            <p className="text-xs text-muted">{sub}</p>
          </div>
        ))}
      </section>
      <p className="mb-4 text-sm">
        {actual.brier != null && actual.brierBase != null
          ? (actual.brier < actual.brierBase ? tr(lng, "v138.mejorQueMoneda") : tr(lng, "v138.peorQueMoneda"))
          : tr(lng, "v138.pocosDatos")}
        {" "}{trf(lng, "v138.parametros", { t: tauTxt(PARAMETROS_POR_DEFECTO.tau), p: PARAMETROS_POR_DEFECTO.prior })}
      </p>

      {rejilla.length > 0 && (
        <section className="card mb-4 overflow-hidden">
          <div className="card-head"><h2 className="text-lg font-bold">{tr(lng, "v138.rejilla")}</h2></div>
          {mejor && <p className="px-4 pt-3 text-sm">{trf(lng, "v138.mejorPar", { t: tauTxt(mejor.par.tau), p: mejor.par.prior, b: num(mejor.m.brier) })}</p>}
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm tabular">
              <thead><tr className="text-left text-muted"><th className="py-1 pr-3">τ</th><th className="pr-3">prior</th><th className="pr-3">Brier</th><th className="pr-3">log-loss</th><th>{tr(lng, "v138.acierto")}</th></tr></thead>
              <tbody>
                {rejilla.slice(0, 12).map((x, i) => (
                  <tr key={`${x.par.tau}-${x.par.prior}`} className={i === 0 ? "font-bold text-win" : ""}>
                    <td className="py-1 pr-3">{tauTxt(x.par.tau)}</td><td className="pr-3">{x.par.prior}</td>
                    <td className="pr-3">{num(x.m.brier)}</td><td className="pr-3">{num(x.m.logloss)}</td>
                    <td>{x.m.acierto != null ? pct(x.m.acierto, 0) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card mb-4 p-4 text-sm">
        <h2 className="mb-2 text-lg font-bold">{tr(lng, "v138.como")}</h2>
        <p className="mb-2 text-ink-2">{tr(lng, "v138.comoTexto")}</p>
        <p className="text-xs text-muted">
          {tr(lng, "v138.pesos")} {Object.entries(PESO_TORNEO).map(([k, w]) => `${k} ${w.toLocaleString("es-ES")}`).join(" · ")}
        </p>
      </section>
    </>
  );
}
