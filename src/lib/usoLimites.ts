/* =========================================================================
   v0.86 — Uso y límites del plan gratuito (panel de organizadores).

   Sin imports, para probarlo.

   Lo que se puede MEDIR desde la app (gente activa, horas con actividad,
   tamaño de la base) entra tal cual; lo que no (páginas vistas, CPU de
   Vercel) se ESTIMA con supuestos que se enseñan en pantalla. Si están las
   variables de Neon, las horas de cómputo y el tráfico son los reales.

   Límites del plan gratuito (comprobados en octubre de 2026; cambian):
     · Vercel Hobby: 1 M de ejecuciones y 4 h de CPU activa al mes.
     · Neon Free: 100 horas de cómputo (CU-hora), 5 GB de tráfico y 0,5 GB de
       almacenamiento por proyecto.
   ========================================================================= */

export const LIMITES = {
  invocaciones: 1_000_000,
  cpuHoras: 4,
  cuHoras: 100,
  transferGB: 5,
  almacenGB: 0.5,
} as const;

export type Supuestos = {
  /** Páginas que ve cada persona activa al día. */
  paginasPorPersonaDia: number;
  /** Ejecuciones de Vercel por página (la página + acciones + datos). */
  invocacionesPorPagina: number;
  /** CPU por página, en milisegundos. */
  msCpuPorPagina: number;
  /** Tamaño de la base de datos encendida (Neon): 0,25 si se ha limitado. */
  cu: number;
  /** Lecturas completas de la base por hora con actividad (la caché las reduce). */
  cargasPorHora: number;
};

export const SUPUESTOS: Supuestos = { paginasPorPersonaDia: 20, invocacionesPorPagina: 1.5, msCpuPorPagina: 100, cu: 0.25, cargasPorHora: 12 };

export type MedidasUso = {
  activos30: number;
  /** Media de horas al día con alguna actividad (últimos 14 días). */
  horasActivasDia: number;
  /** Tamaño de la base en bytes (null si no se pudo leer). */
  bytesBase: number | null;
  /** Cuánto ocupa una lectura completa de las tablas, en bytes (aprox.). */
  bytesCarga: number;
  /** Lo real de Neon, si hay API configurada (en el periodo de facturación actual). */
  neon?: { cuHoras?: number | null; transferGB?: number | null } | null;
};

export type Estado = "ok" | "aviso" | "riesgo";
export type FilaUso = { clave: keyof typeof LIMITES; usado: number; limite: number; pct: number; estado: Estado; real: boolean };

export const estadoDe = (pct: number): Estado => (pct >= 0.9 ? "riesgo" : pct >= 0.6 ? "aviso" : "ok");

export function estimarUso(m: MedidasUso, s: Supuestos = SUPUESTOS): { filas: FilaUso[]; maxActivos: number | null } {
  const paginasMes = Math.max(0, m.activos30) * s.paginasPorPersonaDia * 30;
  const horasMes = Math.min(24, Math.max(0, m.horasActivasDia)) * 30;
  // Neon tarda 5 minutos en apagarse tras la última petición: +5/60 por hora con actividad.
  const cuEstimadas = horasMes * (1 + 5 / 60) * s.cu;
  const transferEstimada = (horasMes * s.cargasPorHora * m.bytesCarga) / 1024 ** 3;
  const fila = (clave: keyof typeof LIMITES, usado: number, real = false): FilaUso => {
    const limite = LIMITES[clave];
    const pct = limite ? usado / limite : 0;
    return { clave, usado, limite, pct, estado: estadoDe(pct), real };
  };
  const filas: FilaUso[] = [
    fila("invocaciones", paginasMes * s.invocacionesPorPagina),
    fila("cpuHoras", (paginasMes * s.msCpuPorPagina) / 3_600_000),
    m.neon?.cuHoras != null ? fila("cuHoras", m.neon.cuHoras, true) : fila("cuHoras", cuEstimadas),
    m.neon?.transferGB != null ? fila("transferGB", m.neon.transferGB, true) : fila("transferGB", transferEstimada),
    fila("almacenGB", (m.bytesBase ?? 0) / 1024 ** 3, m.bytesBase != null),
  ];
  // Cuántas personas activas cabrían con el mismo uso por persona (lo que escala con la gente).
  const porPersona = filas.filter((f) => f.clave === "invocaciones" || f.clave === "cpuHoras");
  const factor = Math.min(...porPersona.map((f) => (f.usado > 0 ? f.limite / f.usado : Infinity)));
  const maxActivos = m.activos30 > 0 && Number.isFinite(factor) ? Math.floor(m.activos30 * factor) : null;
  return { filas, maxActivos };
}

/** Horas al día con actividad: horas distintas (de un día concreto) con algún evento, de media. */
export function horasActivasPorDia(momentos: Date[], dias = 14, ahora = new Date()): number {
  const desde = ahora.getTime() - dias * 86_400_000;
  const horas = new Set<string>();
  for (const d of momentos) {
    const t = d instanceof Date ? d.getTime() : NaN;
    if (!Number.isFinite(t) || t < desde || t > ahora.getTime()) continue;
    horas.add(new Date(t).toISOString().slice(0, 13)); // AAAA-MM-DDTHH
  }
  return horas.size / dias;
}
