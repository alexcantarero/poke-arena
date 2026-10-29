/* =========================================================================
   v0.74 — El recomendador de mazos: qué jugar en el siguiente torneo.

   Sin imports: los datos entran ya agregados (ver `recomendadorDatos.ts`), y
   las cuentas aquí son puras y probadas.

   1. UN MAZO = SU POKÉMON LÍDER. «Dragapult ex», «Dragapult / Dusknoir» y
      «dragapult-dusknoir» son el mismo arquetipo base: Dragapult. Lo que lo
      acompaña son variantes. Así se cruzan Limitless, las City Leagues, los
      Regionales y vuestros datos sin mantener tablas de equivalencias.
   2. EL CAMPO: qué se va a jugar en ESE tipo de torneo. Cada fuente aporta su
      cuota con un peso que depende del tipo (en un Regional mandan los
      Regionales; en una Challenge, lo que se juega en vuestras tiendas). Una
      fuente con pocos datos pesa menos (encogimiento n / (n + k)).
   3. LOS EMPAREJAMIENTOS: % de cada mazo contra cada otro, sumando partidas de
      todas las fuentes y encogido hacia el 50 % (con 6 partidas no se puede
      decir «ganas el 83 %»). Son partidas al mejor de 1 casi todas (online,
      City Leagues): en un torneo al mejor de 3 se convierte — p²(3 − 2p).
   4. LA RONDA: probabilidad de ganar una ronda = media de los emparejamientos
      pesada por el campo. El espejo y lo desconocido cuentan como 50 %.
   5. EL TORNEO: con esa probabilidad y la estructura oficial (rondas, Día 2,
      top cut), la probabilidad de pasar al Día 2, entrar en el corte y ganar.
      La línea de corte sale de la calculadora suiza (`simularSuizo`).

   Todo es una ESTIMACIÓN para ordenar opciones, no una predicción. La
   pantalla lo dice y enseña cuántos datos hay detrás de cada cifra.
   ========================================================================= */

/* ------------------------------------------------------------ el líder -- */

/** El Pokémon líder de un nombre de arquetipo, como slug de sprite. */
export function liderDe(nombre: string | null | undefined): string {
  let s = (nombre ?? "").trim();
  if (!s) return "";
  // Lo primero que se nombra es el líder: «Dragapult / Dusknoir», «Gardevoir & Jellicent», «Raging Bolt Ogerpon».
  s = s.split(/\s*(?:\/|&|\+|,|\bwith\b|\bcon\b|\by\b)\s*/i)[0];
  s = s.replace(/^(?:team\s+)?[a-zà-ÿ'’.]+(?:'s|’s)\s+/i, ""); // «N's Zoroark» → Zoroark
  const mega = /^mega[\s-]+/i.test(s);
  if (mega) s = s.replace(/^mega[\s-]+/i, "");
  s = s.replace(/[\s-]+(ex|v|vmax|vstar|gx)$/i, "");
  s = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['’.]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (mega && !s.endsWith("-mega")) s = `${s}-mega`;
  return s;
}

/* ------------------------------------------------------------- tipos -- */

export type TipoTorneo = "league_challenge" | "league_cup" | "regional" | "city_league";
export type Objetivo = "ganar" | "top" | "dia2" | "positivo";

export type Cruce = { a: string; b: string; w: number; l: number; t: number };

export type Fuente = {
  id: string;
  /** Lo que se juega: líder → cuántas listas o partidas. */
  cuota: Record<string, number>;
  /** Emparejamientos (de A contra B, por partidas). Opcional. */
  cruces?: Cruce[];
  /** Conversión real al corte, si la fuente tiene puestos: líder → {listas, enCorte}. */
  conversion?: Record<string, { n: number; corte: number }>;
};

/** Cuánto pesa cada fuente en el campo de cada tipo de torneo. */
/* v0.76 — lo online pesa sobre todo en las Challenges (suizo al mejor de 1,
   como casi todo lo online), poco en las Cups (allí solo el top cut es al
   mejor de 3) y casi nada en los Regionales. */
export const PESOS_CAMPO: Record<TipoTorneo, Record<string, number>> = {
  regional: { regionales: 0.7, cityleagues: 0.2, online: 0.05, grupo: 0.05 },
  league_cup: { grupo: 0.45, cityleagues: 0.4, online: 0.1, regionales: 0.05 },
  league_challenge: { grupo: 0.4, online: 0.35, cityleagues: 0.2, regionales: 0.05 },
  city_league: { cityleagues: 0.75, online: 0.15, regionales: 0.1 },
};

/**
 * v0.76 — Cuánto cuentan los EMPAREJAMIENTOS de cada fuente según el torneo.
 * Una partida online cuenta entera para una Challenge y bastante menos para
 * un Regional: sus partidas se multiplican por este peso, así que con menos
 * peso el % se acerca más al 50 % (menos confianza), sin perder la señal.
 */
export const PESOS_CRUCES: Record<TipoTorneo, Record<string, number>> = {
  regional: { online: 0.15, grupo: 1 },
  league_cup: { online: 0.3, grupo: 1 },
  league_challenge: { online: 1, grupo: 1 },
  city_league: { online: 0.5, grupo: 1 },
};

/** Al mejor de 3 (Regional, Cup, Challenge) o de 1 (City League, suizo). */
export const AL_MEJOR_DE: Record<TipoTorneo, 1 | 3> = { regional: 3, league_cup: 3, league_challenge: 3, city_league: 1 };

/* -------------------------------------------------------------- campo -- */

/** Reparto esperado del campo: líder → fracción (suma 1). `k`: datos para fiarse de una fuente. */
export function campoDe(tipo: TipoTorneo, fuentes: Fuente[], k = 30): Record<string, number> {
  const pesos = PESOS_CAMPO[tipo];
  const out: Record<string, number> = {};
  let totalPeso = 0;
  for (const f of fuentes) {
    const base = pesos[f.id] ?? 0;
    const n = Object.values(f.cuota).reduce((a, b) => a + b, 0);
    if (!base || !n) continue;
    const peso = base * (n / (n + k));
    totalPeso += peso;
    for (const [l, c] of Object.entries(f.cuota)) if (l) out[l] = (out[l] ?? 0) + peso * (c / n);
  }
  if (!totalPeso) return {};
  for (const l of Object.keys(out)) out[l] /= totalPeso;
  return out;
}

/* ------------------------------------------------------ emparejamientos -- */

export type Tabla = Map<string, Map<string, { w: number; l: number; t: number }>>;

/** Junta los cruces de todas las fuentes, en los dos sentidos (con su peso, si se da). */
export function tablaCruces(fuentes: Fuente[], pesos?: Record<string, number>): Tabla {
  const t: Tabla = new Map();
  const sumar = (a: string, b: string, w: number, l: number, e: number) => {
    if (!a || !b || a === b) return;
    let fila = t.get(a);
    if (!fila) t.set(a, (fila = new Map()));
    const c = fila.get(b) ?? { w: 0, l: 0, t: 0 };
    c.w += w; c.l += l; c.t += e;
    fila.set(b, c);
  };
  for (const f of fuentes) {
    const k = pesos ? (pesos[f.id] ?? 1) : 1;
    if (!k) continue;
    for (const c of f.cruces ?? []) { sumar(c.a, c.b, c.w * k, c.l * k, c.t * k); sumar(c.b, c.a, c.l * k, c.w * k, c.t * k); }
  }
  return t;
}

/** % de partida de A contra B, encogido hacia el 50 % con `k` partidas imaginarias. */
export function pPartida(t: Tabla, a: string, b: string, k = 8): { p: number; n: number } {
  if (a === b) return { p: 0.5, n: 0 };
  const c = t.get(a)?.get(b);
  const n = c ? c.w + c.l + c.t : 0;
  return { p: ((c?.w ?? 0) + (c?.t ?? 0) / 2 + k * 0.5) / (n + k), n };
}

/** De partida al mejor de 1 a serie al mejor de 3 (sin empates): p²(3 − 2p). */
export const alMejorDe3 = (p: number) => p * p * (3 - 2 * p);

/* ------------------------------------------------------------- torneo -- */

export type Estructura = {
  rondas: number;
  corte: number;
  /** Dos fases: rondas de la primera y puntos para pasar. */
  fase1?: number | null;
  umbral?: number | null;
  /** De la calculadora suiza: puntos → fracción que entra en el corte. */
  pCorte: Record<number, number>;
  /** Torneos SIN corte (Challenge): puntos → fracción que acaba 1.º. Ganar sale de aquí. */
  pPrimero?: Record<number, number>;
};

/**
 * Probabilidades de un jugador que gana cada ronda con `p` (sin empates): Día 2,
 * corte, ganar el torneo y acabar con récord positivo. En el corte, cada ronda
 * de eliminatoria con `pCorte` (el mismo mazo contra los que llegan).
 */
export function probTorneo(p: number, e: Estructura, pEliminatoria = p) {
  const q = Math.min(0.999, Math.max(0.001, p));
  // dist[v] = P(v victorias), con el corte del Día 2 si lo hay.
  let dist = new Map<number, number>([[0, 1]]);
  let pDia2: number | null = null;
  for (let r = 1; r <= e.rondas; r++) {
    const sig = new Map<number, number>();
    for (const [v, x] of dist) {
      sig.set(v + 1, (sig.get(v + 1) ?? 0) + x * q);
      sig.set(v, (sig.get(v) ?? 0) + x * (1 - q));
    }
    dist = sig;
    if (e.fase1 && e.umbral != null && r === e.fase1) {
      const sigue = new Map<number, number>();
      let pasa = 0;
      for (const [v, x] of dist) if (v * 3 >= e.umbral) { sigue.set(v, x); pasa += x; }
      pDia2 = pasa;
      dist = sigue;
    }
  }
  let pTop = 0, pPositivo = 0, pPrimero = 0;
  for (const [v, x] of dist) {
    pTop += x * (e.pCorte[v * 3] ?? 0);
    if (e.pPrimero) pPrimero += x * (e.pPrimero[v * 3] ?? 0);
    if (v > e.rondas / 2) pPositivo += x;
  }
  const rondasCorte = e.corte > 1 ? Math.ceil(Math.log2(e.corte)) : 0;
  const pGanar = e.pPrimero
    ? pPrimero
    : pTop * Math.pow(Math.min(0.999, Math.max(0.001, pEliminatoria)), rondasCorte);
  return { pDia2, pTop, pGanar, pPositivo };
}

/* ------------------------------------------------------- recomendación -- */

export type FilaRecomendada = {
  lider: string;
  cuota: number;
  /** Probabilidad de ganar una ronda (ya al mejor de 1 o de 3 según el torneo). */
  pRonda: number;
  pDia2: number | null;
  pTop: number;
  pGanar: number;
  pPositivo: number;
  /** La del objetivo elegido, y cuántas veces la de un mazo «medio» (p = 0,5). */
  pObjetivo: number;
  indice: number;
  /** Partidas de emparejamiento que hay detrás. */
  datos: number;
  confianza: "alta" | "media" | "baja";
  mejor: { contra: string; p: number } | null;
  peor: { contra: string; p: number } | null;
  /** Conversión real al corte frente a la media del campo (1 = igual), si hay. */
  conversion: number | null;
};

export function recomendar(opts: {
  tipo: TipoTorneo;
  objetivo: Objetivo;
  fuentes: Fuente[];
  estructura: Estructura;
  /** v0.75 — calibración aprendida de vuestras rondas (`evaluar`). 1 = sin tocar. */
  alfa?: number;
  /** v0.76 — victorias y derrotas en Pokémon TCG Live por líder (a ciegas, al
      mejor de 1). Solo se usan para las Challenges. */
  live?: Record<string, { w: number; l: number }>;
  /** Candidatos mínimos de cuota (por defecto 1 %) y cuántos devolver. */
  minCuota?: number;
  max?: number;
}): { filas: FilaRecomendada[]; campo: Record<string, number>; media: number } {
  const { tipo, objetivo, fuentes, estructura } = opts;
  const campo = campoDe(tipo, fuentes);
  const tabla = tablaCruces(fuentes, PESOS_CRUCES[tipo]);
  const bo3 = AL_MEJOR_DE[tipo] === 3;

  // Conversión real (Regionales / City Leagues): enCorte/listas del mazo frente a la del campo.
  const conv: Record<string, { n: number; corte: number }> = {};
  for (const f of fuentes) for (const [l, c] of Object.entries(f.conversion ?? {})) {
    const x = conv[l] ?? { n: 0, corte: 0 };
    x.n += c.n; x.corte += c.corte; conv[l] = x;
  }
  const totConv = Object.values(conv).reduce((a, c) => ({ n: a.n + c.n, corte: a.corte + c.corte }), { n: 0, corte: 0 });
  const tasaCampo = totConv.n ? totConv.corte / totConv.n : 0;

  const media = probTorneo(0.5, estructura);
  const objDe = (r: ReturnType<typeof probTorneo>) =>
    objetivo === "ganar" ? r.pGanar : objetivo === "top" ? r.pTop : objetivo === "dia2" ? (r.pDia2 ?? r.pTop) : r.pPositivo;
  const objMedia = objDe(media) || 1e-9;

  const candidatos = Object.entries(campo).filter(([, c]) => c >= (opts.minCuota ?? 0.01)).map(([l]) => l);
  const filas: FilaRecomendada[] = candidatos.map((lider) => {
    let pPart = 0, datos = 0;
    let mejor: FilaRecomendada["mejor"] = null, peor: FilaRecomendada["peor"] = null;
    for (const [rival, frac] of Object.entries(campo)) {
      const { p, n } = pPartida(tabla, lider, rival);
      pPart += frac * p;
      datos += n;
      if (rival !== lider && frac >= 0.03 && n >= 5) {
        if (!mejor || p > mejor.p) mejor = { contra: rival, p };
        if (!peor || p < peor.p) peor = { contra: rival, p };
      }
    }
    // Un pequeño ajuste por la conversión real, si hay base (≥ 20 listas): ±5 puntos como mucho.
    const c = conv[lider];
    let conversion: number | null = null;
    if (c && c.n >= 20 && tasaCampo > 0) {
      conversion = c.corte / c.n / tasaCampo;
      pPart += 0.05 * Math.max(-1, Math.min(1, Math.log2(Math.max(conversion, 1e-3))));
    }
    /* v0.76 — Challenge: lo que rinde el mazo en TCG Live (a ciegas y al mejor
       de 1, como una Challenge). Encogido con 30 partidas imaginarias y con
       un tercio de peso: es ladder, no torneo. */
    const lv = tipo === "league_challenge" ? opts.live?.[lider] : undefined;
    if (lv && lv.w + lv.l >= 10) {
      const wrLive = (lv.w + 15) / (lv.w + lv.l + 30);
      pPart += (wrLive - 0.5) / 3;
    }
    pPart = Math.min(0.95, Math.max(0.05, calibrar(pPart, opts.alfa ?? 1)));
    const pRonda = bo3 ? alMejorDe3(pPart) : pPart;
    const r = probTorneo(pRonda, estructura);
    const pObjetivo = objDe(r);
    return {
      lider, cuota: campo[lider], pRonda, ...r, pObjetivo, indice: pObjetivo / objMedia, datos,
      confianza: datos >= 300 ? "alta" : datos >= 60 ? "media" : "baja", mejor, peor, conversion,
    };
  });
  filas.sort((a, b) => b.pObjetivo - a.pObjetivo || b.cuota - a.cuota);
  return { filas: filas.slice(0, opts.max ?? 12), campo, media: objMedia };
}

/* -------------------------------------------------------- consistencia -- */

/**
 * Nota de consistencia del 1 al 10. Sale del % de mulligan (teórico, de la
 * lista; o real, de los mulligans apuntados en vuestras partidas, que manda
 * cuando hay al menos 20 juegos). Un 10 % de mulligan o menos es un 10; cada
 * 2,5 puntos más resta uno. null si no hay ni lista ni partidas.
 */
export function notaConsistencia(pMullTeorico: number | null, mullReales: number | null, juegos: number): number | null {
  let p: number | null = null;
  if (mullReales != null && juegos >= 20) {
    const real = mullReales / juegos;
    p = pMullTeorico != null ? (real * juegos + pMullTeorico * 20) / (juegos + 20) : real;
  } else if (pMullTeorico != null) p = pMullTeorico;
  if (p == null || !Number.isFinite(p)) return null;
  return Math.max(1, Math.min(10, Math.round(10 - (p - 0.1) / 0.025)));
}

/* =========================================================================
   v0.75 — Aprender del acierto.

   No es una red neuronal: es más sencillo y, con pocos datos, mejor. El
   modelo predice cada ronda que jugáis en un torneo (con las fuentes de FUERA,
   para no examinarse con sus propias respuestas) y se compara con lo que pasó.
   De ahí salen el % de acierto y un único parámetro, α, que corrige si el
   modelo se pasa de seguro (α < 1: acerca sus % al 50) o se queda corto
   (α > 1: los separa). Cada ronda nueva que apuntáis es feedback y α se
   recalcula solo. Un solo número aprendido no se «sobreajusta» con 50 rondas;
   una red con miles de pesos, sí.
   ========================================================================= */

/** Aplica la calibración: acerca (α < 1) o aleja (α > 1) del 50 %. */
export const calibrar = (p: number, alfa: number) =>
  Math.min(0.99, Math.max(0.01, 0.5 + (Number.isFinite(alfa) ? alfa : 1) * (p - 0.5)));

export type Muestra = { p: number; r: 0 | 0.5 | 1 };

export type Evaluacion = {
  n: number;
  /** % de rondas en que el favorito según el modelo ganó (sin contar p = 50 % ni empates). */
  acierto: number | null;
  /** Error cuadrático medio (Brier). 0,25 es lo que da decir siempre «50 %». */
  brier: number | null;
  /** El α que mejor encaja con lo que pasó. 1 si hay menos de `minimo` rondas. */
  alfa: number;
  /** Brier ya calibrado con ese α. */
  brierCalibrado: number | null;
};

export function evaluar(muestras: Muestra[], minimo = 30): Evaluacion {
  const ms = muestras.filter((m) => Number.isFinite(m.p));
  const n = ms.length;
  if (!n) return { n: 0, acierto: null, brier: null, alfa: 1, brierCalibrado: null };
  const brierCon = (a: number) => ms.reduce((s, m) => s + (calibrar(m.p, a) - m.r) ** 2, 0) / n;
  const decididas = ms.filter((m) => m.p !== 0.5 && m.r !== 0.5);
  const acierto = decididas.length ? decididas.filter((m) => (m.p > 0.5) === (m.r === 1)).length / decididas.length : null;
  let alfa = 1;
  if (n >= minimo) {
    let mejor = brierCon(1);
    for (let a = 0.2; a <= 1.6 + 1e-9; a += 0.05) {
      const b = brierCon(a);
      if (b < mejor - 1e-12) { mejor = b; alfa = Math.round(a * 100) / 100; }
    }
  }
  return { n, acierto, brier: brierCon(1), alfa, brierCalibrado: brierCon(alfa) };
}

/* =========================================================================
   v0.75 — La mejor VARIANTE de cada arquetipo.

   Dragapult es el arquetipo; Dragapult / Dusknoir y Dragapult / Pidgeot son
   variantes, y no rinden igual. Cada variante se puntúa por su % de
   victorias (online, encogido hacia el 50 % con 20 partidas imaginarias) y,
   si hay base, por cómo convierte al corte en Regionales y City Leagues. Se
   recomienda la de mejor puntuación entre las que tienen datos suficientes.
   ========================================================================= */

export type Variante = {
  clave: string;
  nombre: string;
  /** Partidas online (w, l, t) y listas / conversión de los presenciales. */
  w: number; l: number; t: number;
  listas: number;
  corte: number;
  /** Listas con puesto (base de la conversión). */
  conPuesto: number;
};

export type VarianteValorada = Variante & { wr: number; conversion: number | null; puntuacion: number; cuota: number };

export function valorarVariantes(vs: Variante[], tasaCampo: number | null, k = 20): VarianteValorada[] {
  const total = vs.reduce((s, v) => s + v.w + v.l + v.t + v.listas, 0) || 1;
  return vs.map((v) => {
    const n = v.w + v.l + v.t;
    const wr = (v.w + v.t / 2 + k * 0.5) / (n + k);
    const conversion = tasaCampo && v.conPuesto >= 10 ? v.corte / v.conPuesto / tasaCampo : null;
    const extra = conversion != null ? 0.05 * Math.max(-1, Math.min(1, Math.log2(Math.max(conversion, 1e-3)))) : 0;
    return { ...v, wr, conversion, puntuacion: wr + extra, cuota: (n + v.listas) / total };
  }).sort((a, b) => b.puntuacion - a.puntuacion || b.cuota - a.cuota);
}

/** La variante a recomendar: la mejor puntuada con al menos `minimo` datos; si ninguna, la más jugada. */
export function mejorVariante(vs: Variante[], tasaCampo: number | null, minimo = 15): VarianteValorada | null {
  if (!vs.length) return null;
  const v = valorarVariantes(vs, tasaCampo);
  return v.find((x) => x.w + x.l + x.t + x.listas >= minimo) ?? [...v].sort((a, b) => b.cuota - a.cuota)[0];
}
