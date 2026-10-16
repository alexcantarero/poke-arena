import { loadConfig } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { TournamentForm } from "@/components/TournamentForm";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

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
  const lng = await getLang(); // v0.49

  // v0.28: solo hace falta la temporada de CP de los ajustes.
  const cfg = await loadConfig();

  return (
    <>
      <PageHead
        title={tr(lng, "x.fca27f06")}
        sub={tr(lng, "x.d2125204")}
        back={{ href: "/torneos", label: tr(lng, "x.f02a0f3c") }}
      />
      <TournamentForm season={cfg.cpSeason} back="/torneos" />
    </>
  );
}
