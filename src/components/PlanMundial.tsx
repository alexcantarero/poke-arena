import { getSeason, type CpTotals } from "@/lib/cp";
import { CAMPO_TIPICO, planMundial, type ContadorPlan } from "@/lib/planMundial";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/* v0.73 — «Camino al Mundial» en el perfil, debajo de los CP: qué resultados
   te faltan para unos 650 CP (referencia del grupo, no corte oficial), en los
   huecos que te quedan o mejorando los que ya cuentan, de más fácil a más
   difícil. Las cuentas en `lib/planMundial.ts`. */
const CONTADORES: Array<{ contador: string; tipos: string[] }> = [
  { contador: "league_challenge", tipos: ["league_challenge"] },
  { contador: "league_cup", tipos: ["league_cup"] },
  { contador: "regional", tipos: ["regional", "international"] },
];

export async function PlanMundial({ cp, objetivo = 650 }: { cp: CpTotals; objetivo?: number }) {
  const lng = await getLang(); // v0.49
  const tabla = getSeason(cp.season);
  const contadores: ContadorPlan[] = CONTADORES.flatMap(({ contador, tipos }) => {
    const def = tabla.events[contador];
    if (!def?.bfl) return [];
    const contados = cp.rows.filter((r) => r.bucket === contador && !r.excluded && r.counted > 0).map((r) => r.counted);
    const eventos = tipos.flatMap((tipo) => {
      const ev = tabla.events[tipo];
      return ev?.tiers?.length ? [{ tipo, etiqueta: ev.label, tramos: ev.tiers, campoTipico: CAMPO_TIPICO[tipo] ?? 40 }] : [];
    });
    return [{ contador, etiqueta: def.label, contados, huecos: def.bfl, eventos }];
  });
  const plan = planMundial(cp.total, contadores, objetivo);

  return (
    <section className="card mb-5 p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold">{tr(lng, "pm.titulo")}</h2>
        <span className="font-mono text-sm tabular text-muted">{cp.total} / {plan.objetivo} CP</span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={plan.objetivo} aria-valuenow={cp.total}>
        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (cp.total / plan.objetivo) * 100).toFixed(1)}%` }} />
      </div>
      {plan.faltan === 0 ? (
        <p className="text-sm text-win">{tr(lng, "pm.llegas")}</p>
      ) : (
        <>
          <p className="mb-2 text-sm text-ink-2">
            {plan.inalcanzable ? trf(lng, "pm.inalcanzable", { n: plan.faltan }) : trf(lng, "pm.faltan", { n: plan.faltan })}
          </p>
          <ol className="flex flex-col gap-1.5">
            {plan.pasos.map((p, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg border border-line-soft px-3 py-2 text-sm">
                <span className="grid size-6 flex-none place-items-center rounded-full bg-surface-2 font-mono text-xs font-bold">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{p.puesto} · {p.etiqueta}</span>
                  <span className="block text-[11px] text-muted">
                    {p.ahora > 0 ? trf(lng, "pm.mejora", { de: p.ahora, a: p.cp }) : tr(lng, "pm.hueco")}
                  </span>
                </span>
                <span className="flex-none font-mono text-sm font-bold tabular text-win">+{p.gana}</span>
                <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold ${p.dificultad < 0.5 ? "bg-win/15 text-win" : p.dificultad < 0.9 ? "bg-brand/15 text-brand-strong" : "bg-loss/15 text-loss"}`}>
                  {tr(lng, p.dificultad < 0.5 ? "pm.facil" : p.dificultad < 0.9 ? "pm.medio" : "pm.dificil")}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
      <p className="mt-3 text-[11px] text-muted">{tr(lng, "pm.nota")}</p>
    </section>
  );
}
