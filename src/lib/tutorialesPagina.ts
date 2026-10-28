/* =========================================================================
   v0.61 — Los tutoriales de cada página: la primera vez que entras en ella,
   para qué sirve y cómo se usa. Sin imports.

   Cada página tiene una CLAVE (lo que se apunta en la cuenta al verlo) y sus
   pasos (claves de traducción). Las rutas más concretas van ANTES que las
   generales: `/torneos/nuevo` antes que `/torneos/<id>`, y esta antes que
   `/torneos`.
   ========================================================================= */

/* v0.73 — cada paso señala algo de la página (`foco`): el elemento con
   `data-paso="<clave>-<n>"`. Si la página no lo tiene, el primer paso señala
   el título. Lo pinta `TutorialPagina`. */
export type TutorialPagina = { clave: string; pasos: Array<{ titulo: string; texto: string; foco: string }> };

const pasos = (clave: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({
    titulo: `tp.${clave}.t${i + 1}`, texto: `tp.${clave}.x${i + 1}`, foco: `[data-paso="${clave}-${i + 1}"]`,
  }));

/** [prueba de la ruta, clave, número de pasos] */
const RUTAS: Array<[(r: string) => boolean, string, number]> = [
  [(r) => r === "/", "inicio", 3],
  [(r) => r === "/herramientas", "herramientas", 2],
  [(r) => r === "/partidas/nueva", "registrar", 2],
  [(r) => r === "/torneos/nuevo", "torneoNuevo", 2],
  [(r) => /^\/torneos\/[^/]+$/.test(r), "torneo", 2],
  [(r) => r === "/torneos", "torneos", 2],
  [(r) => r === "/competiciones" || r.startsWith("/competiciones/"), "liga", 2],
  [(r) => r === "/estadisticas", "estadisticas", 2],
  [(r) => r === "/ranking", "ranking", 2],
  [(r) => r === "/topdecks" || r.startsWith("/topdecks/"), "topdecks", 2],
  [(r) => r === "/calendario", "calendario", 2],
  [(r) => r === "/resultados", "resultados", 2],
  [(r) => /^\/perfil\/[^/]+$/.test(r) && r !== "/perfil/editar", "perfil", 2],
  [(r) => r === "/mazos" || r.startsWith("/mazos/"), "mazos", 2],
  [(r) => r === "/ajustes", "ajustes", 2],
];

export const CLAVES_TUTORIAL: readonly string[] = RUTAS.map(([, c]) => c);

/** El tutorial de una ruta, o null si esa página no tiene. */
export function tutorialDe(ruta: string): TutorialPagina | null {
  const r = ruta.split("?")[0].replace(/\/+$/, "") || "/";
  for (const [prueba, clave, n] of RUTAS) if (prueba(r)) return { clave, pasos: pasos(clave, n) };
  return null;
}

/** La lista guardada en la cuenta («inicio,ranking») con una clave más, sin repetir ni colar claves desconocidas. */
export function anadirVisto(guardado: string, clave: string): string {
  const set = new Set(guardado.split(",").filter((c) => CLAVES_TUTORIAL.includes(c)));
  if (CLAVES_TUTORIAL.includes(clave)) set.add(clave);
  return [...set].join(",");
}
