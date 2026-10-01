/* =========================================================================
   v0.16 — La lista de Torneos: filtros y los tres grupos.

   Grupos, en este orden estricto:

     1. HOY        — el torneo está sucediendo hoy: hoy cae entre su fecha y
                     su fecha de fin (un Regional de dos días sale los dos).
     2. PRÓXIMOS   — de mañana en adelante, del más cercano al más lejano.
     3. PASADOS    — lo que ya acabó, del más reciente al más antiguo.

   El grupo sale de la FECHA, no del estado: un torneo de ayer que nadie ha
   cerrado está en Pasados, con su chip de «En curso» a la vista para que se
   note que falta cerrarlo.

   Filtros, todos combinables (Y): persona, tipo, estado, desde y hasta. El
   rango de fechas se mira contra el torneo entero: un Regional del 17–18
   entra si el rango toca cualquiera de los dos días.

   Fechas en ISO (AAAA-MM-DD): se comparan como cadenas. Sin imports.
   ========================================================================= */

export type TorneoLista = {
  id: string;
  date: string;
  endDate?: string | null;
  kind: string;
  status: string;
};

export type FiltroTorneos = {
  /** Ids de torneo en los que está esa persona; null = sin filtro. */
  dePersona?: Set<string> | null;
  tipo?: string;
  estado?: string;
  desde?: string;
  hasta?: string;
};

export function filtrarTorneos<T extends TorneoLista>(ts: T[], f: FiltroTorneos): T[] {
  return ts.filter((t) => {
    const fin = t.endDate && t.endDate > t.date ? t.endDate : t.date;
    if (f.dePersona && !f.dePersona.has(t.id)) return false;
    if (f.tipo && t.kind !== f.tipo) return false;
    if (f.estado && t.status !== f.estado) return false;
    if (f.desde && fin < f.desde) return false;
    if (f.hasta && t.date > f.hasta) return false;
    return true;
  });
}

export function agruparTorneos<T extends TorneoLista>(ts: T[], hoy: string) {
  const fin = (t: T) => (t.endDate && t.endDate > t.date ? t.endDate : t.date);
  const hoyL: T[] = [], proximos: T[] = [], pasados: T[] = [];
  for (const t of ts) {
    if (t.date <= hoy && fin(t) >= hoy) hoyL.push(t);
    else if (t.date > hoy) proximos.push(t);
    else pasados.push(t);
  }
  hoyL.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  proximos.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  pasados.sort((a, b) => fin(b).localeCompare(fin(a)) || b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  return { hoy: hoyL, proximos, pasados };
}
