/* =========================================================================
   v0.73 — Camino al Mundial: qué resultados te faltan.

   Sin imports: las tablas de CP y tus resultados contados entran por
   parámetro (desde `cp.ts` / `computeCp`).

   El objetivo por defecto son 650 CP: no es un corte oficial (desde 2025 la
   invitación es por Top N de la zona y la línea solo se sabe al acabar la
   temporada), es la referencia aproximada que usa el grupo, y se puede cambiar.

   Cómo se decide qué recomendar:
     · Cada contador de Best Finish Limit (Challenges, Cups, Regionales +
       Internacionales) tiene N huecos. Un hueco vacío vale 0; uno lleno, lo
       que ya puntúa. Mejorarlo = conseguir un puesto que dé más que eso.
     · La DIFICULTAD de un puesto es qué parte del campo típico lo consigue:
       un top 8 en una Challenge de 16 es la mitad del campo; un top 64 en un
       Regional de 1.500, el 4 %. Se aproxima así a propósito: es una guía para
       ordenar, no una probabilidad.
     · Se busca el NIVEL de dificultad más bajo con el que, usando cada hueco
       una vez como mucho, sumas lo que falta. Esa es la recomendación; los
       pasos se ordenan de más fácil a más difícil.
   ========================================================================= */

export type TramoCp = { from: number; to: number; cp: number; minPlayers: number };

export type ContadorPlan = {
  /** Clave del contador («league_challenge», «league_cup», «regional»). */
  contador: string;
  etiqueta: string;
  /** Lo que ya cuenta en cada hueco (los vacíos no van). */
  contados: number[];
  huecos: number;
  /** Tipos de evento que gastan de este contador, con sus tramos y su campo típico. */
  eventos: Array<{
    tipo: string; etiqueta: string; tramos: TramoCp[]; campoTipico: number;
    /** v0.80 — probabilidad de conseguir cada tramo (alineada con `tramos`), si
        se sabe por vuestros resultados (`probDeTramo`). Si no, se estima por el campo típico. */
    prob?: number[];
  }>;
};

export type PasoPlan = {
  contador: string;
  tipo: string;
  etiqueta: string;
  /** «Top 8», «Campeón», «Top 64»… */
  puesto: string;
  /** Qué vale ese hueco ahora (0 si está vacío). */
  ahora: number;
  cp: number;
  gana: number;
  /** 0 = muy fácil … 1 = muy difícil. */
  dificultad: number;
};

export type Plan = {
  objetivo: number;
  total: number;
  faltan: number;
  /** Pasos recomendados, de más fácil a más difícil. Vacío si ya llegas. */
  pasos: PasoPlan[];
  /** Suma de lo que darían los pasos. */
  suma: number;
  /** Si ni usando todos los huecos al máximo nivel razonable se llega. */
  inalcanzable: boolean;
};

/** Campo típico por tipo de evento, para medir la dificultad. */
export const CAMPO_TIPICO: Record<string, number> = {
  league_challenge: 12, league_cup: 32, regional: 1500, international: 3500,
};

/**
 * v0.81 — Cuánto más fácil (o difícil) es puntuar en cada tipo, además del
 * tamaño del campo: Challenge < Cup < Regional < Internacional. En una
 * Challenge el campo es local y corto (se «maxea» rápido); en una Cup cuesta
 * más; en un Regional, llegar al Día 2 ya es un logro; un Internacional es lo
 * más difícil. Multiplica la probabilidad de conseguir cada puesto.
 */
export const FACILIDAD: Record<string, number> = {
  // v0.82 — recalibrado: Challenge campeón=Fácil, Cup campeón=Medio, Regional Top128+=Difícil.
  league_challenge: 3.5, league_cup: 1.8, regional: 0.55, international: 0.4,
};

/**
 * v0.81 — Cuántos torneos de un tipo caben en una temporada. En Europa hay
 * como mucho 2 Internacionales (Europa y, si toca, otro), así que solo pueden
 * llenar 2 de los 5 huecos que comparten con los Regionales.
 */
export const MAX_POR_TEMPORADA: Record<string, number> = { international: 2 };

/** Cómo se llama un puesto. En Regionales e Internacionales, con su referencia al Día 2. */
function nombrePuesto(t: TramoCp, tipo = ""): string {
  const base = t.from === 1 && t.to === 1 ? "Campeón" : t.from === t.to ? `${t.from}.º` : `Top ${t.to}`;
  if (tipo !== "regional" && tipo !== "international") return base;
  if (t.to >= 1024) return base;
  if (t.to >= 512) return `${base} · casi Día 2`;
  if (t.to >= 129) return `${base} · Día 2`;
  return base;
}

export function planMundial(total: number, contadores: ContadorPlan[], objetivo = 650): Plan {
  const obj = Number.isFinite(objetivo) && objetivo > 0 ? Math.round(objetivo) : 650;
  const faltan = Math.max(0, obj - Math.round(total));
  if (!faltan) return { objetivo: obj, total, faltan: 0, pasos: [], suma: 0, inalcanzable: false };

  // Huecos: los vacíos (valen 0) y los llenos (lo que ya cuentan), de peor a mejor.
  type Hueco = { c: ContadorPlan; ahora: number };
  const huecos: Hueco[] = [];
  for (const c of contadores) {
    const llenos = [...c.contados].sort((a, b) => a - b).slice(0, c.huecos);
    const vacios = Math.max(0, c.huecos - llenos.length);
    for (let i = 0; i < vacios; i++) huecos.push({ c, ahora: 0 });
    for (const v of llenos) huecos.push({ c, ahora: v });
  }

  // Todas las opciones: (hueco, evento, tramo) que mejoran el hueco y son posibles en un campo típico.
  type Opcion = PasoPlan & { h: number };
  const opciones: Opcion[] = [];
  huecos.forEach((h, idx) => {
    for (const ev of h.c.eventos) {
      for (const t of ev.tramos) {
        if (t.cp <= h.ahora || t.minPlayers > ev.campoTipico) continue;
        const k = ev.tramos.indexOf(t);
        const p0 = ev.prob?.[k] ?? Math.min(1, t.to / ev.campoTipico);
        const p = Math.min(1, p0 * (FACILIDAD[ev.tipo] ?? 1));
        const dificultad = Math.min(1, Math.max(0, 1 - p));
        opciones.push({
          h: idx, contador: h.c.contador, tipo: ev.tipo, etiqueta: ev.etiqueta, puesto: nombrePuesto(t, ev.tipo),
          ahora: h.ahora, cp: t.cp, gana: t.cp - h.ahora, dificultad,
        });
      }
    }
  });
  if (!opciones.length) return { objetivo: obj, total, faltan, pasos: [], suma: 0, inalcanzable: true };

  // Para cada nivel de dificultad (de fácil a difícil): en cada hueco, lo mejor que
  // se puede sacar sin pasar de ese nivel. El primer nivel que llega, gana.
  const niveles = [...new Set(opciones.map((o) => o.dificultad))].sort((a, b) => a - b);
  const mejorHasta = (nivel: number) => {
    const porHueco = new Map<number, Opcion>();
    const usados: Record<string, number> = {};
    // v0.81 — los tipos con tope por temporada (Internacionales: 2) se reparten
    // primero a los huecos donde más ganan; el resto de huecos, sin ellos.
    const validas = opciones.filter((o) => o.dificultad <= nivel + 1e-9)
      .sort((a, b) => b.gana - a.gana || a.dificultad - b.dificultad);
    for (const o of validas) {
      const tope = MAX_POR_TEMPORADA[o.tipo];
      const ya = porHueco.get(o.h);
      if (ya) continue;
      if (tope != null && (usados[o.tipo] ?? 0) >= tope) continue;
      porHueco.set(o.h, o);
      usados[o.tipo] = (usados[o.tipo] ?? 0) + 1;
    }
    return [...porHueco.values()].sort((a, b) => a.dificultad - b.dificultad || b.gana - a.gana);
  };
  for (const nivel of niveles) {
    const elegidas = mejorHasta(nivel);
    // Con este nivel, los pasos justos para llegar: de más ganancia a menos, y se presentan por facilidad.
    const porGanancia = [...elegidas].sort((a, b) => b.gana - a.gana || a.dificultad - b.dificultad);
    const pasos: Opcion[] = [];
    let suma = 0;
    for (const o of porGanancia) {
      if (suma >= faltan) break;
      pasos.push(o); suma += o.gana;
    }
    if (suma >= faltan) {
      pasos.sort((a, b) => a.dificultad - b.dificultad || b.gana - a.gana);
      return { objetivo: obj, total, faltan, pasos: pasos.map(({ h: _h, ...p }) => p), suma, inalcanzable: false };
    }
  }
  const todo = mejorHasta(1);
  const suma = todo.reduce((a, o) => a + o.gana, 0);
  return { objetivo: obj, total, faltan, pasos: todo.map(({ h: _h, ...p }) => p), suma, inalcanzable: true };
}

/* =========================================================================
   v0.80 — Cómo de difícil es cada puesto, con vuestros datos.

   La base es la parte del campo típico que lo consigue (top 8 de 40 = 20 %).
   Encima, lo que ha pasado en la app: de todos vuestros resultados en ese
   tipo de torneo, cuántos llegaron a ese puesto. Se mezclan con `k`
   resultados imaginarios de la base: con 3 resultados casi no cambia; con 40,
   manda lo vuestro.
   ========================================================================= */
export function probDeTramo(tramo: { to: number }, campoTipico: number, puestos: number[], k = 10): { p: number; n: number; hechos: number } {
  const base = Math.min(1, tramo.to / Math.max(1, campoTipico));
  const validos = puestos.filter((x) => Number.isFinite(x) && x > 0);
  const hechos = validos.filter((x) => x <= tramo.to).length;
  return { p: (k * base + hechos) / (k + validos.length), n: validos.length, hechos };
}

export type MinimoTipo = {
  tipo: string; etiqueta: string;
  /** El puesto más asequible que, repetido, te lleva al objetivo. null si ni ganando todo llegas. */
  puesto: string | null;
  veces: number;
  /** Lo máximo que podría sumar este tipo solo, ganándolo todo. */
  maximo: number;
};

/**
 * v0.80 — Lo MÍNIMO de cada tipo de torneo: si solo jugaras ese tipo, qué
 * puesto (el más asequible) tendrías que repetir y cuántas veces, usando sus
 * huecos libres y mejorando los que ya cuentan.
 */
export function minimoPorTipo(total: number, contadores: ContadorPlan[], objetivo = 650): MinimoTipo[] {
  const faltan = Math.max(0, Math.round(objetivo) - Math.round(total));
  const out: MinimoTipo[] = [];
  for (const c of contadores) {
    const llenos = [...c.contados].sort((a, b) => a - b).slice(0, c.huecos);
    const huecos = [...Array(Math.max(0, c.huecos - llenos.length)).fill(0), ...llenos];
    for (const ev of c.eventos) {
      // De más asequible (puesto más bajo de la tabla) a más difícil.
      const tramos = [...ev.tramos].filter((t) => t.minPlayers <= ev.campoTipico).sort((a, b) => b.to - a.to);
      const tope = MAX_POR_TEMPORADA[ev.tipo] ?? Infinity;
      const sumaCon = (t: TramoCp) => huecos.map((h) => Math.max(0, t.cp - h)).sort((a, b) => b - a).slice(0, tope);
      const maximo = tramos.length ? sumaCon(tramos[tramos.length - 1]).reduce((s, x) => s + x, 0) : 0;
      let elegido: MinimoTipo | null = null;
      for (const t of tramos) {
        let s = 0, veces = 0;
        for (const g of sumaCon(t)) { if (s >= faltan || g <= 0) break; s += g; veces++; }
        if (s >= faltan) { elegido = { tipo: ev.tipo, etiqueta: ev.etiqueta, puesto: nombrePuesto(t, ev.tipo), veces, maximo }; break; }
      }
      out.push(elegido ?? { tipo: ev.tipo, etiqueta: ev.etiqueta, puesto: null, veces: 0, maximo });
    }
  }
  return out;
}
