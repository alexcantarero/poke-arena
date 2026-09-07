import { loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { DeckForm } from "@/components/DeckForm";
import { readSession } from "@/lib/auth";

export default async function NewDeckPage({
  searchParams,
}: { searchParams: Promise<{ player?: string }> }) {
  const [q, snap, session] = await Promise.all([searchParams, loadSnapshot(), readSession()]);
  return (
    <>
      <PageHead title="Nuevo mazo" sub="Lo mínimo es el Pokémon principal; la lista completa se puede añadir más tarde." />
      <DeckForm
        players={snap.players}
        archetypes={snap.archetypes}
        defaultPlayerId={q.player ?? session?.playerId}
      />
    </>
  );
}
