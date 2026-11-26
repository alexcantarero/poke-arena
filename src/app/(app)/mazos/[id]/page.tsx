import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canManageLeague, readSession } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { DeckForm } from "@/components/DeckForm";
import { DeckList } from "@/components/DeckList";
import { CardSearch } from "@/components/CardSearch";
import { tr, trf } from "@/lib/i18n";
import { anotarSesionLive } from "@/actions";
import { dificultades, sesionesDeMazo } from "@/lib/mazosExtraDb";
import { VotoDificultad } from "@/components/VotoDificultad";
import { liveConPeso, pesoLadder } from "@/lib/ladderPeso";
import { pct, todayISO } from "@/lib/format";
import { getLang } from "@/lib/lang";

export default async function EditDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const lng = await getLang(); // v0.49

  const { id } = await params;
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  const deck = snap.decksById.get(id);
  if (!deck) notFound();

  const me = session ? snap.playersById.get(session.playerId) : undefined;
  const manager = me ? canManageLeague(me.role) : false;

  /* Quién puede abrir esto es exactamente quién puede guardarlo: el dueño si
     el mazo tiene dueño, y si es de la biblioteca compartida, quien lo metió.
     Compartido quiere decir que lo puede **usar** cualquiera, no que se lo
     pueda reescribir cualquiera; la comprobación de verdad está en `saveDeck`,
     esto solo evita enseñar un formulario que el servidor va a rechazar. */
  const canEdit = Boolean(me) && (
    manager || (deck.playerId ? deck.playerId === me?.id : deck.createdBy === me?.id)
  );
  if (!canEdit) redirect("/mazos");

  const archetype = snap.archById.get(deck.archetypeId);
  // v0.137 — las sesiones del Live de este mazo y su % ponderado por el ladder.
  const [sesiones, difs] = await Promise.all([sesionesDeMazo(deck.id), dificultades(me?.id ?? null)]);
  const resumenLive = liveConPeso(sesiones, deck.liveWins, deck.liveLosses);
  const hoy = todayISO();
  return (
    <>
      <PageHead title={deck.name} sub={archetype?.name} back={{ href: "/mazos", label: tr(lng, "x.78f2cee5") }} />
      <DeckForm
        deck={{ ...deck, archetype }}
        players={snap.players}
        archetypes={snap.archetypes}
        canPickPlayer={manager}
      />

      {/* v0.139 — la dificultad también se vota al editar (antes solo al crear). */}
      <section className="card mt-4 p-4" aria-labelledby="dif-mazo">
        <h2 id="dif-mazo" className="font-display text-lg font-bold">{tr(lng, "v137.dificultad")}</h2>
        <p className="text-sm text-muted">{tr(lng, "v139.difAyuda")}</p>
        <VotoDificultad deckId={deck.id} resumen={difs.porMazo.get(deck.id)} miVoto={difs.mios.get(deck.id)} back={`/mazos/${deck.id}`} lng={lng} />
      </section>

      {/* v0.137 — SESIONES DEL PTCG LIVE: victorias y derrotas entre dos fechas, pesadas por el ladder de esas fechas. */}
      <section className="card mt-4 p-4" aria-labelledby="live-sesiones">
        <h2 id="live-sesiones" className="font-display text-lg font-bold">{tr(lng, "v137.sesiones")}</h2>
        <p className="mb-3 text-sm text-muted">{tr(lng, "v137.sesionesAyuda")}</p>
        <form action={anotarSesionLive} className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:items-end">
          <input type="hidden" name="deckId" value={deck.id} />
          <input type="hidden" name="back" value={`/mazos/${deck.id}`} />
          <label className="flex flex-col gap-1"><span className="label">{tr(lng, "v133.ganadas")}</span>
            <input className="input" type="number" name="wins" min={0} max={9999} inputMode="numeric" defaultValue={0} /></label>
          <label className="flex flex-col gap-1"><span className="label">{tr(lng, "v133.perdidas")}</span>
            <input className="input" type="number" name="losses" min={0} max={9999} inputMode="numeric" defaultValue={0} /></label>
          <label className="flex flex-col gap-1"><span className="label">{tr(lng, "v137.desde")}</span>
            <input className="input" type="date" name="desde" defaultValue={hoy} /></label>
          <label className="flex flex-col gap-1"><span className="label">{tr(lng, "v137.hasta")}</span>
            <input className="input" type="date" name="hasta" defaultValue={hoy} /></label>
          <button className="btn btn-brand col-span-2 sm:col-span-1" type="submit">{tr(lng, "v137.anotar")}</button>
        </form>
        {sesiones.length > 0 && (
          <>
            <p className="mt-4 text-sm">
              <b>{trf(lng, "v137.ponderado", { p: resumenLive.pctPonderado != null ? pct(resumenLive.pctPonderado, 0) : "—", s: resumenLive.pctSimple != null ? pct(resumenLive.pctSimple, 0) : "—" })}</b>
            </p>
            <ul className="mt-2 divide-y divide-line-soft text-sm">
              {sesiones.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2 tabular">
                  <span className="font-semibold">{s.wins}-{s.losses}</span>
                  <span className="text-muted">{s.desde === s.hasta ? s.desde : `${s.desde} → ${s.hasta}`}</span>
                  <span className="ml-auto text-xs text-muted">
                    {s.rango != null ? trf(lng, "v137.conRango", { r: s.rango, p: pesoLadder(s.rango).toLocaleString(lng === "en" ? "en-GB" : "es-ES") }) : tr(lng, "v137.sinRango")}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* El buscador va SIEMPRE, con lista o sin ella: es justo cuando no hay
          lista todavía cuando más falta hace. Cerrado por defecto, como todo
          lo de esta pantalla que no es el formulario. */}
      <details className="card mt-4">
        <summary className="tap cursor-pointer justify-between px-4 font-display text-lg font-bold">
          {tr(lng, "x.00f5042b")}
          <span className="text-xs font-normal text-muted">{tr(lng, "x.46c4a48c")}</span>
        </summary>
        <div className="border-t border-line-soft p-4">
          <CardSearch />
        </div>
      </details>

      {/* El simulador va detrás de un desplegable y debajo del formulario: se
          abre cuando se quiere probar el mazo, no cada vez que se entra a
          cambiarle el nombre. */}
      {deck.list.trim() && (
        <>
          {/* v0.71 — el simulador de manos y mulligan se mudó a Herramientas. */}
          <Link href={`/herramientas?h=manos&mazo=${deck.id}`} className="card mt-4 flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold hover:bg-surface-2">
            <span>{tr(lng, "hr.mn.desdeMazo")}</span>
            <span aria-hidden="true">→</span>
          </Link>

          <details className="card mt-4">
            <summary className="tap cursor-pointer justify-between px-4 font-display text-lg font-bold">
              {tr(lng, "x.5bbb562a")}
              <span className="text-xs font-normal text-muted">{tr(lng, "x.36d25802")}</span>
            </summary>
            <div className="border-t border-line-soft p-4">
              {/* v0.59 — los comentarios de la lista, encima de ella */}
              {deck.notes?.trim() && (
                <div className="mb-4 rounded-xl border border-brand/30 bg-brand-soft p-3">
                  <p className="label mb-1">{tr(lng, "dk.notas")}</p>
                  <p className="whitespace-pre-line text-sm text-ink">{deck.notes}</p>
                </div>
              )}
              <DeckList list={deck.list} listJson={deck.listJson} />
            </div>
          </details>
        </>
      )}
    </>
  );
}
