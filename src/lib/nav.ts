export type NavItem = {
  href: string;
  label: string;
  icon: string;
  /**
   * v0.38 — la sección existe y funciona, pero no se pinta en el menú.
   *
   * Sigue en `NAV_ITEMS` a propósito: es la lista con la que se resuelve
   * «¿en qué sección estoy?» y el título de la cabecera. Sacarla de ahí
   * dejaría /mazos sin nombre en la barra superior.
   */
  oculto?: boolean;
  /**
   * v0.64 — el sprite de la sección: un objeto de PokéAPI o un Pokémon, con el
   * formato de `leerRef` (`lib/objetos.ts`). Si no carga, se pinta `icon`,
   * que queda de reserva. Sustituye a los emojis de la v0.63.
   */
  sprite?: string;
};
/** `key` es la clave de traducción del título del grupo (`lib/i18n.ts`). */
export type NavGroup = { key: string; title: string; items: NavItem[] };

/* =========================================================================
   v0.16 — El menú, agrupado.

   Antes eran once botones seguidos. Ahora van en cuatro grupos, por lo que
   se viene a hacer:

     · Principal  — lo de todos los días: el inicio y qué hay esta semana.
     · Competir   — donde se juega y se apunta: torneos de fuera, la liga
                    interna y el historial de partidas.
     · Análisis   — lo que se mira para mejorar: clasificación, números,
                    meta y los mazos.
     · Cuenta     — tu perfil y la configuración.

   «Competiciones» pasa a llamarse **Liga** y lleva un escudo: con el trofeo
   y la copa uno al lado del otro no se distinguía de Torneos. La URL sigue
   siendo /competiciones para no romper enlaces guardados.
   ========================================================================= */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: "nav.group.main",
    title: "Principal",
    items: [
      { href: "/", label: "Inicio", icon: "home", sprite: "pokemon:chansey" },
      { href: "/calendario", label: "Calendario", icon: "calendar", sprite: "objeto:town-map" },
    ],
  },
  {
    key: "nav.group.compete",
    title: "Competir",
    items: [
      { href: "/torneos", label: "Torneos", icon: "trophy", sprite: "objeto:vs-seeker" },
      { href: "/competiciones", label: "Liga", icon: "league", sprite: "objeto:shiny-charm" },
      { href: "/resultados", label: "Resultados", icon: "results", sprite: "objeto:rare-candy" },
      // Beta: se conserva la herramienta, pero se oculta de la navegación.
      // { href: "/mesa", label: "Mi Mesa", icon: "plus" },
    ],
  },
  {
    key: "nav.group.analysis",
    title: "Análisis",
    items: [
      { href: "/ranking", label: "Ranking", icon: "rank", sprite: "objeto:master-ball" },
      { href: "/estadisticas", label: "Estadísticas", icon: "stats", sprite: "objeto:poke-radar" },
      { href: "/topdecks", label: "Top Decks", icon: "globe", sprite: "objeto:great-ball" },
      /* v0.38 — Mazos sale del menú. No desaparece: vive dentro de Top
         Decks, que es donde se mira el metagame y se decide con qué ir, y
         es justo el momento en que uno quiere abrir su biblioteca. Un menú
         con dos entradas casi iguales («Top Decks» y «Mazos») obliga a
         elegir antes de saber qué hay en cada una. */
      { href: "/mazos", label: "Mazos", icon: "deck", sprite: "objeto:poke-ball", oculto: true },
    ],
  },
  {
    key: "nav.group.account",
    title: "Cuenta",
    items: [{ href: "/ajustes", label: "Ajustes", icon: "cog", sprite: "objeto:dowsing-machine" }],
  },
];

/** Todas las secciones, en orden. Incluye las ocultas: esta lista es la que
    resuelve en qué sección estás y cómo se titula la pantalla. */
/** v0.64 — el sprite del perfil: el Repartir Experiencia (tu progreso). */
export const SPRITE_PERFIL = "objeto:exp-share";

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Los grupos tal y como se pintan en el menú: sin las secciones ocultas, y
    sin los grupos que se quedan vacíos al quitarlas. */
export const NAV_GROUPS_VISIBLES: NavGroup[] = NAV_GROUPS
  .map((g) => ({ ...g, items: g.items.filter((i) => !i.oculto) }))
  .filter((g) => g.items.length > 0);

/** Las que caben en la barra inferior del móvil. El resto van a «Más». */
export const MOBILE_HREFS = ["/", "/estadisticas", "/torneos"];

export const moreSections = () =>
  NAV_ITEMS.filter((i) => !i.oculto && !MOBILE_HREFS.includes(i.href));

/** «Más» del móvil, con los mismos grupos que la barra lateral. */
export const moreGroups = (): NavGroup[] =>
  NAV_GROUPS_VISIBLES
    .map((g) => ({ ...g, items: g.items.filter((i) => !MOBILE_HREFS.includes(i.href)) }))
    .filter((g) => g.items.length > 0);
