import { loadSnapshot } from "@/lib/data";
import {
  activityByMonth, archetypeStats, firstTurnStats, isPlayed, matchupMatrix, seriesShapes,
} from "@/lib/stats";
import { MONTHS, pct, wrColor } from "@/lib/format";
import { Bars, Kpi, PageHead, Sprites } from "@/components/ui";
import { Matrix } from "@/components/Matrix";
import { CompSelector } from "@/components/CompSelector";

export default async function StatsPage({
  searchParams,
}: { searchParams: Promise<{ comp?: string; arch?: string }> }) {
  const { comp = "all" } = await searchParams;
  const snap = await loadSnapshot();
  const all = snap.matches.filter(isPlayed);
  const rows = comp === "all" ? all : all.filter((m) => m.competitionId === comp);

  const archs = archetypeStats(rows, snap.archIndex);
  const ft = firstTurnStats(rows);
  const shapes = seriesShapes(rows);
  const months = activityByMonth(rows);
  const matrix = matchupMatrix(rows, snap.archIndex, 1);
  const totalGames = rows.reduce((a, m) => a + m.games.length, 0);
  const withBothDecks = rows.filter((m) => m.deckAId && m.deckBId).length;
  const bo = { 1: 0, 3: 0, 5: 0 } as Record<number, number>;
  for (const m of rows) bo[m.bestOf] = (bo[m.bestOf] ?? 0) + 1;

  return (
    <>
      <PageHead
        title="Estadísticas"
        sub="Todo se calcula sobre las partidas registradas. Las que no llevan mazo asignado cuentan para el ranking, pero no para la matriz de emparejamientos."
        actions={<CompSelector competitions={snap.competitions} current={comp} basePath="/estadisticas" />}
      />

      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <Kpi label="Partidas" value={rows.length} note={`${totalGames} juegos (${rows.length ? (totalGames / rows.length).toFixed(2) : "0"} por partida)`} />
        <Kpi label="Arquetipos vistos" value={archs.length} note={`${withBothDecks} partidas con los dos mazos`} />
        <Kpi
          label="Gana quien empieza"
          value={pct(ft.winRate, 1)}
          note={`${ft.n} juegos con turno anotado`}
          highlight={(ft.winRate ?? 0) > 0.55}
        />
        <Kpi
          label="Reparto de formato"
          value={`Bo3 ${rows.length ? Math.round(((bo[3] ?? 0) / rows.length) * 100) : 0}%`}
          note={`Bo1 ${bo[1] ?? 0} · Bo3 ${bo[3] ?? 0} · Bo5 ${bo[5] ?? 0}`}
        />
      </div>

      <div className="grid g-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head"><h2>Uso del metagame</h2><span className="hint">veces que se llevó cada mazo</span></div>
          <div className="card-pad">
            {archs.length ? (
              <Bars rows={archs.slice(0, 10).map((a) => ({
                label: <span className="arch"><Sprites archetype={a.archetype} size="sm" /><span className="an">{a.archetype?.name}</span></span>,
                value: a.played,
                right: `${a.played} · ${pct(a.played / (rows.length * 2 || 1), 0)}`,
              }))} />
            ) : <div className="hint">Sin mazos asignados todavía.</div>}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Rendimiento por arquetipo</h2><span className="hint">% de victorias (partidas)</span></div>
          <div className="card-pad">
            {archs.filter((a) => a.played >= 2).length ? (
              <Bars max={100} rows={archs.filter((a) => a.played >= 2).slice(0, 10).map((a) => ({
                label: <span className="arch"><Sprites archetype={a.archetype} size="sm" /><span className="an">{a.archetype?.name}</span></span>,
                value: (a.winRate ?? 0) * 100,
                right: `${pct(a.winRate, 0)} (${a.played})`,
                color: wrColor(a.winRate),
              }))} />
            ) : <div className="hint">Hacen falta al menos 2 usos por arquetipo.</div>}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h2>Matriz de emparejamientos</h2>
          <span className="hint">% de victorias de la fila contra la columna · máx. 12 arquetipos</span>
        </div>
        <div className="card-pad">
          <Matrix data={matrix} byId={snap.archById} />
          <div className="matrix-legend">
            <span><b style={{ background: "var(--win)", display: "inline-block", width: 9, height: 9, borderRadius: 3, marginRight: 5 }} />favorable (≥55%)</span>
            <span><b style={{ background: "var(--blue)", display: "inline-block", width: 9, height: 9, borderRadius: 3, marginRight: 5 }} />equilibrado</span>
            <span><b style={{ background: "var(--loss)", display: "inline-block", width: 9, height: 9, borderRadius: 3, marginRight: 5 }} />desfavorable (≤45%)</span>
            <span>La intensidad crece con el número de partidas.</span>
          </div>
        </div>
      </div>

      <div className="grid g-3">
        <div className="card">
          <div className="card-head"><h2>Cómo terminan las series</h2></div>
          <div className="card-pad">
            {shapes.length ? (
              <Bars rows={shapes.map((s) => ({
                label: <span className="num" style={{ textAlign: "left" }}>{s.key}</span>,
                value: s.n,
                right: String(s.n),
              }))} />
            ) : <div className="hint">Aún no hay series a más de un juego.</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>Ventaja del primer turno</h2></div>
          <div className="card-pad">
            {ft.n && ft.winRate != null ? (
              <>
                <div className="score" style={{ fontSize: 40, color: wrColor(ft.winRate) }}>{pct(ft.winRate, 1)}</div>
                <div className="hint" style={{ margin: "4px 0 12px" }}>
                  de los {ft.n} juegos con turno anotado los gana quien empieza
                </div>
                <div className="split">
                  <i style={{ width: `${(ft.winRate * 100).toFixed(1)}%`, background: "var(--win)" }} />
                  <i style={{ width: `${((1 - ft.winRate) * 100).toFixed(1)}%`, background: "var(--loss)" }} />
                </div>
                <div className="legend" style={{ marginTop: 8 }}>
                  <span><b style={{ background: "var(--win)" }} />gana quien empieza</span>
                  <span><b style={{ background: "var(--loss)" }} />gana quien responde</span>
                </div>
              </>
            ) : (
              <div className="hint">
                Anota quién empezó cada juego al registrar la partida y aquí sabrás si el primer
                turno pesa tanto como dice todo el mundo.
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>Actividad por mes</h2></div>
          <div className="card-pad">
            {months.length ? (
              <Bars rows={months.map((x) => {
                const [y, m] = x.key.split("-");
                return {
                  label: <span style={{ textTransform: "capitalize" }}>{MONTHS[Number(m) - 1]} {y.slice(2)}</span>,
                  value: x.n,
                  right: `${x.n} part.`,
                };
              })} />
            ) : <div className="hint">Sin partidas.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
