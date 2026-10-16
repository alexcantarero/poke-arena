import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canManageLeague } from "@/lib/auth";
import { currentPlayer, loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { TournamentForm } from "@/components/TournamentForm";
import { Icon } from "@/components/icons";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Editar torneo" };

/**
 * Editar la cabecera, en su propia pantalla.
 *
 * Antes este formulario colgaba debajo de la información del torneo, y ahí
 * parecía parte de ella: se leía la ficha y lo siguiente que veías era una
 * caja para reescribirla. Sacarlo a una ruta propia convierte «editar» en algo
 * que decides hacer, que es lo que es.
 *
 * Quien no puede editar no ve la pantalla: se va a la ficha en vez de
 * encontrarse un formulario que la acción va a rechazar en silencio.
 */
export default async function EditTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const lng = await getLang(); // v0.49

  const { id } = await params;
  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  const t = snap.toursById.get(id);
  if (!t) notFound();
  if (!me) redirect("/entrar");
  if (!canManageLeague(me.role) && t.createdBy !== me.id) redirect(`/torneos/${id}`);

  return (
    <>
      <PageHead
        title={tr(lng, "x.75af5434")}
        sub={t.name}
        actions={
          <Link className="btn btn-ghost btn-sm" href={`/torneos/${id}`}>
            <Icon name="back" className="size-4" /> {tr(lng, "x.84a715a7")}
          </Link>
        }
      />
      <TournamentForm
        season={t.season ?? snap.config.cpSeason}
        tournament={t}
        back={`/torneos/${id}`}
      />
    </>
  );
}
