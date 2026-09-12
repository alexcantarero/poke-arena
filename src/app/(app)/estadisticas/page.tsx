import { loadSnapshot } from "@/lib/data";
import {
  activityByMonth, archetypeStats, firstTurnSeriesStats, firstTurnStats, isInternal, isPlayed,
  matchupMatrix, seriesShapes,
} from "@/lib/stats";
import { MONTHS, pct, wrColor } from "@/lib/format";
import { Bars, Kpi, PageHead, SectionTitle, Sprites } from "@/components/ui";
import { Matrix } from "@/components/Matrix";
import { ScopeTabs } from "@/components/ScopeTabs";

export const metadata = { title: "Estadísticas" };

export default async function StatsPage({
  searchParams,
}: { searchParams: Promise<{ comp?: string; arch?: string }> }) {
  const { comp = "all", arch } = await searchParams;
  const snap = await loadSnapshot();
  const all = snap.matches.filter(isPlayed);
  const rows = comp === "all" ? all : all.filter((m) => m.competitionId === comp);

  const archs = archetypeStats(rows, snap.archIndex, undefined, snap.archById);
  const ft = firstTurnStats(rows);
  // A nivel de serie. Es la única lectura posible de las rondas de torneo
  // apuntadas en modo rápido, que tienen turno y resultado pero no desglose.
  const fts = firstTurnSeriesStats(rows);
  const shapes = seriesShapes(rows);
  const months = activityByMonth(rows);
  const matrix = matchupMatrix(rows, snap.archIndex, 1, snap.archById);
  const totalGames = rows.reduce((a, m) => a + m.games.length, 0);
  const external = rows.filter((m) => !isInternal(m)).length;
  const bo: Record<number, number> = { 1: 0, 3: 0, 5: 0 };
  for (const m of rows) bo[m.bestOf] = (bo[m.bestOf] ?? 0) + 1;

  const focus = arch ? snap.archById.get(arch) : undefined;
  const focusRow = arch ? archs.find((a) => a.archetypeId === arch) : undefined;

  return (
    <>
      <PageHead
        title="Estadísticas"
        sub="Sobre las partidas registradas. Las que no llevan mazo en los dos lados cuentan para el ranking, pero no para la matriz."
      />

      <ScopeTabs
        basePath="/estadisticas" param="comp" current={comp}
        options={snap.competitions.map((c) => ({ value: c.id, label: c.name }))}
      />

      {focus && focusRow && (
        <section className="card mt-4 p-4">
          <div className="flex items-center gap-3">
            <Sprites archetype={focus} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold">{focus.name}</h2>
              <p className="text-sm text-muted">
                {focusRow.played} usos · {focusRow.wins}V {focusRow.losses}D · juegos {focusRow.gameWins}–{focusRow.gameLosses}
              </p>
            </div>
            <span className="font-display text-3xl font-extrabold tabular" style={{ color: wrColor(focusRow.winRate) }}>
              {pct(focusRow.winRate, 0)}
            </span>
          </div>
        </section>
      )}

      <div className="my-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi label="Partidas" value={rows.length} note={`${totalGames} juegos`} />
        <Kpi label="Arquetipos" value={archs.length} note={`${external} contra gente de fuera`} />
        <Kpi label="Gana quien empieza" value={pct(ft.winRate, 1)} note={`${ft.n} juegos anotados`} highlight={(ft.winRate ?? 0) > 0.55} />
        <Kpi label="Formato" value={`Bo3 ${rows.length ? Math.round(((bo[3] ?? 0) / rows.length) * 100) : 0}%`}
          note={`Bo1 ${bo[1] ?? 0} · Bo3 ${bo[3] ?? 0} · Bo5 ${bo[5] ?? 0}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="card-head"><h2 className="text-lg font-bold">Uso del metagame</h2></div>
          <div className="p-4">
            {archs.length ? (
              <Bars rows={archs.slice(0, 10).map((a) => ({
                label: <span className="inline-flex min-w-0 items-center gap-1.5"><Sprites archetype={a.archetype} size="sm" /><span className="truncate text-[13px]">{a.archetype?.name}</span></span>,
                value: a.played,
                right: `${a.played}`,
              }))} />
            ) : <p className="text-sm text-muted">Sin mazos asignados todavía.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="text-lg font-bold">Rendimiento</h2>
            <span className="text-xs text-muted">mín. 2 usos</span>
          </div>
          <div className="p-4">
            {archs.filter((a) => a.played >= 2).length ? (
              <Bars max={100} rows={archs.filter((a) => a.played >= 2).slice(0, 10).map((a) => ({
                label: <span className="inline-flex min-w-0 items-center gap-1.5"><Sprites archetype={a.archetype} size="sm" /><span className="truncate text-[13px]">{a.archetype?.name}</span></span>,
                value: (a.winRate ?? 0) * 100,
                right: `${pct(a.winRate, 0)} (${a.played})`,
                color: wrColor(a.winRate),
              }))} />
            ) : <p className="text-sm text-muted">Hacen falta al menos dos usos por arquetipo.</p>}
          </div>
        </section>
      </div>

      <section className="card mt-4">
        <div className="card-head">
          <h2 className="text-lg font-bold">Matriz de emparejamientos</h2>
          <span className="text-xs text-muted">fila contra columna</span>
        </div>
        <div className="p-4">
          <Matrix data={matrix} byId={snap.archById} />
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-win" />favorable (≥55%)</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-series-1" />equilibrado</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-loss" />desfavorable (≤45%)</span>
            <span>La intensidad crece con el número de partidas.</span>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="card">
          <div className="card-head"><h2 className="text-lg font-bold">Cómo acaban las series</h2></div>
          <div className="p-4">
            {shapes.length
              ? <Bars rows={shapes.map((s) => ({ label: <span className="font-mono text-[13px]">{s.key}</span>, value: s.n, right: String(s.n) }))} />
              : <p className="text-sm text-muted">Aún no hay series a más de un juego.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2 className="text-lg font-bold">Primer turno</h2></div>
          <div className="p-4">
            {ft.n && ft.winRate != null ? (
              <>
                <div className="font-display text-4xl font-extrabold tabular" style={{ color: wrColor(ft.winRate) }}>
                  {pct(ft.winRate, 1)}
                </div>
                <p className="mt-1 mb-3 text-sm text-muted">
                  de los {ft.n} juegos con turno anotado los gana quien empieza
                </p>
                <div className="flex h-2 overflow-hidden rounded-full bg-surface-3">
                  <i className="block h-full bg-win" style={{ width: `${(ft.winRate * 100).toFixed(1)}%` }} />
                  <i className="block h-full bg-loss" style={{ width: `${((1 - ft.winRate) * 100).toFixed(1)}%` }} />
                </div>
                {fts.n > 0 && fts.winRate != null && (
                  <p className="mt-3 text-xs text-muted">
                    Contando series completas en vez de juegos sueltos: {pct(fts.winRate, 1)} de{" "}
                    {fts.n} partidas las gana quien salió primero. Aquí entran también las rondas
                    de torneo apuntadas sin desglose, que tienen turno y resultado pero no juegos.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">
                Anota quién empezó cada juego y aquí sabrás si el primer turno pesa tanto como dice todo el mundo.
              </p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2 className="text-lg font-bold">Actividad</h2></div>
          <div className="p-4">
            {months.length
              ? <Bars rows={months.map((x) => {
                  const [y, m] = x.key.split("-");
                  return { label: <span className="capitalize">{MONTHS[Number(m) - 1]} {y.slice(2)}</span>, value: x.n, right: String(x.n) };
                })} />
              : <p className="text-sm text-muted">Sin partidas.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
