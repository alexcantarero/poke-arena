/* =========================================================================
   v0.90 — El resumen de tu torneo (al cerrarlo): récord, y el mejor y el peor
   emparejamiento de los que jugaste. Sin imports, para probarlo.
   ========================================================================= */
export type RondaResumen = { rival: string; nombre: string; r: "w" | "l" | "t" };
export type Cruce = { rival: string; nombre: string; w: number; l: number; t: number };

export function resumenTorneo(rondas: RondaResumen[]) {
  const w = rondas.filter((x) => x.r === "w").length;
  const l = rondas.filter((x) => x.r === "l").length;
  const t = rondas.filter((x) => x.r === "t").length;
  const por = new Map<string, Cruce>();
  for (const x of rondas) {
    if (!x.rival) continue;
    const c = por.get(x.rival) ?? { rival: x.rival, nombre: x.nombre, w: 0, l: 0, t: 0 };
    c[x.r]++;
    por.set(x.rival, c);
  }
  const saldo = (c: Cruce) => (c.w - c.l) / (c.w + c.l + c.t);
  const lista = [...por.values()];
  const mejor = [...lista].filter((c) => c.w > 0).sort((a, b) => saldo(b) - saldo(a) || b.w - a.w)[0] ?? null;
  const peor = [...lista].filter((c) => c.l > 0).sort((a, b) => saldo(a) - saldo(b) || b.l - a.l)[0] ?? null;
  return { w, l, t, mejor, peor: peor && mejor && peor.rival === mejor.rival ? null : peor };
}
