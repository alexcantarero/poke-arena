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

export type RarezaLogro = "menos1" | "menos5" | "menos10" | "menos25" | "comun" | "sinDatos";

export type PopularidadLogro = {
  cantidad: number;
  total: number;
  porcentaje: number | null;
  rareza: RarezaLogro;
};

export function rarezaPorcentaje(porcentaje: number | null): RarezaLogro {
  if (porcentaje == null || !Number.isFinite(porcentaje)) return "sinDatos";
  if (porcentaje < 1) return "menos1";
  if (porcentaje < 5) return "menos5";
  if (porcentaje < 10) return "menos10";
  if (porcentaje < 25) return "menos25";
  return "comun";
}

/** Frecuencia de cada logro dentro de la cohorte elegida por quien llama. */
export function popularidadLogros(guardados: readonly (string | null | undefined)[]): Record<string, PopularidadLogro> {
  const conteos = new Map(CLAVES_LOGRO.map((clave) => [clave, 0]));
  for (const guardado of guardados) {
    for (const clave of leerLogros(guardado)) conteos.set(clave, (conteos.get(clave) ?? 0) + 1);
  }
  return Object.fromEntries(CLAVES_LOGRO.map((clave) => {
    const cantidad = conteos.get(clave) ?? 0;
    const porcentaje = guardados.length ? cantidad / guardados.length * 100 : null;
    return [clave, { cantidad, total: guardados.length, porcentaje, rareza: rarezaPorcentaje(porcentaje) }];
  }));
}

export type TonoTitulo = "base" | "bronce" | "plata" | "oro" | "prisma" | "secreto";
export type GrupoTitulo = "inicio" | "liga" | "circuito" | "eventos" | "medallas" | "logros";
export type TituloPerfil = { id: string; clave: string; grupo: GrupoTitulo; tono: TonoTitulo };

type HitoTitulo = {
  desde: number;
  clave: string;
  tono: Exclude<TonoTitulo, "base" | "secreto">;
};
type RutaTitulo = {
  id: string;
  grupo: GrupoTitulo;
  avance: "liga" | "torneos" | "cortes" | "medallas" | "medallasOro" | "logros";
  hitos: HitoTitulo[];
};
export type AvanceTitulos = Record<RutaTitulo["avance"], number>;

const rutasTitulo: RutaTitulo[] = [
  {
    id: "liga", grupo: "liga", avance: "liga",
    hitos: [
      { desde: 10, clave: "perfil.titulo.rivalLiga", tono: "bronce" },
      { desde: 50, clave: "perfil.titulo.veteranoLiga", tono: "plata" },
      { desde: 100, clave: "perfil.titulo.leyendaLiga", tono: "oro" },
      { desde: 250, clave: "perfil.titulo.guardiaLiga", tono: "prisma" },
    ],
  },
  {
    id: "circuito", grupo: "circuito", avance: "torneos",
    hitos: [
      { desde: 1, clave: "perfil.titulo.caminanteCircuito", tono: "bronce" },
      { desde: 5, clave: "perfil.titulo.viajeroCircuito", tono: "plata" },
      { desde: 15, clave: "perfil.titulo.maestroCircuito", tono: "oro" },
      { desde: 30, clave: "perfil.titulo.leyendaCircuito", tono: "prisma" },
    ],
  },
  {
    id: "eventos", grupo: "eventos", avance: "cortes",
    hitos: [
      { desde: 1, clave: "perfil.titulo.finalistaEventos", tono: "bronce" },
      { desde: 5, clave: "perfil.titulo.especialistaEventos", tono: "plata" },
      { desde: 10, clave: "perfil.titulo.dominadorEventos", tono: "oro" },
      { desde: 20, clave: "perfil.titulo.leyendaEventos", tono: "prisma" },
    ],
  },
  {
    id: "medallas", grupo: "medallas", avance: "medallas",
    hitos: [
      { desde: 1, clave: "perfil.titulo.medallista", tono: "bronce" },
      { desde: 3, clave: "perfil.titulo.coleccionistaMedallas", tono: "plata" },
      { desde: 5, clave: "perfil.titulo.maestroMedallas", tono: "oro" },
      { desde: 8, clave: "perfil.titulo.leyendaVitrina", tono: "prisma" },
    ],
  },
  {
    id: "oro", grupo: "medallas", avance: "medallasOro",
    hitos: [
      { desde: 1, clave: "perfil.titulo.medallistaDorado", tono: "bronce" },
      { desde: 3, clave: "perfil.titulo.orfebreMedallas", tono: "plata" },
      { desde: 5, clave: "perfil.titulo.maestroDorado", tono: "oro" },
      { desde: 8, clave: "perfil.titulo.leyendaDorada", tono: "prisma" },
    ],
  },
  {
    id: "secretos", grupo: "logros", avance: "logros",
    hitos: [
      { desde: 3, clave: "perfil.titulo.cazadorSecretos", tono: "bronce" },
      { desde: 7, clave: "perfil.titulo.guardianSecretos", tono: "plata" },
      { desde: 10, clave: "perfil.titulo.maestroLogros", tono: "oro" },
      { desde: LOGROS.length, clave: "perfil.titulo.leyendaSecretos", tono: "prisma" },
    ],
  },
];

function mejorHito(ruta: RutaTitulo, avance: AvanceTitulos): HitoTitulo | null {
  const valor = avance[ruta.avance];
  return [...ruta.hitos].reverse().find((hito) => valor >= hito.desde) ?? null;
}

export function titulosDisponibles(
  guardado: string | null | undefined,
  avance: AvanceTitulos,
): TituloPerfil[] {
  const conseguidos = new Set(leerLogros(guardado));
  return [
    { id: "entrenador", clave: "perfil.titulo.entrenador", grupo: "inicio", tono: "base" },
    ...rutasTitulo.flatMap((ruta) => {
      const hito = mejorHito(ruta, avance);
      return hito ? [{ id: ruta.id, clave: hito.clave, grupo: ruta.grupo, tono: hito.tono }] : [];
    }),
    ...LOGROS
      .filter((logro) => conseguidos.has(logro.clave))
      .map((logro) => ({
        id: `logro:${logro.clave}`,
        clave: `logro.${logro.clave}.nombre`,
        grupo: "logros" as const,
        tono: "secreto" as const,
      })),
  ];
}

export function tituloDePerfil(
  id: string | null | undefined,
  guardado: string | null | undefined,
  avance: AvanceTitulos,
): TituloPerfil | null {
  if (!id) return null;
  return titulosDisponibles(guardado, avance).find((titulo) => titulo.id === id) ?? null;
}

export function tituloValido(
  id: string,
  guardado: string | null | undefined,
  avance: AvanceTitulos,
): boolean {
  return id === "" || titulosDisponibles(guardado, avance).some((titulo) => titulo.id === id);
}

/** Lo guardado con un logro más. Una clave desconocida no entra. */
export function anadirLogro(guardado: string | null | undefined, clave: string): string {
  const actuales = leerLogros(guardado);
  if (CLAVES_LOGRO.includes(clave) && !actuales.includes(clave)) actuales.push(clave);
  return CLAVES_LOGRO.filter((c) => actuales.includes(c)).join(",");
}

/* ------------------------------------------------------- la Ball de uso -- */

export type NivelBall = { ball: string; nombre: string; desde: number };

/* Las Balls avanzan de las más fáciles de conseguir a las más raras o únicas.
   Los umbrales son orientativos: la disponibilidad cambia entre juegos. */
export const NIVELES_BALL: NivelBall[] = [
  { ball: "poke-ball", nombre: "Poké Ball", desde: 0 },
  { ball: "great-ball", nombre: "Super Ball", desde: 40 },
  { ball: "ultra-ball", nombre: "Ultra Ball", desde: 120 },
  { ball: "net-ball", nombre: "Malla Ball", desde: 180 },
  { ball: "dive-ball", nombre: "Buceo Ball", desde: 240 },
  { ball: "nest-ball", nombre: "Nido Ball", desde: 300 },
  { ball: "repeat-ball", nombre: "Acopio Ball", desde: 360 },
  { ball: "timer-ball", nombre: "Turno Ball", desde: 420 },
  { ball: "quick-ball", nombre: "Veloz Ball", desde: 480 },
  { ball: "heal-ball", nombre: "Sana Ball", desde: 540 },
  { ball: "dusk-ball", nombre: "Ocaso Ball", desde: 600 },
  { ball: "luxury-ball", nombre: "Lujo Ball", desde: 660 },
  { ball: "premier-ball", nombre: "Honor Ball", desde: 720 },
  { ball: "fast-ball", nombre: "Rapid Ball", desde: 780 },
  { ball: "level-ball", nombre: "Nivel Ball", desde: 840 },
  { ball: "lure-ball", nombre: "Cebo Ball", desde: 900 },
  { ball: "heavy-ball", nombre: "Peso Ball", desde: 960 },
  { ball: "love-ball", nombre: "Amor Ball", desde: 1020 },
  { ball: "friend-ball", nombre: "Amigo Ball", desde: 1080 },
  { ball: "moon-ball", nombre: "Luna Ball", desde: 1140 },
  { ball: "safari-ball", nombre: "Safari Ball", desde: 1200 },
  { ball: "sport-ball", nombre: "Competi Ball", desde: 1260 },
  { ball: "park-ball", nombre: "Parque Ball", desde: 1320 },
  { ball: "dream-ball", nombre: "Ensueño Ball", desde: 1380 },
  { ball: "beast-ball", nombre: "Ente Ball", desde: 1440 },
  { ball: "master-ball", nombre: "Master Ball", desde: 1520 },
  { ball: "cherish-ball", nombre: "Gloria Ball", desde: 1620 },
  { ball: "strange-ball", nombre: "Extraña Ball", desde: 1720 },
  { ball: "academy-ball", nombre: "Pelota Academia", desde: 1820 },
  { ball: "cyber-ball", nombre: "Pelota Cibernética", desde: 1920 },
  { ball: "koraidons-poke-ball", nombre: "Poké Ball de Koraidon", desde: 2020 },
  { ball: "miraidons-poke-ball", nombre: "Poké Ball de Miraidon", desde: 2120 },
  { ball: "lapoke-ball", nombre: "Poké Ball de Hisui", desde: 2220 },
  { ball: "lagreat-ball", nombre: "Super Ball de Hisui", desde: 2320 },
  { ball: "laultra-ball", nombre: "Ultra Ball de Hisui", desde: 2420 },
  { ball: "lafeather-ball", nombre: "Pluma Ball", desde: 2520 },
  { ball: "lawing-ball", nombre: "Ala Ball", desde: 2620 },
  { ball: "lajet-ball", nombre: "Aero Ball", desde: 2720 },
  { ball: "laheavy-ball", nombre: "Peso Ball de Hisui", desde: 2820 },
  { ball: "laleaden-ball", nombre: "Kilo Ball", desde: 2920 },
  { ball: "lagigaton-ball", nombre: "Quintal Ball", desde: 3020 },
  { ball: "lastrange-ball", nombre: "Extraña Ball de Hisui", desde: 3120 },
  { ball: "laorigin-ball", nombre: "Origen Ball", desde: 3220 },
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
