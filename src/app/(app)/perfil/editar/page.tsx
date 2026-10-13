import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { currentPlayer, loadArchetypes } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata = { title: "Editar perfil" };

export default async function EditProfilePage() {
  // v0.28: el jugador de la sesión y la lista de arquetipos, nada más.
  const [me, archetypes, session] = await Promise.all([currentPlayer(), loadArchetypes(), readSession()]);
  if (!session) redirect("/entrar");
  if (!me) redirect("/entrar");

  return (
    <>
      <PageHead title="Tu perfil" sub="Cómo te ven los demás dentro de la liga." back={{ href: "/mas", label: "Más" }} />
      <ProfileForm player={me} archetypes={archetypes} />
    </>
  );
}
