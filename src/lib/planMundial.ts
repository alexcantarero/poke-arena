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
  eventos: Array<{ tipo: string; etiqueta: string; tramos: TramoCp[]; campoTipico: number }>;
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
  league_challenge: 16, league_cup: 40, regional: 1500, international: 3500,
};

const nombrePuesto = (t: TramoCp) => (t.from === 1 && t.to === 1 ? "Campeón" : t.from === t.to ? `${t.from}.º` : `Top ${t.to}`);

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
        const dificultad = Math.min(1, Math.max(0, 1 - t.to / ev.campoTipico));
        opciones.push({
          h: idx, contador: h.c.contador, tipo: ev.tipo, etiqueta: ev.etiqueta, puesto: nombrePuesto(t),
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
    for (const o of opciones) {
      if (o.dificultad > nivel + 1e-9) continue;
      const ya = porHueco.get(o.h);
      if (!ya || o.gana > ya.gana || (o.gana === ya.gana && o.dificultad < ya.dificultad)) porHueco.set(o.h, o);
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
