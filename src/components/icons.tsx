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
  trophy: "M6 3h12v5a6 6 0 0 1-12 0zM9 21h6M12 14v7M4 5H2v2a4 4 0 0 0 4 4M20 5h2v2a4 4 0 0 1-4 4",
  cog: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM12 2v3m0 14v3M2 12h3m14 0h3M4.5 4.5 6.6 6.6m10.8 10.8 2.1 2.1M19.5 4.5 17.4 6.6M6.6 17.4 4.5 19.5",
  plus: "M12 5v14M5 12h14",
  more: "M4 6h16M4 12h16M4 18h16",
  back: "M15 6l-6 6 6 6",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h9",
  share: "M12 15V3m0 0L8 7m4-4 4 4M5 13v6h14v-6",
  check: "M4 12.5 9.5 18 20 6",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4",
  lock: "M6 10h12v10H6zM9 10V7a3 3 0 0 1 6 0v3",
  refresh: "M4 12a8 8 0 0 1 13.7-5.7L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.7L4 16M4 20v-4h4",
};

export function Icon({ name, className = "size-5" }: { name: keyof typeof P | string; className?: string }) {
  return (
    <svg
      className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <path d={P[name] ?? P.more} />
    </svg>
  );
}

export const ICON_NAMES = Object.keys(P);
