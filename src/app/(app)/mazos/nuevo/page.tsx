import { readSession, canManageLeague } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { DeckForm } from "@/components/DeckForm";

export const metadata = { title: "Nuevo mazo" };

export default async function NewDeckPage({
  searchParams,
}: { searchParams: Promise<{ player?: string }> }) {
  const [q, snap, session] = await Promise.all([searchParams, loadSnapshot(), readSession()]);
  const me = session ? snap.playersById.get(session.playerId) : undefined;
  return (
    <>
      <PageHead title="Nuevo mazo" sub="Lo mínimo es el Pokémon principal. La lista completa se puede pegar luego." />
      <DeckForm
        players={snap.players}
        archetypes={snap.archetypes}
        defaultPlayerId={q.player ?? session?.playerId}
        canPickPlayer={me ? canManageLeague(me.role) : false}
      />
    </>
  );
}
