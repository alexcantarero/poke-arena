import { TableTracker } from "./TableTracker";
import { loadSnapshot, currentPlayer } from "@/lib/data";

export const metadata = { title: "Mi Mesa" };

export default async function MesaPage() {
  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  return <TableTracker players={snap.players} meId={me?.id} />;
}
