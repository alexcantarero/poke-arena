"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";
import { pct } from "@/lib/format";
import { CLAVE_TIPO, COLOR_TIPO, TIPOS_PARTIDA } from "@/lib/tiposPartida";
import { agregar, arquetiposOrdenados, type FilaSeguimiento, type Granularidad } from "@/lib/seguimiento";

/* =========================================================================
   Seguimiento de jugadores en el tiempo. v0.50.

   Una línea por jugador, en días, semanas o meses; con partidas jugadas o %
   de victorias; filtrable por jugadores, tipo de partida y arquetipo. Al
   tocar un punto: partidas, récord, % y con qué arquetipos jugó cada uno.

   Pensada para el móvil primero: los filtros son chips de un toque, y debajo
   hay una tabla con el total de cada jugador, porque en una pantalla pequeña
   una tabla se lee mejor que un punto de cuatro píxeles.

   Con «% de victorias», un periodo sin partidas es un HUECO en la línea, no
   un 0 %: no jugar no es perder.
   ========================================================================= */

export type JugadorSeguimiento = { id: string; name: string; color: string };

type Props = { filas: FilaSeguimiento[]; jugadores: JugadorSeguimiento[] };

const MAX_INICIALES = 5;

export function SeguimientoJugadores({ filas, jugadores }: Props) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const loc = lng === "en" ? "en-GB" : "es-ES";

  // Por defecto, los cinco con más partidas: con veintidós líneas no se ve nada.
  const porActividad = useMemo(() => {
    const n = new Map<string, number>();
    for (const f of filas) n.set(f.p, (n.get(f.p) ?? 0) + 1);
    return jugadores.filter((j) => n.has(j.id)).sort((a, b) => (n.get(b.id) ?? 0) - (n.get(a.id) ?? 0));
  }, [filas, jugadores]);
  const arquetipos = useMemo(
    () => [...new Set(filas.map((f) => f.a).filter((a): a is string => Boolean(a)))].sort((a, b) => a.localeCompare(b)),
    [filas],
  );
  const tiposPresentes = useMemo(() => TIPOS_PARTIDA.filter((t) => filas.some((f) => f.t === t)), [filas]);

  const [elegidos, setElegidos] = useState<string[]>(() => porActividad.slice(0, MAX_INICIALES).map((j) => j.id));
  const [tipos, setTipos] = useState<string[]>(() => [...tiposPresentes]);
  const [arquetipo, setArquetipo] = useState<string>("");
  const [gran, setGran] = useState<Granularidad>("semana");
  const [metrica, setMetrica] = useState<"n" | "pct">("n");

  const { periodos, series } = useMemo(
    () => agregar(filas, { jugadores: elegidos, tipos, arquetipo: arquetipo || null, granularidad: gran }),
    [filas, elegidos, tipos, arquetipo, gran],
  );
  const porId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);

  const etiqueta = (p: string) => {
    if (gran === "mes") return new Intl.DateTimeFormat(loc, { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${p}-01T00:00:00Z`));
    return new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${p}T00:00:00Z`));
  };
  const datos = periodos.map((p, i) => {
    const fila: Record<string, number | string | null> = { periodo: p };
    for (const id of elegidos) {
      const c = series[id]?.[i];
      fila[id] = !c ? null : metrica === "n" ? c.n : c.pct == null ? null : Math.round(c.pct * 1000) / 10;
    }
    return fila;
  });
  const totales = elegidos.map((id) => {
    const s = series[id] ?? [];
    const t = s.reduce((a, c) => ({ n: a.n + c.n, w: a.w + c.w, l: a.l + c.l, t: a.t + c.t }), { n: 0, w: 0, l: 0, t: 0 });
    const arqs: Record<string, number> = {};
    for (const c of s) for (const [a, k] of Object.entries(c.arqs)) arqs[a] = (arqs[a] ?? 0) + k;
    const favorito = Object.entries(arqs).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { id, ...t, pct: t.n ? (t.w + t.t / 2) / t.n : null, favorito };
  }).sort((a, b) => b.n - a.n);

  const alterna = <T,>(lista: T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  const seg = (activo: boolean) => `chip ${activo ? "chip-brand" : ""}`;

  return (
    <section className="card min-w-0 overflow-hidden">
      <div className="card-head">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{tr(lng, "seg.titulo")}</h2>
          <p className="text-xs text-muted">{tr(lng, "seg.sub")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {/* Qué medir y cada cuánto */}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <div className="flex gap-1.5" role="group" aria-label={tr(lng, "seg.metrica")}>
            <button type="button" aria-pressed={metrica === "n"} className={seg(metrica === "n")} onClick={() => setMetrica("n")}>{tr(lng, "seg.partidas")}</button>
            <button type="button" aria-pressed={metrica === "pct"} className={seg(metrica === "pct")} onClick={() => setMetrica("pct")}>{tr(lng, "seg.pct")}</button>
          </div>
          <div className="flex gap-1.5" role="group" aria-label={tr(lng, "seg.cada")}>
            {(["dia", "semana", "mes"] as const).map((g) => (
              <button key={g} type="button" aria-pressed={gran === g} className={seg(gran === g)} onClick={() => setGran(g)}>{tr(lng, `seg.${g}`)}</button>
            ))}
          </div>
        </div>

        {/* Tipos de partida, con su color */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr(lng, "seg.tipos")}>
          {tiposPresentes.map((t) => (
            <button key={t} type="button" aria-pressed={tipos.includes(t)} onClick={() => setTipos((x) => alterna(x, t))}
              className={`chip inline-flex items-center gap-1.5 ${tipos.includes(t) ? "" : "opacity-50"}`}>
              <span className="size-2.5 rounded-sm" style={{ background: COLOR_TIPO[t] }} aria-hidden="true" />
              {tr(lng, CLAVE_TIPO[t])}
            </button>
          ))}
        </div>

        {/* Arquetipo */}
        <label className="flex min-w-0 flex-col gap-1">
          <span className="label">{tr(lng, "seg.arquetipo")}</span>
          <select className="input" value={arquetipo} onChange={(e) => setArquetipo(e.target.value)}>
            <option value="">{tr(lng, "seg.todosArq")}</option>
            {arquetipos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>

        {/* Jugadores, con su color de perfil */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr(lng, "seg.jugadores")}>
          {porActividad.map((j) => (
            <button key={j.id} type="button" aria-pressed={elegidos.includes(j.id)} onClick={() => setElegidos((x) => alterna(x, j.id))}
              className={`chip inline-flex items-center gap-1.5 ${elegidos.includes(j.id) ? "" : "opacity-50"}`}>
              <span className="size-2.5 rounded-full" style={{ background: j.color }} aria-hidden="true" />
              {j.name}
            </button>
          ))}
          <button type="button" className="chip text-info" onClick={() => setElegidos(porActividad.map((j) => j.id))}>{tr(lng, "seg.todos")}</button>
          <button type="button" className="chip" onClick={() => setElegidos([])}>{tr(lng, "seg.ninguno")}</button>
        </div>

        {periodos.length && elegidos.length ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datos} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line-soft)" />
                <XAxis dataKey="periodo" tickFormatter={etiqueta} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} minTickGap={18} />
                <YAxis allowDecimals={false} domain={metrica === "pct" ? [0, 100] : [0, "auto"]}
                  tickFormatter={(v: number) => (metrica === "pct" ? `${v}%` : String(v))}
                  tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, label }) => {
                    if (!active || label == null) return null;
                    const i = periodos.indexOf(String(label));
                    const filasT = elegidos
                      .map((id) => ({ id, c: series[id]?.[i] }))
                      .filter((x) => x.c && x.c.n > 0)
                      .sort((a, b) => b.c!.n - a.c!.n);
                    return (
                      <div className="max-w-[18rem] rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[var(--shadow-2)]">
                        <div className="mb-1 font-bold">{etiqueta(String(label))}</div>
                        {filasT.length ? filasT.map(({ id, c }) => (
                          <div key={id} className="mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="size-2 rounded-full" style={{ background: porId.get(id)?.color }} />
                              <b>{porId.get(id)?.name}</b>
                              <span className="ml-auto tabular text-muted">{c!.w}–{c!.l}{c!.t ? `–${c!.t}` : ""} · {pct(c!.pct, 0)}</span>
                            </div>
                            <div className="pl-3.5 text-muted">
                              {arquetiposOrdenados(c!).slice(0, 3).map(([a, k]) => `${a} ×${k}`).join(" · ") || tr(lng, "seg.sinArq")}
                            </div>
                          </div>
                        )) : <div className="text-muted">{tr(lng, "seg.nadie")}</div>}
                      </div>
                    );
                  }}
                />
                {elegidos.map((id) => (
                  <Line key={id} type="linear" dataKey={id} name={porId.get(id)?.name ?? id}
                    stroke={porId.get(id)?.color ?? "var(--info)"} strokeWidth={2}
                    dot={{ r: 2.5 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted">{tr(lng, "seg.vacio")}</p>
        )}

        {/* El total de cada uno: en el móvil se lee mejor que la gráfica */}
        {totales.length > 0 && (
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  <th className="py-1.5 pr-2">{tr(lng, "seg.jugador")}</th>
                  <th className="py-1.5 pr-2 text-right">{tr(lng, "seg.partidas")}</th>
                  <th className="py-1.5 pr-2 text-right">V–D–E</th>
                  <th className="py-1.5 pr-2 text-right">%V</th>
                  <th className="py-1.5">{tr(lng, "seg.masJugado")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {totales.map((t) => (
                  <tr key={t.id}>
                    <td className="py-1.5 pr-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ background: porId.get(t.id)?.color }} />
                        {porId.get(t.id)?.name}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular">{t.n}</td>
                    <td className="py-1.5 pr-2 text-right tabular">{t.w}–{t.l}–{t.t}</td>
                    <td className="py-1.5 pr-2 text-right tabular">{pct(t.pct, 0)}</td>
                    <td className="py-1.5 text-muted">{t.favorito ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">{trf(lng, "seg.pie", { n: periodos.length })}</p>
          </div>
        )}
      </div>
    </section>
  );
}
