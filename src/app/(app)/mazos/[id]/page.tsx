import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canManageLeague, readSession } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { DeckForm } from "@/components/DeckForm";
import { DeckList } from "@/components/DeckList";
import { CardSearch } from "@/components/CardSearch";
import { tr } from "@/lib/i18n";
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
  return (
    <>
      <PageHead title={deck.name} sub={archetype?.name} back={{ href: "/mazos", label: tr(lng, "x.78f2cee5") }} />
      <DeckForm
        deck={{ ...deck, archetype }}
        players={snap.players}
        archetypes={snap.archetypes}
        canPickPlayer={manager}
      />

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
