import { notFound, redirect } from "next/navigation";
import { canManageLeague, readSession } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { DeckForm } from "@/components/DeckForm";
import { DeckList } from "@/components/DeckList";
import { MulliganSim } from "@/components/MulliganSim";

export default async function EditDeckPage({ params }: { params: Promise<{ id: string }> }) {
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
      <PageHead title={deck.name} sub={archetype?.name} />
      <DeckForm
        deck={{ ...deck, archetype }}
        players={snap.players}
        archetypes={snap.archetypes}
        canPickPlayer={manager}
      />

      {/* El simulador va detrás de un desplegable y debajo del formulario: se
          abre cuando se quiere probar el mazo, no cada vez que se entra a
          cambiarle el nombre. */}
      {deck.list.trim() && (
        <>
          <details className="card mt-4">
            <summary className="tap cursor-pointer justify-between px-4 font-display text-lg font-bold">
              Simulador de manos
              <span className="text-xs font-normal text-muted">mulligan y aperturas</span>
            </summary>
            <div className="border-t border-line-soft p-4">
              <MulliganSim list={deck.list} listJson={deck.listJson} />
            </div>
          </details>

          <details className="card mt-4">
            <summary className="tap cursor-pointer justify-between px-4 font-display text-lg font-bold">
              La lista
              <span className="text-xs font-normal text-muted">texto o cartas</span>
            </summary>
            <div className="border-t border-line-soft p-4">
              <DeckList list={deck.list} listJson={deck.listJson} />
            </div>
          </details>
        </>
      )}
    </>
  );
}
