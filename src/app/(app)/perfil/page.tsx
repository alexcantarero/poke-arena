import { redirect } from "next/navigation";
import { currentPlayer } from "@/lib/data";

/* v0.61 — `/perfil` a secas daba 404: el perfil vive en `/perfil/<id>`. Ahora
   lleva al tuyo (y, sin sesión, a entrar). */
export default async function MiPerfil() {
  const me = await currentPlayer();
  redirect(me ? `/perfil/${me.id}` : "/entrar");
}
