export type NavItem = { href: string; label: string; icon: string };

/** Todas las secciones, en el orden en que se muestran en la barra lateral. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/ranking", label: "Ranking", icon: "rank" },
  { href: "/resultados", label: "Resultados", icon: "results" },
  { href: "/torneos", label: "Torneos", icon: "trophy" },
  { href: "/calendario", label: "Calendario", icon: "calendar" },
  { href: "/estadisticas", label: "Estadísticas", icon: "stats" },
  { href: "/mazos", label: "Mazos", icon: "deck" },
  { href: "/competiciones", label: "Competiciones", icon: "cup" },
  { href: "/ajustes", label: "Ajustes", icon: "cog" },
];

/** Las que caben en la barra inferior del móvil. El resto van a «Más». */
export const MOBILE_HREFS = ["/", "/ranking", "/torneos"];

export const moreSections = () => NAV_ITEMS.filter((i) => !MOBILE_HREFS.includes(i.href));
