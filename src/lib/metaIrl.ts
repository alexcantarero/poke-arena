/* =========================================================================
   Contar el metagame presencial.

   Entra lo que se ha importado de los Regionales —puesto y arquetipo, nunca
   una persona— y sale la misma foto que da la pantalla de Top Decks para el
   online: cuánto se juega cada cosa y hasta dónde llega.

   UNA ADVERTENCIA QUE VA EN EL CÓDIGO PORQUE ES FÁCIL DE OLVIDAR
   --------------------------------------------------------------
   Lo que se importa de un Regional casi nunca es el evento entero: es el top
   32, o el top 64. Eso quiere decir que **la cuota de aquí no es la cuota del
   torneo**, es la cuota del corte, que es otra cosa y siempre favorece a los
   mazos buenos. Un mazo que el 20% de la sala juega y que no corta nunca
   sale aquí con un 3%, y no es un error: es que esta foto mide otra cosa.

   Por eso `IrlSummary` lleva `coverage` y la pantalla lo dice con palabras.
   No hay forma de corregirlo con matemáticas —no tenemos las listas que no
   cortaron— así que lo honesto es decir qué se está mirando.

   CONVERSIÓN
   ----------
   El top 8 y el top 4 solo se cuentan sobre las filas que **tienen puesto**.
   Un resumen pegado a mano («Gardevoir ex — 6») no lo tiene, así que no suma
   ni al numerador ni al denominador: si no, un evento resumido hundiría la
   conversión de todos los demás.

   Sin imports, como `cut.ts` o `badges.ts`, para que los tests lo carguen
   directamente.
   ========================================================================= */

/** Un evento importado, con lo justo para contar. */
export type IrlEvent = {
  id: string;
  name: string;
  date: string;
  kind: string;
  /** Hasta qué puesto llega lo importado. Nulo si se metió como resumen. */
  coverage: number | null;
  playerCount: number | null;
  topCut: number | null;
};

/** Una fila importada. No hay ninguna columna de persona, ni aquí ni en la base. */
export type IrlEntry = {
  eventId: string;
  placement: number | null;
  copies: number;
  archetypeId: string | null;
  archetypeName: string;
  main: string;
  secondary: string;
};

export type IrlRow = {
  /** El arquetipo si casó; si no, el nombre normalizado. Es la clave de agrupación. */
  key: string;
  name: string;
  archetypeId: string | null;
  main: string;
  secondary: string;
  /** Listas contadas (suma de `copies`). */
  entries: number;
  /** Qué parte de lo importado es este mazo. */
  share: number;
  /** En cuántos eventos distintos aparece. */
  events: number;
  /** Victorias, semifinales y cuartos. Solo de las filas con puesto. */
  top1: number;
  top4: number;
  top8: number;
  /** Filas con puesto, que es el denominador de las tres de arriba. */
  placed: number;
  /** El mejor puesto que ha hecho, y dónde. */
  best: { placement: number; event: string } | null;
};

export type IrlSummary = {
  rows: IrlRow[];
  events: number;
  entries: number;
  /** El puesto más bajo importado en el evento que menos cubre. */
  coverage: number | null;
  /** Asistencia sumada de los eventos que la tienen apuntada. */
  attendance: number | null;
  /** El evento más reciente, para poder fechar la foto. */
  latest: IrlEvent | null;
};

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Agrupa por arquetipo y ordena por cuota.
 *
 * La clave de agrupación es el `archetypeId` cuando lo hay y el nombre
 * normalizado cuando no. Así, un mazo que en un Regional casó con el catálogo
 * y en otro no —porque el catálogo estaba viejo cuando se importó— no sale
 * partido en dos filas.
 */
export function irlMeta(events: IrlEvent[], entries: IrlEntry[]): IrlSummary {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const acc = new Map<string, IrlRow & { _events: Set<string> }>();

  let total = 0;
  for (const e of entries) {
    const key = e.archetypeId ?? `n:${norm(e.archetypeName)}`;
    if (!key || key === "n:") continue;

    let row = acc.get(key);
    if (!row) {
      row = {
        key,
        name: e.archetypeName,
        archetypeId: e.archetypeId,
        main: e.main,
        secondary: e.secondary,
        entries: 0, share: 0, events: 0,
        top1: 0, top4: 0, top8: 0, placed: 0,
        best: null,
        _events: new Set<string>(),
      };
      acc.set(key, row);
    }

    const copies = Math.max(1, e.copies || 1);
    row.entries += copies;
    total += copies;
    row._events.add(e.eventId);
    // Los sprites: el primero que traiga alguno manda. Una fila importada sin
    // arquetipo del catálogo puede no tenerlos, y no por eso se pierde el de
    // las demás.
    if (!row.main && e.main) { row.main = e.main; row.secondary = e.secondary; }
    if (!row.archetypeId && e.archetypeId) row.archetypeId = e.archetypeId;

    if (e.placement != null) {
      row.placed += copies;
      if (e.placement === 1) row.top1 += copies;
      if (e.placement <= 4) row.top4 += copies;
      if (e.placement <= 8) row.top8 += copies;
      if (!row.best || e.placement < row.best.placement) {
        row.best = { placement: e.placement, event: eventById.get(e.eventId)?.name ?? "" };
      }
    }
  }

  const rows: IrlRow[] = [...acc.values()].map(({ _events, ...r }) => ({
    ...r,
    events: _events.size,
    share: total > 0 ? r.entries / total : 0,
  }));

  rows.sort((a, b) => b.entries - a.entries || a.name.localeCompare(b.name, "es"));

  const coberturas = events.map((e) => e.coverage).filter((c): c is number => c != null);
  const asistencias = events.map((e) => e.playerCount).filter((n): n is number => n != null);
  const porFecha = [...events].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return {
    rows,
    events: events.length,
    entries: total,
    coverage: coberturas.length ? Math.min(...coberturas) : null,
    attendance: asistencias.length ? asistencias.reduce((a, b) => a + b, 0) : null,
    latest: porFecha[0] ?? null,
  };
}

/** Qué parte de sus listas llegó al top 4. Nulo si no hay puestos que mirar. */
export function top4Rate(r: IrlRow): number | null {
  return r.placed > 0 ? r.top4 / r.placed : null;
}

/** Qué parte de sus listas llegó al top 8. */
export function top8Rate(r: IrlRow): number | null {
  return r.placed > 0 ? r.top8 / r.placed : null;
}

/**
 * El mazo con mejor conversión a top 4, entre los que tienen listas de sobra.
 *
 * El mínimo no es decorativo: con tres listas, un 100% de top 4 es una
 * casualidad y presentarlo como «el mejor» es mentir con la verdad.
 */
export function mejorConversion(rows: IrlRow[], minimo = 5): IrlRow | null {
  const con = rows.filter((r) => r.placed >= minimo);
  if (!con.length) return null;
  return con.reduce((best, r) => ((top4Rate(r) ?? 0) > (top4Rate(best) ?? 0) ? r : best));
}
