/* =========================================================================
   v0.85 — Emparejamientos presenciales de Ciphermaniac (`matchupProfiles.json`).

   Sin imports. Su documentación no fija la forma del fichero, así que se
   aceptan las dos más habituales y se descarta lo que no case:
     · objeto por arquetipo: { "dragapult": { "matchups": { "gardevoir": { wins, losses, ties } } } }
       (o sin el nivel «matchups»);
     · lista de filas: [{ archetype | deck, opponent | vs, wins, losses, ties }].
   Son partidas de Regional (al mejor de 3): se devuelven como RESULTADOS DE
   SERIE, para que el recomendador no los convierta al Bo3 dos veces.
   ========================================================================= */
export type CruceCm = { a: string; b: string; w: number; l: number; t: number };

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
const victorias = (o: Record<string, unknown>) => n(o.wins ?? o.w ?? o.win);
const derrotas = (o: Record<string, unknown>) => n(o.losses ?? o.l ?? o.loss);
const empates = (o: Record<string, unknown>) => n(o.ties ?? o.t ?? o.draws ?? o.tie);

export function crucesDeMatchupProfiles(datos: unknown, aLider: (nombre: string) => string): CruceCm[] {
  const out = new Map<string, CruceCm>();
  const sumar = (a0: string, b0: string, w: number, l: number, t: number) => {
    const a = aLider(a0), b = aLider(b0);
    if (!a || !b || a === b || w + l + t === 0) return;
    // Un solo sentido por pareja: el otro lo pone el recomendador.
    const [x, y, ww, ll] = a < b ? [a, b, w, l] : [b, a, l, w];
    const c = out.get(`${x}|${y}`) ?? { a: x, b: y, w: 0, l: 0, t: 0 };
    c.w += ww; c.l += ll; c.t += t;
    out.set(`${x}|${y}`, c);
  };
  const vistas = new Set<string>();
  const unaVez = (a: string, b: string) => {
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (vistas.has(k)) return false;
    vistas.add(k); return true;
  };
  if (Array.isArray(datos)) {
    for (const x of datos) {
      const o = (x ?? {}) as Record<string, unknown>;
      const a = String(o.archetype ?? o.deck ?? o.name ?? ""), b = String(o.opponent ?? o.vs ?? o.against ?? "");
      if (a && b && unaVez(a, b)) sumar(a, b, victorias(o), derrotas(o), empates(o));
    }
  } else if (datos && typeof datos === "object") {
    for (const [a, v] of Object.entries(datos as Record<string, unknown>)) {
      const o = (v ?? {}) as Record<string, unknown>;
      const m = (o.matchups && typeof o.matchups === "object" ? o.matchups : o) as Record<string, unknown>;
      for (const [b, r] of Object.entries(m)) {
        if (!r || typeof r !== "object") continue;
        if (unaVez(a, b)) sumar(a, b, victorias(r as Record<string, unknown>), derrotas(r as Record<string, unknown>), empates(r as Record<string, unknown>));
      }
    }
  }
  return [...out.values()];
}
