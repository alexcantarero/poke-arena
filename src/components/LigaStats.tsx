import Link from "next/link";
import type { MatchFull, PublicPlayer } from "@/lib/types";
import { activityByMonth, firstTurnStats, isPlayed, outcome } from "@/lib/stats";
import { MONTHS, pct, wrColor } from "@/lib/format";
import { Kpi } from "@/components/primitives";
import { Avatar } from "@/components/ui";

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
  matches, playersById, titulo = "Estadísticas de la liga",
}: { matches: MatchFull[]; playersById: Map<string, PublicPlayer>; titulo?: string }) {
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
    </section>
  );
}
