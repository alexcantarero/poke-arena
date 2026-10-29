import { getSeason, type CpTotals } from "@/lib/cp";
import { CAMPO_TIPICO, minimoPorTipo, planMundial, probDeTramo, type ContadorPlan } from "@/lib/planMundial";
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

/* v0.80 — los alias puntúan y se miden como su tipo. */
const ALIAS: Record<string, string> = { pokemon_challenge: "league_challenge", pokemon_cup: "league_cup", special: "regional" };

/* v0.82 — estilos visuales según la categoría épica de dificultad. */
const ESTILOS_NIVEL: Record<string, string> = {
  muy_facil: "bg-win/15 text-win",
  facil: "bg-win/20 text-win font-semibold",
  medio: "bg-brand/15 text-brand-strong",
  dificil: "bg-orange-500/15 text-orange-400 font-semibold",
  muy_dificil: "bg-loss/20 text-loss font-bold",
  extremo: "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30",
  leyenda: "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30",
  mitico: "bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30",
  inmortal: "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30",
  titan: "bg-indigo-500/25 text-indigo-200 font-black border border-indigo-400/40",
  campeon_supremo: "bg-gradient-to-r from-amber-500/30 via-rose-500/30 to-amber-500/30 text-amber-200 font-black border border-amber-400/50 shadow-sm shadow-amber-500/20",
};

export async function PlanMundial({ cp, objetivo = 650, torneos = [] }: {
  cp: CpTotals; objetivo?: number;
  /** v0.80 — vuestros torneos (tipo y puestos de todos), para medir lo difícil que es cada puesto. */
  torneos?: Array<{ kind: string; puestos: Array<number | null> }>;
}) {
  const puestosDe: Record<string, number[]> = {};
  for (const t of torneos) {
    const k = ALIAS[t.kind] ?? t.kind;
    (puestosDe[k] ??= []).push(...t.puestos.filter((x): x is number => x != null && x > 0));
  }
  const lng = await getLang(); // v0.49
  const tabla = getSeason(cp.season);
  const contadores: ContadorPlan[] = CONTADORES.flatMap(({ contador, tipos }) => {
    const def = tabla.events[contador];
    if (!def?.bfl) return [];
    const contados = cp.rows.filter((r) => r.bucket === contador && !r.excluded && r.counted > 0).map((r) => r.counted);
    const eventos = tipos.flatMap((tipo) => {
      const ev = tabla.events[tipo];
      if (!ev?.tiers?.length) return [];
      const campoTipico = CAMPO_TIPICO[tipo] ?? 40;
      return [{ tipo, etiqueta: ev.label, tramos: ev.tiers, campoTipico,
        prob: ev.tiers.map((t) => probDeTramo(t, campoTipico, puestosDe[tipo] ?? []).p) }];
    });
    return [{ contador, etiqueta: def.label, contados, huecos: def.bfl, eventos }];
  });
  const plan = planMundial(cp.total, contadores, objetivo);
  const minimos = minimoPorTipo(cp.total, contadores, objetivo);
  const nTipo = (tipo: string) => (puestosDe[tipo] ?? []).length;

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
                {/* v0.82 — categoría épica (Fácil, Medio, Difícil, Muy difícil, Extremo, Leyenda, Mítico, Inmortal, Titán, Campeón Supremo). */}
                <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] ${ESTILOS_NIVEL[p.nivelClave] ?? "bg-surface-2 text-muted"}`}
                  title={trf(lng, "pm.prob", { p: Math.round(p.probEst), n: nTipo(p.tipo) })}>
                  {tr(lng, p.nivelLabel)} · {p.probEst < 1 ? "<1 %" : `${Math.round(p.probEst)} %`}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
      {plan.faltan > 0 && (
        <>
          {/* v0.80 — lo mínimo si solo jugaras un tipo de torneo. */}
          <h3 className="mb-1.5 mt-4 text-sm font-bold">{tr(lng, "pm.minimoTitulo")}</h3>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {minimos.map((m) => (
              <li key={m.tipo} className="rounded-lg border border-line-soft px-3 py-2 text-sm">
                <span className="block font-semibold">{m.etiqueta}</span>
                <span className="block text-xs text-muted">
                  {m.puesto ? trf(lng, "pm.minimo", { v: m.veces, p: m.puesto }) : trf(lng, "pm.noLlega", { n: m.maximo })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-[11px] text-muted">{tr(lng, "pm.nota")}</p>
    </section>
  );
}
