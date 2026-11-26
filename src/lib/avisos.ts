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

export type TipoAviso = "resultado" | "liga" | "reset" | "ladder" | "inscripcion" | "nick" | "oficial" | "torneo" | "regional";

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
  /** v0.135 — No he puesto mi nombre en Play! Pokémon (para casar la clasificación oficial). */
  faltaOficial?: boolean;
  /** v0.135 — La cuenta es nueva (dos semanas): lo primero es completar el perfil. */
  cuentaNueva?: boolean;
  /** v0.136 — Torneos a los que dijiste «iré» en los próximos días. */
  torneosProximos?: ReadonlyArray<{ id: string; nombre: string; fecha: string }>;
  /** v0.136 — Tu próxima partida de liga sin jugar: con quién. */
  proximoLiga?: { rival: string } | null;
  /** v0.136 — Un Regional (o mayor) recién importado. */
  regionalNuevo?: { nombre: string; fecha: string } | null;
};

/** Los avisos de un jugador, de lo más urgente a lo menos. */
export function avisosDe(e: EstadoAvisos): Aviso[] {
  const out: Aviso[] = [];
  /* v0.135 — COMPLETAR EL PERFIL: el nick de Limitless, el nombre en Play!
     Pokémon y el ladder. En una cuenta nueva van LO PRIMERO (es lo primero que
     tiene que hacer); en una antigua, al final, como recordatorio. */
  const perfil: Aviso[] = [];
  if (e.faltaNick) perfil.push({ id: "nick", tipo: "nick", href: "/perfil/editar#limitlessHandle" });
  if (e.faltaOficial) perfil.push({ id: "oficial", tipo: "oficial", href: `/perfil/${e.playerId}#mundial` });
  if (e.cuentaNueva && !e.resetLadder && e.ladderToca) perfil.push({ id: "ladder", tipo: "ladder", href: `/perfil/${e.playerId}#ladder` });
  if (e.cuentaNueva) out.push(...perfil);
  // Lo que se olvida y luego no hay quien lo recuerde: el resultado de un torneo. Del más reciente al más antiguo.
  for (const t of [...e.torneosSinResultado].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5)) {
    out.push({ id: `resultado:${t.id}`, tipo: "resultado", href: `/torneos/${t.id}`, nombre: t.nombre, fecha: t.fecha });
  }
  // v0.136 — el torneo al que vas, unos días antes: para preparar el mazo.
  for (const t of [...(e.torneosProximos ?? [])].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 3)) {
    out.push({ id: `torneo:${t.id}`, tipo: "torneo", href: `/torneos/${t.id}/preparacion`, nombre: t.nombre, fecha: t.fecha });
  }
  if (e.pendientesLiga > 0) out.push({ id: "liga", tipo: "liga", href: "/liga", n: e.pendientesLiga, nombre: e.proximoLiga?.rival });
  // El reset y el recordatorio dirían lo mismo: con reset reciente, solo el reset.
  if (e.resetLadder) out.push({ id: "reset", tipo: "reset", href: `/perfil/${e.playerId}#ladder` });
  else if (e.ladderToca && !e.cuentaNueva) out.push({ id: "ladder", tipo: "ladder", href: `/perfil/${e.playerId}#ladder` });
  if (e.inscripcion) out.push({ id: `inscripcion:${e.inscripcion.id}`, tipo: "inscripcion", href: "/liga", nombre: e.inscripcion.nombre });
  // v0.136 — un Regional recién terminado e importado: el metagame nuevo está en el Inicio.
  if (e.regionalNuevo) out.push({ id: `regional:${e.regionalNuevo.fecha}`, tipo: "regional", href: "/#ultimo-regional", nombre: e.regionalNuevo.nombre, fecha: e.regionalNuevo.fecha });
  if (!e.cuentaNueva) out.push(...perfil.filter((a) => a.tipo !== "ladder"));
  return out;
}

/** v0.135 — ¿Es una cuenta nueva? Las dos primeras semanas desde el alta. */
export function esCuentaNueva(alta: string | Date | null | undefined, ahora: number): boolean {
  if (!alta) return false;
  const t = typeof alta === "string" ? Date.parse(alta.length === 10 ? `${alta}T00:00:00Z` : alta) : alta.getTime();
  return Number.isFinite(t) && ahora - t < 14 * 86_400_000;
}
