/* =========================================================================
   v0.108 — Torneos EN DIRECTO: qué torneos están jugándose hoy y cómo va el
   grupo en cada uno (el «ranking IRL» del Inicio y del modo directo).

   Sin imports, para probarlo.

   Un torneo está en directo si está abierto y HOY cae entre su primer y su
   último día (Regionales de dos días incluidos). También el día siguiente al
   último, hasta que alguien lo cierre: la gente apunta el top cut tarde.
   La clasificación del grupo es por puntos de suizo (3/1/0), luego por menos
   derrotas y luego por rondas jugadas; quien se retiró va al final.
   ========================================================================= */

export type FilaDirecto = {
  playerId: string;
  /** Resultados de sus rondas apuntadas, en orden. null = ronda sin resultado aún. */
  rondas: Array<"w" | "l" | "t" | null>;
  dropped?: boolean;
};

export type PuestoDirecto = FilaDirecto & {
  puesto: number;
  puntos: number;
  w: number; l: number; t: number;
  jugadas: number;
  /** La última ronda apuntada (0 si ninguna). */
  ultima: number;
};

const sumaDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function enDirecto(t: { status: string; date: string; endDate?: string | null }, hoy: string): boolean {
  if (t.status !== "open") return false;
  const fin = t.endDate && t.endDate > t.date ? t.endDate : t.date;
  return hoy >= t.date && hoy <= sumaDias(fin, 1);
}

export function clasificacionDirecto(filas: FilaDirecto[]): PuestoDirecto[] {
  const conDatos = filas.map((f) => {
    const w = f.rondas.filter((r) => r === "w").length;
    const l = f.rondas.filter((r) => r === "l").length;
    const t = f.rondas.filter((r) => r === "t").length;
    return { ...f, w, l, t, puntos: w * 3 + t, jugadas: w + l + t, ultima: f.rondas.length, puesto: 0 };
  });
  conDatos.sort((a, b) =>
    Number(Boolean(a.dropped)) - Number(Boolean(b.dropped))
    || b.puntos - a.puntos || a.l - b.l || b.jugadas - a.jugadas || a.playerId.localeCompare(b.playerId));
  let anterior: PuestoDirecto | null = null;
  conDatos.forEach((f, i) => {
    // Empatados en todo (puntos, derrotas, jugadas y drop) comparten puesto.
    f.puesto = anterior && !anterior.dropped === !f.dropped && anterior.puntos === f.puntos && anterior.l === f.l && anterior.jugadas === f.jugadas
      ? anterior.puesto : i + 1;
    anterior = f;
  });
  return conDatos;
}

/** «3-1-0 · 9 pts». */
export const recordTexto = (p: Pick<PuestoDirecto, "w" | "l" | "t" | "puntos">) => `${p.w}-${p.l}-${p.t} · ${p.puntos} pts`;
