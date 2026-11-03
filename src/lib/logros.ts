/* =========================================================================
   v0.65 — Logros secretos, la Ball de uso y las etiquetas del perfil.

   Sin imports, como el resto de módulos que se prueban.

   · LOGROS: se ganan encontrando los easter eggs de la web. En el perfil solo
     se ven los encontrados; los demás no se nombran (solo «quedan N»), porque
     un secreto con su pista escrita deja de serlo.
   · LA BALL DE USO: mejora según lo que se usa la web (partidas apuntadas,
     torneos jugados, logros encontrados). Poké → Super → Ultra → Master.
   · ETIQUETAS: hitos con nombre, como la de Bronce del ladder, que ya existe
     aparte (`RankBadge`).

   Los sprites NO se dibujan: los de Pokémon son los de la app (Limitless) y
   las Balls, de PokéAPI, como en `balls.ts`.
   ========================================================================= */

export type Logro = {
  clave: string;
  nombre: string;
  /** Qué se hizo para ganarlo: solo se enseña una vez ganado. */
  como: string;
  /** Pokémon del sprite (slug de la app). */
  pokemon: string;
  /** v0.73 — número de la Pokédex, para los que no están en los sprites de la
      app (Limitless solo tiene los de Escarlata y Púrpura; Klinklang no). */
  dex?: number;
};

/** v0.73 — sprite oficial de PokéAPI por número de Pokédex (enlazado, no dibujado). */
export const urlPokeApi = (dex: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${Math.max(1, Math.round(dex))}.png`;

export const LOGROS: Logro[] = [
  { clave: "solrock", nombre: "Amanecer", como: "Pasaste la app al tema claro.", pokemon: "solrock" },
  { clave: "lunatone", nombre: "Luna llena", como: "Pasaste la app al tema oscuro.", pokemon: "lunatone" },
  { clave: "tadbulb", nombre: "Cortocircuito", como: "Machacaste el botón del tema hasta que algo reventó.", pokemon: "tadbulb" },
  { clave: "psyduck", nombre: "Dolor de cabeza", como: "Apuntaste una penalización de dos premios.", pokemon: "psyduck" },
  { clave: "estacion", nombre: "Observador de estaciones", como: "Tocaste la estación de la barra y asomó su Pokémon.", pokemon: "deerling" },
  { clave: "voltorb", nombre: "Eso no era una Poké Ball", como: "Le diste demasiadas veces a la Poké Ball de la barra.", pokemon: "voltorb" },
  // v0.72
  { clave: "klinklang", nombre: "Engranaje perfecto", como: "Hiciste girar la rueda de Ajustes hasta que encajaron los engranajes.", pokemon: "klinklang", dex: 601 },
  // v0.90
  { clave: "missingno", nombre: "MissingNo.", como: "Te perdiste por una página que no existe.", pokemon: "porygon", dex: 137 },
  { clave: "variocolor", nombre: "¡Variocolor!", como: "Tu avatar salió shiny: 1 entre 4.096.", pokemon: "pikachu", dex: 25 },
  { clave: "snorlax", nombre: "Un Snorlax bloquea el camino", como: "Lo despertaste con la Poké Flauta de madrugada.", pokemon: "snorlax", dex: 143 },
  { clave: "salpicadura", nombre: "Salpicadura", como: "Cinco derrotas seguidas. No tuvo ningún efecto… esta vez.", pokemon: "magikarp", dex: 129 },
  { clave: "ditto", nombre: "Transformación", como: "Mantuviste pulsado tu avatar y Ditto copió a tu rival.", pokemon: "ditto", dex: 132 },
  { clave: "mew", nombre: "Código secreto", como: "Tecleaste el código Konami.", pokemon: "mew", dex: 151 },
  { clave: "eevee", nombre: "Eeveelución", como: "Cambiaste tema e idioma ocho veces.", pokemon: "eevee", dex: 133 },
];

export const CLAVES_LOGRO = LOGROS.map((l) => l.clave);

/** Lo guardado en la cuenta («psyduck,voltorb») → claves válidas, sin repetir. */
export function leerLogros(guardado: string | null | undefined): string[] {
  const set = new Set((guardado ?? "").split(",").map((c) => c.trim()));
  return CLAVES_LOGRO.filter((c) => set.has(c));
}

/** Lo guardado con un logro más. Una clave desconocida no entra. */
export function anadirLogro(guardado: string | null | undefined, clave: string): string {
  const actuales = leerLogros(guardado);
  if (CLAVES_LOGRO.includes(clave) && !actuales.includes(clave)) actuales.push(clave);
  return CLAVES_LOGRO.filter((c) => actuales.includes(c)).join(",");
}

/* ------------------------------------------------------- la Ball de uso -- */

export type NivelBall = { ball: string; nombre: string; desde: number };

/* v0.73 — más escalones y más separados: subir tiene que costar. Con los
   puntos de uso (partida 1, torneo 3, logro 5), una temporada normal de liga
   llega a Ultra; la Master Ball es de quien vive en la app. */
export const NIVELES_BALL: NivelBall[] = [
  { ball: "poke-ball", nombre: "Poké Ball", desde: 0 },
  { ball: "great-ball", nombre: "Super Ball", desde: 40 },
  { ball: "ultra-ball", nombre: "Ultra Ball", desde: 120 },
  { ball: "dusk-ball", nombre: "Ocaso Ball", desde: 240 },
  { ball: "luxury-ball", nombre: "Lujo Ball", desde: 400 },
  { ball: "beast-ball", nombre: "Ente Ball", desde: 650 },
  { ball: "master-ball", nombre: "Master Ball", desde: 1000 },
];

export type Uso = { partidas: number; torneos: number; logros: number };

/** Puntos de uso: una partida vale 1, un torneo 3 (es un día entero) y un logro 5. */
export const puntosDeUso = (u: Uso) =>
  Math.max(0, u.partidas) + 3 * Math.max(0, u.torneos) + 5 * Math.max(0, u.logros);

export function nivelDeUso(u: Uso): { nivel: NivelBall; puntos: number; siguiente: NivelBall | null; faltan: number; progreso: number } {
  const puntos = puntosDeUso(u);
  let i = 0;
  for (let k = 0; k < NIVELES_BALL.length; k++) if (puntos >= NIVELES_BALL[k].desde) i = k;
  const nivel = NIVELES_BALL[i];
  const siguiente = NIVELES_BALL[i + 1] ?? null;
  const faltan = siguiente ? siguiente.desde - puntos : 0;
  const progreso = siguiente ? (puntos - nivel.desde) / (siguiente.desde - nivel.desde) : 1;
  return { nivel, puntos, siguiente, faltan, progreso };
}

/* ------------------------------------------------------------ etiquetas -- */

export type Etiqueta = { clave: string; nombre: string; tono: "bronce" | "plata" | "oro" | "secreto" };

/** Hitos con nombre. Solo los conseguidos: una etiqueta sin ganar no se enseña. */
export function etiquetasDe(u: Uso): Etiqueta[] {
  const out: Etiqueta[] = [];
  const escalon = (n: number, cortes: [number, number, number], clave: string, nombres: [string, string, string]) => {
    if (n >= cortes[2]) out.push({ clave, nombre: nombres[2], tono: "oro" });
    else if (n >= cortes[1]) out.push({ clave, nombre: nombres[1], tono: "plata" });
    else if (n >= cortes[0]) out.push({ clave, nombre: nombres[0], tono: "bronce" });
  };
  escalon(u.partidas, [10, 50, 150], "partidas", ["Entrenador", "Entrenador veterano", "As de la liga"]);
  escalon(u.torneos, [1, 5, 15], "torneos", ["Primer torneo", "Torneísta", "Viajero del circuito"]);
  if (u.logros >= CLAVES_LOGRO.length) out.push({ clave: "todos", nombre: "Lo encontró todo", tono: "secreto" });
  else if (u.logros >= 1) out.push({ clave: "secretos", nombre: "Buscador de secretos", tono: "secreto" });
  return out;
}

/** v0.90 — el sprite shiny oficial de PokéAPI (para el logro «¡Variocolor!»). */
export const urlPokeApiShiny = (dex: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${Math.max(1, Math.round(dex))}.png`;

/** v0.90 — ¿una racha de `n` derrotas seguidas al final? (de más antigua a más reciente). */
export function rachaDerrotas(resultados: Array<"w" | "l" | "t">): number {
  let n = 0;
  for (let i = resultados.length - 1; i >= 0 && resultados[i] === "l"; i--) n++;
  return n;
}

/** v0.90 — el código Konami: ↑↑↓↓←→←→BA. */
export const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
export function avanzaKonami(pos: number, tecla: string): number {
  const t = tecla.length === 1 ? tecla.toLowerCase() : tecla;
  if (t === KONAMI[pos]) return pos + 1;
  return t === KONAMI[0] ? 1 : 0;
}
