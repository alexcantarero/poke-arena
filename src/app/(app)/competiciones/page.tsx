import Link from "next/link";
import { compPlayers, currentPlayer, loadSnapshot } from "@/lib/data";
import { canManageLeague } from "@/lib/auth";
import { isPlayed, standings } from "@/lib/stats";
import { fmtDate, pct, todayISO, wrColor } from "@/lib/format";
import { actividadTexto, diasEntre, ordenarCompeticiones, partidasEsperadas, progresoLiga } from "@/lib/resumenLiga";
import { COMPETITION_KINDS, type CompetitionKind } from "@/lib/types";
import { Empty, PageHead, PlayerTag, Record } from "@/components/ui";
import { CompetitionForm } from "@/components/CompetitionForm";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Liga" };

export default async function CompetitionsPage() {
  const lng = await getLang(); // v0.49

  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  const played = snap.matches.filter(isPlayed);
  const manager = me ? canManageLeague(me.role) : false;

  return (
    <>
      <PageHead
        title={tr(lng, "x.942efd43")}
        sub={tr(lng, "x.748f9484")}
      />

      {/* v0.25: sin gráfica de Elo en la Liga (queda en el Ranking). */}

      {snap.competitions.length ? (
        <div className="mb-6 flex flex-col gap-4">
          {/* v0.43 — en curso primero; antes salían en el orden de la base. */}
          {ordenarCompeticiones(snap.competitions).map((c) => {
            const rows = played.filter((m) => m.competitionId === c.id);
            const jugadores = compPlayers(snap, c.id);
            const table = standings(rows, jugadores, snap.elo.rating, snap.config);
            const conPartidas = table.filter((r) => r.played > 0);
            const kind = COMPETITION_KINDS[c.kind as CompetitionKind] ?? COMPETITION_KINDS.league;
            const cerrada = c.status === "done";

            /* v0.43 — lo que se quiere saber de un vistazo y no salía: cuánto
               falta para acabar (solo en todos contra todos, que es donde hay
               un número fijo) y si la liga sigue viva. */
            const progreso = progresoLiga(rows.length, partidasEsperadas(c.kind, jugadores.length, c.modality));
            const ultima = rows.reduce<string | null>((max, m) => (!max || m.date > max ? m.date : max), null);

            return (
              <section className="card" key={c.id}>
                <div className="card-head">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{kind.name}</div>
                    {/* El título también lleva a la liga: buscar el botón «Abrir»
                        en la esquina era un paso de más en el móvil. */}
                    <Link href={`/competiciones/${c.id}`} className="block truncate text-lg font-bold hover:underline">
                      {c.name}
                    </Link>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <span className={`chip ${cerrada ? "" : "chip-win"}`}>{cerrada ? "Cerrada" : tr(lng, "x.f9ade367")}</span>
                    <Link className="btn btn-sm" href={`/competiciones/${c.id}`}>{tr(lng, "x.bf763df7")}</Link>
                  </div>
                </div>

                {/* El «líder» de antes repetía al primero de la tabla de abajo.
                    En su sitio va cuándo se jugó por última vez. */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5 text-xs text-muted">
                  <span>{jugadores.length} jugadores</span>
                  <span>Bo{c.bestOf}</span>
                  <span>desde {fmtDate(c.start)}</span>
                  {ultima && !cerrada && <span>última partida {actividadTexto(diasEntre(ultima, todayISO()))}</span>}
                </div>

                {progreso ? (
                  <div className="px-4 pb-3">
                    <div className="mb-1 flex items-baseline justify-between text-xs">
                      <span className="text-muted">
                        <b className="tabular text-ink">{progreso.jugadas}</b> de {progreso.esperadas} partidas
                      </span>
                      <span className="tabular text-muted">{pct(progreso.fraccion, 0)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"
                      role="progressbar" aria-valuemin={0} aria-valuemax={progreso.esperadas} aria-valuenow={progreso.jugadas}
                      aria-label={`${progreso.jugadas} de ${progreso.esperadas} partidas jugadas`}>
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(progreso.fraccion * 100).toFixed(1)}%` }} />
                    </div>
                  </div>
                ) : (
                  <p className="px-4 pb-3 text-xs text-muted">{rows.length} partidas jugadas</p>
                )}

                {conPartidas.length ? (
                  <ol className="divide-y divide-line-soft border-t border-line-soft">
                    {/* v0.44 — sin la columna de puntos, a petición: en el resumen no
                        aporta y la clasificación completa ya los enseña al entrar. */}
                    <li className="flex items-center gap-3 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted" aria-hidden="true">
                      <span className="w-5 flex-none" />
                      <span className="flex-1">{tr(lng, "x.588eb828")}</span>
                      <span className="hidden w-16 text-right xs:block">{tr(lng, "x.e5f65dc6")}</span>
                      <span className="w-8 text-right">{tr(lng, "x.a87fe3dd")}</span>
                      <span className="w-12 text-right">{tr(lng, "x.39683ef7")}</span>
                    </li>
                    {conPartidas.slice(0, 5).map((r, i) => (
                      <li key={r.playerId} className="flex items-center gap-3 px-4 py-2">
                        <span className={`w-5 flex-none text-center font-display font-extrabold tabular ${i === 0 ? "text-brand" : "text-muted"}`}>{i + 1}</span>
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <PlayerTag player={snap.playersById.get(r.playerId)} size="sm" className="min-w-0" />
                          {cerrada && i === 0 && <span className="chip chip-brand flex-none text-[10px]">{tr(lng, "x.c4274e98")}</span>}
                        </span>
                        <span className="hidden w-16 justify-end xs:flex"><Record w={r.wins} d={r.ties} l={r.losses} /></span>
                        {/* El %V lleva al lado sobre cuántas partidas: un 100 %
                            sobre una no es un 100 % sobre diez.
                            v0.66 — en su propia columna (PJ) y no apilado bajo el
                            %: en una línea se lee de un vistazo y no se aprieta. */}
                        <span className="w-8 text-right font-mono text-xs tabular text-muted">{r.played}</span>
                        <span className="w-12 text-right font-mono text-xs font-semibold tabular" style={{ color: wrColor(r.winRate) }}>{pct(r.winRate, 0)}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="border-t border-line-soft px-4 py-3 text-sm text-muted">{tr(lng, "x.8a42f06a")}</p>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card mb-6"><Empty title={tr(lng, "x.216a4f59")}>{tr(lng, "x.a405d648")}</Empty></div>
      )}

      {/* v0.18 — plegado por defecto (abierto solo si todavía no hay ninguna). */}
      {manager && (
        <details className="mb-6" open={snap.competitions.length === 0}>
          {/* El formulario ya trae sus propias tarjetas: aquí solo la cabecera es tarjeta. */}
          <summary className="card tap mb-3 cursor-pointer justify-between px-4 font-display text-lg font-bold">
            <span className="flex items-center gap-2">
              <span aria-hidden="true">+</span> {tr(lng, "x.4938a56c")}
            </span>
            <span className="text-xs font-normal text-muted">{tr(lng, "x.4e9effbb")}</span>
          </summary>
          <CompetitionForm players={snap.players} />
        </details>
      )}
    </>
  );
}
