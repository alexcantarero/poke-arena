"use client";

import { useMemo, useState } from "react";
import { MulliganSim } from "@/components/MulliganSim";
import {
  consistencia, premiosDeCarta, premiosDeDos, probCorteDesde, simularSuizo, type ResultadoSuizo,
} from "@/lib/herramientas";
import { estructuraDe, TOP_CUT_MAXIMO_TCG } from "@/lib/estructura";
import { pct } from "@/lib/format";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   v0.71 — Herramientas: calculadora suiza, consistencia, premios y el
   simulador de manos (que antes vivía en la ficha de cada mazo).

   Las cuentas están en `lib/herramientas.ts` (puras y probadas). Aquí solo hay
   formularios y tablas. Si una entrada no tiene sentido, se dice qué falla en
   vez de pintar «NaN%».
   ========================================================================= */

export type MazoHerramienta = { id: string; name: string; list: string; listJson: unknown };
type Pestana = "suiza" | "consistencia" | "premios" | "manos";

const n = (v: string, def = 0) => {
  const x = Number(v.replace(",", "."));
  return Number.isFinite(x) ? x : def;
};

function Campo({ label, value, onChange, min = 0, max = 9999, ayuda }: {
  label: string; value: string; onChange: (v: string) => void; min?: number; max?: number; ayuda?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="label">{label}</span>
      <input className="input tabular" type="number" inputMode="numeric" min={min} max={max}
        value={value} onChange={(e) => onChange(e.target.value)} />
      {ayuda && <span className="text-[11px] text-muted">{ayuda}</span>}
    </label>
  );
}

export function Herramientas({ mazos, inicial, mazoInicial }: { mazos: MazoHerramienta[]; inicial?: string; mazoInicial?: string }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const [pestana, setPestana] = useState<Pestana>(
    inicial === "consistencia" || inicial === "premios" || inicial === "manos" ? inicial : mazoInicial ? "manos" : "suiza");

  const pestanas: Array<[Pestana, string]> = [
    ["suiza", tr(lng, "hr.tab.suiza")], ["consistencia", tr(lng, "hr.tab.consistencia")],
    ["premios", tr(lng, "hr.tab.premios")], ["manos", tr(lng, "hr.tab.manos")],
  ];
  const cambiar = (p: Pestana) => {
    setPestana(p);
    try { history.replaceState(null, "", `/herramientas?h=${p}`); } catch { /* da igual */ }
  };

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap gap-1.5" aria-label={tr(lng, "hr.titulo")} data-paso="herramientas-2">
        {pestanas.map(([k, l]) => (
          <button key={k} type="button" onClick={() => cambiar(k)} aria-pressed={pestana === k}
            className={`chip ${pestana === k ? "chip-brand" : ""}`}>{l}</button>
        ))}
      </nav>
      {pestana === "suiza" && <Suiza />}
      {pestana === "consistencia" && <ConsistenciaPanel />}
      {pestana === "premios" && <PremiosPanel />}
      {pestana === "manos" && <Manos mazos={mazos} mazoInicial={mazoInicial} />}
    </div>
  );
}

/* ---------------------------------------------------------------- suiza -- */

const TIPOS = [
  ["", "hr.sz.tipoLibre"], ["league_challenge", "hr.sz.challenge"], ["league_cup", "hr.sz.cup"], ["regional", "hr.sz.regional"],
] as const;

function Suiza() {
  const lng = useLang(); // v0.49
  const [tipo, setTipo] = useState<string>("league_cup");
  const [jugadores, setJugadores] = useState("32");
  const [rondasLibre, setRondasLibre] = useState("5");
  const [corteLibre, setCorteLibre] = useState("8");
  const [empate, setEmpate] = useState("3");
  const [res, setRes] = useState<ResultadoSuizo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [v, setV] = useState("0"), [d, setD] = useState("0"), [e, setE] = useState("0");

  const N = Math.round(n(jugadores));
  const est = tipo ? estructuraDe(N, tipo) : null;
  const rondas = est ? est.total : Math.round(n(rondasLibre));
  const corte = est ? est.topCut : Math.round(n(corteLibre));
  const pEmp = Math.min(50, Math.max(0, n(empate))) / 100;

  const calcular = () => {
    setCalculando(true); setError(null);
    // Un respiro para que se pinte «Calculando…» antes de la simulación.
    setTimeout(() => {
      const r = simularSuizo({
        jugadores: N, rondas, corte, pEmpate: pEmp,
        fase1: est && est.umbral != null ? est.fase1 : null, umbralDia2: est?.umbral ?? null,
        asimetrico: est?.asimetrico ?? false, maxCorte: TOP_CUT_MAXIMO_TCG,
      });
      if (!r) setError(tr(lng, "hr.sz.error"));
      setRes(r); setCalculando(false);
    }, 20);
  };

  const ptsAhora = Math.round(n(v)) * 3 + Math.round(n(e));
  const jugadas = Math.round(n(v)) + Math.round(n(d)) + Math.round(n(e));
  const quedan = Math.max(0, rondas - jugadas);
  const pMio = res && jugadas <= rondas ? probCorteDesde(ptsAhora, quedan, pEmp, res.filas) : null;

  return (
    <section className="card flex flex-col gap-4 p-4">
      <div>
        <h2 className="font-display text-lg font-bold">{tr(lng, "hr.sz.titulo")}</h2>
        <p className="mt-1 text-sm text-muted">{tr(lng, "hr.sz.explica")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="col-span-2 flex min-w-0 flex-col gap-1 sm:col-span-1">
          <span className="label">{tr(lng, "hr.sz.tipo")}</span>
          <select className="input" value={tipo} onChange={(ev) => { setTipo(ev.target.value); setRes(null); }}>
            {TIPOS.map(([k, l]) => <option key={k} value={k}>{tr(lng, l)}</option>)}
          </select>
        </label>
        <Campo label={tr(lng, "hr.sz.jugadores")} value={jugadores} onChange={(x) => { setJugadores(x); setRes(null); }} min={4} max={5000} />
        {!est && <Campo label={tr(lng, "hr.sz.rondas")} value={rondasLibre} onChange={(x) => { setRondasLibre(x); setRes(null); }} min={1} max={20} />}
        {!est && <Campo label={tr(lng, "hr.sz.corte")} value={corteLibre} onChange={(x) => { setCorteLibre(x); setRes(null); }} min={0} max={512} />}
        <Campo label={tr(lng, "hr.sz.empates")} value={empate} onChange={(x) => { setEmpate(x); setRes(null); }} min={0} max={50} ayuda={tr(lng, "hr.sz.empatesAyuda")} />
      </div>
      {est && (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-2">
          {est.umbral != null
            ? trf(lng, "hr.sz.estructura2", { r1: est.fase1, r2: est.fase2, u: est.umbral, c: est.topCut })
            : trf(lng, "hr.sz.estructura1", { r: est.total, c: est.topCut })}
        </p>
      )}
      {tipo && !est && <p className="text-xs text-loss">{tr(lng, "hr.sz.pocos")}</p>}
      <button type="button" className="btn btn-brand w-full sm:w-auto" onClick={calcular} disabled={calculando || (Boolean(tipo) && !est)}>
        {calculando ? tr(lng, "hr.sz.calculando") : tr(lng, "hr.sz.calcular")}
      </button>
      {error && <p className="text-sm text-loss">{error}</p>}

      {res && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-line-soft p-3">
              <p className="label">{tr(lng, "hr.sz.seguro")}</p>
              <p className="font-display text-xl font-bold">{res.seguro != null ? `${res.seguro} pts` : "—"}</p>
            </div>
            <div className="rounded-lg border border-line-soft p-3">
              <p className="label">{tr(lng, "hr.sz.posible")}</p>
              <p className="font-display text-xl font-bold">{res.posible != null ? `${res.posible} pts` : "—"}</p>
            </div>
            {res.diaDos != null && (
              <div className="rounded-lg border border-line-soft p-3">
                <p className="label">{tr(lng, "hr.sz.dia2")}</p>
                <p className="font-display text-xl font-bold tabular">≈ {Math.round(res.diaDos)}</p>
              </div>
            )}
          </div>
          <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-line-soft">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-3 py-2 text-left">{tr(lng, "hr.sz.puntos")}</th>
                  <th className="px-3 py-2 text-left">{tr(lng, "hr.sz.record")}</th>
                  <th className="px-3 py-2 text-right">{tr(lng, "hr.sz.esperados")}</th>
                  <th className="px-3 py-2 text-right">{tr(lng, "hr.sz.pCorte")}</th>
                </tr>
              </thead>
              <tbody>
                {res.filas.filter((f) => f.esperados >= 0.05).map((f) => (
                  <tr key={f.puntos} className="border-t border-line-soft"
                    data-estado={f.pCorte >= 0.995 ? "dentro" : f.pCorte > 0.005 ? "depende" : "fuera"}>
                    <td className="px-3 py-1.5 font-mono font-bold tabular">{f.puntos}</td>
                    <td className="px-3 py-1.5 font-mono text-xs">{f.records.join(" · ")}</td>
                    <td className="px-3 py-1.5 text-right font-mono tabular">{f.esperados.toFixed(1)}</td>
                    <td className={`px-3 py-1.5 text-right font-mono font-semibold tabular ${f.pCorte >= 0.995 ? "text-win" : f.pCorte > 0.005 ? "text-brand-strong" : "text-muted"}`}>
                      {pct(f.pCorte, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-info/40 bg-info-soft/30 p-3">
            <p className="mb-2 font-semibold">{tr(lng, "hr.sz.tuTorneo")}</p>
            <div className="grid grid-cols-3 gap-2">
              <Campo label={tr(lng, "hr.sz.v")} value={v} onChange={setV} max={20} />
              <Campo label={tr(lng, "hr.sz.d")} value={d} onChange={setD} max={20} />
              <Campo label={tr(lng, "hr.sz.e")} value={e} onChange={setE} max={20} />
            </div>
            <p className="mt-2 text-sm">
              {jugadas > rondas
                ? <span className="text-loss">{tr(lng, "hr.sz.demasiadas")}</span>
                : pMio != null && trf(lng, "hr.sz.tuProb", { p: pct(pMio, 0), q: quedan })}
            </p>
          </div>
          <p className="text-[11px] text-muted">{tr(lng, "hr.sz.nota")}</p>
        </>
      )}
    </section>
  );
}

/* --------------------------------------------------------- consistencia -- */

function ConsistenciaPanel() {
  const lng = useLang(); // v0.49
  const [mazo, setMazo] = useState("60");
  const [basicos, setBasicos] = useState("12");
  const [salidas, setSalidas] = useState("10");
  const [salidasB, setSalidasB] = useState("4");
  const r = useMemo(() => consistencia(n(mazo), n(basicos), n(salidas), n(salidasB)), [mazo, basicos, salidas, salidasB]);

  return (
    <section className="card flex flex-col gap-4 p-4">
      <div>
        <h2 className="font-display text-lg font-bold">{tr(lng, "hr.co.titulo")}</h2>
        <p className="mt-1 text-sm text-muted">{tr(lng, "hr.co.explica")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Campo label={tr(lng, "hr.co.mazo")} value={mazo} onChange={setMazo} min={8} max={200} />
        <Campo label={tr(lng, "hr.co.basicos")} value={basicos} onChange={setBasicos} min={1} max={60} />
        <Campo label={tr(lng, "hr.co.salidas")} value={salidas} onChange={setSalidas} max={60} ayuda={tr(lng, "hr.co.salidasAyuda")} />
        <Campo label={tr(lng, "hr.co.salidasB")} value={salidasB} onChange={setSalidasB} max={60} ayuda={tr(lng, "hr.co.salidasBAyuda")} />
      </div>
      {r ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-line-soft p-3">
            <p className="label">{tr(lng, "hr.co.enMano")}</p>
            <p className="font-display text-2xl font-bold tabular text-win">{pct(r.enMano, 1)}</p>
          </div>
          <div className="rounded-lg border border-line-soft p-3">
            <p className="label">{tr(lng, "hr.co.conRobo")}</p>
            <p className="font-display text-2xl font-bold tabular">{pct(r.conRobo, 1)}</p>
          </div>
          <div className="rounded-lg border border-line-soft p-3">
            <p className="label">{tr(lng, "hr.co.mulligan")}</p>
            <p className="font-display text-2xl font-bold tabular text-muted">{pct(r.mulligan, 1)}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-loss">{tr(lng, "hr.co.error")}</p>
      )}
      <p className="text-[11px] text-muted">{tr(lng, "hr.co.nota")}</p>
    </section>
  );
}

/* --------------------------------------------------------------- premios -- */

function PremiosPanel() {
  const lng = useLang(); // v0.49
  const [mazo, setMazo] = useState("60");
  const [a, setA] = useState("4");
  const [b, setB] = useState("");
  const una = useMemo(() => premiosDeCarta(n(a), n(mazo)), [a, mazo]);
  const dos = useMemo(() => (b.trim() ? premiosDeDos(n(a), n(b), n(mazo)) : null), [a, b, mazo]);

  return (
    <section className="card flex flex-col gap-4 p-4">
      <div>
        <h2 className="font-display text-lg font-bold">{tr(lng, "hr.pr.titulo")}</h2>
        <p className="mt-1 text-sm text-muted">{tr(lng, "hr.pr.explica")}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Campo label={tr(lng, "hr.co.mazo")} value={mazo} onChange={setMazo} min={7} max={200} />
        <Campo label={tr(lng, "hr.pr.a")} value={a} onChange={setA} max={60} />
        <Campo label={tr(lng, "hr.pr.b")} value={b} onChange={setB} max={60} ayuda={tr(lng, "hr.pr.bAyuda")} />
      </div>
      {una ? (
        <div className="overflow-x-auto rounded-lg border border-line-soft">
          <table className="w-full text-sm">
            <tbody>
              {una.exacto.map((p, j) => (
                <tr key={j} className="border-t border-line-soft first:border-t-0">
                  <td className="px-3 py-1.5">{trf(lng, "hr.pr.exacto", { j })}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular">{pct(p, 2)}</td>
                </tr>
              ))}
              <tr className="border-t border-line-soft bg-surface-2">
                <td className="px-3 py-1.5 font-semibold">{tr(lng, "hr.pr.alMenos")}</td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold tabular">{pct(una.alMenosUna, 2)}</td>
              </tr>
              <tr className="border-t border-line-soft bg-surface-2">
                <td className="px-3 py-1.5 font-semibold">{tr(lng, "hr.pr.todas")}</td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold tabular">{pct(una.todas, 3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : <p className="text-sm text-loss">{tr(lng, "hr.pr.error")}</p>}
      {b.trim() && (dos ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-line-soft p-3"><p className="label">{tr(lng, "hr.pr.alguna")}</p><p className="font-display text-xl font-bold tabular">{pct(dos.alguna, 1)}</p></div>
          <div className="rounded-lg border border-line-soft p-3"><p className="label">{tr(lng, "hr.pr.ambas")}</p><p className="font-display text-xl font-bold tabular">{pct(dos.ambas, 2)}</p></div>
          <div className="rounded-lg border border-line-soft p-3"><p className="label">{tr(lng, "hr.pr.todasAlguna")}</p><p className="font-display text-xl font-bold tabular">{pct(dos.todasDeAlguna, 3)}</p></div>
        </div>
      ) : <p className="text-sm text-loss">{tr(lng, "hr.pr.error")}</p>)}
    </section>
  );
}

/* ----------------------------------------------------------------- manos -- */

function Manos({ mazos, mazoInicial }: { mazos: MazoHerramienta[]; mazoInicial?: string }) {
  const lng = useLang(); // v0.49
  const [id, setId] = useState(mazoInicial && mazos.some((m) => m.id === mazoInicial) ? mazoInicial : mazos[0]?.id ?? "");
  const [pegada, setPegada] = useState("");
  const elegido = mazos.find((m) => m.id === id);
  const usarPegada = id === "__pegar";

  return (
    <section className="card flex flex-col gap-4 p-4">
      <div>
        <h2 className="font-display text-lg font-bold">{tr(lng, "hr.mn.titulo")}</h2>
        <p className="mt-1 text-sm text-muted">{tr(lng, "hr.mn.explica")}</p>
      </div>
      <label className="flex flex-col gap-1">
        <span className="label">{tr(lng, "hr.mn.mazo")}</span>
        <select className="input" value={id} onChange={(ev) => setId(ev.target.value)}>
          {mazos.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          <option value="__pegar">{tr(lng, "hr.mn.pegar")}</option>
        </select>
      </label>
      {usarPegada && (
        <textarea className="input min-h-40 font-mono text-xs" value={pegada} onChange={(ev) => setPegada(ev.target.value)}
          placeholder={tr(lng, "hr.mn.pegarAyuda")} />
      )}
      {usarPegada
        ? (pegada.trim() ? <MulliganSim key={`p-${pegada.length}`} list={pegada} /> : null)
        : elegido ? <MulliganSim key={elegido.id} list={elegido.list} listJson={elegido.listJson} /> : <p className="text-sm text-muted">{tr(lng, "hr.mn.sinMazos")}</p>}
    </section>
  );
}
