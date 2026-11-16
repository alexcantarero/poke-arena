/* =========================================================================
   v0.131 — EL CENTRO DE AVISOS: todo lo que tienes pendiente, en un sitio.

   Sin imports, para probarlo.

   No hay tabla de notificaciones: cada aviso se DEDUCE del estado real cada
   vez que se mira (¿hace 3 días que no actualizas el ladder?, ¿dijiste «iré»
   a un torneo que ya pasó y no tiene tu resultado?…). Por eso un aviso no se
   puede quedar viejo ni hay que «marcarlo como leído»: desaparece solo cuando
   haces lo que pide. La campana del menú enseña cuántos hay.

   No es una notificación push del sistema (la que suena con la app cerrada):
   sigue descartada. Esto es dentro de la web.
   ========================================================================= */

export type TipoAviso = "resultado" | "liga" | "reset" | "ladder" | "inscripcion" | "nick";

export type Aviso = {
  id: string;
  tipo: TipoAviso;
  /** A dónde lleva. */
  href: string;
  /** Un número para el texto (partidas pendientes…). */
  n?: number;
  /** Un nombre para el texto (el torneo, la temporada de liga…). */
  nombre?: string;
  fecha?: string;
};

export type EstadoAvisos = {
  playerId: string;
  /** Torneos pasados a los que dijiste «iré» y en los que no tienes resultado. */
  torneosSinResultado: ReadonlyArray<{ id: string; nombre: string; fecha: string }>;
  /** Mis partidas de liga sin resultado. */
  pendientesLiga: number;
  /** Hubo un reset del ladder hace poco y aún no he puesto mi rango. */
  resetLadder: boolean;
  /** Toca actualizar el rango del ladder (nunca puesto, o hace 3 días o más). */
  ladderToca: boolean;
  /** Hay una temporada de liga con la inscripción abierta y no estoy apuntado. */
  inscripcion: { id: string; nombre: string } | null;
  /** No he puesto mi nick de Limitless. */
  faltaNick: boolean;
};

/** Los avisos de un jugador, de lo más urgente a lo menos. */
export function avisosDe(e: EstadoAvisos): Aviso[] {
  const out: Aviso[] = [];
  // Lo que se olvida y luego no hay quien lo recuerde: el resultado de un torneo. Del más reciente al más antiguo.
  for (const t of [...e.torneosSinResultado].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5)) {
    out.push({ id: `resultado:${t.id}`, tipo: "resultado", href: `/torneos/${t.id}`, nombre: t.nombre, fecha: t.fecha });
  }
  if (e.pendientesLiga > 0) out.push({ id: "liga", tipo: "liga", href: "/liga", n: e.pendientesLiga });
  // El reset y el recordatorio dirían lo mismo: con reset reciente, solo el reset.
  if (e.resetLadder) out.push({ id: "reset", tipo: "reset", href: `/perfil/${e.playerId}#ladder` });
  else if (e.ladderToca) out.push({ id: "ladder", tipo: "ladder", href: `/perfil/${e.playerId}#ladder` });
  if (e.inscripcion) out.push({ id: `inscripcion:${e.inscripcion.id}`, tipo: "inscripcion", href: "/liga", nombre: e.inscripcion.nombre });
  if (e.faltaNick) out.push({ id: "nick", tipo: "nick", href: "/ajustes#cuenta" });
  return out;
}
