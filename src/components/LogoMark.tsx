/* =========================================================================
   v0.24 — Emblema de PokeArena TCG: insignia hexagonal con dos katanas
   cruzadas y un orbe dorado en el cruce. Diseño propio (no reproduce la Poké
   Ball ni ningún logotipo de The Pokémon Company). Colores fijos: es la
   marca y tiene que verse igual en tema claro y oscuro.

   Sin ids internos (ni degradados ni <defs>): puede salir varias veces en la
   misma página. El mismo dibujo está en `src/app/icon.svg` (favicon).
   ========================================================================= */

function Katana({ flip = false }: { flip?: boolean }) {
  // Dibujada en diagonal de arriba-derecha a abajo-izquierda; `flip` la refleja.
  return (
    <g transform={flip ? "matrix(-1 0 0 1 100 0)" : undefined}>
      {/* hoja con curva suave */}
      <path d="M78 14 C80 13 84 15 83 18 L40 62 L36 58 Z" fill="#e6ecf3" stroke="#9fb0c3" strokeWidth="1.2" />
      <path d="M80 16 L39 59" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      {/* tsuba (guarda) */}
      <ellipse cx="37" cy="61" rx="6" ry="2.6" transform="rotate(-45 37 61)" fill="#f2b544" stroke="#8a6a2a" strokeWidth="1" />
      {/* empuñadura con el trenzado */}
      <path d="M35 63 L22 76 L25 79 L38 66 Z" fill="#7a1f2b" stroke="#3a0d14" strokeWidth="1" />
      <path d="M31 67 l3 3 M28 70 l3 3 M25 73 l3 3" stroke="#f2b544" strokeWidth="1.2" />
      {/* kashira (remate) */}
      <circle cx="22.5" cy="78.5" r="2.4" fill="#f2b544" stroke="#8a6a2a" strokeWidth="0.8" />
    </g>
  );
}

export function LogoMark({ className = "size-9", title = "PokeArena TCG" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} flex-none`} role="img" aria-label={title}>
      <title>{title}</title>
      {/* insignia hexagonal: borde dorado, fondo marino */}
      <path d="M50 3 L91 26.5 V73.5 L50 97 L9 73.5 V26.5 Z" fill="#f2b544" />
      <path d="M50 9 L86 29.5 V70.5 L50 91 L14 70.5 V29.5 Z" fill="#1b2a52" />
      <path d="M50 9 L86 29.5 V50 H14 V29.5 Z" fill="#24396b" opacity="0.6" />
      <Katana />
      <Katana flip />
      {/* orbe en el cruce */}
      <circle cx="50" cy="50" r="9" fill="#f2b544" stroke="#1b2a52" strokeWidth="3" />
      <circle cx="47" cy="47" r="2.6" fill="#fff6dc" />
    </svg>
  );
}
