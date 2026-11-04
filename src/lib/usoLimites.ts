/* =========================================================================
   v0.86 — Uso y límites del plan gratuito (panel de organizadores).
   v0.95 — Lecturas guardadas, Vercel apuntado a mano, memoria, proyección a
           fin de periodo y las series de los gráficos.

   Sin imports, para probarlo.

   Lo que se puede MEDIR desde la app (gente activa, horas con actividad,
   tamaño de la base) entra tal cual; lo que no (páginas vistas, CPU de
   Vercel) se ESTIMA con supuestos que se enseñan en pantalla. Si están las
   variables de Neon, cómputo, tráfico y almacenamiento son los reales; si un
   organizador apuntó las cifras del panel de Vercel, mandan esas.

   Límites del plan gratuito (comprobados el 4 de noviembre de 2026; cambian,
   ver docs/15-uso-vercel-neon.md):
     · Vercel Hobby: 1 M de invocaciones, 4 h de CPU activa y 360 GB-hora de
       memoria provisionada al mes. Las funciones van SIEMPRE con 2 GB.
     · Neon Free: 100 CU-hora de cómputo, 5 GB de tráfico y **1 GB** de
       almacenamiento por proyecto (era 0,5 GB hasta 2025).
   Neon cuenta en GB DECIMALES (10⁹ bytes), no en GiB.
   ========================================================================= */

export const LIMITES = {
  invocaciones: 1_000_000,
  cpuHoras: 4,
  memoriaGBh: 360,
  cuHoras: 100,
  transferGB: 5,
  almacenGB: 1,
} as const;

export type ClaveUso = keyof typeof LIMITES;
export const CLAVES_VERCEL: readonly ClaveUso[] = ["invocaciones", "cpuHoras", "memoriaGBh"];
export const CLAVES_NEON: readonly ClaveUso[] = ["cuHoras", "transferGB", "almacenGB"];

/** Neon: 1 GB = 10⁹ bytes. */
export const GB = 1e9;

export type Supuestos = {
  /** Páginas que ve cada persona activa al día. */
  paginasPorPersonaDia: number;
  /** Ejecuciones de Vercel por página (la página + acciones + datos). */
  invocacionesPorPagina: number;
  /** CPU por página, en milisegundos. */
  msCpuPorPagina: number;
  /** Duración de reloj por ejecución (incluye esperar a Neon), en ms. */
  msDuracionPorEjecucion: number;
  /** Memoria de cada función en Vercel Hobby (fija). */
  memoriaGB: number;
  /** Tamaño de la base de datos encendida (Neon): 0,25 si se ha limitado. */
  cu: number;
  /** Lecturas completas de la base por hora con actividad (la caché las reduce). */
  cargasPorHora: number;
};

export const SUPUESTOS: Supuestos = {
  paginasPorPersonaDia: 20, invocacionesPorPagina: 1.5, msCpuPorPagina: 100,
  msDuracionPorEjecucion: 400, memoriaGB: 2, cu: 0.25, cargasPorHora: 12,
};

export type MedidasUso = {
  activos30: number;
  /** Media de horas al día con alguna actividad (últimos 14 días). */
  horasActivasDia: number;
  /** Tamaño de la base en bytes (null si no se pudo leer). */
  bytesBase: number | null;
  /** Cuánto ocupa una lectura completa de las tablas, en bytes (aprox.). */
  bytesCarga: number;
  /** Lo real de Neon, si hay API configurada (en el periodo de facturación actual). */
  neon?: { cuHoras?: number | null; transferGB?: number | null; almacenGB?: number | null } | null;
  /** Lo apuntado a mano desde el panel de Vercel (Usage), si lo hay. */
  vercel?: { invocaciones?: number | null; cpuHoras?: number | null; memoriaGBh?: number | null } | null;
};

export type Estado = "ok" | "aviso" | "riesgo";
export type FilaUso = { clave: ClaveUso; usado: number; limite: number; pct: number; estado: Estado; real: boolean };

export const estadoDe = (pct: number): Estado => (pct >= 0.9 ? "riesgo" : pct >= 0.6 ? "aviso" : "ok");

const finito = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function estimarUso(m: MedidasUso, s: Supuestos = SUPUESTOS): { filas: FilaUso[]; maxActivos: number | null } {
  const paginasMes = Math.max(0, m.activos30) * s.paginasPorPersonaDia * 30;
  const ejecuciones = paginasMes * s.invocacionesPorPagina;
  const horasMes = Math.min(24, Math.max(0, m.horasActivasDia)) * 30;
  // Neon tarda 5 minutos en apagarse tras la última petición: +5/60 por hora con actividad.
  const cuEstimadas = horasMes * (1 + 5 / 60) * s.cu;
  const transferEstimada = (horasMes * s.cargasPorHora * m.bytesCarga) / GB;
  const fila = (clave: ClaveUso, usado: number, real = false): FilaUso => {
    const limite = LIMITES[clave];
    const pct = limite ? usado / limite : 0;
    return { clave, usado, limite, pct, estado: estadoDe(pct), real };
  };
  const real = (clave: ClaveUso, v: unknown, estimado: number) => (finito(v) ? fila(clave, v, true) : fila(clave, estimado));
  const filas: FilaUso[] = [
    real("invocaciones", m.vercel?.invocaciones, ejecuciones),
    real("cpuHoras", m.vercel?.cpuHoras, (paginasMes * s.msCpuPorPagina) / 3_600_000),
    real("memoriaGBh", m.vercel?.memoriaGBh, (ejecuciones * s.msDuracionPorEjecucion * s.memoriaGB) / 3_600_000),
    real("cuHoras", m.neon?.cuHoras, cuEstimadas),
    real("transferGB", m.neon?.transferGB, transferEstimada),
    finito(m.neon?.almacenGB) ? fila("almacenGB", m.neon!.almacenGB!, true)
      : fila("almacenGB", (m.bytesBase ?? 0) / GB, m.bytesBase != null),
  ];
  // Cuántas personas activas cabrían con el mismo uso por persona (lo que escala con la gente).
  const porPersona = filas.filter((f) => CLAVES_VERCEL.includes(f.clave));
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

/* ------------------------------------------------------------------------
   v0.95 — Series para los gráficos.
   ------------------------------------------------------------------------ */

/** Día (AAAA-MM-DD) y hora (0–23) en Madrid. `Intl` es del lenguaje, no un import. */
const fmtDia = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" });
const fmtHora = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hourCycle: "h23" });
export const diaMadrid = (d: Date) => fmtDia.format(d);
export const horaMadrid = (d: Date) => Number(fmtHora.format(d)) % 24;

export type Evento = { t: Date; quien?: string | null };
export type PuntoDia = { dia: string; n: number; personas: number };

/**
 * Actividad por día de los últimos `dias` días (hoy incluido), en hora de
 * Madrid: cuántos eventos (partidas apuntadas o corregidas) y cuánta gente
 * distinta. Los días sin nada salen con cero: un hueco también es un dato.
 */
export function actividadPorDia(eventos: Evento[], dias = 30, ahora = new Date()): PuntoDia[] {
  const out: PuntoDia[] = [];
  const idx = new Map<string, { n: number; quien: Set<string> }>();
  for (let i = dias - 1; i >= 0; i--) {
    const dia = diaMadrid(new Date(ahora.getTime() - i * 86_400_000));
    if (!idx.has(dia)) { idx.set(dia, { n: 0, quien: new Set() }); out.push({ dia, n: 0, personas: 0 }); }
  }
  for (const e of eventos) {
    const t = e.t instanceof Date ? e.t.getTime() : NaN;
    if (!Number.isFinite(t) || t > ahora.getTime()) continue;
    const b = idx.get(diaMadrid(new Date(t)));
    if (!b) continue;
    b.n++;
    if (e.quien) b.quien.add(e.quien);
  }
  return out.map((p) => { const b = idx.get(p.dia)!; return { dia: p.dia, n: b.n, personas: b.quien.size }; });
}

/**
 * A qué horas se usa la app (Madrid), últimos `dias` días: 24 recuentos.
 * Es la gráfica que explica Neon: cada hora con algo despierta la base.
 */
export function actividadPorHora(momentos: Date[], dias = 30, ahora = new Date()): number[] {
  const desde = ahora.getTime() - dias * 86_400_000;
  const horas = new Array<number>(24).fill(0);
  for (const d of momentos) {
    const t = d instanceof Date ? d.getTime() : NaN;
    if (!Number.isFinite(t) || t < desde || t > ahora.getTime()) continue;
    horas[horaMadrid(new Date(t))]++;
  }
  return horas;
}

/**
 * Proyección lineal a final del periodo: si en `transcurridos` días se ha
 * gastado `usado`, al ritmo actual se llegará a… Neon y Vercel facturan por
 * periodos de ~30 días. Con menos de un día de datos no se proyecta (sería
 * multiplicar ruido): devuelve null.
 */
export function proyectarPeriodo(usado: number, inicio: Date | null, ahora = new Date(), diasPeriodo = 30): { proyeccion: number; transcurridos: number; quedan: number } | null {
  if (!inicio || !finito(usado)) return null;
  const transcurridos = (ahora.getTime() - inicio.getTime()) / 86_400_000;
  if (!(transcurridos >= 1)) return null;
  const total = Math.max(diasPeriodo, transcurridos);
  return { proyeccion: (usado / transcurridos) * total, transcurridos, quedan: Math.max(0, total - transcurridos) };
}

/** Una lectura guardada (`uso_lecturas`). `datos` son métricas sueltas. */
export type Lectura = { fecha: string; fuente: string; datos: Record<string, unknown> };

/**
 * La serie de una métrica a lo largo de las lecturas, del periodo ACTUAL: si
 * el valor baja de un día a otro es que el periodo se reinició, y lo de antes
 * del reinicio no se mezcla con lo de ahora.
 */
export function serieDelPeriodo(lecturas: Lectura[], fuente: string, metrica: string): Array<{ fecha: string; valor: number }> {
  const puntos = lecturas
    .filter((l) => l.fuente === fuente && finito(l.datos[metrica]))
    .map((l) => ({ fecha: l.fecha, valor: l.datos[metrica] as number }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  let corte = 0;
  for (let i = 1; i < puntos.length; i++) if (puntos[i].valor < puntos[i - 1].valor) corte = i;
  return puntos.slice(corte);
}

/**
 * Lee una cifra tal y como se copia del panel de Vercel o se teclea a mano:
 * «12.345», «12,345», «1,5», «1.2K», «3,4 M», «0.75 h», «12 GB-Hrs».
 * El punto y la coma valen las dos como decimal; si hay grupos de tres cifras
 * exactas detrás de un separador repetido, son miles. Devuelve null si no es
 * un número.
 *
 * `entero`: la cifra es un recuento (invocaciones). Solo entonces «12,345»
 * se lee como doce mil; en horas o GB-hora, «1,125» es uno coma algo.
 */
export function leerCifra(texto: string, entero = false): number | null {
  let t = String(texto ?? "").trim().replace(/\s+/g, "");
  if (!t) return null;
  let mult = 1;
  const unidad = /^([0-9.,]+)([a-zA-Z\-]*)$/.exec(t);
  if (!unidad) return null;
  const letras = unidad[2];
  if (/^[kK]/.test(letras)) mult = 1e3;
  else if (/^M(?![bB])/.test(letras)) mult = 1e6;
  t = unidad[1];
  const sep = [...t].filter((c) => c === "." || c === ",");
  if (sep.length > 1) {
    const ultimo = Math.max(t.lastIndexOf("."), t.lastIndexOf(","));
    const mismos = sep.every((c) => c === sep[0]);
    if (mismos) t = t.split(sep[0]).join(""); // 1.234.567 / 1,234,567
    else t = t.slice(0, ultimo).replace(/[.,]/g, "") + "." + t.slice(ultimo + 1); // 1.234,5
  } else if (sep.length === 1) {
    const [ent, dec] = t.split(sep[0]);
    // «12,345» o «12.345» con exactamente 3 cifras y sin sufijo: miles.
    t = entero && dec.length === 3 && mult === 1 && ent.length > 0 && ent !== "0" ? ent + dec : `${ent}.${dec}`;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n * mult : null;
}

/** Resumen de los despliegues de Vercel (solo estados y tiempos; ni autores ni correos). */
export type Despliegue = { creado: number; empiezaBuild?: number | null; listo?: number | null; estado: string; produccion: boolean };
export function resumenDespliegues(ds: Despliegue[], ahora = new Date(), dias = 30) {
  const desde = ahora.getTime() - dias * 86_400_000;
  const del = ds.filter((d) => finito(d.creado) && d.creado >= desde);
  const builds = del
    .filter((d) => d.estado === "READY" && finito(d.empiezaBuild) && finito(d.listo) && d.listo! >= d.empiezaBuild!)
    .map((d) => (d.listo! - d.empiezaBuild!) / 1000);
  const media = builds.length ? builds.reduce((a, b) => a + b, 0) / builds.length : null;
  return {
    total: del.length,
    produccion: del.filter((d) => d.produccion).length,
    fallidos: del.filter((d) => d.estado === "ERROR").length,
    buildMedioSeg: media,
    ultimo: ds.length ? Math.max(...ds.map((d) => d.creado)) : null,
  };
}
