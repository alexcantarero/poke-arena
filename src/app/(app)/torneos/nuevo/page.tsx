import Link from "next/link";
import { loadConfig, loadTournamentHeads } from "@/lib/data";
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
export default async function NewTournamentPage({ searchParams }: { searchParams: Promise<{ desde?: string }> }) {
  const lng = await getLang(); // v0.49

  // v0.28: solo hace falta la temporada de CP de los ajustes.
  const cfg = await loadConfig();
  /* v0.55 — plantillas: los últimos torneos, para copiar su estructura (tipo,
     formato, rondas, fases, corte, sede…). La fecha no se copia: es de hoy. */
  const [{ desde }, recientes] = await Promise.all([searchParams, loadTournamentHeads()]);
  const ultimos = recientes.slice(0, 4);
  const origen = desde ? recientes.find((t) => t.id === desde) : undefined;
  /* Se copia la ESTRUCTURA, no lo que fue de aquel torneo: ni su estado (se
     crearía cerrado), ni su asistencia (los CP del nuevo saldrían con la gente
     del anterior), ni su enlace, ni sus notas. */
  const plantilla = origen ? {
    ...origen, date: new Date().toISOString().slice(0, 10), endDate: null,
    status: "open", playerCount: null, url: "", notes: "",
  } : undefined;

  return (
    <>
      <PageHead
        title={tr(lng, "x.fca27f06")}
        sub={tr(lng, "x.d2125204")}
        back={{ href: "/torneos", label: tr(lng, "x.f02a0f3c") }}
      />
      {ultimos.length > 0 && (
        <div className="card mb-4 p-3">
          <p className="label mb-2">{tr(lng, "tp.copiar")}</p>
          <div className="flex flex-wrap gap-1.5">
            {ultimos.map((t) => (
              <Link key={t.id} href={`/torneos/nuevo?desde=${t.id}`} scroll={false}
                aria-current={t.id === desde ? "true" : undefined}
                className={`chip max-w-full truncate ${t.id === desde ? "chip-brand" : ""}`}>{t.name}</Link>
            ))}
            {origen && <Link href="/torneos/nuevo" scroll={false} className="chip text-muted">{tr(lng, "tp.vacio")}</Link>}
          </div>
          {origen && <p className="mt-2 text-xs text-muted">{tr(lng, "tp.nota")}</p>}
        </div>
      )}
      {/* `key`: al cambiar de plantilla, el formulario se monta de nuevo con sus valores. */}
      <TournamentForm key={origen?.id ?? "nuevo"} season={cfg.cpSeason} back="/torneos" plantilla={plantilla} />
    </>
  );
}
