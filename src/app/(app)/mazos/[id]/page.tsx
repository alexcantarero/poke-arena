import { notFound, redirect } from "next/navigation";
import { canManageLeague, readSession } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { DeckForm } from "@/components/DeckForm";

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
    </>
  );
}
