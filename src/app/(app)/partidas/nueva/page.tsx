import { loadSnapshot } from "@/lib/data";
import { readSession } from "@/lib/auth";
import { PageHead } from "@/components/ui";
import { MatchForm } from "@/components/MatchForm";

export default async function NewMatchPage() {
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  return (
    <>
      <PageHead
        title="Registrar partida"
        sub="Elige el formato, los dos mazos y el resultado juego a juego. Se guarda cuando alguien llega al número de juegos necesario."
      />
      <MatchForm
        players={snap.players}
        decks={snap.decks}
        archetypes={snap.archetypes}
        competitions={snap.competitions}
        defaultPlayerId={session?.playerId}
      />
    </>
  );
}
