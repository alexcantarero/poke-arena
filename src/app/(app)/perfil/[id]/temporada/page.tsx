import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentPlayer, loadSnapshot } from "@/lib/data";
import { archetypesOfMatch, esNoPresentadoPartida, outcome } from "@/lib/stats";
import { cpKindOf, effectiveCp, seasonOfDate } from "@/lib/cp";
import { badgesOf } from "@/lib/badges";
import { entradaMedallasDeJugador } from "@/lib/perfilTitulos";
import { resumenDeTemporada, type PartidaTemporada, type TorneoTemporada } from "@/lib/resumenTemporada";
import { pct } from "@/lib/format";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Resumen de temporada" };

/* =========================================================================
   v0.130 — EL RESUMEN DE LA TEMPORADA de un jugador (`/perfil/<id>/temporada`).

   Lo jugado, lo ganado y lo mejor de una temporada (de julio a junio, la de
   los CP), en una pantalla para enseñar. Los números los hace
   `lib/resumenTemporada.ts`; aquí se juntan las partidas, los torneos y el
   Elo de esa temporada. `?t=2027` elige otra.

   Las medallas son las del perfil (de siempre, no solo de esta temporada): se
   cuentan por escalón y se enlaza a la vitrina.
   ========================================================================= */
export default async function TemporadaPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, q, snap, me, lng] = await Promise.all([params, searchParams, loadSnapshot(), currentPlayer(), getLang()]);
  if (!me) redirect("/entrar");
  const jugador = snap.playersById.get(id);
  if (!jugador) notFound();

  const pedida = Number(q.t);
  const temporada = Number.isInteger(pedida) && pedida >= 2020 && pedida <= 2100 ? pedida : snap.config.cpSeason;
  const enTemporada = (fecha: string) => seasonOfDate(fecha) === temporada;

  const partidas: PartidaTemporada[] = [];
  const temporadasConDatos = new Set<number>();
  for (const m of snap.matches) {
    const soyA = m.playerAId === id, soyB = m.playerBId === id;
    if (!soyA && !soyB) continue;
    const s = seasonOfDate(m.date);
    if (s != null) temporadasConDatos.add(s);
    if (!enTemporada(m.date) || m.opponentName === "BYE" || esNoPresentadoPartida(m)) continue;
    const g = outcome(m).winner;
    if (!g) continue;
    const { a, b } = archetypesOfMatch(m, snap.archIndex, snap.archById);
    partidas.push({
      fecha: m.date, r: g === "tie" ? "t" : (g === "a") === soyA ? "w" : "l",
      miMazo: (soyA ? a : b)?.name ?? "", suMazo: (soyA ? b : a)?.name ?? "",
    });
  }
  const torneos: TorneoTemporada[] = [];
  for (const t of snap.tournaments) {
    const r = t.results.find((x) => x.playerId === id);
    if (!r || (t.season ?? seasonOfDate(t.date)) !== temporada) continue;
    torneos.push({ nombre: t.name, fecha: t.date, puesto: r.placement, jugadores: t.playerCount, cp: effectiveCp(temporada, cpKindOf(t), r, t.playerCount) });
  }
  const elo = (snap.elo.history[id] ?? []).filter((h) => enTemporada(h.date)).map((h) => ({ fecha: h.date, valor: h.value }));
  const r = resumenDeTemporada(partidas, torneos, elo);

  const medallas = badgesOf(entradaMedallasDeJugador(snap, id));
  const oro = medallas.filter((b) => b.tier === "gold").length, plata = medallas.filter((b) => b.tier === "silver").length,
    bronce = medallas.filter((b) => b.tier === "bronze").length;

  const marca = (x: { w: number; l: number; t: number }) => `${x.w}-${x.l}${x.t ? `-${x.t}` : ""}`;
  const otras = [...temporadasConDatos].filter((s) => s !== temporada).sort((a, b) => b - a);
  const esMio = me.id === id;

  const Dato = ({ rotulo, valor, nota, tono = "" }: { rotulo: string; valor: string; nota?: string; tono?: string }) => (
    <div className="card p-4">
      <p className="label">{rotulo}</p>
      <p className={`font-display text-3xl font-black tabular ${tono}`}>{valor}</p>
      {nota && <p className="text-xs text-muted">{nota}</p>}
    </div>
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link href={`/perfil/${id}`} className="btn btn-ghost btn-sm">← {jugador.name}</Link>
        {otras.map((s) => (
          <Link key={s} href={`/perfil/${id}/temporada?t=${s}`} className="chip">{trf(lng, "v130.temporadaN", { n: s })}</Link>
        ))}
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-strong">{trf(lng, "v130.temporadaN", { n: temporada })}</p>
      <h1 className="mb-4 font-display text-3xl font-black leading-tight">
        {esMio ? tr(lng, "v130.tuTemporada") : trf(lng, "v130.temporadaDe", { n: jugador.name })}
      </h1>

      {r.partidas === 0 && r.torneos === 0 ? (
        <p className="card p-4 text-sm text-muted">{tr(lng, "v130.sinTemporada")}</p>
      ) : (
        <>
          <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Dato rotulo={tr(lng, "v130.partidasJugadas")} valor={String(r.partidas)} nota={marca(r)} />
            <Dato rotulo={tr(lng, "v130.victorias")} valor={r.pct != null ? pct(r.pct, 0) : "—"}
              tono={r.pct != null && r.pct >= 0.5 ? "text-win" : r.pct != null ? "text-loss" : ""}
              nota={r.rachaVictorias >= 2 ? trf(lng, "v130.mejorRacha", { n: r.rachaVictorias }) : undefined} />
            <Dato rotulo={tr(lng, "v130.torneos")} valor={String(r.torneos)}
              nota={r.podios ? trf(lng, "v130.podios", { n: r.podios }) : undefined} />
            <Dato rotulo="CP" valor={String(r.cp)} tono="text-brand-strong" />
          </section>

          <section className="card mb-4 overflow-hidden">
            <div className="card-head"><h2 className="text-lg font-bold">{tr(lng, "v130.loMejor")}</h2></div>
            <dl className="divide-y divide-line-soft text-sm">
              {([
                [tr(lng, "v130.mejorPuesto"), r.mejorPuesto ? `${r.mejorPuesto.puesto}.º · ${r.mejorPuesto.nombre}${r.mejorPuesto.jugadores ? ` (${r.mejorPuesto.jugadores})` : ""}` : null],
                [tr(lng, "v130.mazoMasJugado"), r.mazoMasJugado ? `${r.mazoMasJugado.mazo} · ${trf(lng, "v130.partidas", { n: r.mazoMasJugado.n })} · ${pct(r.mazoMasJugado.pct, 0)}` : null],
                [tr(lng, "v130.mazosDistintos"), r.mazosDistintos ? String(r.mazosDistintos) : null],
                [tr(lng, "v130.mejorCruce"), r.mejorCruce ? `${r.mejorCruce.mazo} · ${marca(r.mejorCruce)}` : null],
                [tr(lng, "v130.peorCruce"), r.peorCruce ? `${r.peorCruce.mazo} · ${marca(r.peorCruce)}` : null],
                [tr(lng, "v130.mesMasActivo"), r.mesMasActivo ? `${r.mesMasActivo.mes} · ${trf(lng, "v130.partidas", { n: r.mesMasActivo.n })}` : null],
                ["Elo", r.elo ? `${r.elo.inicio} → ${r.elo.fin} (${r.elo.cambio >= 0 ? "+" : "−"}${Math.abs(r.elo.cambio)}) · ${trf(lng, "v130.pico", { n: r.elo.pico })}` : null],
              ] as Array<[string, string | null]>).map(([k, v]) => (
                <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="min-w-0 text-right font-semibold">{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}

      <section className="card mb-4 p-4">
        <h2 className="mb-2 text-lg font-bold">{tr(lng, "v130.vitrina")}</h2>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="division-elo cp-rank-gold">{trf(lng, "v130.oro", { n: oro })}</span>
          <span className="division-elo cp-rank-silver">{trf(lng, "v130.plata", { n: plata })}</span>
          <span className="division-elo cp-rank-bronze">{trf(lng, "v130.bronce", { n: bronce })}</span>
          <Link href={`/perfil/${id}`} className="btn btn-ghost btn-sm ml-auto">{tr(lng, "v130.verVitrina")}</Link>
        </p>
        <p className="mt-2 text-xs text-muted">{tr(lng, "v130.vitrinaNota")}</p>
      </section>
    </>
  );
}
