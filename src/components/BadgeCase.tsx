import { badgesOf, earnedCount, BADGE_TOTAL, type Badge, type BadgeInput } from "@/lib/badges";
import { Icon } from "./icons";

/* =========================================================================
   La vitrina de medallas, como la de los juegos.

   Se enseñan **todas**, ganadas y sin ganar. Una vitrina con huecos es la
   mitad de la gracia, y el hueco con «te faltan 2 victorias» debajo es lo
   que hace que alguien se acuerde de registrar la partida.

   El escalón se lee por dos vías a la vez —el color del aro y la palabra
   (bronce/plata/oro)—, no solo por el color: a pleno sol el bronce y el oro
   se parecen bastante.
   ========================================================================= */

const TIER_LABEL: Record<Badge["tier"], string> = {
  none: "Sin conseguir",
  bronze: "Bronce",
  silver: "Plata",
  gold: "Oro",
};

/* Los aros. El de oro es el de la marca; los otros dos, grises con
   temperatura, que es lo que distingue el bronce de la plata sin recurrir a
   dos naranjas parecidos. */
const TIER_RING: Record<Badge["tier"], string> = {
  none: "var(--line)",
  bronze: "#b07a45",
  silver: "#9aa6b8",
  gold: "var(--brand)",
};

export function BadgeCase({ input, owner }: { input: BadgeInput; owner: string }) {
  const badges = badgesOf(input);
  const ganadas = earnedCount(badges);

  return (
    <section className="card mb-6">
      <div className="card-head">
        <h2 className="text-lg font-bold">Medallas</h2>
        <span className="text-xs text-muted tabular">{ganadas} de {BADGE_TOTAL}</span>
      </div>

      <ul className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-5">
        {badges.map((b) => {
          const ganada = b.tier !== "none";
          return (
            <li key={b.id} className="flex flex-col items-center gap-1.5 text-center">
              <span
                className="grid size-14 place-items-center rounded-full border-[3px] transition-transform"
                style={{
                  borderColor: TIER_RING[b.tier],
                  background: ganada
                    ? `color-mix(in oklab, ${b.color} 16%, transparent)`
                    : "var(--surface-2)",
                  color: ganada ? b.color : "var(--muted)",
                  // Sin conseguir se ve, pero se ve apagada: la vitrina tiene
                  // que dejar claro de un vistazo qué falta.
                  opacity: ganada ? 1 : 0.55,
                }}
                title={`${b.name} · ${b.about} · ${TIER_LABEL[b.tier]}`}
              >
                <Icon name={b.icon} className="size-6" />
              </span>

              <span className="block text-[11px] font-semibold leading-tight">
                {b.name.replace("Medalla ", "")}
              </span>
              <span className="block text-[10px] leading-tight text-muted">
                {ganada ? TIER_LABEL[b.tier] : b.hint}
              </span>
              {ganada && b.next != null && (
                <span className="block text-[10px] leading-tight text-muted tabular">
                  {b.value} / {b.next}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="border-t border-line-soft px-4 py-3 text-[11px] text-muted">
        Se calculan solas de las partidas, los mazos y los torneos de {owner}: nadie las
        concede y nadie las quita. Cada una tiene bronce, plata y oro; el número de abajo es
        lo que lleva y lo que hace falta para el siguiente escalón.
      </p>
    </section>
  );
}
