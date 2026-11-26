/* =========================================================================
   v0.140 — IMPORTAR PARTIDAS DEL PTCG LIVE desde su registro de batalla.

   Sin imports, para probarlo. El juego no tiene API ni exporta un historial,
   pero al terminar cada partida tiene «Registro de batalla» y un botón que lo
   copia ENTERO al portapapeles (comprobado: lo describe su propio foro). Eso
   es lo que se pega aquí, una partida o varias seguidas.

   De cada partida se saca: los dos jugadores (las líneas de «robó 7 cartas
   para la mano inicial»), quién ganó (la última línea «… wins.»), quién
   empezó y qué Pokémon sacó cada uno (puestos en juego, robados y bajados,
   evolucionados). Con eso se adivina el arquetipo del rival contra el
   catálogo de la app: el que tenga su Pokémon principal (y, mejor, también el
   secundario) entre los que se le vieron.

   AVISO: el formato está escrito con ejemplos públicos del registro en
   inglés; si el juego lo cambia o está en otro idioma, puede no reconocerlo.
   Lo que no se entiende se descarta, nunca se inventa.
   ========================================================================= */

export type PartidaLive = {
  jugadores: [string, string];
  ganador: string | null;
  primero: string | null;
  /** Pokémon que se le vieron a cada jugador (nombres tal cual, sin código de expansión). */
  pokemon: Record<string, string[]>;
};

const limpiar = (s: string) => s.replace(/^\(\w+_\w+\)\s*/, "").replace(/\s*\(\w+_\w+\)\s*/g, " ").trim();

/** Trocea un pegado en partidas: cada «Setup» (o un nuevo par de manos iniciales) empieza una. */
export function trocear(texto: string): string[][] {
  const lineas = texto.replace(/\r/g, "").split("\n").map((l) => l.replace(/^[-•\s]+/, "").trim()).filter(Boolean);
  const partidas: string[][] = [];
  let actual: string[] = [];
  let manos = 0;
  for (const l of lineas) {
    const esSetup = /^setup$/i.test(l);
    const esMano = /drew 7 cards for the opening hand/i.test(l);
    if ((esSetup || (esMano && manos >= 2)) && actual.some((x) => /drew 7 cards for the opening hand/i.test(x))) {
      partidas.push(actual); actual = []; manos = 0;
    }
    if (esMano) manos++;
    actual.push(l);
  }
  if (actual.length) partidas.push(actual);
  return partidas;
}

export function leerPartida(lineas: readonly string[]): PartidaLive | null {
  const nombres: string[] = [];
  for (const l of lineas) {
    const m = /^(.+?) drew 7 cards for the opening hand/i.exec(l);
    if (m && !nombres.includes(m[1])) nombres.push(m[1]);
  }
  if (nombres.length !== 2) return null;
  const [a, b] = nombres;
  let ganador: string | null = null, primero: string | null = null;
  const pokemon: Record<string, string[]> = { [a]: [], [b]: [] };
  const ver = (quien: string, carta: string) => {
    const c = limpiar(carta).replace(/[.!]$/, "");
    if (c && pokemon[quien] && !pokemon[quien].includes(c)) pokemon[quien].push(c);
  };
  const de = (s: string) => (s === a || s === b ? s : null);
  for (const l of lineas) {
    let m: RegExpExecArray | null;
    if ((m = /(?:^|\.\s+)([^.]+?) wins\.?$/i.exec(l)) && de(m[1].trim())) ganador = m[1].trim();
    else if ((m = /^(.+?) (?:decided to go first|will go first|goes first)/i.exec(l)) && de(m[1])) primero = primero ?? m[1];
    else if ((m = /^Turn #\s*1\s*-\s*(.+?)'s Turn/i.exec(l)) && de(m[1])) primero = primero ?? m[1];
    if ((m = /^(.+?) played (.+?) to the (?:Active Spot|Bench)/i.exec(l)) && de(m[1])) ver(m[1], m[2]);
    else if ((m = /^(.+?) drew (.+?) and played it to the (?:Active Spot|Bench)/i.exec(l)) && de(m[1])) ver(m[1], m[2]);
    else if ((m = /^(.+?)'s (.+?) evolved into (.+?)(?: on the Bench| in the Active Spot)?\.?$/i.exec(l)) && de(m[1])) { ver(m[1], m[2]); ver(m[1], m[3]); }
  }
  return { jugadores: [a, b], ganador, primero, pokemon };
}

export function leerRegistros(texto: string): PartidaLive[] {
  return trocear(texto).map(leerPartida).filter((p): p is PartidaLive => p != null);
}

/** Quién soy: el nombre que sale en todas las partidas (o el que me digan). */
export function quienSoy(partidas: readonly PartidaLive[], preferido?: string | null): string | null {
  if (preferido && partidas.some((p) => p.jugadores.includes(preferido))) return preferido;
  const cuenta = new Map<string, number>();
  for (const p of partidas) for (const j of p.jugadores) cuenta.set(j, (cuenta.get(j) ?? 0) + 1);
  const [mejor] = [...cuenta.entries()].sort((x, y) => y[1] - x[1]);
  return mejor && (partidas.length === 1 ? null : mejor[1] === partidas.length ? mejor[0] : null);
}

export type ArqCatalogo = { id: string; name: string; main: string; secondary?: string | null };

/** El arquetipo más probable con esos Pokémon: hace falta ver su principal; el secundario desempata. */
export function adivinarArquetipo(pokemon: readonly string[], catalogo: readonly ArqCatalogo[], slug: (n: string) => string): ArqCatalogo | null {
  const vistos = new Set(pokemon.map(slug).filter(Boolean));
  let mejor: ArqCatalogo | null = null, nota = 0;
  for (const a of catalogo) {
    if (!a.main || !vistos.has(a.main)) continue;
    const n = 2 + (a.secondary && vistos.has(a.secondary) ? 1 : a.secondary ? -0.5 : 0);
    if (n > nota) { mejor = a; nota = n; }
  }
  return mejor;
}
