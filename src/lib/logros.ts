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
};

export const LOGROS: Logro[] = [
  { clave: "solrock", nombre: "Amanecer", como: "Pasaste la app al tema claro.", pokemon: "solrock" },
  { clave: "lunatone", nombre: "Luna llena", como: "Pasaste la app al tema oscuro.", pokemon: "lunatone" },
  { clave: "tadbulb", nombre: "Cortocircuito", como: "Machacaste el botón del tema hasta que algo reventó.", pokemon: "tadbulb" },
  { clave: "psyduck", nombre: "Dolor de cabeza", como: "Apuntaste una penalización de dos premios.", pokemon: "psyduck" },
  { clave: "estacion", nombre: "Observador de estaciones", como: "Tocaste la estación de la barra y asomó su Pokémon.", pokemon: "deerling" },
  { clave: "voltorb", nombre: "Eso no era una Poké Ball", como: "Le diste demasiadas veces a la Poké Ball de la barra.", pokemon: "voltorb" },
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

export type NivelBall = { ball: "poke-ball" | "great-ball" | "ultra-ball" | "master-ball"; nombre: string; desde: number };

export const NIVELES_BALL: NivelBall[] = [
  { ball: "poke-ball", nombre: "Poké Ball", desde: 0 },
  { ball: "great-ball", nombre: "Super Ball", desde: 25 },
  { ball: "ultra-ball", nombre: "Ultra Ball", desde: 80 },
  { ball: "master-ball", nombre: "Master Ball", desde: 200 },
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
