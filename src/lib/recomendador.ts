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
/* v0.82 — «positivo» (acabar con récord positivo) se cambia por «sorpresa»:
   mazos con pocas listas que han dado resultados muy buenos. */
export type Objetivo = "ganar" | "top" | "dia2" | "sorpresa";

export type Cruce = { a: string; b: string; w: number; l: number; t: number };

export type Fuente = {
  id: string;
  /** v1.0 — los cruces son RESULTADOS DE SERIE (p. ej. ganar un Bo3), no partidas sueltas.
      Se convierten a probabilidad por partida antes de mezclar: si no, la conversión
      al Bo3 que hace la pipeline se aplicaría dos veces. */
  serie?: boolean;
  /** Lo que se juega: líder → cuántas listas o partidas. */
  cuota: Record<string, number>;
  /** Emparejamientos (de A contra B, por partidas). Opcional. */
  cruces?: Cruce[];
  /** Conversión real, si la fuente tiene puestos: líder → listas, en el corte y
      (v0.80) en top 4 y ganadas. */
  conversion?: Record<string, { n: number; corte: number; top4?: number; ganados?: number; dia2?: number; dia2Base?: number }>;
};

/** Cuánto pesa cada fuente en el campo de cada tipo de torneo. */
/* v0.76 — lo online pesa sobre todo en las Challenges (suizo al mejor de 1,
   como casi todo lo online), poco en las Cups (allí solo el top cut es al
   mejor de 3) y casi nada en los Regionales. */
export const PESOS_CAMPO: Record<TipoTorneo, Record<string, number>> = {
  // v0.79 — th_*: Trainer Hill (majors = torneos grandes presenciales).
  regional: { regionales: 0.6, th_majors: 0.2, th_mixto: 0.05, cityleagues: 0.15, online: 0.03, grupo: 0.05 },
  // v0.85 — locales_*: las Cups y Challenges que apunta el grupo (vuestro meta local).
  league_cup: { grupo: 0.35, locales_cup: 0.35, cityleagues: 0.25, th_majors: 0.05, th_mixto: 0.05, online: 0.1, regionales: 0.05 },
  league_challenge: { grupo: 0.3, locales_challenge: 0.3, locales_cup: 0.1, online: 0.25, th_online: 0.1, th_mixto: 0.05, cityleagues: 0.15, regionales: 0.05 },
  city_league: { cityleagues: 0.75, online: 0.15, regionales: 0.1 },
};

/**
 * v0.76 — Cuánto cuentan los EMPAREJAMIENTOS de cada fuente según el torneo.
 * Una partida online cuenta entera para una Challenge y bastante menos para
 * un Regional: sus partidas se multiplican por este peso, así que con menos
 * peso el % se acerca más al 50 % (menos confianza), sin perder la señal.
 */
export const PESOS_CRUCES: Record<TipoTorneo, Record<string, number>> = {
  // v0.77 — «yo»: tus propias partidas, solo en el modo personalizado, cuentan doble.
  // v0.79 — Trainer Hill: los «majors» (presenciales, mejor de 3) mandan en
  // Regionales; los online, como la API de Limitless; el mezclado, a medias.
  // v0.85 — cm_majors: emparejamientos presenciales de Ciphermaniac (como los Majors de Trainer Hill).
  regional: { online: 0.15, th_majors: 1, cm_majors: 1, th_mixto: 0.4, th_online: 0.15, grupo: 1, yo: 2 },
  league_cup: { online: 0.3, th_majors: 0.6, cm_majors: 0.6, th_mixto: 0.4, th_online: 0.3, grupo: 1, yo: 2 },
  league_challenge: { online: 1, th_majors: 0.3, cm_majors: 0.3, th_mixto: 0.6, th_online: 1, grupo: 1, yo: 2 },
  city_league: { online: 0.5, th_majors: 0.4, cm_majors: 0.4, th_mixto: 0.5, th_online: 0.5, grupo: 1, yo: 2 },
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

/** Inversa de `alMejorDe3`: la probabilidad por partida que explica una serie con probabilidad `s`. */
export function porPartidaDeSerie(s: number): number {
  const objetivo = Math.min(0.999, Math.max(0.001, s));
  let lo = 0, hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (alMejorDe3(mid) < objetivo) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Un cruce de serie (ganas/pierdes series) como partidas equivalentes, con el mismo número de datos. */
export function cruceComoPartidas(c: Cruce): Cruce {
  const n = c.w + c.l + c.t;
  if (!n) return c;
  const pg = porPartidaDeSerie((c.w + c.t / 2) / n);
  return { a: c.a, b: c.b, w: pg * n, l: (1 - pg) * n, t: 0 };
}

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
    for (const c0 of f.cruces ?? []) {
      const c = f.serie ? cruceComoPartidas(c0) : c0;
      sumar(c.a, c.b, c.w * k, c.l * k, c.t * k); sumar(c.b, c.a, c.l * k, c.w * k, c.t * k);
    }
  }
  return t;
}

/** % de partida de A contra B, encogido hacia el 50 % con `k` partidas imaginarias. */
export function pPartida(t: Tabla, a: string, b: string, k = 4): { p: number; n: number } {
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
  /** v1.0 — límite inferior (≈84 %) de pObjetivo según cuántos datos hay: lo que se ordena. */
  pObjetivoBajo: number;
  indice: number;
  /** Partidas de emparejamiento que hay detrás. */
  datos: number;
  confianza: "alta" | "media" | "baja";
  mejor: { contra: string; p: number } | null;
  peor: { contra: string; p: number } | null;
  /** Conversión real al corte frente a la media del campo (1 = igual), si hay. */
  conversion: number | null;
  /** v0.82 — lo que ha pasado de verdad (presenciales y vuestros torneos), pesado por tipo. */
  evidencia: { n: number; corte: number; ganados: number; dia2: number; dia2Base: number } | null;
  /** v0.82 — la cifra del objetivo sale de resultados reales (true) o solo del modelo (false). */
  conEvidencia: boolean;
  /** v0.84 — por qué es una lista sorpresa: pocas listas o contra pronóstico. */
  sorpresa: "pocas" | "pronostico" | null;
};

/**
 * v0.82 — Cuánto cuentan los RESULTADOS de cada fuente según el torneo: los
 * Regionales importados para un Regional; las City Leagues y vuestros torneos
 * para Cups y Challenges.
 */
export const PESOS_EVIDENCIA: Record<TipoTorneo, Record<string, number>> = {
  regional: { regionales: 1, cityleagues: 0.3, grupo: 0.5 },
  league_cup: { regionales: 0.3, cityleagues: 1, grupo: 1, locales_cup: 1, locales_challenge: 0.3 },
  league_challenge: { regionales: 0.1, cityleagues: 0.6, grupo: 1, locales_challenge: 1, locales_cup: 0.5 },
  city_league: { regionales: 0.2, cityleagues: 1, grupo: 0.5 },
};

/** Límite inferior de Wilson de una proporción (z = Z_BAJO). */
export function wilsonBajo(exitos: number, n: number, z = 1): number {
  if (!(n > 0)) return 0;
  const p = Math.min(1, Math.max(0, exitos / n));
  const z2 = z * z;
  return Math.max(0, (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n));
}

/* =========================================================================
   v0.84 — UNA SOLA FORMA DE PASAR DE «% DE PARTIDA» A «% QUE USA EL MODELO».

   Antes, `evaluar()` medía el acierto con el % de partida tal cual, pero la
   calibración α se aplicaba después sobre el % ya amplificado (×1,4) en el
   recomendador: α se aprendía sobre una cosa y se usaba sobre otra. Ahora las
   dos partes usan `pModelo`, así que α corrige exactamente lo que se usa.
   ========================================================================= */
/** Las desviaciones del 50 % se magnifican ×1,4 para que los buenos mazos destaquen. */
export const AMPLIF = 1.4;
/** % de partida → % del modelo (sin calibrar), acotado. */
export const pModelo = (p: number) => Math.min(0.95, Math.max(0.05, 0.5 + (p - 0.5) * AMPLIF));

/** Cuántos errores típicos se resta para ordenar (1 ≈ 84 % de confianza en el lado bajo). */
export const Z_BAJO = 1;

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
  /** v0.77 — modo personalizado: cuánto rindes TÚ con cada líder por encima
      (o por debajo) de lo que el modelo esperaba. Se suma a la probabilidad de ronda. */
  ajustes?: Record<string, number>;
  /** v0.77 — solo estos líderes (p. ej. «los que tengo»). */
  soloLideres?: string[];
  /** Candidatos mínimos de cuota (por defecto 1 %) y cuántos devolver. */
  minCuota?: number;
  max?: number;
}): { filas: FilaRecomendada[]; campo: Record<string, number>; media: number; soloModelo: boolean } {
  const { tipo, objetivo, fuentes, estructura } = opts;
  const campo = campoDe(tipo, fuentes);
  const tabla = tablaCruces(fuentes, PESOS_CRUCES[tipo]);
  const bo3 = AL_MEJOR_DE[tipo] === 3;

  /* v0.80 — ÉXITO real en presenciales (Regionales / City Leagues), no solo
     entrar en el corte: cada lista suma 1 si entra al corte, +1 si llega a top 4
     y +2 si GANA. Se compara con la media del campo. Pesa más en los torneos
     grandes (Regional) que en los pequeños: ganar un Regional dice mucho más
     del mazo que ganar una Challenge. */
  const conv: Record<string, { n: number; corte: number; puntos: number }> = {};
  for (const f of fuentes) for (const [l, c] of Object.entries(f.conversion ?? {})) {
    const x = conv[l] ?? { n: 0, corte: 0, puntos: 0 };
    x.n += c.n; x.corte += c.corte; x.puntos += c.corte + (c.top4 ?? 0) + 2 * (c.ganados ?? 0);
    conv[l] = x;
  }
  const totConv = Object.values(conv).reduce((a, c) => ({ n: a.n + c.n, puntos: a.puntos + c.puntos }), { n: 0, puntos: 0 });
  const mediaExito = totConv.n ? totConv.puntos / totConv.n : 0;
  /* v0.82 — resultados reales por líder, pesados por tipo de torneo. */
  const ev: Record<string, { n: number; corte: number; ganados: number; dia2: number; dia2Base: number }> = {};
  for (const f of fuentes) {
    const w = PESOS_EVIDENCIA[tipo][f.id] ?? 0;
    if (!w) continue;
    for (const [l, c] of Object.entries(f.conversion ?? {})) {
      const x = (ev[l] ??= { n: 0, corte: 0, ganados: 0, dia2: 0, dia2Base: 0 });
      x.n += w * c.n; x.corte += w * c.corte; x.ganados += w * (c.ganados ?? 0);
      x.dia2 += w * (c.dia2 ?? 0); x.dia2Base += w * (c.dia2Base ?? 0);
    }
  }
  const PESO_EXITO: Record<TipoTorneo, number> = { regional: 0.1, league_cup: 0.06, city_league: 0.06, league_challenge: 0.03 };
  const ratioExito = (l: string): number | null => {
    const c = conv[l];
    return c && c.n >= 10 && mediaExito > 0 ? (c.puntos / c.n) / mediaExito : null;
  };

  /* v0.80 — EL CAMPO DE LAS RONDAS QUE DECIDEN. En las últimas rondas del
     suizo y en el corte no te cruzas con el campo medio: te cruzas con los
     mazos que ganan. Así que se usa también un campo «de arriba», cada mazo
     pesado por su cuota × su éxito real. Ganarle a lo que gana (el «counter»
     del mazo dominante) vale más que ganarle a lo que se queda por el camino. */
  const campoArriba: Record<string, number> = {};
  let totArriba = 0;
  for (const [l, f] of Object.entries(campo)) {
    const r = ratioExito(l);
    const w = f * (r == null ? 1 : Math.max(0.2, Math.min(4, r)));
    campoArriba[l] = w; totArriba += w;
  }
  for (const l of Object.keys(campoArriba)) campoArriba[l] /= totArriba || 1;

  const media = probTorneo(0.5, estructura);
  const objDe = (r: ReturnType<typeof probTorneo>) =>
    objetivo === "ganar" ? r.pGanar : objetivo === "top" ? r.pTop : objetivo === "dia2" ? (r.pDia2 ?? r.pTop) : r.pTop;
  const objMedia = objDe(media) || 1e-9;

  const solo = opts.soloLideres ? new Set(opts.soloLideres) : null;
  const candidatos = solo
    ? [...solo].filter((l) => l)
    : Object.entries(campo).filter(([, c]) => c >= (opts.minCuota ?? 0.01)).map(([l]) => l);

  const contra = (lider: string, campoX: Record<string, number>) => {
    let p = 0;
    for (const [rival, frac] of Object.entries(campoX)) p += frac * pPartida(tabla, lider, rival).p;
    return p;
  };

  const filas: FilaRecomendada[] = candidatos.map((lider) => {
    let datos = 0, neff = 0;
    let mejor: FilaRecomendada["mejor"] = null, peor: FilaRecomendada["peor"] = null;
    for (const [rival, frac] of Object.entries(campo)) {
      const { p, n } = pPartida(tabla, lider, rival);
      datos += n;
      neff += frac * n;
      if (rival !== lider && frac >= 0.03 && n >= 5) {
        if (!mejor || p > mejor.p) mejor = { contra: rival, p };
        if (!peor || p < peor.p) peor = { contra: rival, p };
      }
    }
    // v0.82 — el mix campo/arriba depende del objetivo: ganar el torneo exige
    // vencer a los que llegan arriba; acabar con récord solo necesita ganar el
    // campo general. Esto separa los rankings según lo que el jugador busca.
    const mezclaCampo = objetivo === "sorpresa" ? 0.90
      : objetivo === "ganar" ? 0.30
      : 0.65; // top y dia2: equilibrado
    let pPart = mezclaCampo * contra(lider, campo) + (1 - mezclaCampo) * contra(lider, campoArriba);
    // El corte: contra el campo de arriba.
    let pTopPart = contra(lider, campoArriba);
    const ratio = ratioExito(lider);
    const conversion = ratio;
    if (ratio != null) {
      const extra = PESO_EXITO[tipo] * Math.max(-1.5, Math.min(1.5, Math.log2(Math.max(ratio, 1e-3))));
      pPart += extra; pTopPart += extra;
    }
    /* v0.76 — Challenge: lo que rinde el mazo en TCG Live (a ciegas y al mejor
       de 1, como una Challenge). Encogido con 30 partidas imaginarias y con
       un tercio de peso: es ladder, no torneo. */
    const lv = tipo === "league_challenge" ? opts.live?.[lider] : undefined;
    if (lv && lv.w + lv.l >= 10) {
      const wrLive = (lv.w + 15) / (lv.w + lv.l + 30);
      pPart += (wrLive - 0.5) / 3;
    }
    const ajuste = opts.ajustes?.[lider] ?? 0;
    // v0.82 — amplificar: las desviaciones del 50 % se magnifican ×1.4 para
    // que los buenos mazos destaquen más. acotar() limita a [0.05, 0.95].
    pPart     = 0.5 + (pPart     - 0.5) * AMPLIF;
    pTopPart  = 0.5 + (pTopPart  - 0.5) * AMPLIF;
    const acotar = (x: number) => Math.min(0.95, Math.max(0.05, calibrar(x, opts.alfa ?? 1) + ajuste));
    pPart = acotar(pPart); pTopPart = acotar(pTopPart);
    const pRonda = bo3 ? alMejorDe3(pPart) : pPart;
    const pCorteRonda = alMejorDe3(pTopPart); // el top cut siempre al mejor de 3
    const r = probTorneo(pRonda, estructura, pCorteRonda);
    const pObjetivo = objDe(r);
    /* v1.0 — incertidumbre: error típico de la probabilidad de partida con los datos
       efectivos del campo (binomial), y el objetivo recalculado en el extremo bajo. */
    const eEf = Math.max(1, neff);
    const se = Math.sqrt((pPart * (1 - pPart)) / eEf);
    const pPartBajo = Math.max(0.05, pPart - Z_BAJO * se);
    const rBajo = probTorneo(bo3 ? alMejorDe3(pPartBajo) : pPartBajo, estructura, pCorteRonda);
    const pObjetivoBajo = objDe(rBajo);
    /* v0.82 — EL OBJETIVO, CON LO QUE HA PASADO DE VERDAD.
       · top: solo mazos que han entrado al corte alguna vez; la cifra es su %
         real de corte, con el modelo como base (8 listas «imaginarias»).
       · ganar: solo mazos que han ganado algún torneo; la cifra, su % de ganar.
       · dia2: su % de listas que pasaron al Día 2.
       · sorpresa: pocas listas (≤ 30) y resultados muy por encima de la media.
       Se ordena por el límite bajo (Wilson): más veces = más seguro. */
    const e = ev[lider];
    const K = 8;
    let pObj = pObjetivo, pBajo = pObjetivoBajo, conEvidencia = false;
    let sorpresa: FilaRecomendada["sorpresa"] = null;
    const conReal = (exitos: number, base: number, previo: number) => {
      const pp = (exitos + K * previo) / (base + K);
      return { pp, bajo: wilsonBajo(exitos + K * previo, base + K, Z_BAJO) };
    };
    if (e && objetivo === "top" && e.corte > 0) {
      ({ pp: pObj, bajo: pBajo } = conReal(e.corte, e.n, r.pTop)); conEvidencia = true;
    } else if (e && objetivo === "ganar" && e.ganados > 0) {
      ({ pp: pObj, bajo: pBajo } = conReal(e.ganados, e.n, r.pGanar)); conEvidencia = true;
    } else if (e && objetivo === "dia2" && e.dia2Base > 0) {
      ({ pp: pObj, bajo: pBajo } = conReal(e.dia2, e.dia2Base, r.pDia2 ?? r.pTop)); conEvidencia = true;
    } else if (e && objetivo === "sorpresa" && e.n > 0 && e.corte > 0) {
      /* v0.84 — dos clases de sorpresa:
         · pocas listas (≤ 30) que han entrado al corte;
         · CONTRA PRONÓSTICO: mazos que el modelo da por flojos (menos del 50 %
           por ronda) o que suelen convertir por debajo de la media, y aun así
           han entrado. Cuanto más por encima de lo esperado, más arriba. */
      const esperado = Math.max(0.01, r.pTop) * e.n;
      const flojo = pPart < 0.5 || (ratio != null && ratio < 1);
      if (e.n <= 30 || flojo) {
        pObj = e.corte / e.n;
        pBajo = Math.min(1, (e.corte / esperado) / 10) * Math.min(1, Math.sqrt(e.corte) / 2);
        conEvidencia = true;
        sorpresa = e.n <= 30 ? "pocas" : "pronostico";
      }
    }
    return {
      lider, cuota: campo[lider] ?? 0, pRonda, ...r, pObjetivo: pObj, pObjetivoBajo: pBajo, indice: pObj / objMedia, datos: Math.round(datos),
      confianza: datos >= 300 ? "alta" : datos >= 60 ? "media" : "baja", mejor, peor, conversion,
      evidencia: e ? { n: Math.round(e.n), corte: Math.round(e.corte), ganados: Math.round(e.ganados), dia2: Math.round(e.dia2), dia2Base: Math.round(e.dia2Base) } : null,
      conEvidencia, sorpresa,
    };
  });
  // v1.0 — se ordena por el límite inferior: un mazo con muchos datos y un 55 % vale más que uno con 6 partidas y un 60 %.
  filas.sort((a, b) => b.pObjetivoBajo - a.pObjetivoBajo || b.pObjetivo - a.pObjetivo || b.cuota - a.cuota);
  /* v0.82 — si hay mazos con resultados reales para este objetivo, SOLO esos
     (lo que pediste: «solo puntúan los que han ganado / entrado al corte»).
     Si no hay ninguno, el modelo, avisando. */
  const conReales = filas.filter((f) => f.conEvidencia);
  const lista = conReales.length ? conReales : objetivo === "sorpresa" ? [] : filas;
  return { filas: lista.slice(0, opts.max ?? 12), campo, media: objMedia, soloModelo: !conReales.length };
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

/* =========================================================================
   v0.77 — Recomendación PERSONALIZADA.

   La general responde «qué mazo le va mejor al jugador medio». La tuya mira
   además lo que has jugado: con cada líder, cuánto has ganado frente a lo que
   el modelo esperaba con tus emparejamientos. Si con Slowking ganas más de lo
   que «debería», ese mazo sube para ti; si con Dragapult pierdes más, baja.

   El ajuste se encoge con `k` partidas imaginarias (pocas partidas → casi
   nada) y se limita a ±10 puntos: un mal fin de semana no hunde un mazo.
   ========================================================================= */

export type RegistroPersonal = { lider: string; p: number; r: 0 | 0.5 | 1 };

export function ajustesPersonales(registros: RegistroPersonal[], k = 15): Record<string, { ajuste: number; n: number; w: number; l: number; t: number; esperado: number }> {
  const acc: Record<string, { s: number; e: number; n: number; w: number; l: number; t: number }> = {};
  for (const r of registros) {
    if (!r.lider || !Number.isFinite(r.p)) continue;
    const x = (acc[r.lider] ??= { s: 0, e: 0, n: 0, w: 0, l: 0, t: 0 });
    x.s += r.r; x.e += r.p; x.n++;
    if (r.r === 1) x.w++; else if (r.r === 0) x.l++; else x.t++;
  }
  return Object.fromEntries(Object.entries(acc).map(([l, x]) => [l, {
    ajuste: Math.max(-0.1, Math.min(0.1, (x.s - x.e) / (x.n + k))),
    n: x.n, w: x.w, l: x.l, t: x.t, esperado: x.n ? x.e / x.n : 0.5,
  }]));
}

/**
 * v0.84 — Conversión al Día 2 por líder a partir de dos recuentos de un mismo
 * evento: TODAS las listas (Día 1) y las del Día 2 (p. ej. Ciphermaniac, que
 * publica el evento entero y la «fase 2»). Si el «total» no es mayor que el
 * Día 2 (es decir, solo hay listas de Día 2), no dice nada: null.
 */
export function conversionDia2(
  todos: Array<{ lider: string; listas: number }>,
  dia2: Array<{ lider: string; listas: number }>,
): Record<string, { dia2: number; base: number }> | null {
  const sumaT = todos.reduce((s, x) => s + (x.listas || 0), 0);
  const sumaD = dia2.reduce((s, x) => s + (x.listas || 0), 0);
  if (!sumaT || sumaD >= sumaT * 0.95) return null;
  const out: Record<string, { dia2: number; base: number }> = {};
  for (const x of todos) if (x.lider) (out[x.lider] ??= { dia2: 0, base: 0 }).base += x.listas || 0;
  for (const x of dia2) if (x.lider && out[x.lider]) out[x.lider].dia2 += x.listas || 0;
  for (const l of Object.keys(out)) out[l].dia2 = Math.min(out[l].dia2, out[l].base);
  return out;
}
