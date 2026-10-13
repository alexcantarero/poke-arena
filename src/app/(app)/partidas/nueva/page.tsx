import { canManageLeague } from "@/lib/auth";
import { currentPlayer, loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { MatchForm } from "@/components/MatchForm";

export const metadata = { title: "Registrar partida" };

export default async function NewMatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  
  const p1 = typeof q.p1 === "string" ? q.p1 : undefined;
  const p2 = typeof q.p2 === "string" ? q.p2 : undefined;
  const w1 = typeof q.w1 === "string" ? parseInt(q.w1) : undefined;
  const w2 = typeof q.w2 === "string" ? parseInt(q.w2) : undefined;
  const bo = typeof q.bo === "string" ? parseInt(q.bo) : undefined;
  
  let initialGames: any = undefined;
  if (w1 !== undefined && w2 !== undefined) {
    initialGames = [];
    for (let i = 0; i < w1; i++) initialGames.push({ winner: "a", first: "", archA: "", archB: "" });
    for (let i = 0; i < w2; i++) initialGames.push({ winner: "b", first: "", archA: "", archB: "" });
  }
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
        initialP1={p1}
        initialP2={p2}
        initialBestOf={bo}
        initialGames={initialGames}
      />
    </>
  );
}
