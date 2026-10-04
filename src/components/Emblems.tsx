/* =========================================================================
   v0.18 — Emblemas de tipo de torneo: Challenge, Cup y Online.

   Hacen juego con el logo de los Regional Championships (escudo con borde
   azul marino, franja blanca con el nombre y campo de color debajo), pero
   son dibujos PROPIOS: ni Poké Ball ni logotipos de The Pokémon Company. El
   del Regional sí es el oficial, y por eso va como imagen aparte.

   SVG en línea y sin ids (ni degradados ni <defs>): se pintan varias veces
   en la misma página y unos ids repetidos se pisarían entre sí.
   ========================================================================= */

export type EmblemKind = "league_challenge" | "league_cup" | "online";

const NAVY = "#1b2a52";
const GRIS = "#c5ccd6";

const CONFIG: Record<EmblemKind, { titulo: string; sub?: string; campo: string; label: string }> = {
  league_challenge: { titulo: "CHALLENGE", sub: "LEAGUE", campo: "#2f9e5a", label: "League Challenge" },
  league_cup:       { titulo: "CUP",       sub: "LEAGUE", campo: "#2563c9", label: "League Cup" },
  online:           { titulo: "ONLINE",                   campo: "#7048c4", label: "Torneo online" },
};

/** El símbolo del campo, en blanco, centrado en (50, 66). */
function Simbolo({ kind }: { kind: EmblemKind }) {
  if (kind === "league_challenge") {
    // Estrella de cinco puntas.
    return (
      <path fill="#fff" stroke={NAVY} strokeWidth="2.5" strokeLinejoin="round"
        d="M50 48 l4.6 9.4 10.3 1.5 -7.5 7.3 1.8 10.3 -9.2 -4.9 -9.2 4.9 1.8 -10.3 -7.5 -7.3 10.3 -1.5z" />
    );
  }
  if (kind === "league_cup") {
    // Copa con dos asas.
    return (
      <g fill="#fff" stroke={NAVY} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M38 52 h24 v6 a12 12 0 0 1 -24 0z" />
        <path fill="none" strokeWidth="3" d="M38 55 h-5 a5 5 0 0 0 5 8 M62 55 h5 a5 5 0 0 1 -5 8" />
        <path d="M47 69 h6 v6 h-6z" />
        <path d="M41 75 h18 v5 h-18z" />
      </g>
    );
  }
  // Online: tres arcos de wifi y un punto.
  return (
    <g fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round">
      <path d="M33 61 a24 24 0 0 1 34 0" />
      <path d="M39 67 a15 15 0 0 1 22 0" />
      <path d="M45 73 a6.5 6.5 0 0 1 10 0" />
      <circle cx="50" cy="78.5" r="2.4" fill="#fff" stroke="none" />
    </g>
  );
}

export function KindEmblem({ kind, className = "size-10" }: { kind: EmblemKind; className?: string }) {
  const c = CONFIG[kind];
  // Escudo: arriba plano con hombros, abajo en punta.
  const escudo = "M50 4 L88 14 Q90 15 90 17 V46 C90 70 73 86 50 96 C27 86 10 70 10 46 V17 Q10 15 12 14 Z";
  return (
    <svg viewBox="0 0 100 100" className={`${className} flex-none`} role="img" aria-label={c.label}>
      <title>{c.label}</title>
      {/* Borde marino y bisel gris, como el del Regional. */}
      <path d={escudo} fill={NAVY} />
      <path d="M50 10 L84 19 V46 C84 66 69 80 50 89 C31 80 16 66 16 46 V19 Z" fill={GRIS} />
      {/* Campo de color (la mitad de abajo) y franja blanca con el nombre. */}
      <path d="M50 13 L81 21 V46 C81 64 67 77 50 85 C33 77 19 64 19 46 V21 Z" fill={c.campo} />
      <path d="M50 13 L81 21 V42 H19 V21 Z" fill="#fff" />
      {c.sub && (
        <text x="50" y="25" textAnchor="middle" fontSize="8.5" fontWeight="800" letterSpacing="1.5"
          fill={NAVY} fontFamily="'Saira Condensed', 'Arial Narrow', sans-serif">{c.sub}</text>
      )}
      <text x="50" y={c.sub ? 38 : 34} textAnchor="middle"
        fontSize={c.titulo.length > 6 ? 14 : c.sub ? 18 : 16} fontWeight="800" letterSpacing="0.5"
        fill={NAVY} fontFamily="'Saira Condensed', 'Arial Narrow', sans-serif"
        textLength={c.titulo.length > 6 ? 58 : undefined} lengthAdjust="spacingAndGlyphs">
        {c.titulo}
      </text>
      <path d="M19 42 H81" stroke={NAVY} strokeWidth="2.5" />
      <Simbolo kind={kind} />
    </svg>
  );
}

/**
 * Qué emblema le toca a un torneo/evento. Online gana al tipo: un Challenge
 * jugado por internet se reconoce antes por ser online.
 */
export function emblemKindOf(kind: string | null | undefined, scope?: string | null): EmblemKind | "regional" | null {
  if (kind === "online" || scope === "online") return "online";
  if (kind === "regional") return "regional";
  if (kind === "league_challenge") return "league_challenge";
  if (kind === "league_cup") return "league_cup";
  return null;
}
