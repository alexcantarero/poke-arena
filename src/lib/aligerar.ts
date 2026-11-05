/* =========================================================================
   v0.108 — Rendimiento: lo que viaja al navegador, a dieta.

   Sin imports, para probarlo.

   Un componente de cliente recibe sus props SERIALIZADAS dentro del HTML. El
   formulario de partida (la pantalla que más se usa desde el móvil) recibía
   todos los mazos con su lista entera (`list`, `list_json`, `notes`) y todos
   los torneos con todos sus resultados, para enseñar un selector de mazo y
   los últimos 30 torneos. Con 37 jugadores, cientos de KB por visita.

   Aquí se recortan a lo que el formulario usa de verdad, sin cambiar su tipo:
   de la lista solo importa si existe (`hasList`), así que viaja un «1».
   ========================================================================= */

export function mazosLigeros<T extends { list: string; listJson?: unknown; notes?: string }>(decks: T[]): T[] {
  return decks.map((d) => ({ ...d, list: d.list.trim() ? "1" : "", listJson: null, notes: "" }));
}

/** Los `n` torneos más recientes, sin sus resultados ni sus rondas. */
export function torneosLigeros<T extends { date: string; results?: unknown[] }>(ts: T[], n = 40): Array<Omit<T, "results">> {
  return [...ts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n)
    .map(({ results: _r, ...t }) => t);
}
