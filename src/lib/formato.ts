/* =========================================================================
   v0.110 — El estado del formato Estándar en una fecha.

   Sin imports, para probarlo: los datos (`src/data/formatoEstandar.ts`)
   entran por parámetro. Responde a lo que se mira antes de elegir mazo:

     · qué expansión es la última que VALE en torneos hoy;
     · si hay una que ya está a la venta pero todavía no vale (el hueco de
       dos semanas entre la salida y la legalidad, que es justo cuando más
       se pregunta «¿ya puedo jugar esto?»);
     · cuál es la siguiente y cuánto falta;
     · la rotación siguiente y el final de temporada.
   ========================================================================= */

export type ExpansionDato = {
  nombre: string;
  codigo?: string;
  salida: string;
  legal?: string;
  legalCalculada?: boolean;
  oficial: boolean;
  portada?: string;
  notaClave?: string;
};

export type RotacionDato = { fecha: string | null; sale: string; quedan: string[]; oficial: boolean; estimada?: string };

export type FormatoDato = {
  marcas: string[];
  desde: string;
  rotacionAnterior: RotacionDato;
  rotacionSiguiente: RotacionDato;
  finTemporada: { nombre: string; desde: string; hasta: string; lugar: string };
  revisado: string;
};

export type EstadoFormato = {
  /** La última expansión que ya vale en torneos. */
  actual: ExpansionDato | null;
  /** Ya a la venta pero aún no legal (o null). */
  enEspera: (ExpansionDato & { diasParaLegal: number }) | null;
  /** La siguiente que todavía no ha salido (o null). */
  proxima: (ExpansionDato & { diasParaSalida: number }) | null;
  marcas: string[];
  desde: string;
  rotacion: RotacionDato & { dias: number | null };
  finTemporada: FormatoDato["finTemporada"] & { dias: number };
  /** Días desde la última revisión a mano de los datos. */
  diasDesdeRevision: number;
};

const DIA = 86_400_000;
const t = (iso: string) => Date.parse(`${iso.slice(0, 10)}T12:00:00Z`);

/** Días de `hoy` a `fecha` (positivo si es futura). */
export function diasHasta(fecha: string, hoy: string): number {
  return Math.round((t(fecha) - t(hoy)) / DIA);
}

/** Día desde el que vale en torneo. */
export const legalDe = (e: ExpansionDato) => e.legal ?? e.salida;

export function estadoFormato(hoy: string, expansiones: ExpansionDato[], formato: FormatoDato): EstadoFormato {
  const orden = [...expansiones].sort((a, b) => a.salida.localeCompare(b.salida));
  const legales = orden.filter((e) => legalDe(e) <= hoy);
  const actual = legales[legales.length - 1] ?? null;
  const vendida = orden.filter((e) => e.salida <= hoy && legalDe(e) > hoy);
  const espera = vendida[vendida.length - 1] ?? null;
  const futura = orden.find((e) => e.salida > hoy) ?? null;
  const rs = formato.rotacionSiguiente;
  // Si la rotación «siguiente» ya ha pasado (nadie actualizó el fichero), no se anuncia como futura.
  const rotacionPasada = rs.fecha != null && rs.fecha <= hoy;
  return {
    actual,
    enEspera: espera ? { ...espera, diasParaLegal: diasHasta(legalDe(espera), hoy) } : null,
    proxima: futura ? { ...futura, diasParaSalida: diasHasta(futura.salida, hoy) } : null,
    marcas: rotacionPasada ? rs.quedan : formato.marcas,
    desde: formato.desde,
    rotacion: { ...rs, dias: rs.fecha && !rotacionPasada ? diasHasta(rs.fecha, hoy) : null },
    finTemporada: { ...formato.finTemporada, dias: diasHasta(formato.finTemporada.desde, hoy) },
    diasDesdeRevision: Math.max(0, -diasHasta(formato.revisado, hoy)),
  };
}
