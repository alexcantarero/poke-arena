/* =========================================================================
   v0.23 — Modalidades de liga.

     · mazo_fijo  — cada uno entrega UN mazo al empezar y juega con él toda la
                    liga (bloqueado; ver `league_decks`).
     · tres_mazos — series Bo3; cada uno entrega hasta TRES mazos y en cada
                    serie juega con uno de ellos.
     · equipos    — duelo por equipos de 3. Cada jornada enfrenta a dos
                    equipos: tres partidas, cada miembro contra el del mismo
                    puesto del otro equipo. Gana el duelo quien gana más de
                    las tres. Cada jugador lleva un mazo fijo.

   Sin imports: lo cargan los tests.
   ========================================================================= */

export type Modalidad = "mazo_fijo" | "tres_mazos" | "equipos";

export const MODALIDADES: Record<Modalidad, { label: string; hint: string; maxMazos: number }> = {
  // v0.24: sin entrega ni bloqueo previo; los mazos se apuntan en cada partida.
  mazo_fijo: {
    label: "Mazo fijo",
    hint: "Se juega toda la liga con el mismo mazo, por acuerdo. El mazo se apunta en cada partida.",
    maxMazos: 1,
  },
  tres_mazos: {
    label: "Bo3 · hasta 3 mazos",
    hint: "Series al mejor de tres, con hasta tres mazos por persona. El mazo se apunta en cada partida.",
    maxMazos: 3,
  },
  equipos: {
    label: "Duelo por equipos",
    hint: "Equipos de 3. Cada jornada, equipo contra equipo: tres partidas, una por puesto.",
    maxMazos: 1,
  },
};

export const asModalidad = (v: string | null | undefined): Modalidad =>
  v === "tres_mazos" || v === "equipos" ? v : "mazo_fijo";

export const TAM_EQUIPO = 3;

/**
 * ¿Vale este mazo para una partida de liga? `entregados` = los mazos que esa
 * persona entregó (vacío si no ha entregado: entonces no se impone nada).
 * Devuelve el mazo con el que se guarda la partida, o un error.
 */
export function mazoDePartida(
  entregados: string[],
  elegido: string | null,
): { ok: true; deckId: string | null } | { ok: false; error: string } {
  if (!entregados.length) return { ok: true, deckId: elegido };
  if (!elegido) {
    // Con un solo mazo entregado no hay nada que elegir: se pone ese.
    if (entregados.length === 1) return { ok: true, deckId: entregados[0] };
    return { ok: false, error: "Elige con cuál de tus mazos de liga has jugado esta serie." };
  }
  if (entregados.includes(elegido)) return { ok: true, deckId: elegido };
  return {
    ok: false,
    error: entregados.length === 1
      ? "En esta liga juegas con el mazo que entregaste: no se puede cambiar."
      : "Ese mazo no es uno de los que entregaste para esta liga.",
  };
}

/* ----------------------------------------------------------- equipos ---- */

export type Equipo = { id: string; name: string; members: string[] };

/**
 * Jornada `ronda` (1-based) de una liga todos contra todos entre equipos, por
 * el método del círculo. Con un número impar, uno descansa (`descansa`).
 */
export function jornadaEquipos(ids: string[], ronda: number): { cruces: Array<[string, string]>; descansa: string | null } {
  const lista: Array<string | null> = [...ids];
  if (lista.length % 2) lista.push(null);
  const n = lista.length;
  if (n < 2) return { cruces: [], descansa: ids[0] ?? null };
  const giros = (ronda - 1) % (n - 1);
  // El primero queda fijo; el resto rota.
  const resto = lista.slice(1);
  for (let i = 0; i < giros; i++) resto.unshift(resto.pop()!);
  const orden = [lista[0], ...resto];
  const cruces: Array<[string, string]> = [];
  let descansa: string | null = null;
  for (let i = 0; i < n / 2; i++) {
    const a = orden[i], b = orden[n - 1 - i];
    if (a && b) cruces.push([a, b]);
    else descansa = a ?? b;
  }
  return { cruces, descansa };
}

/** Las partidas de un duelo: miembro i contra miembro i. */
export function partidasDeDuelo(a: Equipo, b: Equipo): Array<[string, string]> {
  const n = Math.min(a.members.length, b.members.length);
  return Array.from({ length: n }, (_, i) => [a.members[i], b.members[i]] as [string, string]);
}

export type FilaEquipo = {
  teamId: string; duelos: number; ganados: number; empatados: number; perdidos: number;
  puntos: number; victorias: number; derrotas: number;
};

/**
 * Clasificación por equipos. Un duelo = las partidas de una misma jornada
 * entre miembros de dos equipos. Lo gana el que gana más partidas; con las
 * mismas, empate. Puntos de duelo 3/1/0. Desempate: partidas ganadas.
 */
export function clasificacionEquipos(
  equipos: Equipo[],
  partidas: Array<{ round: number; playerAId: string; playerBId: string | null; winner: "a" | "b" | "tie" | null }>,
  puntos = { win: 3, tie: 1, loss: 0 },
): FilaEquipo[] {
  const equipoDe = new Map<string, string>();
  for (const e of equipos) for (const m of e.members) equipoDe.set(m, e.id);
  const filas = new Map<string, FilaEquipo>(equipos.map((e) => [e.id, {
    teamId: e.id, duelos: 0, ganados: 0, empatados: 0, perdidos: 0, puntos: 0, victorias: 0, derrotas: 0,
  }]));

  const duelos = new Map<string, { a: string; b: string; ga: number; gb: number }>();
  for (const p of partidas) {
    if (!p.playerBId || !p.winner) continue;
    const ta = equipoDe.get(p.playerAId), tb = equipoDe.get(p.playerBId);
    if (!ta || !tb || ta === tb) continue;
    const [x, y] = ta < tb ? [ta, tb] : [tb, ta];
    const k = `${p.round}|${x}|${y}`;
    const d = duelos.get(k) ?? { a: x, b: y, ga: 0, gb: 0 };
    const ganaA = p.winner === "a", ganaB = p.winner === "b";
    const ganador = ganaA ? ta : ganaB ? tb : null;
    if (ganador === x) d.ga++; else if (ganador === y) d.gb++;
    if (ganador) {
      filas.get(ganador)!.victorias++;
      filas.get(ganador === ta ? tb : ta)!.derrotas++;
    }
    duelos.set(k, d);
  }
  for (const d of duelos.values()) {
    const fa = filas.get(d.a)!, fb = filas.get(d.b)!;
    fa.duelos++; fb.duelos++;
    if (d.ga > d.gb) { fa.ganados++; fb.perdidos++; fa.puntos += puntos.win; fb.puntos += puntos.loss; }
    else if (d.gb > d.ga) { fb.ganados++; fa.perdidos++; fb.puntos += puntos.win; fa.puntos += puntos.loss; }
    else { fa.empatados++; fb.empatados++; fa.puntos += puntos.tie; fb.puntos += puntos.tie; }
  }
  return [...filas.values()].sort((p, q) => q.puntos - p.puntos || q.victorias - p.victorias || p.derrotas - q.derrotas);
}
