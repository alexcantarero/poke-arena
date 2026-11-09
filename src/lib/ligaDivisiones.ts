/* =========================================================================
   v0.116 — Liga por divisiones: el reparto y el calendario de jornadas.

   Sin imports, para probarlo.

   · REPARTO de la primera edición: al AZAR, con una semilla que se guarda.
     Con la misma semilla sale el mismo sorteo, así que cualquiera puede
     comprobar que no se tocó a mano, y el organizador puede «volver a
     sortear» (semilla nueva) antes de empezar.
   · TAMAÑOS equilibrados con un tope por división (6 por defecto): con 14
     personas salen 5 / 5 / 4, no 6 / 6 / 2. Las divisiones de arriba se
     llevan el sobrante.
   · JORNADAS: todos contra todos por el método del círculo. Con un número
     impar, cada jornada descansa uno (y nadie descansa dos veces).
   ========================================================================= */

/** Hash FNV-1a de 32 bits: convierte la semilla (texto) en un número. */
export function hashSemilla(semilla: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < semilla.length; i++) {
    h ^= semilla.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Generador pseudoaleatorio reproducible (mulberry32). */
export function azarDe(semilla: string): () => number {
  let a = hashSemilla(semilla);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Barajado de Fisher-Yates con la semilla. No toca la lista original. */
export function barajar<T>(lista: readonly T[], semilla: string): T[] {
  const r = azarDe(semilla);
  const out = [...lista];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Tamaños de las divisiones: el mínimo número de divisiones con el tope, lo más iguales posible. */
export function tamanosDivisiones(n: number, maximo: number): number[] {
  if (n <= 0) return [];
  const tope = Math.max(2, Math.floor(maximo));
  const k = Math.ceil(n / tope);
  const base = Math.floor(n / k);
  const sobra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < sobra ? 1 : 0));
}

/** Parte una lista ya ordenada en divisiones (la 1.ª es la de arriba). */
export function partirEnDivisiones<T>(orden: readonly T[], maximo: number): T[][] {
  const out: T[][] = [];
  let i = 0;
  for (const t of tamanosDivisiones(orden.length, maximo)) {
    out.push(orden.slice(i, i + t));
    i += t;
  }
  return out;
}

/** El sorteo de la primera edición. */
export function sortearDivisiones(ids: readonly string[], maximo: number, semilla: string): string[][] {
  // Se ordena antes de barajar: el resultado no depende del orden en que llegaron.
  return partirEnDivisiones(barajar([...ids].sort(), semilla), maximo);
}

/**
 * Todos contra todos por el método del círculo. Devuelve las jornadas; cada
 * jornada, sus cruces. Con un número impar se añade un «descanso» (null) y
 * quien cae contra él no juega esa jornada.
 */
export function todosContraTodos(ids: readonly string[]): Array<{ cruces: Array<[string, string]>; descansa: string | null }> {
  const lista: Array<string | null> = [...ids];
  if (lista.length < 2) return [];
  if (lista.length % 2 === 1) lista.push(null);
  const n = lista.length;
  const jornadas: Array<{ cruces: Array<[string, string]>; descansa: string | null }> = [];
  let rueda = [...lista];
  for (let r = 0; r < n - 1; r++) {
    const cruces: Array<[string, string]> = [];
    let descansa: string | null = null;
    for (let i = 0; i < n / 2; i++) {
      const a = rueda[i], b = rueda[n - 1 - i];
      if (a == null) { descansa = b; continue; }
      if (b == null) { descansa = a; continue; }
      // Se alterna quién va primero para que nadie sea siempre «A».
      cruces.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    jornadas.push({ cruces, descansa });
    // El primero queda fijo; el resto gira una posición.
    rueda = [rueda[0], rueda[n - 1], ...rueda.slice(1, n - 1)];
  }
  return jornadas;
}

/** La fecha de la jornada `k` (1, 2, 3…): una por semana desde el inicio. */
export function fechaJornada(inicio: string, k: number, diasEntre = 7): string {
  const d = new Date(`${inicio.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + (k - 1) * diasEntre);
  return d.toISOString().slice(0, 10);
}

/* =========================================================================
   v0.116 (cierre) — Clasificación de una división, ascensos y descensos, y
   el reparto de la temporada siguiente.
   ========================================================================= */

export type PartidaDivision = { a: string; b: string; ga: number; gb: number; ganador: "a" | "b" | "tie" | null };

export type FilaDivision = {
  id: string; jugadas: number; v: number; e: number; d: number; puntos: number;
  juegosFavor: number; juegosContra: number; owp: number | null;
};

/**
 * Clasificación de una división (series al mejor de 3). Desempates, en orden:
 *   1. puntos de serie (3 / 1 / 0);
 *   2. enfrentamiento directo, SOLO si empatan exactamente dos;
 *   3. diferencia de juegos;
 *   4. % de victorias de los rivales (suelo del 25 %, como Play! Pokémon);
 *   5. id, para que el orden sea siempre el mismo.
 * Las partidas sin resultado (`ganador` nulo) no cuentan.
 */
export function clasificarDivision(ids: readonly string[], partidas: readonly PartidaDivision[]): FilaDivision[] {
  const f = new Map<string, FilaDivision & { rivales: string[] }>();
  for (const id of ids) f.set(id, { id, jugadas: 0, v: 0, e: 0, d: 0, puntos: 0, juegosFavor: 0, juegosContra: 0, owp: null, rivales: [] });
  const jugadas = partidas.filter((p) => p.ganador && f.has(p.a) && f.has(p.b));
  for (const p of jugadas) {
    const A = f.get(p.a)!, B = f.get(p.b)!;
    A.jugadas++; B.jugadas++;
    A.juegosFavor += p.ga; A.juegosContra += p.gb; B.juegosFavor += p.gb; B.juegosContra += p.ga;
    A.rivales.push(p.b); B.rivales.push(p.a);
    if (p.ganador === "a") { A.v++; B.d++; A.puntos += 3; }
    else if (p.ganador === "b") { B.v++; A.d++; B.puntos += 3; }
    else { A.e++; B.e++; A.puntos++; B.puntos++; }
  }
  const pct = (x: FilaDivision) => (x.jugadas ? Math.max(0.25, (x.v + 0.5 * x.e) / x.jugadas) : 0.25);
  for (const x of f.values()) x.owp = x.rivales.length ? x.rivales.reduce((s, r) => s + pct(f.get(r)!), 0) / x.rivales.length : null;

  const directo = (a: string, b: string): number => {
    let pa = 0, pb = 0;
    for (const p of jugadas) {
      if (!((p.a === a && p.b === b) || (p.a === b && p.b === a))) continue;
      const ganaA = (p.ganador === "a" && p.a === a) || (p.ganador === "b" && p.b === a);
      const ganaB = (p.ganador === "a" && p.a === b) || (p.ganador === "b" && p.b === b);
      if (ganaA) pa += 3; else if (ganaB) pb += 3; else { pa++; pb++; }
    }
    return pb - pa;
  };
  const filas = [...f.values()];
  const empatadosEnPuntos = (p: number) => filas.filter((x) => x.puntos === p).length;
  filas.sort((x, y) => y.puntos - x.puntos
    || (empatadosEnPuntos(x.puntos) === 2 ? directo(x.id, y.id) : 0)
    || (y.juegosFavor - y.juegosContra) - (x.juegosFavor - x.juegosContra)
    || (y.owp ?? 0) - (x.owp ?? 0)
    || x.id.localeCompare(y.id));
  return filas.map(({ rivales: _r, ...x }) => x);
}

export type Movimiento = { sube: string[]; baja: string[] };

/**
 * Quién sube y quién baja de cada división, con su clasificación final.
 * Suben los `n` primeros (no en la División 1) y bajan los `n` últimos (no en
 * la última). En una división muy pequeña se limita para que nadie suba y
 * baje a la vez.
 */
export function movimientos(ordenes: readonly string[][], n = 2): Movimiento[] {
  return ordenes.map((orden, i) => {
    const tope = Math.min(n, Math.floor(orden.length / 2));
    const esPrimera = i === 0, esUltima = i === ordenes.length - 1;
    return {
      sube: esPrimera ? [] : orden.slice(0, tope),
      baja: esUltima ? [] : orden.slice(orden.length - tope),
    };
  });
}

/**
 * El reparto de la temporada siguiente: se aplican los ascensos y descensos,
 * se quita a quien no se ha vuelto a apuntar, los nuevos entran por la última
 * división y se reequilibra con el tope por división (manteniendo el orden de
 * niveles: nadie de una división de abajo adelanta a una de arriba).
 */
export function siguienteReparto(ordenes: readonly string[][], inscritos: readonly string[], maximo: number, n = 2): string[][] {
  const mov = movimientos(ordenes, n);
  const nuevas = ordenes.map((orden, i) => {
    const salen = new Set([...mov[i].sube, ...mov[i].baja]);
    return [
      ...(i > 0 ? mov[i - 1].baja : []),
      ...orden.filter((id) => !salen.has(id)),
      ...(i < ordenes.length - 1 ? mov[i + 1].sube : []),
    ];
  });
  // Se reordena para que los que suben queden arriba de su nueva división: no
  // importa para el calendario, pero hace el reparto legible.
  const vale = new Set(inscritos);
  const antes = new Set(ordenes.flat());
  const plano = nuevas.flat().filter((id) => vale.has(id));
  const nuevos = [...inscritos].filter((id) => !antes.has(id)).sort();
  return partirEnDivisiones([...plano, ...nuevos], maximo);
}
