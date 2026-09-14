import { loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { TournamentForm } from "@/components/TournamentForm";

export const metadata = { title: "Nuevo torneo" };

/**
 * Crear un torneo es crear su cabecera, y nada más.
 *
 * El resultado ya no se pide aquí. Iban juntos y parecía que ahorraba un
 * paso, pero cuando apuntas un torneo todavía no lo has jugado: el formulario
 * se guardaba siempre a medias y había que volver igualmente. Ahora el ciclo
 * está partido donde de verdad está partido en la realidad.
 */
export default async function NewTournamentPage() {
  const snap = await loadSnapshot();

  return (
    <>
      <PageHead
        title="Nuevo torneo"
        sub="Primero la cabecera: qué evento es, cuándo y de qué tamaño. Las rondas y el puesto se rellenan después, desde la ficha."
      />
      <TournamentForm season={snap.config.cpSeason} back="/torneos" />
    </>
  );
}
