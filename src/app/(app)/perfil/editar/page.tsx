import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata = { title: "Editar perfil" };

export default async function EditProfilePage() {
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  if (!session) redirect("/entrar");
  const me = snap.playersById.get(session.playerId);
  if (!me) redirect("/entrar");

  return (
    <>
      <PageHead title="Tu perfil" sub="Cómo te ven los demás dentro de la liga." back={{ href: "/mas", label: "Más" }} />
      <ProfileForm player={me} archetypes={snap.archetypes} />
    </>
  );
}
