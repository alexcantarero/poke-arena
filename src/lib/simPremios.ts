/* =========================================================================
   v0.137 — SIMULADOR DE PREMIOS: repartir una partida y adivinar qué quedó
   en premios, como el «prize check» del primer turno.

   Sin imports, para probarlo. `azar` entra por parámetro (en las pruebas, uno
   fijo; en la app, Math.random).
   ========================================================================= */

export type CartaSim = { name: string; pokemon: boolean };
export type Reparto = { mano: CartaSim[]; premios: CartaSim[]; mazo: CartaSim[]; mulligans: number };

/** La lista en 60 cartas sueltas. */
export function expandir(lista: { pokemon?: unknown; trainer?: unknown; energy?: unknown } | null | undefined): CartaSim[] {
  const out: CartaSim[] = [];
  if (!lista || typeof lista !== "object") return out;
  const secciones: Array<[unknown, boolean]> = [[lista.pokemon, true], [lista.trainer, false], [lista.energy, false]];
  for (const [sec, pokemon] of secciones) {
    if (!Array.isArray(sec)) continue;
    for (const c of sec as Array<{ n?: unknown; name?: unknown }>) {
      const n = Number(c?.n), name = typeof c?.name === "string" ? c.name.trim() : "";
      if (!name || !Number.isInteger(n) || n <= 0) continue;
      for (let i = 0; i < Math.min(n, 60); i++) out.push({ name, pokemon });
    }
  }
  return out;
}

export function barajar<T>(xs: readonly T[], azar: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Como en la mesa: se roban 7; sin Pokémon en la mano, mulligan (se vuelve a
 * barajar y a robar). Después, 6 premios. Lo demás es el mazo.
 * (No sabemos qué Pokémon son básicos: cualquier Pokémon vale para no hacer mulligan.)
 */
export function repartir(cartas: readonly CartaSim[], azar: () => number, maxMulligans = 20): Reparto {
  let mulligans = 0;
  let b = barajar(cartas, azar);
  while (!b.slice(0, 7).some((c) => c.pokemon) && mulligans < maxMulligans && cartas.some((c) => c.pokemon)) {
    mulligans++;
    b = barajar(cartas, azar);
  }
  return { mano: b.slice(0, 7), premios: b.slice(7, 13), mazo: b.slice(13), mulligans };
}

/** Cuántas de tus apuestas acertaron: la intersección como multiconjunto (dos Boss apostados, uno en premios = 1). */
export function aciertos(apuestas: readonly string[], premios: readonly CartaSim[]): number {
  const quedan = new Map<string, number>();
  for (const p of premios) quedan.set(p.name, (quedan.get(p.name) ?? 0) + 1);
  let ok = 0;
  for (const a of apuestas) {
    const n = quedan.get(a) ?? 0;
    if (n > 0) { ok++; quedan.set(a, n - 1); }
  }
  return ok;
}

/** Lo que falta de cada carta en mano + mazo respecto a la lista: exactamente lo que está en premios. */
export function faltan(lista: readonly CartaSim[], vistas: readonly CartaSim[]): Map<string, number> {
  const n = new Map<string, number>();
  for (const c of lista) n.set(c.name, (n.get(c.name) ?? 0) + 1);
  for (const c of vistas) n.set(c.name, (n.get(c.name) ?? 0) - 1);
  return new Map([...n].filter(([, k]) => k > 0));
}
