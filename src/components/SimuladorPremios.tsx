"use client";

import { useEffect, useMemo, useState } from "react";
import { aciertos, expandir, faltan, repartir, type CartaSim, type Reparto } from "@/lib/simPremios";
import { PremiosEnPartida } from "@/components/PremiosEnPartida";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   v0.137 — PREMIOS: SIMULADOR + CALCULADORA, en uno.

   Simulador (el «prize check» del primer turno): se baraja tu lista, se roba
   la mano (con mulligan si no hay Pokémon), se apartan 6 premios y ves tu mano
   y tu mazo, como al buscar con una Ultra Ball. Tienes que decir qué hay en
   los 6 premios. Se cuenta el tiempo y los aciertos; tu mejor marca se guarda
   en este dispositivo. Dos niveles: «Fácil» con el mazo ordenado por nombre,
   «Real» con el mazo en el orden en que está, como en la mesa.

   Calculadora: la de la v0.136 (marcas lo visto y te da probabilidades).
   ========================================================================= */
type Mazo = { id: string; name: string; listJson: unknown };

export function SimuladorPremios({ mazos }: { mazos: Mazo[] }) {
  const lng = useLang();
  const [modo, setModo] = useState<"sim" | "calc">("sim");
  return (
    <section className="card mt-4 p-4">
      <div className="seg mb-3 w-full" role="tablist">
        <button type="button" role="tab" data-on={modo === "sim"} aria-selected={modo === "sim"} onClick={() => setModo("sim")}>{tr(lng, "v137.sim.simulador")}</button>
        <button type="button" role="tab" data-on={modo === "calc"} aria-selected={modo === "calc"} onClick={() => setModo("calc")}>{tr(lng, "v137.sim.calculadora")}</button>
      </div>
      {modo === "sim" ? <Simulador mazos={mazos} /> : <PremiosEnPartida mazos={mazos} />}
    </section>
  );
}

function Simulador({ mazos }: { mazos: Mazo[] }) {
  const lng = useLang();
  const [mazoId, setMazoId] = useState(mazos[0]?.id ?? "");
  const [nivel, setNivel] = useState<"facil" | "real">("facil");
  const [rep, setRep] = useState<Reparto | null>(null);
  const [apuestas, setApuestas] = useState<string[]>([]);
  const [inicio, setInicio] = useState(0);
  const [fin, setFin] = useState<number | null>(null);
  const [ahora, setAhora] = useState(0);
  const [mejor, setMejor] = useState<Record<string, { ok: number; seg: number }>>({});
  const mazo = mazos.find((m) => m.id === mazoId);
  const cartas = useMemo(() => expandir(mazo?.listJson as Parameters<typeof expandir>[0]), [mazo]);
  const nombres = useMemo(() => {
    const n = new Map<string, number>();
    for (const c of cartas) n.set(c.name, (n.get(c.name) ?? 0) + 1);
    return [...n.entries()];
  }, [cartas]);
  const clave = `arena-premios-${mazoId}-${nivel}`;

  useEffect(() => {
    try { setMejor(JSON.parse(localStorage.getItem("arena-premios-mejor") ?? "{}")); } catch { setMejor({}); }
  }, []);
  useEffect(() => {
    if (!rep || fin != null) return;
    const t = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(t);
  }, [rep, fin]);

  if (!mazos.length) return <p className="text-sm text-muted">{tr(lng, "v136.pp.sinMazos")}</p>;

  const empezar = () => {
    setRep(repartir(cartas, Math.random));
    setApuestas([]); setFin(null); setInicio(Date.now()); setAhora(Date.now());
  };
  const comprobar = () => {
    if (!rep) return;
    const t = Date.now();
    setFin(t);
    const ok = aciertos(apuestas, rep.premios), seg = Math.round((t - inicio) / 1000);
    const previo = mejor[clave];
    if (!previo || ok > previo.ok || (ok === previo.ok && seg < previo.seg)) {
      const nuevo = { ...mejor, [clave]: { ok, seg } };
      setMejor(nuevo);
      try { localStorage.setItem("arena-premios-mejor", JSON.stringify(nuevo)); } catch { /* sin almacenamiento */ }
    }
  };
  const cuenta = (n: string) => apuestas.filter((a) => a === n).length;
  const poner = (n: string, max: number) => { if (fin == null && apuestas.length < 6 && cuenta(n) < max) setApuestas([...apuestas, n]); };
  const quitar = (n: string) => { if (fin != null) return; const i = apuestas.lastIndexOf(n); if (i >= 0) setApuestas(apuestas.filter((_, k) => k !== i)); };
  const mazoVisto: CartaSim[] = rep ? (nivel === "facil" ? [...rep.mazo].sort((a, b) => a.name.localeCompare(b.name, "es")) : rep.mazo) : [];
  const seg = rep ? Math.round(((fin ?? ahora) - inicio) / 1000) : 0;
  const ok = rep && fin != null ? aciertos(apuestas, rep.premios) : null;
  const solucion = rep && fin != null ? faltan(cartas, [...rep.mano, ...rep.mazo]) : null;

  return (
    <div>
      <p className="mb-3 text-sm text-muted">{tr(lng, "v137.sim.explica")}</p>
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <select className="input" value={mazoId} onChange={(e) => { setMazoId(e.target.value); setRep(null); }} aria-label={tr(lng, "v136.pp.mazo")}>
          {mazos.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <div className="seg">
          <button type="button" data-on={nivel === "facil"} onClick={() => { setNivel("facil"); setRep(null); }}>{tr(lng, "v137.sim.facil")}</button>
          <button type="button" data-on={nivel === "real"} onClick={() => { setNivel("real"); setRep(null); }}>{tr(lng, "v137.sim.real")}</button>
        </div>
        <button type="button" className="btn btn-brand" onClick={empezar} disabled={cartas.length < 13}>{tr(lng, rep ? "v137.sim.otra" : "v137.sim.empezar")}</button>
      </div>
      {mejor[clave] && <p className="mb-2 text-xs text-muted">{trf(lng, "v137.sim.mejor", { ok: mejor[clave].ok, s: mejor[clave].seg })}</p>}
      {cartas.length > 0 && cartas.length !== 60 && <p className="mb-2 text-xs text-loss">{trf(lng, "v137.sim.no60", { n: cartas.length })}</p>}

      {rep && (
        <>
          <p className="mb-2 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-display text-xl font-black tabular">⏱ {Math.floor(seg / 60)}:{String(seg % 60).padStart(2, "0")}</span>
            {rep.mulligans > 0 && <span className="chip text-[11px]">{trf(lng, "v137.sim.mulligans", { n: rep.mulligans })}</span>}
            <span className="text-muted">{trf(lng, "v137.sim.apostadas", { n: apuestas.length })}</span>
          </p>
          <p className="label mb-1">{tr(lng, "v137.sim.mano")}</p>
          <div className="sim-cartas mb-3">{rep.mano.map((c, i) => <span key={i} className="sim-carta" data-pk={c.pokemon}>{c.name}</span>)}</div>
          <p className="label mb-1">{tr(lng, "v137.sim.premios")}</p>
          <div className="sim-cartas mb-3">
            {rep.premios.map((c, i) => (
              <span key={i} className="sim-carta" data-dorso={fin == null} data-ok={fin != null && apuestas.includes(c.name)}>{fin == null ? "?" : c.name}</span>
            ))}
          </div>
          <details className="mb-3" open>
            <summary className="label cursor-pointer">{trf(lng, "v137.sim.mazo", { n: rep.mazo.length })}</summary>
            <div className="sim-cartas mt-1">{mazoVisto.map((c, i) => <span key={i} className="sim-carta sim-carta-mini" data-pk={c.pokemon}>{c.name}</span>)}</div>
          </details>
          <p className="label mb-1">{tr(lng, "v137.sim.tuApuesta")}</p>
          <ul className="mb-3 divide-y divide-line-soft rounded-lg border border-line-soft">
            {nombres.map(([n, max]) => {
              const k = cuenta(n), real = solucion?.get(n) ?? 0;
              return (
                <li key={n} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{max}× {n}</span>
                  {solucion && real > 0 && <span className="chip chip-win text-[10px]">{trf(lng, "v137.sim.estaban", { n: real })}</span>}
                  <div className="mt-contador w-28">
                    <button type="button" disabled={k === 0 || fin != null} onClick={() => quitar(n)} aria-label="−">−</button>
                    <output>{k}</output>
                    <button type="button" disabled={k >= max || apuestas.length >= 6 || fin != null} onClick={() => poner(n, max)} aria-label="+">+</button>
                  </div>
                </li>
              );
            })}
          </ul>
          {fin == null ? (
            <button type="button" className="btn btn-brand w-full" disabled={apuestas.length !== 6} onClick={comprobar}>{tr(lng, "v137.sim.comprobar")}</button>
          ) : (
            <p className="rounded-lg bg-surface-2 p-3 text-center font-display text-xl font-black">{trf(lng, "v137.sim.resultado", { ok: ok ?? 0, s: seg })}</p>
          )}
        </>
      )}
    </div>
  );
}
