/* =========================================================================
   v0.59 — Los mensajes de Discord: cómo se arman. Sin imports, para probarlos.

   Tres avisos, cada uno a su webhook:
     · Resultados de un torneo, al cerrarse (a mano o por el cron).
     · Partidas de liga pendientes, los lunes.
     · La agenda de la semana, los lunes.

   PRIVACIDAD: en el de un torneo solo salen los jugadores del GRUPO (los que
   tienen cuenta en la app), como en todas las pantallas. Nunca terceros.
   ========================================================================= */

export const AMARILLO = 0xfacc15;
const LIMITE_DESC = 3800; // Discord corta la descripción a 4096

export type Embed = {
  title: string; url?: string; description?: string; color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string }; timestamp?: string;
};

const recortar = (t: string) => (t.length > LIMITE_DESC ? `${t.slice(0, LIMITE_DESC - 1)}…` : t);
const record = (w: number, l: number, t: number) => `${w}-${l}${t ? `-${t}` : ""}`;

export type ResultadoTorneo = {
  jugador: string; puesto: number | null; mazo: string | null; cinturon?: boolean;
  wins: number; losses: number; ties: number; drop: boolean;
};

/** Resultados de un torneo: el grupo, por puesto. Los del corte, con su medalla. */
export function embedTorneo(t: { id: string; nombre: string; fecha: string; jugadores: number | null; topCut: number | null },
  resultados: readonly ResultadoTorneo[], urlApp: string): Embed {
  const orden = [...resultados].sort((a, b) => (a.puesto ?? 9999) - (b.puesto ?? 9999) || a.jugador.localeCompare(b.jugador));
  const medalla = (p: number | null) => (p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 || p === 4 ? "🥉" : "▫️");
  const lineas = orden.map((r) => {
    const enCorte = r.puesto != null && t.topCut != null && t.topCut > 0 && r.puesto <= t.topCut;
    const puesto = r.puesto != null ? `**#${r.puesto}**` : "—";
    const mazo = r.mazo ? ` · ${r.mazo}` : "";
    return `${enCorte ? medalla(r.puesto) : "▫️"} ${puesto} ${r.cinturon ? "🏆 " : ""}${r.jugador}${mazo} · ${record(r.wins, r.losses, r.ties)}${r.drop ? " · drop" : ""}`;
  });
  const enCorte = orden.filter((r) => r.puesto != null && t.topCut && r.puesto <= t.topCut).length;
  return {
    title: `🏆 ${t.nombre}`,
    url: `${urlApp}/torneos/${t.id}`,
    color: AMARILLO,
    description: recortar(lineas.length ? lineas.join("\n") : "Nadie del grupo apuntó resultado."),
    fields: [
      { name: "Fecha", value: t.fecha, inline: true },
      ...(t.jugadores ? [{ name: "Jugadores", value: String(t.jugadores), inline: true }] : []),
      ...(t.topCut ? [{ name: `En el top ${t.topCut}`, value: String(enCorte), inline: true }] : []),
    ],
    footer: { text: "PokeArena TCG · torneo cerrado" },
  };
}

export type Pendiente = {
  liga: string; jornada: number | null; a: string; b: string;
  aCinturon?: boolean; bCinturon?: boolean;
};

/** Partidas de liga sin resultado, agrupadas por liga. */
export function embedPendientes(p: readonly Pendiente[], urlApp: string): Embed | null {
  if (!p.length) return null;
  const porLiga = new Map<string, Pendiente[]>();
  for (const x of p) porLiga.set(x.liga, [...(porLiga.get(x.liga) ?? []), x]);
  const bloques = [...porLiga.entries()].map(([liga, xs]) =>
    `**${liga}**\n${xs.sort((a, b) => (a.jornada ?? 0) - (b.jornada ?? 0))
      .map((x) => `• J${x.jornada ?? "?"} · ${x.aCinturon ? "🏆 " : ""}${x.a} vs ${x.bCinturon ? "🏆 " : ""}${x.b}`).join("\n")}`);
  return {
    title: `⏳ ${p.length} partida${p.length === 1 ? "" : "s"} de liga sin resultado`,
    url: `${urlApp}/competiciones`,
    color: AMARILLO,
    description: recortar(bloques.join("\n\n")),
    footer: { text: "PokeArena TCG · el resultado se apunta en un toque desde Inicio" },
  };
}

export type EventoAgenda = { fecha: string; fin: string | null; titulo: string; lugar: string | null; url: string | null };

/** v0.116 — la liga por divisiones: se abre la inscripción o empieza la temporada. */
export type EventoLiga =
  | { tipo: "inscripcion"; nombre: string; inicio: string; maxPorDivision: number }
  | { tipo: "empieza"; nombre: string; divisiones: Array<{ nivel: number; jugadores: string[] }> }
  | { tipo: "cierre"; nombre: string; campeon: string | null; divisiones: Array<{ nivel: number; suben: string[]; bajan: string[] }> };

export function embedLiga(e: EventoLiga, urlApp: string): Embed {
  if (e.tipo === "cierre") {
    const lineas = e.divisiones
      .filter((d) => d.suben.length || d.bajan.length)
      .map((d) => `**División ${d.nivel}**${d.suben.length ? ` · ⬆️ ${d.suben.join(", ")}` : ""}${d.bajan.length ? ` · ⬇️ ${d.bajan.join(", ")}` : ""}`);
    return {
      title: `Liga · ${e.nombre} · Final`,
      url: `${urlApp}/divisiones`,
      description: recortar(`🏆 **${e.campeon ?? "?"}** gana la División 1 y el Cinturón de Liga.\n\n${lineas.join("\n")}`),
      color: AMARILLO,
      footer: { text: "PokeArena TCG · Liga por divisiones" },
      timestamp: new Date().toISOString(),
    };
  }
  const descripcion = e.tipo === "inscripcion"
    ? `📝 Abierta la inscripción a **${e.nombre}**. Empieza el ${e.inicio}, con divisiones de hasta ${e.maxPorDivision}.\n\n👉 Apúntate aquí: ${urlApp}/divisiones`
    : `🏁 Empieza **${e.nombre}**.\n\n` + e.divisiones
      .map((d) => `**División ${d.nivel}**: ${d.jugadores.join(", ")}`)
      .join("\n");
  return {
    title: e.tipo === "inscripcion" ? `Liga · ${e.nombre}` : `Liga · ${e.nombre} · Divisiones`,
    url: `${urlApp}/divisiones`,
    description: recortar(descripcion),
    color: AMARILLO,
    footer: { text: "PokeArena TCG · Liga por divisiones" },
    timestamp: new Date().toISOString(),
  };
}

export type EventoCinturon = {
  tipo: "coronacion" | "defensa" | "cambio" | "forfeit" | "vacante";
  poseedor: string | null;
  anterior?: string | null;
};

export function embedEventoCinturon(evento: EventoCinturon, urlApp: string): Embed {
  const texto = evento.tipo === "coronacion"
    ? `🏆 **${evento.poseedor ?? "?"}** ha ganado el torneo y es el primer poseedor del Cinturón.`
    : evento.tipo === "defensa"
      ? `🏆 **${evento.poseedor ?? "?"}** ha defendido el Cinturón.`
      : evento.tipo === "forfeit"
        ? `⏱️ **${evento.poseedor ?? "?"}** recibe el Cinturón por falta de respuesta de **${evento.anterior ?? "?"}**.`
        : evento.tipo === "vacante"
          ? `⚪ El Cinturón queda vacante tras seis semanas sin defensa de **${evento.anterior ?? "?"}**.`
          : `🏆 **${evento.poseedor ?? "?"}** es el nuevo poseedor del Cinturón.`;
  return {
    title: "El Cinturón de PokeArena",
    url: `${urlApp}/cinturon`,
    description: texto,
    color: 0xfacc15,
    footer: { text: "PokeArena TCG · Cinturón" },
    timestamp: new Date().toISOString(),
  };
}

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const diaCorto = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}`;
};

/** La agenda de la semana, en orden. */
export function embedAgenda(semana: { desde: string; hasta: string }, ev: readonly EventoAgenda[], urlApp: string): Embed | null {
  if (!ev.length) return null;
  const lineas = [...ev].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.titulo.localeCompare(b.titulo)).map((e) => {
    const cuando = e.fin && e.fin !== e.fecha ? `${diaCorto(e.fecha)}–${diaCorto(e.fin)}` : diaCorto(e.fecha);
    const titulo = e.url ? `[${e.titulo}](${e.url})` : e.titulo;
    return `📅 **${cuando}** · ${titulo}${e.lugar ? ` · ${e.lugar}` : ""}`;
  });
  return {
    title: `🗓️ Esta semana · ${diaCorto(semana.desde)} – ${diaCorto(semana.hasta)}`,
    url: `${urlApp}/calendario`,
    color: AMARILLO,
    description: recortar(lineas.join("\n")),
    footer: { text: "PokeArena TCG · agenda" },
  };
}

/** Lunes y domingo de la semana de una fecha (ISO, AAAA-MM-DD). */
export function semanaDe(iso: string): { desde: string; hasta: string } {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
  const lunes = new Date(d.getTime() - dow * 86400000);
  const domingo = new Date(lunes.getTime() + 6 * 86400000);
  return { desde: lunes.toISOString().slice(0, 10), hasta: domingo.toISOString().slice(0, 10) };
}

/** ¿Es lunes en Madrid? El cron va en UTC (04:00): en Madrid ya es lunes. */
export function esLunesEnMadrid(ahora: Date): boolean {
  const dia = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Europe/Madrid" }).format(ahora);
  return dia === "Mon";
}
