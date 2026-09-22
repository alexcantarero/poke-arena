import { canManageLeague } from "@/lib/auth";
import { currentPlayer, loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { MatchForm } from "@/components/MatchForm";

export const metadata = { title: "Registrar partida" };

export default async function NewMatchPage() {
  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  return (
    <>
      <PageHead title="Registrar partida" sub="Se guarda en cuanto alguien llega al número de juegos necesario." back={{ href: "/resultados", label: "Resultados" }} />
      <MatchForm
        players={snap.players}
        decks={snap.decks}
        archetypes={snap.archetypes}
        competitions={snap.competitions}
        tournaments={snap.tournaments}
        meId={me?.id}
        canPickPlayer={me ? canManageLeague(me.role) : false}
      />
    </>
  );
}
