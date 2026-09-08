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
  if (!me || (deck.playerId !== me.id && !manager)) redirect("/mazos");

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
