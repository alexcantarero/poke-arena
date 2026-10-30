"use client";

import { useEffect, useMemo, useState } from "react";
import { MulliganSim } from "@/components/MulliganSim";
import { Calculator, Gauge, Gift, Layers, Sparkles } from "lucide-react";
import type { DatosRecomendador } from "@/lib/recomendadorDatos";
import { mejorVariante, notaConsistencia, recomendar, valorarVariantes, type Objetivo, type TipoTorneo } from "@/lib/recomendador";
import { spriteUrl } from "@/lib/pokemon";
import { urlDeObjeto } from "@/lib/objetos";
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
type Pestana = "recomendador" | "suiza" | "consistencia" | "premios" | "manos";

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

export function Herramientas({ mazos, inicial, mazoInicial, datos }: { mazos: MazoHerramienta[]; inicial?: string; mazoInicial?: string; datos?: DatosRecomendador | null }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const [pestana, setPestana] = useState<Pestana>(
    inicial === "suiza" || inicial === "consistencia" || inicial === "premios" || inicial === "manos" ? inicial : mazoInicial ? "manos" : "recomendador");

  const pestanas: Array<[Pestana, string, typeof Sparkles]> = [
    ["recomendador", tr(lng, "rc.tab"), Sparkles],
    ["suiza", tr(lng, "hr.tab.suiza"), Calculator], ["consistencia", tr(lng, "hr.tab.consistencia"), Gauge],
    ["premios", tr(lng, "hr.tab.premios"), Gift], ["manos", tr(lng, "hr.tab.manos"), Layers],
  ];
  const cambiar = (p: Pestana) => {
    setPestana(p);
    try { history.replaceState(null, "", `/herramientas?h=${p}`); } catch { /* da igual */ }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* v0.76 — pestañas de verdad (`.pestanas`): barra con icono, la activa
          en relieve con el filo de marca, y en el móvil se desliza sin partirse. */}
      <nav className="pestanas" role="tablist" aria-label={tr(lng, "hr.titulo")} data-paso="herramientas-2">
        {pestanas.map(([k, l, Ico]) => (
          <button key={k} type="button" role="tab" onClick={() => cambiar(k)} aria-selected={pestana === k}
            className="pestana" data-on={pestana === k}>
            <Ico className="size-4 flex-none" aria-hidden="true" />
            <span>{l}</span>
          </button>
        ))}
      </nav>
      {pestana === "recomendador" && <Recomendador datos={datos ?? null} />}
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

/* --------------------------------------------------------- recomendador -- */

const TIPOS_REC: Array<{ tipo: TipoTorneo; label: string; jugadores: number; kind: string }> = [
  { tipo: "league_challenge", label: "hr.sz.challenge", jugadores: 20, kind: "league_challenge" },
  { tipo: "league_cup", label: "hr.sz.cup", jugadores: 48, kind: "league_cup" },
  { tipo: "regional", label: "hr.sz.regional", jugadores: 1500, kind: "regional" },
  { tipo: "city_league", label: "rc.city", jugadores: 40, kind: "league_cup" },
];
const OBJETIVOS: Objetivo[] = ["top", "ganar", "dia2", "sorpresa"];

/** v0.84 — simulaciones ya hechas (por estructura), compartidas en la sesión. */
const CACHE_SUIZO = new Map<string, ReturnType<typeof simularSuizo>>();

const nombreLider = (datos: DatosRecomendador, l: string) =>
  datos.nombres[l] ?? l.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

function Recomendador({ datos }: { datos: DatosRecomendador | null }) {
  const lng = useLang(); // v0.49
  const [tipo, setTipo] = useState<TipoTorneo>("league_cup");
  const [jugadores, setJugadores] = useState("48");
  const [objetivo, setObjetivo] = useState<Objetivo>("top");
  /* v0.77 — general (el jugador medio) o para ti (tus partidas y tus mazos). */
  const [modo, setModo] = useState<"general" | "tuyo">("general");
  const [soloMios, setSoloMios] = useState(false);
  // v0.82 — esconder los mazos con fiabilidad baja (pocas partidas o pocas listas).
  const [sinBaja, setSinBaja] = useState(false);
  const yo = datos?.personal ?? null;
  const tuyo = modo === "tuyo" && yo != null;

  const conf = TIPOS_REC.find((t) => t.tipo === tipo)!;
  /* v0.84 — el número de jugadores se aplica 400 ms después de dejar de
     escribir: antes cada tecla relanzaba dos simulaciones del torneo. */
  const [jugadoresD, setJugadoresD] = useState(jugadores);
  useEffect(() => { const t = setTimeout(() => setJugadoresD(jugadores), 400); return () => clearTimeout(t); }, [jugadores]);
  const N = Math.max(4, Math.round(n(jugadoresD, conf.jugadores)));
  const est = estructuraDe(N, conf.kind);

  // La línea de corte (puntos → fracción que entra) sale de simular el torneo con todos iguales.
  /* Sin corte (League Challenge): «top» es acabar entre los 8 primeros de la
     clasificación (es lo que da CP) y «ganar», acabar primero. */
  const sinCorte = Boolean(est && !est.topCut);
  const corte = est ? (est.topCut || Math.min(8, N)) : 0;
  const lineas = useMemo(() => {
    if (!est) return null;
    // v0.84 — memoria entre renders y entre pestañas: la misma estructura no se simula dos veces.
    const clave = (c: number) => `${N}|${est.total}|${c}|${est.umbral}|${est.fase1}|${est.asimetrico}`;
    const sim = (c: number) => CACHE_SUIZO.get(clave(c)) ?? (() => { const r = simularSuizoSinCache(c); CACHE_SUIZO.set(clave(c), r); return r; })();
    const simularSuizoSinCache = (c: number) => simularSuizo({
      jugadores: N, rondas: est.total, corte: c, pEmpate: 0.03,
      fase1: est.umbral != null ? est.fase1 : null, umbralDia2: est.umbral ?? null,
      asimetrico: est.asimetrico, maxCorte: TOP_CUT_MAXIMO_TCG, iteraciones: 120,
    });
    const aMapa = (r: ReturnType<typeof simularSuizo>) => (r ? Object.fromEntries(r.filas.map((f) => [f.puntos, f.pCorte])) : null);
    return { pCorte: aMapa(sim(corte)), pPrimero: sinCorte ? aMapa(sim(1)) : null };
  }, [N, corte, sinCorte, est?.total, est?.umbral, est?.fase1, est?.asimetrico]); // eslint-disable-line react-hooks/exhaustive-deps
  const pCorte = lineas?.pCorte ?? null;

  const res = useMemo(() => {
    if (!datos || !est || !pCorte) return null;
    return recomendar({
      tipo, objetivo, alfa: datos.evaluacion.alfa, live: datos.live,
      ajustes: tuyo ? Object.fromEntries(Object.entries(yo!.porLider).map(([l, x]) => [l, x.ajuste])) : undefined,
      soloLideres: tuyo && soloMios && yo!.misLideres.length ? yo!.misLideres : undefined,
      fuentes: [datos.fuentes.online, datos.fuentes.regionales, datos.fuentes.cityleagues, ...(datos.trainerHill ?? []), datos.grupo[tipo], ...(tuyo ? [yo!.fuente] : [])],
      estructura: {
        rondas: est.total, corte: sinCorte ? 1 : est.topCut, pCorte,
        pPrimero: lineas?.pPrimero ?? undefined,
        fase1: est.umbral != null ? est.fase1 : null, umbral: est.umbral ?? null,
      },
    });
  }, [datos, tipo, objetivo, est, pCorte, sinCorte, lineas, tuyo, soloMios, yo]);

  const objetivoDisponible = objetivo !== "dia2" || est?.umbral != null;

  return (
    <section className="card flex flex-col gap-4 p-4">
      <div>
        <h2 className="font-display text-lg font-bold">{tr(lng, "rc.titulo")}</h2>
        <p className="mt-1 text-sm text-muted">{tr(lng, "rc.explica")}</p>
      </div>
      {/* v0.77 — general o personalizado. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="pestanas" role="tablist" aria-label={tr(lng, "rc.modo")}>
          <button type="button" role="tab" className="pestana" data-on={modo === "general"} aria-selected={modo === "general"} onClick={() => setModo("general")}>
            {tr(lng, "rc.modo.general")}
          </button>
          <button type="button" role="tab" className="pestana" data-on={modo === "tuyo"} aria-selected={modo === "tuyo"} onClick={() => setModo("tuyo")} disabled={!yo}>
            {tr(lng, "rc.modo.tuyo")}
          </button>
        </div>
        {tuyo && yo!.misLideres.length > 0 && (
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={soloMios} onChange={(e) => setSoloMios(e.target.checked)} />
            {trf(lng, "rc.soloMios", { n: yo!.misLideres.length })}
          </label>
        )}
      </div>
      {tuyo && <p className="-mt-2 text-xs text-muted">{tr(lng, "rc.modo.tuyoNota")}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="label">{tr(lng, "hr.sz.tipo")}</span>
          <select className="input" value={tipo} onChange={(e) => {
            const t = e.target.value as TipoTorneo;
            setTipo(t); setJugadores(String(TIPOS_REC.find((x) => x.tipo === t)!.jugadores));
            if (t !== "regional" && objetivo === "dia2") setObjetivo("top");
          }}>
            {TIPOS_REC.map((t) => <option key={t.tipo} value={t.tipo}>{tr(lng, t.label)}</option>)}
          </select>
        </label>
        <Campo label={tr(lng, "hr.sz.jugadores")} value={jugadores} onChange={setJugadores} min={4} max={5000} />
        <label className="col-span-2 flex min-w-0 flex-col gap-1 sm:col-span-1">
          <span className="label">{tr(lng, "rc.objetivo")}</span>
          <select className="input" value={objetivo} onChange={(e) => setObjetivo(e.target.value as Objetivo)}>
            {OBJETIVOS.filter((o) => o !== "dia2" || est?.umbral != null).map((o) => <option key={o} value={o}>{tr(lng, `rc.obj.${o}`)}</option>)}
          </select>
        </label>
      </div>
      {est && (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-2">
          {est.umbral != null
            ? trf(lng, "hr.sz.estructura2", { r1: est.fase1, r2: est.fase2, u: est.umbral, c: est.topCut })
            : trf(lng, "hr.sz.estructura1", { r: est.total, c: est.topCut })}
          {" · "}{tr(lng, tipo === "city_league" ? "rc.bo1" : "rc.bo3")}
          {sinCorte && <>{" · "}{tr(lng, "rc.sinCorte")}</>}
        </p>
      )}

      {/* v0.75 — cuánto acierta el modelo con vuestras partidas, y lo que ha aprendido. */}
      {datos && (
        <div className="rounded-lg border border-line-soft px-3 py-2 text-xs">
          {datos.evaluacion.n === 0 ? (
            <span className="text-muted">{tr(lng, "rc.ev.sin")}</span>
          ) : (
            <>
              <span className="font-semibold">
                {trf(lng, "rc.ev.acierto", { p: datos.evaluacion.acierto != null ? pct(datos.evaluacion.acierto, 0) : "—", n: datos.evaluacion.n })}
              </span>
              <span className="text-muted">
                {" · "}{trf(lng, "rc.ev.brier", { b: (datos.evaluacion.brierCalibrado ?? datos.evaluacion.brier ?? 0).toFixed(3) })}
                {" · "}{datos.evaluacion.n >= 30
                  ? trf(lng, "rc.ev.alfa", { a: datos.evaluacion.alfa.toFixed(2) })
                  : trf(lng, "rc.ev.faltan", { n: 30 - datos.evaluacion.n })}
              </span>
            </>
          )}
        </div>
      )}

      {!datos ? <p className="text-sm text-muted">{tr(lng, "rc.sinDatos")}</p>
        : !est ? <p className="text-xs text-loss">{tr(lng, "hr.sz.pocos")}</p>
        : !res || !res.filas.length ? <p className="text-sm text-muted">{tr(lng, objetivo === "sorpresa" ? "rc.sinSorpresas2" : "rc.vacio")}</p>
        : !objetivoDisponible ? null : (
        <>
          {/* v0.82 — el filtro de fiabilidad y, si no hay resultados reales, el aviso. */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="inline-flex items-center gap-2" title={tr(lng, "rc.ayuda.fiabilidad")}>
              <input type="checkbox" className="size-4" checked={sinBaja} onChange={(e) => setSinBaja(e.target.checked)} />
              {tr(lng, "rc.sinBaja")}
            </label>
            {res.soloModelo && <span className="text-brand-strong">{tr(lng, "rc.soloModelo")}</span>}
          </div>
          <ol className="flex flex-col gap-2">
            {res.filas.filter((f) => !sinBaja || (f.confianza !== "baja" && (!f.conEvidencia || (f.evidencia?.n ?? 0) >= 5))).map((f, i) => {
              const c = datos.consistencia[f.lider];
              const nota = c ? notaConsistencia(c.teorico, c.juegos ? c.mull : null, c.juegos) : null;
              return (
                <li key={f.lider} className={`rounded-xl border p-3 ${i === 0 ? "border-brand/60 bg-brand/5" : "border-line-soft"}`}>
                  <div className="flex items-center gap-3">
                    <span className="grid size-7 flex-none place-items-center rounded-full bg-surface-2 font-display text-sm font-black">{i + 1}</span>
                    {/* v0.80 — los arquetipos sin Pokémon en el nombre (Basic Box, Festival
                        Lead) con los sprites que les pone Limitless; si no, una Poké Ball. */}
                    <span className="flex size-10 flex-none items-center justify-center">
                      {(datos.iconos?.[f.lider] ?? [f.lider]).map((s, k) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={s} src={spriteUrl(s)} alt="" className={`${k ? "-ml-4 size-7" : "size-10"} object-contain [image-rendering:pixelated]`}
                          onError={(e) => { const im = e.currentTarget; if (!im.dataset.f) { im.dataset.f = "1"; im.src = urlDeObjeto("poke-ball"); im.className = "size-7 object-contain"; } }} />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-display font-bold">{nombreLider(datos, f.lider)}</span>
                        {f.sorpresa && (
                          <span className="chip flex-none text-[10px] font-bold" title={tr(lng, `rc.sorpresa.${f.sorpresa}.ayuda`)}>
                            {tr(lng, `rc.sorpresa.${f.sorpresa}`)}
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] text-muted">
                        <span title={tr(lng, "rc.ayuda.cuota")}>{trf(lng, "rc.cuota", { p: pct(f.cuota, 1) })}</span>
                        {" · "}<span title={tr(lng, "rc.ayuda.ronda")}>{trf(lng, "rc.ronda", { p: pct(f.pRonda, 0) })}</span>
                        {nota != null && <> · <span title={tr(lng, "rc.ayuda.consistencia")}>{trf(lng, "rc.consistencia", { n: nota })}</span></>}
                      </span>
                    </span>
                    <span className="flex-none text-right">
                      <span className="block font-display text-xl font-black tabular" title={tr(lng, f.conEvidencia ? `rc.ayuda.obj.${objetivo}` : "rc.ayuda.modelo")}>
                        {pct(f.pObjetivo, f.pObjetivo < 0.1 ? 1 : 0)}
                      </span>
                      <span className={`block text-[11px] font-semibold tabular ${f.indice >= 1 ? "text-win" : "text-loss"}`} title={tr(lng, "rc.ayuda.indice")}>×{f.indice.toFixed(2)}</span>
                    </span>
                  </div>
                  {(() => {
                    /* v0.75 — la variante concreta que recomendamos, y las demás. */
                    const vs = datos.variantes[f.lider] ?? [];
                    const mv = mejorVariante(vs, datos.tasaCampo);
                    if (!mv || vs.length < 2) return null;
                    const todas = valorarVariantes(vs, datos.tasaCampo).filter((x) => x.w + x.l + x.t + x.listas >= 5);
                    return (
                      <details className="mt-2 pl-10">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-muted">{tr(lng, "rc.var.mejor")}</span>
                          <span className="font-semibold">{mv.nombre}</span>
                          <span className="font-mono tabular text-muted">{pct(mv.wr, 0)}</span>
                          <span className="text-info underline underline-offset-2">{trf(lng, "rc.var.ver", { n: todas.length })}</span>
                        </summary>
                        <ul className="mt-1.5 flex flex-col gap-1">
                          {todas.map((x) => (
                            <li key={x.clave} className="flex items-center gap-2 text-[11px]">
                              <span className={`min-w-0 flex-1 truncate ${x.clave === mv.clave ? "font-bold" : ""}`}>{x.nombre}</span>
                              <span className="w-10 text-right font-mono tabular">{pct(x.wr, 0)}</span>
                              <span className="w-24 text-right text-muted tabular">{trf(lng, "rc.var.datos", { n: x.w + x.l + x.t, l: x.listas })}</span>
                              {x.conversion != null && <span className="w-12 text-right font-mono tabular text-muted">×{x.conversion.toFixed(2)}</span>}
                            </li>
                          ))}
                        </ul>
                      </details>
                    );
                  })()}
                  {tuyo && (() => {
                    /* v0.77 — lo tuyo con este mazo. */
                    const mi = yo!.porLider[f.lider];
                    const tengo = yo!.misLideres.includes(f.lider);
                    if (!mi && !tengo) return null;
                    return (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-10 text-[11px]">
                        {tengo && <span className="font-semibold text-win">✓ {tr(lng, "rc.tengo")}</span>}
                        {mi && (
                          <span className={mi.ajuste > 0.005 ? "text-win" : mi.ajuste < -0.005 ? "text-loss" : "text-muted"}>
                            {trf(lng, "rc.tuRecord", { w: mi.w, l: mi.l, t: mi.t, d: `${mi.ajuste >= 0 ? "+" : "−"}${Math.abs(Math.round(mi.ajuste * 100))}` })}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-10 text-[11px] text-muted">
                    {/* v0.82 — lo que ha pasado de verdad con este mazo. */}
                    {f.evidencia && f.evidencia.n > 0 && (
                      <span className="font-semibold text-ink-2" title={tr(lng, "rc.ayuda.real")}>
                        {trf(lng, "rc.real", { c: f.evidencia.corte, n: f.evidencia.n, g: f.evidencia.ganados })}
                        {f.evidencia.dia2Base > 0 && ` · ${trf(lng, "rc.realDia2", { d: f.evidencia.dia2, b: f.evidencia.dia2Base })}`}
                      </span>
                    )}
                    {f.mejor && <span title={tr(lng, "rc.ayuda.mejor")}>{trf(lng, "rc.mejor", { m: nombreLider(datos, f.mejor.contra), p: pct(f.mejor.p, 0) })}</span>}
                    {f.peor && <span title={tr(lng, "rc.ayuda.peor")}>{trf(lng, "rc.peor", { m: nombreLider(datos, f.peor.contra), p: pct(f.peor.p, 0) })}</span>}
                    {f.conversion != null && <span title={tr(lng, "rc.ayuda.conversion")}>{trf(lng, "rc.conversion", { x: f.conversion.toFixed(2) })}</span>}
                    <span className={f.confianza === "alta" ? "text-win" : f.confianza === "media" ? "text-brand-strong" : "text-loss"} title={tr(lng, "rc.ayuda.fiabilidad")}>
                      {trf(lng, "rc.datos", { n: Math.round(f.datos).toLocaleString("es-ES"), c: tr(lng, `rc.conf.${f.confianza}`) })}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="text-[11px] text-muted">
            {trf(lng, "rc.fuentes", {
              t: datos.resumen.online?.torneos ?? 0, p: datos.resumen.online?.partidas ?? 0,
              r: datos.resumen.regionales, c: datos.resumen.cityleagues,
              g: Object.values(datos.grupo[tipo].cuota).reduce((a, b) => a + b, 0),
            })}
            {datos.resumen.trainerHill > 0 && <> {trf(lng, "th.enRecomendador", { n: datos.resumen.trainerHill.toLocaleString("es-ES") })}</>}
          </p>
          <p className="text-[11px] text-muted">{tr(lng, "rc.nota")}</p>
        </>
      )}
    </section>
  );
}
