/* =========================================================================
   Series semanales de torneos online, y su próxima edición.

   Sin imports, como el resto de módulos que se prueban.

   POR QUÉ ASÍ Y NO «LEER LOS INSCRITOS»
   ------------------------------------
   La API de Limitless (`/tournaments`) devuelve torneos ya jugados, y su
   campo `players` es el número de jugadores que PARTICIPARON. No documenta
   torneos futuros ni inscripciones abiertas. Así que «tiene más de 100
   inscritos» no se puede leer de ningún sitio.

   Lo que sí se puede hacer con datos reales es reconocer las series que se
   repiten cada semana —«Pudding Weekly #13», «#14», «#15»…— con más de cien
   jugadores de media, y prever la siguiente: mismo día de la semana, misma
   hora, siete días después. Es una PREVISIÓN y la app la enseña como tal.
   ========================================================================= */

export type TorneoOnline = {
  id: string;
  name: string;
  /** Fecha y hora ISO completa, tal como la da la API. */
  date: string;
  players: number;
  organizerId?: number;
};

export type Serie = {
  /** Clave estable: organizador + nombre sin numeración. */
  clave: string;
  /** Nombre legible, sin el «#14». */
  nombre: string;
  ediciones: number;
  mediaJugadores: number;
  /** Id de la última edición jugada, para enlazarla. */
  ultimaId: string;
  ultimaFecha: string;
};

/**
 * El nombre de la serie, sin la numeración de la edición.
 *
 * «Pudding Weekly #14» → «Pudding Weekly». «Torneo Relámpago ⚡ #82» →
 * «Torneo Relámpago ⚡». También quita un número suelto al final («Cup 12»)
 * y los paréntesis con fecha o edición. Lo que queda es lo que se repite.
 */
export function nombreBase(nombre: string): string {
  return nombre
    .replace(/\(([^)]*\d[^)]*)\)/g, " ")          // «(Oct 12)», «(Week 3)»
    .replace(/#\s*\d+/g, " ")                     // «#14»
    .replace(/\b(week|semana|vol\.?|ed\.?)\s*\d+\b/gi, " ")
    .replace(/\s\d+\s*$/, " ")                    // número suelto al final
    .replace(/\s+/g, " ")
    .trim();
}

const DIA = 86_400_000;

/**
 * Las series semanales con más de `minJugadores` de media.
 *
 * Una serie cuenta como SEMANAL si tiene al menos `minEdiciones` dentro de
 * la ventana y la mediana de días entre ediciones está entre 6 y 8. Mediana
 * y no media: una semana que no se celebró (14 días) no debe tumbar una
 * serie que el resto del tiempo es exactamente semanal.
 */
export function detectarSeries(
  torneos: readonly TorneoOnline[],
  ahora: Date,
  { minJugadores = 100, minEdiciones = 3, ventanaDias = 56 } = {},
): Serie[] {
  const desde = ahora.getTime() - ventanaDias * DIA;
  const grupos = new Map<string, TorneoOnline[]>();

  for (const t of torneos) {
    const ms = Date.parse(t.date);
    if (!Number.isFinite(ms) || ms < desde || ms > ahora.getTime()) continue;
    const base = nombreBase(t.name);
    if (!base) continue;
    const clave = `${t.organizerId ?? "?"}|${base.toLowerCase()}`;
    const g = grupos.get(clave);
    if (g) g.push(t); else grupos.set(clave, [t]);
  }

  const series: Serie[] = [];
  for (const [clave, eds] of grupos) {
    if (eds.length < minEdiciones) continue;
    eds.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

    const huecos = eds.slice(1).map((t, i) => (Date.parse(t.date) - Date.parse(eds[i].date)) / DIA);
    const mediana = [...huecos].sort((a, b) => a - b)[Math.floor(huecos.length / 2)];
    if (mediana < 6 || mediana > 8) continue;

    const media = eds.reduce((s, t) => s + t.players, 0) / eds.length;
    if (media < minJugadores) continue;

    const ultima = eds[eds.length - 1];
    series.push({
      clave, nombre: nombreBase(ultima.name), ediciones: eds.length,
      mediaJugadores: Math.round(media), ultimaId: ultima.id, ultimaFecha: ultima.date,
    });
  }

  return series.sort((a, b) => b.mediaJugadores - a.mediaJugadores);
}

/**
 * Las próximas `semanas` ediciones previstas, desde ahora.
 *
 * Misma hora y mismo día de la semana que la última, sumando semanas
 * enteras: así se respeta la hora local del organizador sin tener que
 * adivinar su zona horaria.
 */
export function proximasEdiciones(serie: Serie, ahora: Date, semanas = 2): string[] {
  let t = Date.parse(serie.ultimaFecha);
  if (!Number.isFinite(t)) return [];
  while (t <= ahora.getTime()) t += 7 * DIA;
  return Array.from({ length: semanas }, (_, i) => new Date(t + i * 7 * DIA).toISOString());
}

/** Id estable de un evento previsto: reimportar no duplica. */
export function idEventoPrevisto(serie: Serie, fechaISO: string): string {
  const slug = serie.clave.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 40);
  return `ltl-serie-${slug}-${fechaISO.slice(0, 10)}`;
}

/** El prefijo de esos ids, para encontrarlos y retirar los ya pasados. */
export const PREFIJO_PREVISTO = "ltl-serie-";
