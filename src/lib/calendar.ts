/* =========================================================================
   Los colores del calendario.

   Un calendario con todo del mismo color no se lee: hay que abrir cada cosa
   para saber qué es. Con un color por tipo de evento se ve de un vistazo que
   noviembre tiene un Regional y dos Cups.

   Los colores salen de la paleta de series de `globals.css`, que ya está
   validada para daltonismo y tiene versión clara y oscura. Ninguno escrito a
   mano: si mañana se cambia `--series-2`, el calendario cambia con él.

   El orden de la lista es el de importancia en el circuito, que es el orden
   en que salen los filtros: primero lo gordo.
   ========================================================================= */

export type CalendarKind = {
  label: string;
  /** Nombre corto, para el chip del día en el móvil. */
  short: string;
  color: string;
};

export const CALENDAR_KINDS: Record<string, CalendarKind> = {
  worlds:           { label: "Mundial",           short: "Worlds", color: "var(--brand)" },
  international:    { label: "Internacional",     short: "IC",     color: "var(--series-7)" },
  regional:         { label: "Regional",          short: "Reg",    color: "var(--series-2)" },
  special:          { label: "Special Event",     short: "SPE",    color: "var(--series-5)" },
  league_cup:       { label: "League Cup",        short: "Cup",    color: "var(--series-1)" },
  league_challenge: { label: "League Challenge",  short: "LC",     color: "var(--series-3)" },
  store:            { label: "De tienda",         short: "Tienda", color: "var(--series-4)" },
  online:           { label: "Online",            short: "Online", color: "var(--series-6)" },
  other:            { label: "Otro",              short: "Otro",   color: "var(--muted)" },
};

/** Lo que no es un torneo del circuito: jornadas, fechas límite, partidas. */
export const CALENDAR_OWN = {
  round:    { label: "Jornada",      short: "Jornada",  color: "var(--info)" },
  deadline: { label: "Fecha límite", short: "Límite",   color: "var(--loss)" },
  match:    { label: "Partida",      short: "Partida",  color: "var(--muted)" },
  event:    { label: "Evento",       short: "Evento",   color: "var(--info)" },
} as const;

/** El color de algo del calendario, mirando primero el tipo de torneo. */
export function toneOf(tournamentKind: string, fallback: keyof typeof CALENDAR_OWN = "event"): CalendarKind {
  const t = CALENDAR_KINDS[tournamentKind];
  if (t) return t;
  const own = CALENDAR_OWN[fallback];
  return { label: own.label, short: own.short, color: own.color };
}

/** Los tipos que de verdad aparecen en una lista, en el orden de arriba. */
export function kindsPresent(kinds: Array<string | null | undefined>): string[] {
  const set = new Set(kinds.filter((k): k is string => Boolean(k && CALENDAR_KINDS[k])));
  return Object.keys(CALENDAR_KINDS).filter((k) => set.has(k));
}

/* =========================================================================
   v0.63 — Filtro de varios tipos a la vez.

   En la URL van separados por comas (`?tipo=regional,league_cup`): sigue
   siendo un enlace que se comparte y la vuelta atrás funciona. Un `tipo`
   antiguo de un solo valor se lee igual que antes.
   ========================================================================= */

/** Los tipos válidos de la URL, sin repetir y en el orden del calendario. */
export function parseTipos(raw: string | string[] | null | undefined): string[] {
  const texto = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  const pedidos = new Set(texto.split(",").map((t) => t.trim()).filter(Boolean));
  return Object.keys(CALENDAR_KINDS).filter((k) => pedidos.has(k));
}

/** Pone o quita un tipo de la selección (tocar un chip). */
export function alternarTipo(tipos: string[], tipo: string): string[] {
  const set = new Set(tipos);
  if (set.has(tipo)) set.delete(tipo); else if (CALENDAR_KINDS[tipo]) set.add(tipo);
  return Object.keys(CALENDAR_KINDS).filter((k) => set.has(k));
}

/** Lo que va en la URL: vacío si no hay filtro. */
export const tiposAParam = (tipos: string[]) => tipos.join(",");

/** ¿Pasa el filtro? Sin tipos elegidos, pasa todo. */
export const pasaTipos = (tipos: string[], kind: string | null | undefined) =>
  tipos.length === 0 || (kind != null && tipos.includes(kind));

const PAISES = new Set([
  "alemania", "australia", "austria", "belgica", "belgium", "belgique", "canada", "china",
  "corea del sur", "dinamarca", "es", "espana", "estados unidos", "fr", "france", "francia",
  "gb", "germany", "greece", "holanda", "india", "irlanda", "islandia", "it", "italia",
  "italy", "japon", "japan", "luxemburgo", "mexico", "netherlands", "noruega", "nueva zelanda",
  "paises bajos", "poland", "polonia", "portugal", "reino unido", "republica checa", "suecia",
  "suiza", "spain", "united kingdom", "united states",
]);

const sinAcentos = (valor: string) =>
  valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Extrae el nombre de ciudad de los formatos de ubicación habituales. */
export function ciudadDeUbicacion(valor: string | null | undefined): string {
  const partes = (valor ?? "").trim().replace(/\s+/g, " ").split(",").map((p) => p.trim()).filter(Boolean);
  if (!partes.length) return "";

  const final = sinAcentos(partes.at(-1)!);
  if (PAISES.has(final)) partes.pop();

  for (const parte of partes) {
    const conCodigoPostal = parte.match(/^\d{4,6}\s+(.+)$/);
    if (conCodigoPostal) return conCodigoPostal[1].trim();
  }

  const indicePostal = partes.findIndex((parte) => /^\d{4,6}$/.test(parte) || /^[A-Z]{1,3}\s+\d{4,6}$/i.test(parte));
  if (indicePostal > 0) return partes[indicePostal - 1];

  return partes.at(-1) ?? "";
}

/** Ciudades registradas en eventos o torneos, sin duplicados por mayúsculas/espacios. */
export function ciudadesPresentes(valores: Array<string | null | undefined>): string[] {
  const ciudades = new Map<string, string>();
  for (const valor of valores) {
    const ciudad = ciudadDeUbicacion(valor);
    if (!ciudad) continue;
    const clave = sinAcentos(ciudad);
    if (!ciudades.has(clave)) ciudades.set(clave, ciudad);
  }
  return [...ciudades.values()].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

/** Conserva el texto de búsqueda libre de la URL, normalizando espacios. */
export function parseCiudad(
  raw: string | string[] | null | undefined,
): string {
  const valor = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return valor?.replace(/\s+/g, " ") ?? "";
}

/** Filtra por texto contenido en la ciudad; no distingue acentos ni mayúsculas. */
export function pasaCiudad(filtro: string, ciudad: string | null | undefined): boolean {
  const busqueda = sinAcentos(filtro.trim().replace(/\s+/g, " "));
  if (!busqueda) return true;
  const normalizada = ciudadDeUbicacion(ciudad);
  return Boolean(normalizada) && sinAcentos(normalizada).includes(busqueda);
}
