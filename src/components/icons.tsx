/** Iconos de línea, 24×24. Trazo heredado del color del texto. */
const P: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5",
  rank: "M4 20h4V9H4zM10 20h4V4h-4zM16 20h4v-7h-4z",
  results: "M4 6h16M4 12h16M4 18h10",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  stats: "M4 19V5m0 14h16M8 16v-5m4 5V8m4 8v-3",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-6 8-6s8 2 8 6",
  deck: "M8 4h11v13H8zM5 7v13h11",
  cup: "M7 4h10v4a5 5 0 0 1-10 0zM9 18h6M12 13v5M5 6H3v2a4 4 0 0 0 4 4M19 6h2v2a4 4 0 0 1-4 4",
  // v0.16 — la Liga: un escudo con la tabla dentro, para no confundirla con Torneos.
  league: "M12 3 4.5 5.8v5.7c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V5.8zM8.5 10h7M8.5 13.5h7M8.5 17h4",
  trophy: "M6 3h12v5a6 6 0 0 1-12 0zM9 21h6M12 14v7M4 5H2v2a4 4 0 0 0 4 4M20 5h2v2a4 4 0 0 1-4 4",
  cog: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM12 2v3m0 14v3M2 12h3m14 0h3M4.5 4.5 6.6 6.6m10.8 10.8 2.1 2.1M19.5 4.5 17.4 6.6M6.6 17.4 4.5 19.5",
  plus: "M12 5v14M5 12h14",
  more: "M4 6h16M4 12h16M4 18h16",
  back: "M15 6l-6 6 6 6",
  // v0.38: la punta de flecha de las secciones plegables. Apunta abajo
  // cuando está abierta y se gira 90° cuando se cierra.
  chevron: "M6 9l6 6 6-6",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h9",
  share: "M12 15V3m0 0L8 7m4-4 4 4M5 13v6h14v-6",
  check: "M4 12.5 9.5 18 20 6",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4",
  lock: "M6 10h12v10H6zM9 10V7a3 3 0 0 1 6 0v3",
  refresh: "M4 12a8 8 0 0 1 13.7-5.7L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.7L4 16M4 20v-4h4",
  close: "M6 6l12 12M18 6 6 18",
  alert: "M12 3 2 20h20zM12 9v5m0 3h.01",
  // Añadidos en la v0.7.0, para la pantalla de estadísticas y el buscador de
  // cartas. Mismo trazo y misma rejilla de 24 que el resto.
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z",
  database: "M12 7c4.4 0 8-1.1 8-2.5S16.4 2 12 2 4 3.1 4 4.5 7.6 7 12 7ZM4 4.5v15C4 20.9 7.6 22 12 22s8-1.1 8-2.5v-15M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5",
  compare: "M12 3v18M7 7 3 11l4 4M17 17l4-4-4-4",
  card: "M4 6h11v14H4zM17 8h3v12H8",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.2 2",
  wifi: "M2.5 9a15 15 0 0 1 19 0M5.5 12.5a10 10 0 0 1 13 0M8.5 16a5.5 5.5 0 0 1 7 0M12 19.5h.01",
  // v0.12.0: quitar un evento del metagame presencial.
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5",
};

export function Icon({
  name, className = "size-5", style,
}: {
  name: keyof typeof P | string;
  className?: string;
  /** Para teñirlo con una variable del tema sin inventarse una clase. */
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <path d={P[name] ?? P.more} />
    </svg>
  );
}

export const ICON_NAMES = Object.keys(P);
