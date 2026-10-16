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
  /**
   * v0.45 — las franjas de la semana en que se juega: día (0 = domingo, en
   * UTC) y la hora de la última edición de ese día. Una serie semanal tiene
   * una; una diaria, siete.
   */
  franjas: Array<{ dia: number; iso: string }>;
  /** v0.45 — ¿está en la lista de series seguidas? Entra sin mínimos. */
  seguida: boolean;
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

/** Para casar nombres: sin mayúsculas, acentos, espacios ni símbolos. */
export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

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
  {
    minJugadores = 100, minEdiciones = 3, ventanaDias = 56,
    seguidas = [] as readonly string[],
  } = {},
): Serie[] {
  const patrones = seguidas.map(normalizar).filter(Boolean);
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
    eds.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const seguida = patrones.some((p) => normalizar(eds[0].name).includes(p));

    // Las seguidas entran con dos ediciones; las demás necesitan tres.
    if (eds.length < (seguida ? 2 : minEdiciones)) continue;

    /* v0.45 — semanal O MÁS FRECUENTE. Antes se exigía una mediana de 6 a 8
       días entre ediciones, y una serie diaria (mediana de 1) se descartaba
       justo por jugarse más. Ahora vale cualquier mediana de hasta 8 días; las
       seguidas aguantan hasta 15, para que una quincenal también entre. */
    const huecos = eds.slice(1).map((t, i) => (Date.parse(t.date) - Date.parse(eds[i].date)) / DIA);
    const mediana = [...huecos].sort((a, b) => a - b)[Math.floor(huecos.length / 2)];
    if (mediana > (seguida ? 15 : 8)) continue;

    const media = eds.reduce((s, t) => s + t.players, 0) / eds.length;
    if (!seguida && media < minJugadores) continue;

    const ultima = eds[eds.length - 1];

    /* Las franjas: qué días de la semana se juega, mirando la última semana
       de ediciones. Una por día de la semana, con la hora de la más reciente
       de ese día: si un organizador mueve la hora, manda la nueva. */
    const ultimaMs = Date.parse(ultima.date);
    const porDia = new Map<number, string>();
    for (const t of eds) {
      const ms = Date.parse(t.date);
      if (ms <= ultimaMs - 7 * DIA + 3_600_000) continue;
      porDia.set(new Date(ms).getUTCDay(), t.date);
    }
    const franjas = [...porDia.entries()].map(([dia, iso]) => ({ dia, iso }));

    series.push({
      clave, nombre: nombreBase(ultima.name), ediciones: eds.length,
      mediaJugadores: Math.round(media), ultimaId: ultima.id, ultimaFecha: ultima.date,
      franjas, seguida,
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
export function proximasEdiciones(serie: Serie, ahora: Date, semanas = 2, maxPorSerie = 7): string[] {
  /* v0.45 — una fecha por FRANJA y por semana. Antes se tomaba solo la última
     edición, así que una serie que se juega martes y sábados quedaba como si
     fuera solo de sábados. El tope evita que una diaria llene el calendario
     con catorce eventos: con siete se ve la semana entera. */
  const franjas = serie.franjas.length ? serie.franjas : [{ dia: -1, iso: serie.ultimaFecha }];
  const fechas: number[] = [];
  for (const f of franjas) {
    let t = Date.parse(f.iso);
    if (!Number.isFinite(t)) continue;
    while (t <= ahora.getTime()) t += 7 * DIA;
    for (let i = 0; i < semanas; i++) fechas.push(t + i * 7 * DIA);
  }
  return fechas.sort((a, b) => a - b).slice(0, maxPorSerie).map((t) => new Date(t).toISOString());
}

/** Id estable de un evento previsto: reimportar no duplica. */
export function idEventoPrevisto(serie: Serie, fechaISO: string): string {
  const slug = serie.clave.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 40);
  return `ltl-serie-${slug}-${fechaISO.slice(0, 10)}`;
}

/** El prefijo de esos ids, para encontrarlos y retirar los ya pasados. */
export const PREFIJO_PREVISTO = "ltl-serie-";
