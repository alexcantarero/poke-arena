import Link from "next/link";
import { notFound } from "next/navigation";
import { canManageLeague, readSession } from "@/lib/auth";
import { compPlayers, deckOptions, archetypeOptions, leagueDecksOf, leagueDeckSubmitters, loadSnapshot, teamsOf } from "@/lib/data";
import { deleteTeam, saveTeam, resultadoRapido } from "@/actions";
import { MODALIDADES, TAM_EQUIPO, asModalidad, clasificacionEquipos, jornadaEquipos, partidasDeDuelo } from "@/lib/modalidades";
import {
  outcome,
} from "@/lib/stats";
import { suggestedRounds } from "@/lib/sugerencias";
import { marcadoresDe } from "@/lib/marcador";
import { DeckPicker } from "@/components/DeckPicker";
import { submitLeagueDeck, unlockLeagueDeck } from "@/actions";
import { fmtDate } from "@/lib/format";
import { applyMatchFilter, parseMatchFilter, type FilterIndex } from "@/lib/filters";
import {
  archetypesOfMatch,
  isPlayed,
  pairRound,
  standings,
} from "@/lib/stats";
import { pct, wrColor } from "@/lib/format";
import { COMPETITION_KINDS, type CompetitionKind } from "@/lib/types";
import {
  Avatar,
  Empty,
  MatchCard,
  MatchList,
  PageHead,
  PlayerTag,
  SectionTitle,
} from "@/components/ui";
import { CompetitionForm } from "@/components/CompetitionForm";
import { FilterPanel } from "@/components/FilterPanel";
import { createPairings } from "@/actions";
import { Icon } from "@/components/icons";
import { LigaStats } from "@/components/LigaStats";
import { ConfirmButton } from "@/components/ConfirmButton";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export default async function CompetitionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const lng = await getLang(); // v0.49

  const { id } = await params;
  const query = await searchParams;
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  const comp = snap.compsById.get(id);
  if (!comp) notFound();

  const me = session ? snap.playersById.get(session.playerId) : undefined;
  const manager = me ? canManageLeague(me.role) : false;

  const ids = compPlayers(snap, id);
  const inComp = snap.matches.filter((m) => m.competitionId === id);
  const playedAll = inComp.filter(isPlayed);
  
  const index: FilterIndex = {
    tournamentKind: new Map(snap.tournaments.map((t) => [t.id, t.kind])),
    tournamentFormat: new Map(snap.tournaments.map((t) => [t.id, t.format])),
    tournamentScope: new Map(snap.tournaments.map((t) => [t.id, t.scope])),
    competitionKind: new Map(snap.competitions.map((c) => [c.id, c.kind])),
    archetypesOf: (m) => {
      const { a, b } = archetypesOfMatch(m, snap.archIndex, snap.archById);
      return [a?.id, b?.id];
    },
  };
  const filter = parseMatchFilter(query);
  const played = applyMatchFilter(playedAll, filter, index);

  const pending = inComp.filter((m) => m.status === "scheduled");
  const table = standings(played, ids, snap.elo.rating, snap.config);
  const isLeague = comp.kind === "league";
  const archetypesByPlayer = new Map<string, Set<string>>();
  for (const match of played) {
    const { a, b } = archetypesOfMatch(match, snap.archIndex, snap.archById);
    if (a) {
      const used = archetypesByPlayer.get(match.playerAId) ?? new Set<string>();
      used.add(a.id);
      archetypesByPlayer.set(match.playerAId, used);
    }
    if (b && match.playerBId) {
      const used = archetypesByPlayer.get(match.playerBId) ?? new Set<string>();
      used.add(b.id);
      archetypesByPlayer.set(match.playerBId, used);
    }
  }
  const nextRound = Math.max(0, ...inComp.map((m) => m.round)) + 1;
  /* v0.44 — `inComp` y no `played`: la acción que crea la jornada recibe
     todas las partidas de la competición, y la vista previa recibía solo las
     jugadas. Lo que se enseñaba podía no ser lo que se creaba al pulsar. */
  const previewLiga = pairRound(comp.kind, ids, inComp, snap.elo.rating, snap.config);
  const kind =
    COMPETITION_KINDS[comp.kind as CompetitionKind] ?? COMPETITION_KINDS.league;

  // v0.23: modalidad y, si es por equipos, los equipos.
  const modalidad = asModalidad(comp.modality);
  const infoModalidad = MODALIDADES[modalidad];
  const equipos = modalidad === "equipos" ? await teamsOf(id) : [];
  const equiposCompletos = equipos.filter((e) => e.members.length === TAM_EQUIPO).sort((a, b) => a.id.localeCompare(b.id));
  const equipoById = new Map(equipos.map((e) => [e.id, e]));
  const tablaEquipos = modalidad === "equipos"
    ? clasificacionEquipos(equipos, played.map((m) => ({
        round: m.round, playerAId: m.playerAId, playerBId: m.playerBId,
        winner: outcome(m).winner as "a" | "b" | "tie" | null,
      })))
    : [];
  const previewEquipos = modalidad === "equipos" ? jornadaEquipos(equiposCompletos.map((e) => e.id), nextRound) : null;
  const enEquipo = new Set(equipos.flatMap((e) => e.members));
  // En una liga por equipos, la jornada son los duelos: 3 partidas por cruce.
  const preview = previewEquipos
    ? {
        pairs: previewEquipos.cruces.flatMap(([a, b]) => partidasDeDuelo(equipoById.get(a)!, equipoById.get(b)!)),
        bye: null as string | null,
        repetidos: 0,
      }
    : previewLiga;

  return (
    <>
      <PageHead
        title={comp.name}
        sub={`${kind.name} · Bo${comp.bestOf} · ${ids.length} jugadores${comp.kind === "swiss" ? ` · ${comp.rounds || suggestedRounds(ids.length)} rondas` : ""}`}
        actions={
          <Link className="btn btn-ghost btn-sm" href="/competiciones">
            <Icon name="back" className="size-4" /> {tr(lng, "x.8a3c3440")}
          </Link>
        }
      />

            <FilterPanel
        action={`/competiciones/${id}`}
        filter={filter}
        show={["date", "player", "archetype", "round"]}
        archetypes={snap.archetypes.map((a) => ({ value: a.id, label: a.name }))}
        players={snap.players.map((p) => ({ value: p.id, label: p.name }))}
      />

      <section className="card mb-4 overflow-hidden">
        <div className="card-head items-center">
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">{tr(lng, "x.759a2fe7")}</h2>
            <p className="mt-0.5 text-xs text-muted">{tr(lng, "x.43ccd295")}</p>
          </div>
          <span className="flex-none rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[11px] font-semibold tabular text-ink-2">
            {ids.length} jugadores · {played.length} partidas
          </span>
        </div>
        {table.some((r) => r.played) ? (
          <>
          <div aria-hidden="true" className="hidden grid-cols-[2.5rem_minmax(10rem,1fr)_4rem_3rem_4rem_4rem_4.5rem_4rem_3.5rem] items-center gap-2 border-y border-line-soft bg-surface-2/70 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted lg:grid">
            <span className="text-center">#</span><span>{tr(lng, "x.588eb828")}</span>
            <span className="text-right">{isLeague ? "V–D" : tr(lng, "x.e5f65dc6")}</span><span className="text-right">{tr(lng, "x.a87fe3dd")}</span><span className="text-right">{tr(lng, "x.39683ef7")}</span>
            <span className="text-right">{tr(lng, "x.68d5ae81")}</span><span className="text-right">{tr(lng, "x.81e206f8")}</span><span className="text-right">{tr(lng, "x.795bcbb1")}</span>
            <span className="text-right" title={tr(lng, "x.2276068c")}>{tr(lng, "x.4afdaaa4")}</span>
          </div>
          <ol className="divide-y divide-line-soft">
            {table.map((r, i) => {
              const isTop1 = i === 0;
              const isTop2 = i === 1;
              const isTop3 = i === 2;
              const playerWinRate = isLeague
                ? (r.wins + r.losses ? r.wins / (r.wins + r.losses) : null)
                : r.winRate;
              const archetypeCount = archetypesByPlayer.get(r.playerId)?.size ?? 0;
              const rowBg = isTop1
                ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--brand-soft)_60%,transparent),transparent_85%)] border-l-[3px] border-l-brand"
                : isTop2
                ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--surface-3)_70%,transparent),transparent_85%)] border-l-[3px] border-l-line"
                : isTop3
                ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--tier-bronce)_25%,transparent),transparent_85%)] border-l-[3px] border-l-tier-bronce"
                : "border-l-[3px] border-l-transparent hover:bg-surface-2/60";

              return (
                <li
                  key={r.playerId}
                  className={`grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 px-3 py-2.5 transition-[background-color,box-shadow] duration-200 hover:shadow-sm sm:px-4 lg:grid-cols-[2.5rem_minmax(10rem,1fr)_4rem_3rem_4rem_4rem_4.5rem_4rem_3.5rem] lg:gap-2 ${rowBg}`}
                >
                  {isTop1 ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-brand/20 font-display text-xs font-black text-brand ring-1 ring-brand/40 shadow-xs md:mx-auto">
                      1
                    </span>
                  ) : isTop2 ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-surface-3 font-display text-xs font-black text-ink-2 ring-1 ring-line shadow-xs md:mx-auto">
                      2
                    </span>
                  ) : isTop3 ? (
                    <span className="flex size-6 items-center justify-center rounded-full bg-tier-bronce/20 font-display text-xs font-black text-tier-bronce ring-1 ring-tier-bronce/40 shadow-xs md:mx-auto">
                      3
                    </span>
                  ) : (
                    <span className="flex size-6 items-center justify-center font-display text-xs font-bold tabular text-muted md:mx-auto">
                      {i + 1}
                    </span>
                  )}
                  <PlayerTag
                    player={snap.playersById.get(r.playerId)}
                    size="sm"
                    className="min-w-0 flex-1 font-semibold text-ink"
                  />
                  <span className="hidden text-right font-mono text-xs font-semibold tabular lg:block">
                    <span className="text-win">{r.wins}</span>–<span className="text-loss">{r.losses}</span>
                    {!isLeague && r.ties > 0 && <>–<span className="text-tie">{r.ties}</span></>}
                  </span>
                  <span
                    className="hidden text-right font-mono text-xs tabular text-ink-2 lg:block"
                    title={`${r.played} partidas jugadas`}
                  >
                    {r.played}
                  </span>
                  <span
                    className="hidden text-right font-mono text-xs font-bold tabular lg:block"
                    style={{ color: wrColor(playerWinRate) }}
                  >
                    {pct(playerWinRate, 0)}
                  </span>
                  <span className="hidden text-right font-mono text-xs tabular text-muted lg:block" title={tr(lng, "x.268ccc58")}>
                    {pct(r.resistance, 0)}
                  </span>
                  <span className="hidden text-right font-mono text-xs tabular lg:block" title={tr(lng, "x.af8f1fcb")}>
                    <span className="text-win">{r.gameWins}</span>–<span className="text-loss">{r.gameLosses}</span>
                  </span>
                  <span className="hidden text-right font-mono text-xs font-semibold tabular lg:block" style={{ color: wrColor(r.gameWinRate) }}>
                    {pct(r.gameWinRate, 0)}
                  </span>
                  <span className="hidden text-right font-mono text-xs tabular text-ink-2 lg:block" title={`${archetypeCount} arquetipos distintos`}>
                    {archetypeCount}
                  </span>
                  <span className="hidden text-right font-mono text-xs tabular text-muted md:block lg:hidden" title={`${archetypeCount} arquetipos distintos`}>{archetypeCount}</span>
                </li>
              );
            })}
          </ol>
          </>
        ) : (
          <Empty title={tr(lng, "x.8d421035")} />
        )}
      </section>

      {/* v0.23 — modalidad de la liga */}
      <div className="card tile-status mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
        style={{ ["--status" as string]: "var(--brand)" }}>
        <span className="meta-kv"><b>{tr(lng, "x.5d1db402")}</b></span>
        <span className="font-bold">{infoModalidad.label}</span>
        <span className="text-xs text-muted">{infoModalidad.hint}</span>
      </div>

      {/* v0.19 — gráficos y cifras de esta competición. */}
      <LigaStats
        matches={played}
        playersById={snap.playersById}
        titulo={tr(lng, "x.53d35418")}
        archIndex={snap.archIndex}
        archById={snap.archById}
      />

      {/* v0.24: fuera la entrega y el bloqueo de mazos de liga. Los mazos se
          apuntan en cada partida, y vale cualquier mazo o arquetipo. */}

      {/* ------------------- v0.23: equipos (duelo por equipos) ------------------- */}
      {modalidad === "equipos" && (
        <section className="card mb-4 min-w-0">
          <div className="card-head">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{tr(lng, "x.6cdcea47")}</h2>
              <p className="text-xs text-muted">{tr(lng, "x.94d11304")}</p>
            </div>
            <span className="flex-none text-xs text-muted tabular">{equiposCompletos.length} completos</span>
          </div>
          {equipos.length ? (
            <ol className="divide-y divide-line-soft">
              {tablaEquipos.map((f, i) => {
                const e = equipoById.get(f.teamId)!;
                return (
                  <li key={e.id} className="flex flex-col gap-2 px-3 py-3 xs:px-4 sm:flex-row sm:items-center">
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="w-6 flex-none text-center font-display text-lg font-extrabold tabular">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{e.name}</span>
                        <span className="flex flex-wrap gap-x-3 gap-y-1">
                          {e.members.map((m, k) => (
                            <Link key={m} href={`/perfil/${m}`} className="inline-flex items-center gap-1 text-xs hover:text-info">
                              <span className="meta-kv"><b>{k + 1}</b></span>
                              <Avatar player={snap.playersById.get(m)} size="sm" />
                              {snap.playersById.get(m)?.name ?? "—"}
                            </Link>
                          ))}
                          {e.members.length < TAM_EQUIPO && <span className="chip chip-dot text-[10px] text-loss">{tr(lng, "x.4a6bcf02")}</span>}
                        </span>
                      </span>
                    </span>
                    <span className="flex flex-none items-center gap-4 pl-9 text-sm sm:pl-0">
                      <span className="text-center font-mono text-xs tabular">
                        <span className="text-win">{f.ganados}</span>–<span className="text-loss">{f.perdidos}</span>–<span className="text-tie">{f.empatados}</span>
                        <span className="block text-[10px] text-muted">{tr(lng, "x.72227507")}</span>
                      </span>
                      <span className="text-center font-mono text-xs tabular">{f.victorias}–{f.derrotas}<span className="block text-[10px] text-muted">{tr(lng, "x.18fd2bbc")}</span></span>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="px-4 py-4 text-sm text-muted">Todavía no hay equipos. {manager ? "Créalos abajo." : tr(lng, "x.1dcf983c")}</p>
          )}

          {manager && (
            <details className="border-t border-line-soft">
              <summary className="tap cursor-pointer justify-between px-4 text-sm font-semibold">
                {tr(lng, "x.d28996ce")}
                <span className="text-[11px] font-normal text-muted">{tr(lng, "x.4e9effbb")}</span>
              </summary>
              <div className="flex flex-col gap-4 p-4">
                {[...equipos, null].map((e) => (
                  <form key={e?.id ?? "nuevo"} action={saveTeam} className="flex flex-col gap-2 rounded-md border border-line-soft p-3">
                    <input type="hidden" name="competitionId" value={comp.id} />
                    {e && <input type="hidden" name="teamId" value={e.id} />}
                    <input className="input" name="name" required maxLength={40}
                      defaultValue={e?.name ?? ""} placeholder={e ? "Nombre del equipo" : tr(lng, "x.45e4a32b")} />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {[0, 1, 2].map((k) => (
                        <select key={k} className="input" name={`member${k + 1}`} required defaultValue={e?.members[k] ?? ""}
                          aria-label={`Puesto ${k + 1}`}>
                          <option value="" disabled>Puesto {k + 1}</option>
                          {ids
                            .filter((pid) => !enEquipo.has(pid) || e?.members.includes(pid))
                            .map((pid) => <option key={pid} value={pid}>{snap.playersById.get(pid)?.name ?? pid}</option>)}
                        </select>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-brand btn-sm" type="submit">{e ? "Guardar equipo" : tr(lng, "x.9663417d")}</button>
                      {e && (
                        <button className="btn btn-ghost btn-sm text-loss" type="submit" formAction={deleteTeam} formNoValidate>
                          {tr(lng, "x.d7b82b21")}
                        </button>
                      )}
                    </div>
                  </form>
                ))}
                <p className="text-xs text-muted">
                  {tr(lng, "x.3c106a88")}
                </p>
              </div>
            </details>
          )}
        </section>
      )}

      {/* v0.18 — `grid-cols-1` explícito y `min-w-0` en cada tarjeta: sin ellos,
          en el móvil la columna implícita se ensanchaba con el contenido (la
          pista «Round robin…», los nombres largos) y la tarjeta se salía de la
          pantalla por la derecha, cortando «Crear partidas» y «Anotar». */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card min-w-0">
          <div className="card-head">
            <h2 className="flex-none text-lg font-bold">Jornada {nextRound}</h2>
            <span className="min-w-0 truncate text-right text-xs text-muted" title={kind.hint}>{kind.hint}</span>
          </div>
          <div className="p-3 xs:p-4">
            {preview.pairs.length ? (
              <>
                {previewEquipos && (
                  <p className="mb-2 text-xs text-muted">
                    {previewEquipos.cruces.map(([a, b]) => `${equipoById.get(a)?.name} vs ${equipoById.get(b)?.name}`).join(" · ")}
                    {previewEquipos.descansa ? ` · descansa ${equipoById.get(previewEquipos.descansa)?.name}` : ""}
                    {" "}— tres partidas por duelo, puesto contra puesto.
                  </p>
                )}
                <ul className="mb-3 divide-y divide-line-soft rounded-xl border border-line">
                  {preview.pairs.map(([a, b], i) => {
                    const A = snap.playersById.get(a),
                      B = snap.playersById.get(b);
                    return (
                      <li
                        key={`${a}-${b}`}
                        className="flex items-center gap-1.5 px-2 py-2.5 xs:gap-2 xs:px-3"
                      >
                        <span className="w-5 flex-none text-center font-mono text-xs text-muted">
                          {i + 1}
                        </span>
                        <Link href={`/perfil/${a}`} className="flex min-w-0 flex-1 items-center justify-end gap-2 hover:text-info">
                          <span className="truncate text-sm">{A?.name}</span>
                          <Avatar player={A} size="sm" />
                        </Link>
                        <span className="flex-none font-display text-xs font-bold text-muted">
                          VS
                        </span>
                        <Link href={`/perfil/${b}`} className="flex min-w-0 flex-1 items-center gap-2 hover:text-info">
                          <Avatar player={B} size="sm" />
                          <span className="truncate text-sm">{B?.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                  {preview.bye && (
                    <li className="flex items-center gap-2 px-3 py-2.5">
                      <span className="w-5 flex-none text-center text-xs text-muted">
                        —
                      </span>
                      <PlayerTag
                        player={snap.playersById.get(preview.bye)}
                        size="sm"
                        className="flex-1"
                      />
                      <span className="chip chip-brand">{tr(lng, "x.7399cdb9")}</span>
                    </li>
                  )}
                </ul>
                {/* v0.44 — si ya no queda ninguna combinación sin repetir (todos han
                    jugado contra todos: segunda vuelta), la jornada se genera igual,
                    pero se dice. Antes repetía en silencio y desde la jornada 4. */}
                {preview.repetidos > 0 && (
                  <p className="mb-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
                    Ya no quedan cruces nuevos: esta jornada repite{" "}
                    <b className="text-ink">{preview.repetidos}</b>{" "}
                    {preview.repetidos === 1 ? "enfrentamiento" : "enfrentamientos"}. Es la segunda vuelta.
                  </p>
                )}
                {manager ? (
                  <form action={createPairings}>
                    <input type="hidden" name="competitionId" value={comp.id} />
                    <button className="btn btn-brand w-full" type="submit">
                      Crear {preview.pairs.length} partidas pendientes
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-muted">
                    {tr(lng, "x.b98489c9")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">
                {tr(lng, "x.1830409f")}
              </p>
            )}
          </div>
        </section>

        <section className="card min-w-0">
          <div className="card-head">
            <h2 className="text-lg font-bold">{tr(lng, "x.eaf186d9")}</h2>
            <span className="text-xs text-muted">{pending.length}</span>
          </div>
          {pending.length ? (
            <ul className="divide-y divide-line-soft">
              {pending.map((m) => {
                const nA = snap.playersById.get(m.playerAId)?.name ?? "A";
                const nB = m.playerBId ? snap.playersById.get(m.playerBId)?.name ?? "B" : m.opponentName ?? "?";
                return (
                <li key={m.id} className="px-3 py-2 xs:px-4">
                  {/* v0.54 — resultado RÁPIDO desde la lista: un toque y guardado, sin
                      abrir el formulario. Son formularios normales: funcionan sin
                      JavaScript. El formulario completo sigue a un toque, «Más detalle». */}
                  <details className="group">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 xs:gap-3">
                      <span className="chip flex-none">J{m.round}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {nA} <span className="text-muted">vs</span> {nB}
                      </span>
                      <span className="btn btn-brand btn-sm flex-none px-3">{tr(lng, "rr.apuntar")}</span>
                    </summary>
                    <form action={resultadoRapido} className="mt-2 flex flex-col gap-2 pb-1">
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="volver" value={`/competiciones/${comp.id}`} />
                      <div className="grid grid-cols-2 gap-2 xs:grid-cols-4">
                        {marcadoresDe(m.bestOf).map(([a, b]) => (
                          <button key={`${a}-${b}`} type="submit" name="marcador" value={`${a}-${b}`}
                            className={`flex min-h-12 flex-col items-center justify-center rounded-xl border-2 border-line-soft bg-surface-2 px-2 py-1.5 ${a > b ? "hover:border-win" : "hover:border-loss"}`}>
                            <span className={`font-display text-xl font-extrabold tabular ${a > b ? "text-win" : "text-loss"}`}>{a}–{b}</span>
                            <span className="max-w-full truncate text-[11px] text-muted">{a > b ? nA : nB}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" name="marcador" value="empate"
                          className="flex-1 rounded-xl border-2 border-line-soft bg-surface-2 px-3 py-2 text-sm font-semibold text-muted hover:border-tie">
                          {tr(lng, "rr.empateTiempo")}
                        </button>
                        <Link href={`/partidas/${m.id}`} className="btn btn-sm flex-none self-center">{tr(lng, "rr.formulario")}</Link>
                      </div>
                    </form>
                  </details>
                </li>
                );
              })}
            </ul>
          ) : (
            <Empty title={tr(lng, "x.1554e971")} />
          )}
        </section>
      </div>

      {played.length > 0 && (
        <>
          <SectionTitle aside={`${played.length}`}>{tr(lng, "x.64f94394")}</SectionTitle>
          <div className="card mb-6">
            <MatchList>
              {played
                
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((m) => {
                    const archs = archetypesOfMatch(m, snap.archIndex, snap.archById);
                    return (
                    <MatchCard
                      key={m.id}
                      match={m}
                      playerA={snap.playersById.get(m.playerAId)}
                      playerB={
                        m.playerBId
                          ? snap.playersById.get(m.playerBId)
                          : undefined
                      }
                      archA={archs.a}
                      archB={archs.b}
                      context={m.round ? `Jornada ${m.round}` : undefined}
                    />
                  )})
}
            </MatchList>
          </div>
        </>
      )}

      {/* v0.18 — plegado por defecto: es una herramienta de vez en cuando y
          ocupaba media pantalla al final de cada liga. */}
      {manager && (
        <details className="mb-6">
          <summary className="card tap mb-3 cursor-pointer justify-between px-4 font-display text-lg font-bold">
            {tr(lng, "x.94dcc1c4")}
            <span className="text-xs font-normal text-muted">{tr(lng, "x.4e9effbb")}</span>
          </summary>
          <CompetitionForm
            competition={comp}
            players={snap.players}
            selectedPlayerIds={snap.playersOfComp.get(id) ?? []}
            canDelete={manager}
          />
        </details>
      )}
    </>
  );
}
