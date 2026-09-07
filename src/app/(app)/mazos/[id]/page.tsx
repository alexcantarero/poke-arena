import { notFound } from "next/navigation";
import { loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { DeckForm } from "@/components/DeckForm";

export default async function EditDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snap = await loadSnapshot();
  const deck = snap.decksById.get(id);
  if (!deck) notFound();
  const archetype = snap.archById.get(deck.archetypeId);
  const owner = snap.playersById.get(deck.playerId);

  return (
    <>
      <PageHead title={deck.name} sub={`Mazo de ${owner?.name ?? "—"}${archetype ? ` · ${archetype.name}` : ""}`} />
      <DeckForm deck={{ ...deck, archetype }} players={snap.players} archetypes={snap.archetypes} />
    </>
  );
}
