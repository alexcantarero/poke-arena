import Link from "next/link";
import type { Archetype, MatchFull, PublicPlayer } from "@/lib/types";
import { activityByMonth, archetypesOfMatch, firstTurnStats, isPlayed, outcome } from "@/lib/stats";
import { MONTHS, pct, wrColor } from "@/lib/format";
import { Kpi } from "@/components/primitives";
import { Avatar, Sprites } from "@/components/ui";

/* =========================================================================
   v0.19 — Estadísticas de la liga, dentro de la propia sección de Liga.

   Pintado en el servidor y sin librería de gráficos: barras de CSS. En el
   móvil se leen igual de bien y no hay que mandar Recharts para esto.

   Solo partidas entre gente del grupo (las de liga tienen siempre dos
   jugadores de casa). Se usa en la lista de competiciones (todas juntas) y
   en la ficha de cada una (solo las suyas).
   ========================================================================= */

type Fila = { id: string; player?: PublicPlayer; w: number; l: number; t: number };

export function LigaStats({
  matches, playersById, titulo = "Estadísticas de la liga", archIndex, archById,
}: {
  matches: MatchFull[]; playersById: Map<string, PublicPlayer>; titulo?: string;
  /** v0.24: para los arquetipos de la liga. Sin ellos, ese bloque no sale. */
  archIndex?: Map<string, Archetype | undefined>; archById?: Map<string, Archetype>;
}) {
  const jugadas = matches.filter(isPlayed).filter((m) => m.playerBId);
  if (!jugadas.length) return null;

  const filas = new Map<string, Fila>();
  const fila = (id: string) => {
    let f = filas.get(id);
    if (!f) { f = { id, player: playersById.get(id), w: 0, l: 0, t: 0 }; filas.set(id, f); }
    return f;
  };
  let juegos = 0;
  for (const m of jugadas) {
    const o = outcome(m);
    juegos += m.games.length;
    const a = fila(m.playerAId), b = fila(m.playerBId!);
    if (o.winner === "a") { a.w++; b.l++; }
    else if (o.winner === "b") { b.w++; a.l++; }
    else { a.t++; b.t++; }
  }
  const tabla = [...filas.values()]
    .map((f) => ({ ...f, n: f.w + f.l + f.t, wr: f.w + f.l + f.t ? (f.w + 0.5 * f.t) / (f.w + f.l + f.t) : null }))
    .sort((x, y) => y.w - x.w || (y.wr ?? 0) - (x.wr ?? 0));
  const maxW = Math.max(1, ...tabla.map((f) => f.n));

  const meses = activityByMonth(jugadas).slice(-8);
  const maxMes = Math.max(1, ...meses.map((m) => m.n));
  const ft = firstTurnStats(jugadas);
  const empates = jugadas.filter((m) => outcome(m).winner === "tie").length;

  /* v0.24 — Arquetipos de la liga: cuánto se juega cada uno (los dos lados de
     cada partida) y su %V. Los 8 más jugados. */
  const porArch = new Map<string, { a: Archetype; n: number; w: number; t: number }>();
  if (archIndex) {
    for (const m of jugadas) {
      const o = outcome(m);
      const { a, b } = archetypesOfMatch(m, archIndex, archById);
      for (const [arch, gano, empata] of [[a, o.winner === "a", o.winner === "tie"], [b, o.winner === "b", o.winner === "tie"]] as const) {
        if (!arch) continue;
        const r = porArch.get(arch.id) ?? { a: arch, n: 0, w: 0, t: 0 };
        r.n++; if (gano) r.w++; if (empata) r.t++;
        porArch.set(arch.id, r);
      }
    }
  }
  const arquetipos = [...porArch.values()].sort((x, y) => y.n - x.n).slice(0, 8);
  const usosTotales = [...porArch.values()].reduce((s, r) => s + r.n, 0);

  /* v0.24 — Rachas: la actual de cada uno (V o D seguidas, contando desde la
     última partida) y la mejor racha de victorias de la liga. */
  const rachas = new Map<string, { actual: number; tipo: "V" | "D" | null; mejor: number; seguidas: number }>();
  for (const m of [...jugadas].sort((x, y) => x.date.localeCompare(y.date))) {
    const o = outcome(m);
    for (const [pid, res] of [[m.playerAId, o.winner === "a" ? "V" : o.winner === "b" ? "D" : "E"], [m.playerBId!, o.winner === "b" ? "V" : o.winner === "a" ? "D" : "E"]] as const) {
      const r = rachas.get(pid) ?? { actual: 0, tipo: null, mejor: 0, seguidas: 0 };
      if (res === "E") { r.actual = 0; r.tipo = null; r.seguidas = 0; }
      else if (r.tipo === res) r.actual++;
      else { r.tipo = res; r.actual = 1; }
      r.seguidas = res === "V" ? r.seguidas + 1 : 0;
      r.mejor = Math.max(r.mejor, r.seguidas);
      rachas.set(pid, r);
    }
  }
  const listaRachas = [...rachas.entries()]
    .map(([id, r]) => ({ id, ...r, player: playersById.get(id) }))
    .sort((x, y) => (y.tipo === "V" ? y.actual : -y.actual) - (x.tipo === "V" ? x.actual : -x.actual));

  return (
    <section className="mb-5">
      <h2 className="mb-2 px-1 font-display text-xl font-bold">{titulo}</h2>
      <div className="mb-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi label="Partidas" icon="results" value={jugadas.length} note={`${juegos} juegos`} />
        <Kpi label="Jugadores" icon="user" value={tabla.length} note="con alguna partida" />
        <Kpi label="Empates" icon="compare" value={empates} note={pct(jugadas.length ? empates / jugadas.length : null, 0)} />
        <Kpi label="Gana quien empieza" icon="star" value={pct(ft.winRate, 0)} note={`${ft.n} juegos anotados`} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="card min-w-0 p-4">
          <h3 className="mb-3 font-bold">Victorias por jugador</h3>
          <ul className="flex flex-col gap-2.5">
            {tabla.map((f) => (
              <li key={f.id} className="flex items-center gap-2">
                <Link href={`/perfil/${f.id}`} className="flex w-28 min-w-0 flex-none items-center gap-1.5 hover:text-info xs:w-36">
                  <Avatar player={f.player} size="sm" />
                  <span className="truncate text-sm font-semibold">{f.player?.name ?? "—"}</span>
                </Link>
                {/* Barra apilada V / E / D, a escala del que más ha jugado. */}
                <span className="flex h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2"
                  title={`${f.w} V · ${f.t} E · ${f.l} D`}>
                  <span className="h-full bg-win" style={{ width: `${(f.w / maxW) * 100}%` }} />
                  <span className="h-full bg-tie" style={{ width: `${(f.t / maxW) * 100}%` }} />
                  <span className="h-full bg-loss/70" style={{ width: `${(f.l / maxW) * 100}%` }} />
                </span>
                <span className="w-12 flex-none text-right font-mono text-xs font-semibold tabular"
                  style={{ color: wrColor(f.wr) }}>{pct(f.wr, 0)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted">
            Verde, victorias; gris, empates; rojo, derrotas. %V cuenta el empate como media victoria.
          </p>
        </div>

        <div className="card min-w-0 p-4">
          <h3 className="mb-3 font-bold">Partidas por mes</h3>
          <div className="flex h-36 items-end gap-1.5">
            {meses.map((m) => {
              const [y, mm] = m.key.split("-").map(Number);
              return (
                <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${MONTHS[mm - 1]} ${y}: ${m.n}`}>
                  <span className="text-[10px] font-semibold tabular text-ink-2">{m.n}</span>
                  <span className="w-full rounded-t bg-info/70" style={{ height: `${Math.max(4, (m.n / maxMes) * 100)}px` }} />
                  <span className="truncate text-[10px] uppercase text-muted">{MONTHS[mm - 1].slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* v0.24 — más análisis de la temporada */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {arquetipos.length > 0 && (
          <div className="card min-w-0 p-4">
            <h3 className="mb-3 font-bold">Arquetipos de la liga</h3>
            <ul className="flex flex-col gap-2.5">
              {arquetipos.map((r) => {
                const wr = r.n ? (r.w + 0.5 * r.t) / r.n : null;
                return (
                  <li key={r.a.id} className="flex items-center gap-2">
                    <Sprites archetype={r.a} size="sm" />
                    <span className="w-28 min-w-0 flex-none truncate text-sm font-semibold xs:w-36">{r.a.name}</span>
                    <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2" title={`${r.n} usos`}>
                      <span className="block h-full bg-info/70" style={{ width: `${(r.n / Math.max(1, usosTotales)) * 100}%` }} />
                    </span>
                    <span className="w-10 flex-none text-right font-mono text-[11px] text-muted tabular">{pct(r.n / Math.max(1, usosTotales), 0)}</span>
                    <span className="w-11 flex-none text-right font-mono text-xs font-semibold tabular" style={{ color: wrColor(wr) }}>{pct(wr, 0)}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-muted">Barra: cuota de uso (cada lado de cada partida). Número de color: % de victorias.</p>
          </div>
        )}

        <div className="card min-w-0 p-4">
          <h3 className="mb-3 font-bold">Rachas</h3>
          <ul className="flex flex-col gap-2">
            {listaRachas.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <Link href={`/perfil/${r.id}`} className="flex min-w-0 flex-1 items-center gap-1.5 hover:text-info">
                  <Avatar player={r.player} size="sm" />
                  <span className="truncate text-sm font-semibold">{r.player?.name ?? "—"}</span>
                </Link>
                <span className={`chip chip-dot flex-none text-[11px] ${r.tipo === "V" ? "text-win" : r.tipo === "D" ? "text-loss" : "text-muted"}`}>
                  {r.tipo ? `${r.actual} ${r.tipo === "V" ? "victoria" : "derrota"}${r.actual === 1 ? "" : "s"} seguida${r.actual === 1 ? "" : "s"}` : "sin racha"}
                </span>
                <span className="w-16 flex-none text-right text-[11px] text-muted tabular">mejor {r.mejor}V</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
