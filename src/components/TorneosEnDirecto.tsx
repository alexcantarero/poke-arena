import Link from "next/link";
import type { Snapshot } from "@/lib/data";
import { roundsOf } from "@/lib/stats";
import { clasificacionDirecto, enDirecto, type FilaDirecto } from "@/lib/enDirecto";
import { todayISO } from "@/lib/format";
import { maxRondasDe, umbralesDe } from "@/lib/estructura";
import { cpKindOf, tablaDePremios } from "@/lib/cp";
import { Avatar, TournamentEmblem } from "@/components/ui";
import { Icon } from "@/components/icons";
import { tr, trf, type Lang } from "@/lib/i18n";

/* =========================================================================
   v0.108 — En el Inicio: los torneos que se están jugando HOY y cómo va el
   grupo en cada uno (ranking IRL), con el récord ronda a ronda. Cada fila y el
   título llevan a la ficha del torneo; el botón grande, al modo directo.

   Solo sale si hay algún torneo en directo con alguien del grupo dentro: un
   día sin torneos, el Inicio no cambia.
   ========================================================================= */
const MAX_FILAS = 6;

export function TorneosEnDirecto({ snap, meId, lang }: { snap: Snapshot; meId: string | null; lang: Lang }) {
  const hoy = todayISO();
  const vivos = snap.tournaments.filter((t) => enDirecto(t, hoy));
  const bloques = vivos.map((t) => {
    const ids = new Set<string>([
      ...t.results.map((r) => r.playerId),
      ...snap.matches.filter((m) => m.tournamentId === t.id && !m.playerBId).map((m) => m.playerAId),
    ]);
    const filas: FilaDirecto[] = [...ids].map((pid) => ({
      playerId: pid,
      rondas: roundsOf(snap.matches, t.id, pid).map((r) => (r.result === "d" ? "t" : r.result)),
      dropped: Boolean(t.results.find((r) => r.playerId === pid)?.dropped),
    }));
    return { t, tabla: clasificacionDirecto(filas) };
  }).filter((b) => b.tabla.length > 0);
  if (!bloques.length) return null;

  return (
    <section className="card mb-4 overflow-hidden border-loss/40" aria-labelledby="directo-titulo">
      <div className="card-head">
        <h2 id="directo-titulo" className="flex items-center gap-2 text-lg font-bold">
          <span className="directo-punto" aria-hidden="true" /> {tr(lang, "dir.titulo")}
        </h2>
        <span className="text-xs text-muted">{tr(lang, "dir.sub")}</span>
      </div>
      <div className="grid gap-px bg-line-soft md:grid-cols-2">
        {bloques.map(({ t, tabla }) => {
          const estoy = meId != null && tabla.some((f) => f.playerId === meId);
          const ronda = Math.max(0, ...tabla.map((f) => f.ultima));
          return (
            <article key={t.id} className="flex min-w-0 flex-col bg-surface">
              <Link href={`/torneos/${t.id}`} className="flex items-center gap-2 px-4 pt-3 hover:text-info">
                <TournamentEmblem kind={t.kind} scope={t.scope} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-bold">{t.name}</span>
                  <span className="block text-[11px] text-muted">
                    {trf(lang, "dir.ronda", { n: ronda })}{t.playerCount ? ` · ${trf(lang, "dir.jugadores", { n: t.playerCount })}` : ""}
                  </span>
                </span>
              </Link>
              <ol className="mt-2 divide-y divide-line-soft">
                {tabla.slice(0, MAX_FILAS).map((f) => {
                  const p = snap.playersById.get(f.playerId);
                  return (
                    <li key={f.playerId}>
                      <Link href={`/torneos/${t.id}`}
                        className={`flex items-center gap-2 px-4 py-2 hover:bg-surface-2 ${f.playerId === meId ? "bg-brand-soft/40" : ""} ${f.dropped ? "opacity-60" : ""}`}>
                        <span className="w-5 flex-none text-center font-display text-xs font-black tabular text-muted">{f.puesto}</span>
                        {p && <Avatar player={p} size="sm" />}
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p?.name ?? "?"}</span>
                        <span className="flex flex-none gap-0.5" aria-hidden="true">
                          {f.rondas.slice(-6).map((r, i) => (
                            <i key={i} className={`size-2 rounded-full ${r === "w" ? "bg-win" : r === "l" ? "bg-loss" : r === "t" ? "bg-tie" : "bg-surface-3"}`} />
                          ))}
                        </span>
                        <span className="w-16 flex-none text-right font-mono text-xs tabular">
                          <b className="text-win">{f.w}</b>-<span className="text-loss">{f.l}</span>-<span className="text-tie">{f.t}</span>
                        </span>
                        <span className="w-10 flex-none text-right font-display text-sm font-extrabold tabular">{f.puntos}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
              {tabla.length > MAX_FILAS && (
                <p className="px-4 pt-1 text-[11px] text-muted">{trf(lang, "dir.mas", { n: tabla.length - MAX_FILAS })}</p>
              )}
              <div className="mt-auto flex flex-wrap gap-2 p-3">
                {estoy && (
                  /* v0.126 — al modo torneo: es la pantalla hecha para apuntar la ronda. */
                  <Link href={`/torneos/${t.id}/modo`} className="btn btn-brand min-h-12 flex-1 text-base">
                    <Icon name="plus" className="size-5" /> {tr(lang, "dir.apuntar")}
                  </Link>
                )}
                <Link href={`/torneos/${t.id}`} className="btn min-h-12 flex-1">{tr(lang, "dir.verTorneo")}</Link>
              </div>
            </article>
          );
        })}
        {/* v0.136 — con un número impar de torneos, la mitad derecha se quedaba vacía:
            ahí va el panel del último, con lo que importa entre ronda y ronda. */}
        {bloques.length % 2 === 1 && (() => {
          const { t, tabla } = bloques[bloques.length - 1];
          return <PanelDirecto t={t} tabla={tabla} meId={meId} season={t.season ?? snap.config.cpSeason} lang={lang} />;
        })()}
      </div>
    </section>
  );
}

/* v0.136 — El panel de datos del torneo en directo: ronda actual y cuántas
   quedan, el récord que hace falta para el corte, lo que da cada puesto en CP
   y, si juegas tú, tus puntos y lo que te falta. Todo de tablas que ya existen
   (`estructura.ts`, `cp.ts`): nada nuevo que pueda contradecir a la ficha. */
function PanelDirecto({ t, tabla, meId, season, lang }: {
  t: Snapshot["tournaments"][number]; tabla: ReturnType<typeof clasificacionDirecto>; meId: string | null; season: number; lang: Lang;
}) {
  const ronda = Math.max(0, ...tabla.map((f) => f.ultima));
  const total = t.rounds ?? maxRondasDe({ kind: t.kind, playerCount: t.playerCount, rounds: t.rounds, topCut: t.topCut });
  const umbrales = t.playerCount ? umbralesDe(t.playerCount, t.kind) : null;
  const corte = umbrales?.corte ?? null;
  const premios = tablaDePremios(season, cpKindOf(t), t.playerCount);
  const yo = meId ? tabla.find((f) => f.playerId === meId) : undefined;
  const meFaltan = yo && corte ? Math.max(0, corte.puntos - yo.puntos) : null;
  const Dato = ({ k, v, sub }: { k: string; v: string; sub?: string }) => (
    <div className="rounded-lg border border-line-soft p-3">
      <p className="label">{k}</p>
      <p className="font-display text-2xl font-black tabular">{v}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
  return (
    <article className="flex min-w-0 flex-col gap-3 bg-surface p-4">
      <div className="grid grid-cols-2 gap-2">
        <Dato k={tr(lang, "v136.dir.ronda")} v={total ? `${ronda}/${total}` : String(ronda)}
          sub={total ? trf(lang, "v136.dir.quedan", { n: Math.max(0, total - ronda) }) : undefined} />
        <Dato k={tr(lang, "v136.dir.corte")} v={corte ? corte.record : "—"}
          sub={corte ? trf(lang, "v136.dir.corteSub", { p: corte.puntos, c: umbrales?.estructura.topCut ?? 0 }) : tr(lang, "v136.dir.sinAsistencia")} />
        {yo && (
          <Dato k={tr(lang, "v136.dir.tu")} v={`${yo.puntos} pts`}
            sub={meFaltan == null ? undefined : meFaltan === 0 ? tr(lang, "v136.dir.dentro") : trf(lang, "v136.dir.teFaltan", { n: meFaltan })} />
        )}
        <Dato k={tr(lang, "v136.dir.grupo")} v={String(tabla.length)}
          sub={trf(lang, "v136.dir.grupoSub", { n: tabla.filter((f) => !f.dropped).length })} />
      </div>
      {premios && (
        <div>
          <p className="label mb-1.5">{tr(lang, "v131.premios")}</p>
          <div className="premios-cp">
            {premios.filas.filter((f) => f.cobra).slice(0, 6).map((f) => (
              <div key={f.from} data-cobra="true">
                <b className="text-win">{f.cp}</b>
                <span>{f.from === f.to ? `${f.from}.º` : `${f.from}–${f.to}.º`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-2">
        <Link href={`/torneos/${t.id}/preparacion`} className="btn btn-sm">{tr(lang, "v129.preparar")}</Link>
        <Link href={`/herramientas?h=suiza&tipo=${encodeURIComponent(cpKindOf(t))}&jug=${t.playerCount ?? 0}&v=${yo?.w ?? 0}&d=${yo?.l ?? 0}&e=${yo?.t ?? 0}&t=${season}`} className="btn btn-sm">
          {tr(lang, "v131.calculadora")}
        </Link>
        <Link href="/herramientas?h=premios" className="btn btn-sm">{tr(lang, "v136.premiosTool")}</Link>
      </div>
    </article>
  );
}
