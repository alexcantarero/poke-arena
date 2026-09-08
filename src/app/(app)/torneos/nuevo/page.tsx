import { readSession } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { TournamentForm } from "@/components/TournamentForm";

export const metadata = { title: "Nuevo torneo" };

export default async function NewTournamentPage() {
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  const myDecks = session ? snap.decks.filter((d) => d.playerId === session.playerId && !d.retired) : [];

  return (
    <>
      <PageHead
        title="Nuevo torneo"
        sub="Apunta el torneo y tu resultado de una vez. Si van más del grupo, cada uno añade el suyo después desde la ficha."
      />
      <TournamentForm season={snap.config.cpSeason} decks={myDecks} archetypes={snap.archetypes} />
    </>
  );
}
