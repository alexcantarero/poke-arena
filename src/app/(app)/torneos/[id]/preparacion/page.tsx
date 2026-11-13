import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentPlayer, loadSnapshot } from "@/lib/data";
import { archetypesOfMatch, outcome } from "@/lib/stats";
import { cargarDatosRecomendador } from "@/lib/recomendadorDatos";
import { campoDe, probsCruce, tipoRecomendador } from "@/lib/recomendador";
import { historialPropio, prepararTorneo, PREP_MIN_PARTIDAS, type FilaPreparacion } from "@/lib/preparacion";
import { spriteUrl } from "@/lib/pokemon";
import { pct } from "@/lib/format";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Preparar el torneo" };

/* =========================================================================
   v0.129 — PREPARACIÓN DE TORNEO (`/torneos/<id>/preparacion`).

   Para la víspera: con TU mazo, qué te vas a cruzar (el campo esperado para
   ese tipo de torneo) y cuánto ganas contra cada cosa, con las partidas que
   hay detrás y, al lado, tu propio historial en ese cruce. Los números salen
   del recomendador (`lib/recomendador.ts`, las mismas fuentes y pesos que
   Herramientas); aquí solo se ordenan (`lib/preparacion.ts`).

   El mazo es el del torneo si ya lo tienes puesto; si no, se elige arriba
   (viaja en la URL, así que se puede compartir y volver atrás).
   ========================================================================= */
export default async function PreparacionPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ mazo?: string }> }) {
  const [{ id }, q, snap, me, lng] = await Promise.all([params, searchParams, loadSnapshot(), currentPlayer(), getLang()]);
  if (!me) redirect("/entrar");
  const t = snap.toursById.get(id);
  if (!t) notFound();

  // Mi mazo en este torneo, si ya está puesto.
  const miResultado = t.results.find((r) => r.playerId === me.id);
  const delTorneo = ((miResultado?.deckId ? snap.archIndex.get(miResultado.deckId) : undefined)
    ?? (miResultado?.archetypeId ? snap.archById.get(miResultado.archetypeId) : undefined))?.main ?? "";

  // Para elegir: los arquetipos de mis mazos primero, y luego el resto.
  const lideresMios = new Set<string>();
  for (const d of snap.decks) {
    if (d.playerId !== me.id || d.retired) continue;
    const a = snap.archIndex.get(d.id);
    if (a?.main) lideresMios.add(a.main);
  }
  const porLider = new Map<string, string>();
  for (const a of snap.archetypes) if (a.main && !porLider.has(a.main)) porLider.set(a.main, a.name);
  const elegido = (q.mazo ?? "").trim().toLowerCase();
  const miLider = porLider.has(elegido) ? elegido : delTorneo || [...lideresMios][0] || "";

  const datos = await cargarDatosRecomendador(snap, me.id).catch(() => null);
  const tipo = tipoRecomendador(t.kind);
  const bo3 = (t.bestOf ?? 1) >= 3;
  const fuentes = datos
    ? [datos.fuentes.online, datos.fuentes.regionales, datos.fuentes.cityleagues, ...datos.trainerHill, datos.ciphermaniac, ...datos.locales, datos.grupo[tipo]]
    : [];
  const campo = campoDe(tipo, fuentes);

  // Mi historial con ese mazo: todas mis partidas con resultado en las que se sabe el mazo de los dos.
  const partidas: Array<{ mio: string; rival: string; r: "w" | "l" | "t" }> = [];
  for (const m of snap.matches) {
    const soyA = m.playerAId === me.id, soyB = m.playerBId === me.id;
    if (!soyA && !soyB) continue;
    const g = outcome(m).winner;
    if (!g) continue;
    const { a, b } = archetypesOfMatch(m, snap.archIndex, snap.archById);
    const mio = soyA ? a : b, rival = soyA ? b : a;
    if (!mio?.main || !rival?.main) continue;
    partidas.push({ mio: mio.main, rival: rival.main, r: g === "tie" ? "t" : (g === "a") === soyA ? "w" : "l" });
  }

  const nombres: Record<string, string> = { ...Object.fromEntries(porLider), ...(datos?.nombres ?? {}) };
  const prep = prepararTorneo({
    miLider, campo, nombres,
    probs: miLider ? probsCruce(fuentes, tipo, miLider, Object.keys(campo), bo3) : {},
    mio: historialPropio(partidas, miLider),
  });

  const TONO: Record<FilaPreparacion["tono"], { clase: string; clave: string }> = {
    favorable: { clase: "chip-win", clave: "v129.t.favorable" },
    parejo: { clase: "", clave: "v129.t.parejo" },
    desfavorable: { clase: "chip-loss", clave: "v129.t.desfavorable" },
    pocosDatos: { clase: "", clave: "v129.t.pocosDatos" },
    espejo: { clase: "", clave: "v129.t.espejo" },
  };
  const maxCuota = Math.max(0.0001, ...prep.filas.map((f) => f.cuota));
  const lista = (fs: FilaPreparacion[]) => fs.map((f) => `${f.nombre} (${pct(f.p, 0)})`).join(" · ");

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link href={`/torneos/${t.id}`} className="btn btn-ghost btn-sm">← {t.name.slice(0, 40)}</Link>
      </div>
      <h1 className="mb-1 font-display text-2xl font-black leading-tight">{tr(lng, "v129.titulo")}</h1>
      <p className="mb-4 text-sm text-muted">{trf(lng, "v129.sub", { f: tr(lng, bo3 ? "v129.bo3" : "v129.bo1") })}</p>

      <form method="get" className="card mb-4 flex flex-wrap items-end gap-2 p-4">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="label">{tr(lng, "v129.tuMazo")}</span>
          <select className="input" name="mazo" defaultValue={miLider}>
            {!miLider && <option value="">{tr(lng, "v125.elige")}</option>}
            {lideresMios.size > 0 && (
              <optgroup label={tr(lng, "v125.misMazos")}>
                {[...lideresMios].map((l) => <option key={`m-${l}`} value={l}>{nombres[l] ?? l}</option>)}
              </optgroup>
            )}
            <optgroup label={tr(lng, "v125.arquetipos")}>
              {[...porLider.entries()].sort((a, b) => a[1].localeCompare(b[1], "es")).map(([l, n]) => <option key={l} value={l}>{n}</option>)}
            </optgroup>
          </select>
        </label>
        <button className="btn btn-brand" type="submit">{tr(lng, "v129.ver")}</button>
      </form>

      {!datos || prep.filas.length === 0 ? (
        <p className="card p-4 text-sm text-muted">{tr(lng, "v129.sinDatos")}</p>
      ) : !miLider ? (
        <p className="card p-4 text-sm text-muted">{tr(lng, "v129.eligeMazo")}</p>
      ) : (
        <>
          <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="card p-4">
              <p className="label">{tr(lng, "v129.esperado")}</p>
              <p className={`font-display text-4xl font-black tabular ${prep.esperado != null && prep.esperado >= 0.5 ? "text-win" : "text-loss"}`}>
                {prep.esperado != null ? pct(prep.esperado, 0) : "—"}
              </p>
              <p className="text-xs text-muted">{tr(lng, "v129.esperadoNota")}</p>
            </div>
            <div className="card p-4">
              <p className="label">{tr(lng, "v129.cubierto")}</p>
              <p className="font-display text-4xl font-black tabular">{pct(prep.cubierto, 0)}</p>
              <p className="text-xs text-muted">{trf(lng, "v129.cubiertoNota", { n: prep.filas.length })}</p>
            </div>
            <div className="card col-span-2 p-4 sm:col-span-1">
              <p className="label">{tr(lng, "v129.cuidado")}</p>
              <p className="text-sm font-semibold text-loss">{prep.cuidado.length ? lista(prep.cuidado) : "—"}</p>
              <p className="label mt-2">{tr(lng, "v129.aFavor")}</p>
              <p className="text-sm font-semibold text-win">{prep.aFavor.length ? lista(prep.aFavor) : "—"}</p>
            </div>
          </section>

          <section className="card mb-4 overflow-hidden">
            <div className="card-head"><h2 className="text-lg font-bold">{tr(lng, "v129.campo")}</h2></div>
            <ul className="divide-y divide-line-soft">
              {prep.filas.map((f) => (
                <li key={f.lider} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={spriteUrl(datos.iconos[f.lider]?.[0] ?? f.lider)} alt="" width={40} height={40} loading="lazy" className="size-10 flex-none object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{f.nombre}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-1.5 flex-none rounded-full bg-info" style={{ width: `${Math.max(4, Math.round((f.cuota / maxCuota) * 96))}px` }} aria-hidden="true" />
                      <span className="text-xs text-muted tabular">{trf(lng, "v129.delCampo", { p: pct(f.cuota, 1) })}</span>
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <p className={`font-display text-2xl font-extrabold tabular ${f.tono === "favorable" ? "text-win" : f.tono === "desfavorable" ? "text-loss" : ""}`}>{pct(f.p, 0)}</p>
                    <p className="text-[11px] text-muted tabular">
                      {f.tono === "espejo" ? tr(lng, "v129.t.espejo") : trf(lng, "v129.partidas", { n: f.n })}
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 pl-[3.25rem] text-xs sm:w-auto sm:pl-0">
                    <span className={`chip text-[11px] ${TONO[f.tono].clase}`}>{tr(lng, TONO[f.tono].clave)}</span>
                    {f.mio && <span className="text-muted tabular">{trf(lng, "v129.tu", { r: `${f.mio.w}-${f.mio.l}${f.mio.t ? `-${f.mio.t}` : ""}` })}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <p className="mb-2 text-xs text-muted">
            {trf(lng, "v129.fuentes", {
              on: datos.resumen.online?.partidas ?? 0, reg: datos.resumen.regionales, city: datos.resumen.cityleagues, min: PREP_MIN_PARTIDAS,
            })}
          </p>
        </>
      )}
    </>
  );
}
