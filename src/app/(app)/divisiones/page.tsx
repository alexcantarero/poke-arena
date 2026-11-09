import Link from "next/link";
import { canManageLeague } from "@/lib/auth";
import { currentPlayer, loadPlayers, loadSnapshot } from "@/lib/data";
import { cargarLiga, ordenesAnteriores } from "@/lib/ligaTemporadaDb";
import { clasificarDivision, fechaJornada, movimientos, siguienteReparto, sortearDivisiones, todosContraTodos, type PartidaDivision } from "@/lib/ligaDivisiones";
import { isPlayed, outcome } from "@/lib/stats";
import { todayISO } from "@/lib/format";
import { Avatar, Empty, PageHead } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { apuntarmeLiga, borrarmeLiga, cerrarLiga, crearTemporadaLiga, empezarLiga, sortearLiga } from "@/actions";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import type { PublicPlayer } from "@/lib/types";

export const metadata = { title: "Liga por divisiones" };

/* =========================================================================
   v0.116 — Liga por divisiones.

   Una pantalla para las tres situaciones de una temporada:
     · sin temporada abierta: el organizador la crea (y sale el aviso a todos);
     · en inscripción: apuntarse, la lista de inscritos y, para el
       organizador, el sorteo (repetible) con el reparto a la vista antes de
       empezar;
     · en curso: las divisiones con enlace a su competición (clasificación,
       jornadas y resultados de siempre) y la lista de espera.
   ========================================================================= */

function Persona({ p }: { p: PublicPlayer | undefined }) {
  return (
    <li className="flex min-w-0 items-center gap-2 py-1.5">
      <Avatar player={p} size="sm" />
      <span className="truncate font-semibold text-ink">{p?.name ?? "?"}</span>
    </li>
  );
}

export default async function DivisionesPage() {
  const lng = await getLang();
  const [liga, me, jugadores] = await Promise.all([cargarLiga(), currentPlayer(), loadPlayers()]);
  const porId = new Map<string, PublicPlayer>(jugadores.map((p) => [p.id, p]));
  const manager = me ? canManageLeague(me.role) : false;

  if ("error" in liga) {
    return (
      <>
        <PageHead title={tr(lng, "v116.titulo")} sub={tr(lng, "v116.sub")} />
        <section className="card p-4 text-sm text-ink-2">{tr(lng, "v116.sinMigrar")}</section>
      </>
    );
  }

  const t = liga.temporada;
  const inscritos = liga.inscripciones.filter((i) => i.estado === "inscrito");
  const espera = liga.inscripciones.filter((i) => i.estado === "espera");
  const mia = me ? liga.inscripciones.find((i) => i.playerId === me.id) : undefined;
  /* Desde la 2.ª temporada, el reparto sale de la anterior (suben 2, bajan 2). */
  const previas = t?.estado === "inscripcion" ? await ordenesAnteriores() : null;
  /* En curso: la clasificación de cada división, con quién subiría y bajaría hoy. */
  let clasif: Array<{ nivel: number; competitionId: string; orden: string[]; pts: Record<string, string> }> = [];
  let pendientes = 0;
  if (t?.estado === "en_curso") {
    const snap = await loadSnapshot();
    clasif = liga.divisiones.map((d) => {
      const ids = liga.miembros[d.competitionId] ?? [];
      const ms = snap.matches.filter((m) => m.competitionId === d.competitionId);
      pendientes += ms.filter((m) => !isPlayed(m)).length;
      const partidas: PartidaDivision[] = ms.filter((m) => m.playerBId && isPlayed(m)).map((m) => {
        const o = outcome(m);
        return { a: m.playerAId, b: m.playerBId!, ga: o.ga, gb: o.gb, ganador: o.winner };
      });
      const filas = clasificarDivision(ids, partidas);
      return {
        nivel: d.nivel, competitionId: d.competitionId, orden: filas.map((f) => f.id),
        pts: Object.fromEntries(filas.map((f) => [f.id, `${f.puntos} pts · ${f.v}-${f.d}${f.e ? `-${f.e}` : ""}`])),
      };
    });
  }
  const mov = movimientos(clasif.map((c) => c.orden));

  return (
    <>
      <PageHead title={tr(lng, "v116.titulo")} sub={t ? t.nombre : tr(lng, "v116.sub")} />

      {liga.anterior?.campeonId && (
        <p className="liga-campeon mb-4">
          {trf(lng, "v116.campeonAnterior", { t: liga.anterior.nombre, n: porId.get(liga.anterior.campeonId)?.name ?? "?" })}
        </p>
      )}

      {/* ----------------------------------------------- sin temporada */}
      {!t && (
        <section className="card p-4">
          <Empty title={tr(lng, "v116.ninguna")}>{manager ? tr(lng, "v116.ningunaOrg") : tr(lng, "v116.ningunaJug")}</Empty>
          {manager && (
            <form action={crearTemporadaLiga} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="label">{tr(lng, "v116.nombre")}</span>
                <input className="input" name="nombre" maxLength={60} placeholder={tr(lng, "v116.nombreAyuda")} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label">{tr(lng, "v116.inicio")}</span>
                <input className="input" type="date" name="inicio" required defaultValue={fechaJornada(todayISO(), 2)} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label">{tr(lng, "v116.max")}</span>
                <input className="input" type="number" name="maxPorDivision" min={2} max={16} defaultValue={6} inputMode="numeric" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label">{tr(lng, "v116.formato")}</span>
                <select className="input" name="bestOf" defaultValue="3">
                  <option value="1">Bo1</option>
                  <option value="3">Bo3</option>
                  <option value="5">Bo5</option>
                </select>
              </label>
              <p className="text-xs text-muted sm:col-span-2">{tr(lng, "v116.crearAyuda")}</p>
              <button className="btn btn-brand sm:col-span-2" type="submit">{tr(lng, "v116.crear")}</button>
            </form>
          )}
        </section>
      )}

      {/* ----------------------------------------------- inscripción */}
      {t?.estado === "inscripcion" && (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <section className="card p-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{tr(lng, "v116.inscripcionAbierta")}</h2>
                <p className="text-sm text-muted">
                  {trf(lng, "v116.detalle", { f: t.inicio, m: t.maxPorDivision, b: t.bestOf })}
                </p>
              </div>
              {me && (mia
                ? <form action={borrarmeLiga}><button className="btn btn-ghost" type="submit">{tr(lng, "v116.borrarme")}</button></form>
                : <form action={apuntarmeLiga}><button className="btn btn-brand btn-gamer" type="submit">{tr(lng, "v116.apuntarme")}</button></form>)}
            </div>
            <h3 className="label mt-4">{trf(lng, "v116.inscritos", { n: inscritos.length })}</h3>
            {inscritos.length
              ? <ul className="grid grid-cols-1 gap-x-4 xs:grid-cols-2 sm:grid-cols-3">{inscritos.map((i) => <Persona key={i.playerId} p={porId.get(i.playerId)} />)}</ul>
              : <p className="text-sm text-muted">{tr(lng, "v116.nadie")}</p>}
          </section>

          {manager && (
            <section className="card p-4">
              <h2 className="text-lg font-bold">{previas ? tr(lng, "v116.repartoTitulo") : tr(lng, "v116.sorteo")}</h2>
              <p className="mb-3 text-sm text-muted">{previas ? tr(lng, "v116.repartoAyuda") : tr(lng, "v116.sorteoAyuda")}</p>
              {!previas && (
                <form action={sortearLiga}>
                  <button className="btn w-full" type="submit" disabled={inscritos.length < 2}>
                    {t.semilla ? tr(lng, "v116.resortear") : tr(lng, "v116.sortear")}
                  </button>
                </form>
              )}
              {(previas || t.semilla) && inscritos.length >= 2 && (() => {
                const ids = inscritos.map((i) => i.playerId);
                const reparto = previas
                  ? siguienteReparto(previas, ids, t.maxPorDivision)
                  : sortearDivisiones(ids, t.maxPorDivision, t.semilla!);
                return (
                  <>
                    <div className="mt-4 flex flex-col gap-3">
                      {reparto.map((ids, k) => (
                        <div key={k} className="liga-division" data-nivel={k + 1}>
                          <p className="liga-division-titulo">
                            {trf(lng, "v116.division", { n: k + 1 })}
                            <span className="text-xs font-normal text-muted"> · {trf(lng, "v116.jornadas", { n: todosContraTodos(ids).length })}</span>
                          </p>
                          <ul>{ids.map((id) => <Persona key={id} p={porId.get(id)} />)}</ul>
                        </div>
                      ))}
                    </div>
                    {!previas && t.semilla && <p className="mt-2 font-mono text-[10px] text-muted" title={t.semilla}>{trf(lng, "v116.semilla", { s: t.semilla.slice(0, 8) })}</p>}
                    <form action={empezarLiga} className="mt-3">
                      <ConfirmButton className="btn btn-brand w-full" message={tr(lng, "v116.empezarConfirma")}>
                        {tr(lng, "v116.empezar")}
                      </ConfirmButton>
                    </form>
                  </>
                );
              })()}
            </section>
          )}
        </div>
      )}

      {/* ----------------------------------------------- en curso */}
      {t?.estado === "en_curso" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clasif.map((c, i) => (
              <Link key={c.nivel} href={`/competiciones/${c.competitionId}`} className="card liga-division p-4 hover:border-brand" data-nivel={c.nivel}>
                <p className="liga-division-titulo">{trf(lng, "v116.division", { n: c.nivel })}</p>
                <ol>
                  {c.orden.map((id, k) => {
                    const sube = mov[i]?.sube.includes(id), baja = mov[i]?.baja.includes(id);
                    const campeon = c.nivel === 1 && k === 0;
                    return (
                      <li key={id} className="flex min-w-0 items-center gap-2 py-1" data-mov={campeon ? "campeon" : sube ? "sube" : baja ? "baja" : undefined}>
                        <span className="w-4 flex-none text-right font-mono text-xs text-muted">{k + 1}</span>
                        <Avatar player={porId.get(id)} size="sm" />
                        <span className="min-w-0 flex-1 truncate font-semibold text-ink">{porId.get(id)?.name ?? "?"}</span>
                        <span className="flex-none text-[11px] text-muted">{c.pts[id]}</span>
                        {(campeon || sube || baja) && (
                          <span className="liga-mov">{tr(lng, campeon ? "v116.movCampeon" : sube ? "v116.movSube" : "v116.movBaja")}</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-1 text-xs text-info">{tr(lng, "v116.verClasificacion")}</p>
              </Link>
            ))}
          </div>
          {manager && (
            <section className="card mt-4 p-4">
              <h2 className="text-lg font-bold">{tr(lng, "v116.cerrarTitulo")}</h2>
              <p className="mb-3 text-sm text-muted">{tr(lng, "v116.cerrarAyuda")}</p>
              <form action={cerrarLiga} className="flex flex-col gap-2">
                {pendientes > 0 && (
                  <label className="inline-flex items-center gap-2 text-sm text-loss">
                    <input type="checkbox" name="aunAsi" className="size-4" />
                    {trf(lng, "v116.cerrarPendientes", { n: pendientes })}
                  </label>
                )}
                <ConfirmButton className="btn btn-brand" message={tr(lng, "v116.cerrarConfirma")}>{tr(lng, "v116.cerrar")}</ConfirmButton>
              </form>
            </section>
          )}
          <section className="card mt-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{trf(lng, "v116.espera", { n: espera.length })}</h2>
                <p className="text-sm text-muted">{tr(lng, "v116.esperaAyuda")}</p>
              </div>
              {me && !mia && <form action={apuntarmeLiga}><button className="btn btn-brand" type="submit">{tr(lng, "v116.apuntarmeEspera")}</button></form>}
              {me && mia?.estado === "espera" && <form action={borrarmeLiga}><button className="btn btn-ghost" type="submit">{tr(lng, "v116.borrarme")}</button></form>}
            </div>
            {espera.length > 0 && <ul className="mt-2 grid grid-cols-1 gap-x-4 xs:grid-cols-2 sm:grid-cols-3">{espera.map((i) => <Persona key={i.playerId} p={porId.get(i.playerId)} />)}</ul>}
          </section>
        </>
      )}
    </>
  );
}
