export type NavItem = { href: string; label: string; icon: string };
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
      { href: "/", label: "Inicio", icon: "home" },
      { href: "/calendario", label: "Calendario", icon: "calendar" },
    ],
  },
  {
    key: "nav.group.compete",
    title: "Competir",
    items: [
      { href: "/torneos", label: "Torneos", icon: "trophy" },
      { href: "/competiciones", label: "Liga", icon: "league" },
      { href: "/resultados", label: "Resultados", icon: "results" },
      // Beta: se conserva la herramienta, pero se oculta de la navegación.
      // { href: "/mesa", label: "Mi Mesa", icon: "plus" },
    ],
  },
  {
    key: "nav.group.analysis",
    title: "Análisis",
    items: [
      { href: "/ranking", label: "Ranking", icon: "rank" },
      { href: "/estadisticas", label: "Estadísticas", icon: "stats" },
      { href: "/topdecks", label: "Top Decks", icon: "globe" },
      { href: "/mazos", label: "Mazos", icon: "deck" },
    ],
  },
  {
    key: "nav.group.account",
    title: "Cuenta",
    items: [{ href: "/ajustes", label: "Ajustes", icon: "cog" }],
  },
];

/** Todas las secciones, en orden. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Las que caben en la barra inferior del móvil. El resto van a «Más». */
export const MOBILE_HREFS = ["/", "/estadisticas", "/torneos"];

export const moreSections = () => NAV_ITEMS.filter((i) => !MOBILE_HREFS.includes(i.href));

/** «Más» del móvil, con los mismos grupos que la barra lateral. */
export const moreGroups = (): NavGroup[] =>
  NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => !MOBILE_HREFS.includes(i.href)) }))
    .filter((g) => g.items.length > 0);
