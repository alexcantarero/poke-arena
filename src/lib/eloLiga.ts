/* =========================================================================
   v0.82 — Liga Elo libre: cualquiera contra cualquiera, las veces que sea.

   Sin imports, para probarlo.

   Para un grupo de ~20 personas que no cuadran horario cada semana: no hay
   jornadas. Cada partida apuntada en la liga mueve el Elo de los dos, y la
   clasificación es el Elo.
     · Ganarle a alguien con más Elo da más; a alguien con menos, menos
       (expectativa clásica: 1 / (1 + 10^((Rb − Ra) / 400))).
     · Cuantas más partidas llevas, menos se mueve tu Elo: K = 40 en las 10
       primeras, 24 hasta 30 y 16 a partir de ahí. Los nuevos se colocan rápido y
       los veteranos no bailan por una mala tarde.
     · Con menos de `PROVISIONAL` partidas estás «en colocación»: tu Elo ya se
       mueve (y rápido, con K = 40), pero no sale tu puesto ni tu rango hasta la 5.ª.
     · v0.83 — todos empezáis en 0 y el Elo NO baja de 0 (suelo): es una escalera
       que se sube, como las ligas de los juegos. Los rangos, en `RANGOS_ELO`.
     · Una partida al mejor de 3 cuenta como una (lo que importa es la serie).
   ========================================================================= */

export const ELO_INICIAL = 0;
/** v0.83 — el Elo no baja de aquí. */
export const ELO_SUELO = 0;
export const PROVISIONAL = 5;

export const kDe = (partidas: number) => (partidas < 10 ? 40 : partidas < 30 ? 24 : 16);
export const esperado = (ra: number, rb: number) => 1 / (1 + Math.pow(10, (rb - ra) / 400));

export type PartidaElo = { a: string; b: string; ganador: "a" | "b" | "tie"; fecha: string };
export type FilaElo = {
  id: string; elo: number; partidas: number; w: number; l: number; t: number;
  /** Lo que movió su última partida. */
  ultimo: number;
  provisional: boolean;
};

export function eloLiga(partidas: PartidaElo[], jugadores: string[] = [], inicial = ELO_INICIAL): FilaElo[] {
  const f = new Map<string, FilaElo>();
  const de = (id: string) => {
    let x = f.get(id);
    if (!x) f.set(id, (x = { id, elo: inicial, partidas: 0, w: 0, l: 0, t: 0, ultimo: 0, provisional: true }));
    return x;
  };
  for (const id of jugadores) de(id);
  // En orden de fecha (y estable para las del mismo día).
  const orden = partidas.map((p, i) => ({ p, i })).sort((x, y) => x.p.fecha.localeCompare(y.p.fecha) || x.i - y.i);
  for (const { p } of orden) {
    if (!p.a || !p.b || p.a === p.b) continue;
    const A = de(p.a), B = de(p.b);
    const ea = esperado(A.elo, B.elo);
    const sa = p.ganador === "a" ? 1 : p.ganador === "b" ? 0 : 0.5;
    const da = kDe(A.partidas) * (sa - ea);
    const db = kDe(B.partidas) * ((1 - sa) - (1 - ea));
    const antesA = A.elo, antesB = B.elo;
    A.elo = Math.max(ELO_SUELO, A.elo + da); B.elo = Math.max(ELO_SUELO, B.elo + db);
    A.ultimo = A.elo - antesA; B.ultimo = B.elo - antesB;
    A.partidas++; B.partidas++;
    if (sa === 1) { A.w++; B.l++; } else if (sa === 0) { A.l++; B.w++; } else { A.t++; B.t++; }
  }
  return [...f.values()]
    .map((x) => ({ ...x, elo: Math.round(x.elo), ultimo: Math.round(x.ultimo), provisional: x.partidas < PROVISIONAL }))
    .sort((a, b) => Number(a.provisional) - Number(b.provisional) || b.elo - a.elo || b.partidas - a.partidas);
}

/* =========================================================================
   v0.83 — Rangos de la Liga Elo libre, cada uno con su color.

   Se empieza en Madera (0) y se sube. Los cortes están pensados para un grupo
   de ~20 personas con K 40 → 24 → 16: quien gana bastante llega a Oro en una
   temporada; Ópalo y Lapislázuli son para quien domina de verdad.
   ========================================================================= */
export type RangoElo = { clave: string; nombre: string; desde: number };

export const RANGOS_ELO: RangoElo[] = [
  { clave: "madera", nombre: "Madera", desde: 0 },
  { clave: "acero", nombre: "Acero", desde: 50 },
  { clave: "cobre", nombre: "Cobre", desde: 100 },
  { clave: "plata", nombre: "Plata", desde: 150 },
  { clave: "oro", nombre: "Oro", desde: 225 },
  { clave: "marmol", nombre: "Mármol", desde: 300 },
  { clave: "cuarzo", nombre: "Cuarzo", desde: 400 },
  { clave: "jade", nombre: "Jade", desde: 500 },
  { clave: "opalo", nombre: "Ópalo", desde: 625 },
  { clave: "lapislazuli", nombre: "Lapislázuli", desde: 775 },
];

/** El rango de un Elo, y cuánto falta para el siguiente (null si es el último). */
export function rangoElo(elo: number): { rango: RangoElo; siguiente: RangoElo | null; faltan: number } {
  let i = 0;
  for (let k = 0; k < RANGOS_ELO.length; k++) if (elo >= RANGOS_ELO[k].desde) i = k;
  const siguiente = RANGOS_ELO[i + 1] ?? null;
  return { rango: RANGOS_ELO[i], siguiente, faltan: siguiente ? Math.max(0, siguiente.desde - elo) : 0 };
}
