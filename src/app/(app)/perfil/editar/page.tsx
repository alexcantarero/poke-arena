import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { currentPlayer, loadArchetypes } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { ProfileForm } from "@/components/ProfileForm";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Editar perfil" };

export default async function EditProfilePage() {
  const lng = await getLang(); // v0.49

  // v0.28: el jugador de la sesión y la lista de arquetipos, nada más.
  const [me, archetypes, session] = await Promise.all([currentPlayer(), loadArchetypes(), readSession()]);
  if (!session) redirect("/entrar");
  if (!me) redirect("/entrar");

  return (
    <>
      <PageHead title={tr(lng, "x.1524be42")} sub={tr(lng, "x.a9e4c85f")} back={{ href: "/mas", label: tr(lng, "x.e4f75d52") }} />
      <ProfileForm player={me} archetypes={archetypes} />
    </>
  );
}
