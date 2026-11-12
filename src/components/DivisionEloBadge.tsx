import { CLASE_DIVISION, divisionDeElo } from "@/lib/divisionElo";
import type { Forma } from "@/lib/forma";
import { tr, trf, type Lang } from "@/lib/i18n";

/* v0.115 — la división de Elo de alguien, con el color del tier de la web
   (`[data-tier]` → `--tier`). Sale de su FORMA; Challenger es quien tiene el
   Cinturón Elo. El texto va siempre (no depende solo del color). */
export function DivisionEloBadge({
  forma, partidas, challenger = false, lang, size = "sm",
}: { forma: Forma | undefined; partidas: number; challenger?: boolean; lang: Lang; size?: "sm" | "md" }) {
  if (!forma) return null;
  const d = divisionDeElo(forma.forma, { challenger, partidas });
  const nombre = tr(lang, `v115.div.${d.id}`);
  const titulo = d.siguiente && d.faltan != null
    ? trf(lang, "v115.div.faltan", { n: d.faltan, d: tr(lang, `v115.div.${d.siguiente}`) })
    : d.id === "novato" ? tr(lang, "v115.div.novatoAyuda") : nombre;
  return (
    <span className={`division-elo ${CLASE_DIVISION[d.id]}`} data-division={d.id} data-size={size} title={titulo}>
      {nombre}{d.sub ? ` ${d.sub}` : ""}
    </span>
  );
}
