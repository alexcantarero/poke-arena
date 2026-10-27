/* =========================================================================
   v0.71 — Las cuentas de «Herramientas».

   Sin imports, como el resto de módulos que se prueban: lo que haga falta
   (la estructura oficial del torneo, por ejemplo) entra por parámetro.

   Tres herramientas, y las tres contestan con NÚMEROS QUE NUNCA SON NaN: si
   la entrada no tiene sentido (más básicos que cartas, un mazo de 0…), se
   devuelve `null` y la pantalla dice qué falla. Una tabla de «NaN%» no es una
   respuesta.

   1. CALCULADORA SUIZA. Mejora a la de `cut.ts`: aquella es una binomial (cada
      ronda, una moneda al aire). Aquí se SIMULA el torneo de verdad, con el
      emparejamiento suizo por puntos, empates, byes y, si el torneo es de dos
      fases, el corte del Día 2. El emparejamiento por puntos hace el reparto
      más plano que la binomial, y es justo lo que movía la línea de corte.
      Todos con la misma fuerza: es el modelo del campo, no de una persona.
   2. PREMIOS. Probabilidad exacta (hipergeométrica) de que una carta, o dos,
      acaben en premios.
   3. CONSISTENCIA. Probabilidad exacta de abrir con alguna «salida» (Drakloak,
      Meowth, Lillie… las que el jugador cuente) SABIENDO que no hay mulligan,
      con o sin el robo del primer turno.
   ========================================================================= */

/* ------------------------------------------------------------ comunes -- */

/** Combinaciones C(n, k) en coma flotante. 0 si k está fuera de rango. */
export function comb(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/** P(exactamente k éxitos al sacar n de una población N con K éxitos). */
export function hiper(N: number, K: number, n: number, k: number): number {
  const total = comb(N, n);
  return total ? (comb(K, k) * comb(N - K, n - k)) / total : 0;
}

const entero = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r < min || r > max ? null : r;
};

/** Generador pseudoaleatorio con semilla (mulberry32): para que los tests sean repetibles. */
export function generador(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------ premios -- */

export type Premios = { exacto: number[]; alMenosUna: number; todas: number };

/** Una carta con `copias` en un mazo de `mazo`, y `premios` cartas de premio. */
export function premiosDeCarta(copias: number, mazo = 60, premios = 6): Premios | null {
  const N = entero(mazo, 1, 200), K = entero(copias, 0, 60), P = entero(premios, 1, 10);
  if (N == null || K == null || P == null || K > N || P > N) return null;
  const exacto = Array.from({ length: Math.min(K, P) + 1 }, (_, j) => hiper(N, K, P, j));
  return { exacto, alMenosUna: 1 - exacto[0], todas: K === 0 ? 0 : K <= P ? exacto[K] : 0 };
}

/**
 * Dos cartas distintas (A copias de una, B de otra). Lo que se pregunta en la
 * mesa: «¿qué probabilidad hay de que me falte alguna de las dos?» —
 * `alguna` — y «¿de que tenga al menos una de cada en premios?» — `ambas`.
 */
export function premiosDeDos(a: number, b: number, mazo = 60, premios = 6): { alguna: number; ambas: number; todasDeAlguna: number } | null {
  const N = entero(mazo, 1, 200), A = entero(a, 0, 60), B = entero(b, 0, 60), P = entero(premios, 1, 10);
  if (N == null || A == null || B == null || P == null || A + B > N || P > N) return null;
  const total = comb(N, P);
  let ninguna = 0, ambas = 0, todasA = 0, todasB = 0, todasAyB = 0;
  for (let x = 0; x <= Math.min(A, P); x++) {
    for (let y = 0; y <= Math.min(B, P - x); y++) {
      const p = (comb(A, x) * comb(B, y) * comb(N - A - B, P - x - y)) / total;
      if (x === 0 && y === 0) ninguna += p;
      if (x > 0 && y > 0) ambas += p;
      if (A > 0 && x === A) todasA += p;
      if (B > 0 && y === B) todasB += p;
      if (A > 0 && B > 0 && x === A && y === B) todasAyB += p;
    }
  }
  return { alguna: 1 - ninguna, ambas, todasDeAlguna: todasA + todasB - todasAyB };
}

/* -------------------------------------------------------- consistencia -- */

export type Consistencia = {
  /** P(mulligan): ningún básico en las 7. */
  mulligan: number;
  /** P(al menos una salida en la mano de 7 | sin mulligan). */
  enMano: number;
  /** Igual, contando también la carta que se roba al empezar el turno. */
  conRobo: number;
};

/**
 * @param basicos         Básicos del mazo (todos).
 * @param salidas         Cartas de «salida» que cuentas (Drakloak, Meowth, Lillie…).
 * @param salidasBasicas  Cuántas de esas salidas son básicos (Meowth sí, Lillie no).
 */
export function consistencia(mazo: number, basicos: number, salidas: number, salidasBasicas: number, mano = 7): Consistencia | null {
  const N = entero(mazo, 8, 200), B = entero(basicos, 1, 60), C = entero(salidas, 0, 60), CB = entero(salidasBasicas, 0, 60), H = entero(mano, 1, 10);
  if (N == null || B == null || C == null || CB == null || H == null) return null;
  if (CB > C || CB > B || B + (C - CB) > N || H >= N) return null;
  // Cuatro grupos sin solaparse: salidas básicas (X), salidas no básicas (Y),
  // otros básicos (Z) y el resto (W).
  const X = CB, Y = C - CB, Z = B - CB, W = N - B - Y;
  const total = comb(N, H);
  let sinMull = 0, okMano = 0, okRobo = 0;
  for (let x = 0; x <= Math.min(X, H); x++)
    for (let y = 0; y <= Math.min(Y, H - x); y++)
      for (let z = 0; z <= Math.min(Z, H - x - y); z++) {
        const w = H - x - y - z;
        if (w > W) continue;
        const p = (comb(X, x) * comb(Y, y) * comb(Z, z) * comb(W, w)) / total;
        if (x + z === 0) continue; // mulligan: no cuenta
        sinMull += p;
        if (x + y > 0) { okMano += p; okRobo += p; }
        else okRobo += p * ((X - x + Y - y) / (N - H));
      }
  if (!(sinMull > 0)) return null;
  return { mulligan: 1 - sinMull, enMano: okMano / sinMull, conRobo: okRobo / sinMull };
}

/* ---------------------------------------------------- calculadora suiza -- */

export type ConfigSuizo = {
  jugadores: number;
  /** Rondas suizas totales (las dos fases juntas, si las hay). */
  rondas: number;
  /** Tamaño del corte (0 = sin corte). */
  corte: number;
  /** Probabilidad de empate en cada partida (0–0,5). */
  pEmpate: number;
  /** Dos fases: rondas de la fase uno y puntos para pasar al Día 2. */
  fase1?: number | null;
  umbralDia2?: number | null;
  /** Corte asimétrico: entran todos los empatados con el último, hasta `maxCorte`. */
  asimetrico?: boolean;
  maxCorte?: number;
  iteraciones?: number;
  azar?: () => number;
};

export type FilaSuiza = {
  puntos: number;
  /** Récords que dan esos puntos, del más limpio al más raro: «4-1-0». */
  records: string[];
  /** Cuántos acaban con esos puntos, de media por torneo. */
  esperados: number;
  /** De los que acaban con esos puntos, qué fracción entra en el corte. */
  pCorte: number;
};

export type ResultadoSuizo = {
  filas: FilaSuiza[];
  /** De media, cuántos pasan al Día 2 (dos fases) o null. */
  diaDos: number | null;
  /** Puntos mínimos con los que se entra SIEMPRE (pCorte ≥ 0,995) y con los que se entra a veces. */
  seguro: number | null;
  posible: number | null;
};

/** Récords V-D-E que suman `puntos` en `rondas` rondas (3/1/0). */
export function recordsDePuntos(puntos: number, rondas: number): string[] {
  const out: string[] = [];
  for (let e = 0; e <= rondas; e++) {
    const v = (puntos - e) / 3;
    if (!Number.isInteger(v) || v < 0 || v + e > rondas) continue;
    out.push(`${v}-${rondas - v - e}-${e}`);
  }
  return out;
}

/**
 * Simula `iteraciones` torneos suizos. Emparejamiento por puntos (dentro de
 * cada grupo, al azar; si un grupo es impar, el que sobra baja al siguiente),
 * bye al último si el total es impar (cuenta como victoria). El desempate
 * del corte, al azar: es lo que hace la resistencia cuando todos tienen la
 * misma fuerza.
 */
export function simularSuizo(cfg: ConfigSuizo): ResultadoSuizo | null {
  const N = entero(cfg.jugadores, 4, 5000), R = entero(cfg.rondas, 1, 20), C = entero(cfg.corte, 0, 512);
  const t = Number.isFinite(cfg.pEmpate) ? Math.min(0.5, Math.max(0, cfg.pEmpate)) : 0;
  if (N == null || R == null || C == null || C > N) return null;
  const f1 = cfg.fase1 && cfg.umbralDia2 != null ? entero(cfg.fase1, 1, R) : null;
  const umbral = f1 != null ? cfg.umbralDia2 ?? null : null;
  const maxCorte = cfg.asimetrico ? Math.max(C, cfg.maxCorte ?? C) : C;
  const it = entero(cfg.iteraciones ?? Math.max(60, Math.min(600, Math.round(400000 / (N * R)))), 1, 5000) ?? 200;
  const azar = cfg.azar ?? Math.random;

  const maxPts = 3 * R;
  const cuenta = new Float64Array(maxPts + 1);
  const enCorte = new Float64Array(maxPts + 1);
  let sumaDia2 = 0;
  const pts = new Int16Array(N);
  const vivo = new Uint8Array(N);

  const jugarRonda = () => {
    // Grupos por puntos, de más a menos, barajados dentro.
    const grupos = new Map<number, number[]>();
    for (let i = 0; i < N; i++) if (vivo[i]) {
      const g = grupos.get(pts[i]);
      if (g) g.push(i); else grupos.set(pts[i], [i]);
    }
    const orden: number[] = [];
    for (const k of [...grupos.keys()].sort((a, b) => b - a)) {
      const g = grupos.get(k)!;
      for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; }
      orden.push(...g);
    }
    if (orden.length % 2 === 1) pts[orden.pop()!] += 3; // bye
    for (let i = 0; i < orden.length; i += 2) {
      const r = azar();
      if (r < t) { pts[orden[i]] += 1; pts[orden[i + 1]] += 1; }
      else if (r < t + (1 - t) / 2) pts[orden[i]] += 3;
      else pts[orden[i + 1]] += 3;
    }
  };

  for (let k = 0; k < it; k++) {
    pts.fill(0); vivo.fill(1);
    for (let r = 1; r <= R; r++) {
      jugarRonda();
      if (f1 != null && r === f1 && umbral != null) {
        let n2 = 0;
        for (let i = 0; i < N; i++) { if (pts[i] < umbral) vivo[i] = 0; else n2++; }
        sumaDia2 += n2;
      }
    }
    // Corte: por puntos y, a igualdad, al azar.
    const vivos: Array<[number, number]> = [];
    for (let i = 0; i < N; i++) {
      cuenta[pts[i]] += 1;
      if (vivo[i]) vivos.push([pts[i], azar()]);
    }
    vivos.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    if (C > 0 && vivos.length) {
      let n = Math.min(C, vivos.length);
      if (cfg.asimetrico && n < vivos.length) {
        const ultimo = vivos[n - 1][0];
        while (n < vivos.length && n < maxCorte && vivos[n][0] === ultimo) n++;
      }
      for (let i = 0; i < n; i++) enCorte[vivos[i][0]] += 1;
    }
  }

  const filas: FilaSuiza[] = [];
  for (let p = maxPts; p >= 0; p--) {
    if (!cuenta[p]) continue;
    filas.push({ puntos: p, records: recordsDePuntos(p, R), esperados: cuenta[p] / it, pCorte: enCorte[p] / cuenta[p] });
  }
  const seguro = filas.filter((f) => f.pCorte >= 0.995).at(-1)?.puntos ?? null;
  const posible = filas.filter((f) => f.pCorte > 0.005).at(-1)?.puntos ?? null;
  return { filas, diaDos: f1 != null ? sumaDia2 / it : null, seguro, posible };
}

/**
 * «¿Qué me falta?»: con tu récord actual y las rondas que quedan, la
 * probabilidad de acabar en el corte, ponderando cada final posible por cómo
 * de probable es llegar a él (cada ronda: gana, pierde o empata) y por la
 * fracción que entra con esos puntos según la simulación.
 */
export function probCorteDesde(puntosAhora: number, rondasQuedan: number, pEmpate: number, filas: FilaSuiza[]): number {
  const t = Math.min(0.5, Math.max(0, Number.isFinite(pEmpate) ? pEmpate : 0));
  const pc = new Map(filas.map((f) => [f.puntos, f.pCorte]));
  let dist = new Map<number, number>([[Math.max(0, Math.round(puntosAhora)), 1]]);
  for (let r = 0; r < Math.max(0, Math.round(rondasQuedan)); r++) {
    const sig = new Map<number, number>();
    for (const [p, q] of dist) {
      sig.set(p + 3, (sig.get(p + 3) ?? 0) + q * (1 - t) / 2);
      sig.set(p, (sig.get(p) ?? 0) + q * (1 - t) / 2);
      if (t > 0) sig.set(p + 1, (sig.get(p + 1) ?? 0) + q * t);
    }
    dist = sig;
  }
  let total = 0;
  for (const [p, q] of dist) total += q * (pc.get(p) ?? 0);
  return total;
}
