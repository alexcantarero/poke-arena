import { TableTracker } from "./TableTracker";
import { loadPlayers, currentPlayer } from "@/lib/data";

export const metadata = { title: "Mi Mesa" };

export default async function MesaPage() {
  // v0.28: esta pantalla solo necesita la lista de jugadores.
  const [players, me] = await Promise.all([loadPlayers(), currentPlayer()]);
  return <TableTracker players={players} meId={me?.id} />;
}
