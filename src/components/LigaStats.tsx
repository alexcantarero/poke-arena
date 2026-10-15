import Link from "next/link";
import type { Archetype, MatchFull, PublicPlayer } from "@/lib/types";
import {
  activityByMonth, archetypesOfMatch, firstTurnStats, isPlayed, matchupMatrix, outcome,
} from "@/lib/stats";
import { MONTHS, pct, wrColor } from "@/lib/format";
import { Avatar, Sprites } from "@/components/ui";
import { Matrix } from "@/components/Matrix";
import { H2HHeatmap } from "@/components/H2HHeatmap";
import { KpiCard } from "@/components/charts/KpiCard";
import { TrendLineChartLazy } from "@/components/statistics/lazy";
import { prepareDailyTrend } from "@/lib/chartData";
import { matrizH2H } from "@/lib/h2h";

/* =========================================================================
   v0.19 — Estadísticas de la liga, dentro de la propia sección de Liga.

   Pintado en el servidor y sin librería de gráficos: barras de CSS. En el
   móvil se leen igual de bien y no hay que mandar Recharts para esto.

   Solo partidas disputadas entre jugadores de la liga. La ficha de competición
   aplica sus filtros antes de pasar los resultados a este componente.
   ========================================================================= */

type Fila = { id: string; player?: PublicPlayer; w: number; l: number };

export function LigaStats({
  matches, playersById, titulo = "Estadísticas de la liga", archIndex, archById,
}: {
  matches: MatchFull[]; playersById: Map<string, PublicPlayer>; titulo?: string;
  /** v0.24: para los arquetipos de la liga. Sin ellos, ese bloque no sale. */
  archIndex?: Map<string, Archetype | undefined>; archById?: Map<string, Archetype>;
}) {
  const jugadas = matches.filter(isPlayed).filter((m) => m.playerBId && outcome(m).winner !== "tie");
  if (!jugadas.length) return null;
  const matriz = archIndex ? matchupMatrix(jugadas, archIndex, 1, archById) : null;
  const matrizJugadores = matrizH2H(jugadas.map((m) => ({
    clave: `m:${m.id}`,
    a: m.playerAId,
    b: m.playerBId!,
    resultado: outcome(m).winner,
  })));
  const jugadoresH2H = matrizJugadores.ids.flatMap((id) => {
    const player = playersById.get(id);
    return player ? [{ id, name: player.name, avatar: <Avatar player={player} size="sm" /> }] : [];
  });

  const filas = new Map<string, Fila>();
  const fila = (id: string) => {
    let f = filas.get(id);
    if (!f) { f = { id, player: playersById.get(id), w: 0, l: 0 }; filas.set(id, f); }
    return f;
  };
  let juegos = 0;
  for (const m of jugadas) {
    const o = outcome(m);
    juegos += m.games.length;
    const a = fila(m.playerAId), b = fila(m.playerBId!);
    if (o.winner === "a") { a.w++; b.l++; }
    else if (o.winner === "b") { b.w++; a.l++; }
  }
  const tabla = [...filas.values()]
    .map((f) => ({ ...f, n: f.w + f.l, wr: f.w + f.l ? f.w / (f.w + f.l) : null }))
    .sort((x, y) => y.w - x.w || (y.wr ?? 0) - (x.wr ?? 0));
  const maxGames = Math.max(1, ...tabla.map((f) => f.n));

  const meses = activityByMonth(jugadas).slice(-8);
  const maxMes = Math.max(1, ...meses.map((m) => m.n));
  const ft = firstTurnStats(jugadas);
  /* v0.24 — Arquetipos de la liga: cuánto se juega cada uno (los dos lados de
     cada partida) y su %V. Los 8 más jugados. */
  const porArch = new Map<string, { a: Archetype; n: number; w: number }>();
  if (archIndex) {
    for (const m of jugadas) {
      const o = outcome(m);
      const { a, b } = archetypesOfMatch(m, archIndex, archById);
      for (const [arch, gano] of [[a, o.winner === "a"], [b, o.winner === "b"]] as const) {
        if (!arch) continue;
        const r = porArch.get(arch.id) ?? { a: arch, n: 0, w: 0 };
        r.n++; if (gano) r.w++;
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
    for (const [pid, res] of [[m.playerAId, o.winner === "a" ? "V" : "D"], [m.playerBId!, o.winner === "b" ? "V" : "D"]] as const) {
      const r = rachas.get(pid) ?? { actual: 0, tipo: null, mejor: 0, seguidas: 0 };
      if (r.tipo === res) r.actual++;
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
      <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard label="Partidas" value={jugadas.length} sub={`${juegos} juegos disputados`} color="blue" />
        <KpiCard label="Arquetipos" value={porArch.size} sub={`${usosTotales} mazos registrados`} color="purple" />
        <KpiCard label="Jugadores" value={tabla.length} sub="con alguna partida" color="green" />
        <KpiCard
          label="Primer turno"
          value={pct(ft.winRate, 0)}
          sub={`${ft.n} juegos (gana 1.º)`}
          color={(ft.winRate ?? 0) > 0.55 ? "green" : "blue"}
        />
      </div>

      {/* Primero los mazos y los Pokémon; después, las estadísticas de jugadores.

          v0.40 — una columna, no dos. La matriz compartía fila con «Mazos
          más jugados» y se quedaba con media tarjeta para diez columnas de
          rivales: había que desplazarla de lado incluso en un monitor
          grande. A ancho completo cabe entera. */}
      <div className="grid grid-cols-1 gap-3">
        {arquetipos.length > 0 && (
          <div className="card min-w-0 p-4">
            <h3 className="mb-1 font-display text-lg font-extrabold tracking-tight text-ink">Mazos más jugados</h3>
            <p className="mb-3 text-xs text-muted">Uso y porcentaje de victorias por arquetipo.</p>
            <ul className="flex flex-col gap-2.5">
              {arquetipos.map((r, i) => {
                const wr = r.n ? r.w / r.n : null;
                return (
                  <li key={r.a.id} title={`${r.a.name}: ${r.n} usos, ${pct(wr, 0)} de victorias`} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2">
                    <span className="w-4 flex-none text-right font-mono text-[10px] text-muted">{porArch.size > 1 ? i + 1 : ""}</span>
                    <Sprites archetype={r.a} size="sm" />
                    <span className="w-28 min-w-0 flex-none truncate text-sm font-semibold xs:w-36">{r.a.name}</span>
                    <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2" title={`${r.n} usos`}>
                      <span className="block h-full rounded-full bg-info/70 transition-[width,filter] duration-300 group-hover:brightness-125" style={{ width: `${(r.n / Math.max(1, usosTotales)) * 100}%` }} />
                    </span>
                    <span className="w-8 flex-none text-right font-mono text-[11px] text-ink-2 tabular" title={`${r.n} usos`}>{r.n}</span>
                    <span className="hidden w-10 flex-none text-right font-mono text-[11px] text-muted tabular sm:block">{pct(r.n / Math.max(1, usosTotales), 0)}</span>
                    <span className="w-11 flex-none text-right font-mono text-xs font-semibold tabular" style={{ color: wrColor(wr) }}>{pct(wr, 0)}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
              <span>Usos: cada lado de cada partida.</span><span>%V: victorias entre usos.</span>
            </p>
          </div>
        )}

        <div className="card min-w-0 p-4">
          <h3 className="mb-1 font-display text-lg font-extrabold tracking-tight text-ink">Enfrentamientos entre mazos</h3>
          <p className="mb-3 text-xs text-muted">Porcentaje de victorias del mazo de la fila contra el de la columna.</p>
          {matriz ? (
            <>
              <Matrix data={matriz} byId={archById ?? new Map<string, Archetype>()} />
              <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-win" />favorable (≥55%)</span>
                <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-series-1" />equilibrado</span>
                <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-loss" />desfavorable (≤45%)</span>
                <span>El color se intensifica con más partidas.</span>
              </p>
            </>
          ) : (
            <p className="py-6 text-center text-sm text-muted">Aún no hay suficientes datos de mazos.</p>
          )}
        </div>
      </div>

      <h3 className="mt-5 px-1 font-display text-lg font-extrabold tracking-tight text-ink">Rendimiento de jugadores</h3>
      <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="card min-w-0 p-4">
          <h4 className="mb-1 font-bold">Victorias y derrotas</h4>
          <p className="mb-3 text-xs text-muted">Récord y porcentaje de victorias por jugador.</p>
          <ul className="flex flex-col gap-2">
            {tabla.map((f) => (
              <li key={f.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2">
                <Link href={`/perfil/${f.id}`} className="flex w-24 min-w-0 flex-none items-center gap-1.5 hover:text-info xs:w-36">
                  <Avatar player={f.player} size="sm" />
                  <span className="truncate text-xs font-semibold sm:text-sm">{f.player?.name ?? "—"}</span>
                </Link>
                <span className="flex h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2" title={`${f.w} victorias y ${f.l} derrotas`}>
                  <span className="h-full bg-win transition-[width,filter] duration-300 group-hover:brightness-125" style={{ width: `${(f.w / maxGames) * 100}%` }} />
                  <span className="h-full bg-loss/70 transition-[width,filter] duration-300 group-hover:brightness-125" style={{ width: `${(f.l / maxGames) * 100}%` }} />
                </span>
                <span className="w-10 flex-none text-right font-mono text-[10px] font-semibold tabular text-muted sm:w-12 sm:text-xs">{f.w}–{f.l}</span>
                <span className="w-10 flex-none text-right font-mono text-xs font-bold tabular sm:w-12" style={{ color: wrColor(f.wr) }}>{pct(f.wr, 0)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-win" />victorias</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-loss" />derrotas</span>
          </p>
        </div>

        <div className="card min-w-0 p-4">
          <h4 className="mb-1 font-bold">Partidas por mes</h4>
          <p className="mb-3 text-xs text-muted">Actividad de la temporada.</p>
          <div className="flex h-36 items-end gap-1.5">
            {meses.map((m) => {
              const [y, mm] = m.key.split("-").map(Number);
              return (
                <div
                  key={m.key}
                  tabIndex={0}
                  role="img"
                  aria-label={`${MONTHS[mm - 1]} ${y}: ${m.n} partidas`}
                  className="group flex min-w-0 flex-1 flex-col items-center gap-1 rounded-t px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-info"
                  title={`${MONTHS[mm - 1]} ${y}: ${m.n} partidas`}
                >
                  <span className="text-[10px] font-semibold tabular text-ink-2">{m.n}</span>
                  <span className="w-full rounded-t bg-info/70 transition-[height,filter] duration-300 group-hover:brightness-125" style={{ height: `${Math.max(4, (m.n / maxMes) * 100)}px` }} />
                  <span className="truncate text-[10px] uppercase text-muted">{MONTHS[mm - 1].slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <section className="card mt-3 overflow-hidden">
        <div className="card-head items-start">
          <div>
            <h4 className="font-display text-lg font-extrabold tracking-tight text-ink">Enfrentamientos directos</h4>
            <p className="mt-0.5 text-xs text-muted">Porcentaje de victorias del jugador de la fila contra el de la columna. Pasa o enfoca una casilla para ver el récord.</p>
          </div>
        </div>
        <div className="p-4">
          <H2HHeatmap matriz={matrizJugadores} jugadores={jugadoresH2H} colorMode="winRate" />
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-win" />más victorias que derrotas</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-series-1" />equilibrado</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-loss" />más derrotas que victorias</span>
          </p>
        </div>
      </section>

      <section className="card mt-3 p-4">
        <h4 className="mb-3 font-display text-lg font-extrabold tracking-tight text-ink">Rachas actuales</h4>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {listaRachas.map((r) => (
            <li key={r.id} className="group flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2">
              <Link href={`/perfil/${r.id}`} className="flex min-w-0 flex-1 items-center gap-1.5 hover:text-info">
                <Avatar player={r.player} size="sm" />
                <span className="truncate text-sm font-semibold">{r.player?.name ?? "—"}</span>
              </Link>
              <span className={`chip chip-dot flex-none text-[11px] ${r.tipo === "V" ? "text-win" : "text-loss"}`}>
                {r.actual} {r.tipo === "V" ? "V" : "D"}
              </span>
              <span className="w-16 flex-none text-right text-[11px] text-muted tabular">mejor {r.mejor}V</span>
            </li>
          ))}
        </ul>
      </section>

      {jugadas.length > 0 && (
        <div className="mt-3">
          <TrendLineChartLazy
            data={prepareDailyTrend(jugadas, 30)}
            title="Actividad diaria en la liga (últimos 30 días)"
            subtitle="Partidas jugadas por día y media móvil de 7 días"
            valueLabel="Partidas"
            height={220}
          />
        </div>
      )}
    </section>
  );
}
