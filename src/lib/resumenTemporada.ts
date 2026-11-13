/* =========================================================================
   v0.130 — EL RESUMEN DE TU TEMPORADA: lo jugado, lo ganado y lo mejor.

   Sin imports, para probarlo. Recibe las partidas y los torneos de UNA
   temporada ya filtrados (la temporada va de julio a junio: `seasonOfDate`),
   y devuelve los números de la pantalla `/perfil/<id>/temporada`.

   Reglas:
     · Mejor puesto: el número más bajo; a igual puesto, el torneo más grande.
     · Mejor y peor cruce: contra un mazo rival con 3 partidas o más (con
       menos, un 1-0 saldría como «tu mejor cruce»).
     · La racha es la más larga de victorias seguidas, en orden de fecha.
     · Un dato que no existe es null, no cero: la pantalla pinta un guion.
   ========================================================================= */

export type PartidaTemporada = { fecha: string; r: "w" | "l" | "t"; miMazo: string; suMazo: string };
export type TorneoTemporada = { nombre: string; fecha: string; puesto: number | null; jugadores: number | null; cp: number };
export type PuntoEloTemporada = { fecha: string; valor: number };

export type CruceTemporada = { mazo: string; w: number; l: number; t: number; pct: number };

export type ResumenTemporada = {
  partidas: number; w: number; l: number; t: number;
  pct: number | null;
  torneos: number;
  cp: number;
  mejorPuesto: { nombre: string; puesto: number; jugadores: number | null } | null;
  podios: number;
  mazoMasJugado: { mazo: string; n: number; pct: number } | null;
  mazosDistintos: number;
  mejorCruce: CruceTemporada | null;
  peorCruce: CruceTemporada | null;
  rachaVictorias: number;
  mesMasActivo: { mes: string; n: number } | null;
  elo: { inicio: number; fin: number; pico: number; cambio: number } | null;
};

export const TEMPORADA_MIN_CRUCE = 3;
const pctDe = (w: number, l: number, t: number) => (w + t / 2) / (w + l + t);

export function resumenDeTemporada(
  partidas: readonly PartidaTemporada[], torneos: readonly TorneoTemporada[], elo: readonly PuntoEloTemporada[] = [],
): ResumenTemporada {
  const ps = [...partidas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const w = ps.filter((p) => p.r === "w").length, l = ps.filter((p) => p.r === "l").length, t = ps.filter((p) => p.r === "t").length;

  let racha = 0, mejorRacha = 0;
  for (const p of ps) { racha = p.r === "w" ? racha + 1 : 0; if (racha > mejorRacha) mejorRacha = racha; }

  const usados = new Map<string, { n: number; w: number; l: number; t: number }>();
  const cruces = new Map<string, { w: number; l: number; t: number }>();
  const meses = new Map<string, number>();
  for (const p of ps) {
    if (p.miMazo) {
      const u = usados.get(p.miMazo) ?? { n: 0, w: 0, l: 0, t: 0 };
      u.n++; u[p.r]++;
      usados.set(p.miMazo, u);
    }
    if (p.suMazo) {
      const c = cruces.get(p.suMazo) ?? { w: 0, l: 0, t: 0 };
      c[p.r]++;
      cruces.set(p.suMazo, c);
    }
    const mes = p.fecha.slice(0, 7);
    meses.set(mes, (meses.get(mes) ?? 0) + 1);
  }
  const masJugado = [...usados.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0], "es"))[0];
  const conBase: CruceTemporada[] = [...cruces.entries()]
    .filter(([, c]) => c.w + c.l + c.t >= TEMPORADA_MIN_CRUCE)
    .map(([mazo, c]) => ({ mazo, ...c, pct: pctDe(c.w, c.l, c.t) }));
  const total = (c: CruceTemporada) => c.w + c.l + c.t;
  const mejor = [...conBase].sort((a, b) => b.pct - a.pct || total(b) - total(a) || a.mazo.localeCompare(b.mazo, "es"))[0] ?? null;
  const peor = [...conBase].sort((a, b) => a.pct - b.pct || total(b) - total(a) || a.mazo.localeCompare(b.mazo, "es"))[0] ?? null;
  const mes = [...meses.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0];

  const conPuesto = torneos.filter((x): x is TorneoTemporada & { puesto: number } => typeof x.puesto === "number" && x.puesto > 0);
  const mejorT = [...conPuesto].sort((a, b) => a.puesto - b.puesto || (b.jugadores ?? 0) - (a.jugadores ?? 0) || b.fecha.localeCompare(a.fecha))[0];

  const es = [...elo].sort((a, b) => a.fecha.localeCompare(b.fecha));
  return {
    partidas: ps.length, w, l, t,
    pct: ps.length ? pctDe(w, l, t) : null,
    torneos: torneos.length,
    cp: torneos.reduce((a, x) => a + (x.cp || 0), 0),
    mejorPuesto: mejorT ? { nombre: mejorT.nombre, puesto: mejorT.puesto, jugadores: mejorT.jugadores } : null,
    podios: conPuesto.filter((x) => x.puesto <= 4).length,
    mazoMasJugado: masJugado ? { mazo: masJugado[0], n: masJugado[1].n, pct: pctDe(masJugado[1].w, masJugado[1].l, masJugado[1].t) } : null,
    mazosDistintos: usados.size,
    mejorCruce: mejor && mejor.pct > 0.5 ? mejor : null,
    peorCruce: peor && peor.pct < 0.5 && peor.mazo !== (mejor && mejor.pct > 0.5 ? mejor.mazo : "") ? peor : null,
    rachaVictorias: mejorRacha,
    mesMasActivo: mes ? { mes: mes[0], n: mes[1] } : null,
    elo: es.length
      ? { inicio: Math.round(es[0].valor), fin: Math.round(es[es.length - 1].valor), pico: Math.round(Math.max(...es.map((x) => x.valor))),
        cambio: Math.round(es[es.length - 1].valor - es[0].valor) }
      : null,
  };
}
