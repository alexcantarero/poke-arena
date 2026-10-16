import { badgesOf, earnedCount, BADGE_TOTAL, type Badge, type BadgeInput } from "@/lib/badges";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

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

const MEDAL_MOTIFS: Record<string, string> = {
  partidas: "M15 16h18M15 24h18M15 32h18",
  victorias: "M24 13v22M13 24h22M17 17l14 14M31 17 17 31",
  racha: "M15 30c4-10 8-10 12 0s8 10 12 0",
  variedad: "M12 31 20 15l8 16zM26 31l5-11 6 11z",
  torneos: "M24 12 28 20 36 24 28 28 24 36 20 28 12 24 20 20z",
  cortes: "M15 15h18v18H15zM15 15l18 18M33 15 15 33",
  cp: "M14 29c3-8 7-12 10-12s7 4 10 12M16 32h16M20 36h8",
  anotador: "M16 32 30 18l4 4-14 14-6 2zM28 20l4 4",
};

function MedalEmblem({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h20l10 10v20L34 44H14L4 34V14z" />
      <path d={MEDAL_MOTIFS[id] ?? MEDAL_MOTIFS.partidas} />
    </svg>
  );
}

function requisitoActual(current: number | null, unit: string, mode: "atLeast" | "atMost") {
  if (current == null) return "—";
  if (unit === "%") return `${Math.round(current)}%`;
  if (mode === "atMost") return `#${current}`;
  return `${current}${unit ? ` ${unit}` : ""}`;
}

function requisitoObjetivo(target: number, unit: string, mode: "atLeast" | "atMost") {
  if (mode === "atMost") return `#${target} o mejor`;
  return `${target}${unit ? ` ${unit}` : ""}`;
}

export async function BadgeCase({ input, owner }: { input: BadgeInput; owner: string }) {
  const lng = await getLang(); // v0.49

  const badges = badgesOf(input);
  const ganadas = earnedCount(badges);

  return (
    <section className="card mb-6">
      <div className="card-head">
        <h2 className="text-lg font-bold">{tr(lng, "x.1efa93e8")}</h2>
        <span className="text-xs text-muted tabular">{ganadas} de {BADGE_TOTAL}</span>
      </div>

      <ul className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-5">
        {badges.map((b) => {
          const ganada = b.tier !== "none";
          return (
            <li key={b.id} className="flex flex-col items-center gap-1.5 text-center">
              <span
                className="grid size-14 place-items-center rounded-2xl border-[3px] transition-transform"
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
                <MedalEmblem id={b.id} />
              </span>

              <span className="block text-[11px] font-semibold leading-tight">
                {b.name.replace(tr(lng, "x.356a2186"), "")}
              </span>
              <span className="block text-[10px] leading-tight text-muted">{ganada ? TIER_LABEL[b.tier] : b.hint}</span>
              {b.requirements.map((r) => (
                <span key={r.label} className={`block text-[9px] leading-tight tabular ${r.met ? "text-win" : "text-muted"}`}>
                  {r.label}: {requisitoActual(r.current, r.unit, r.mode)} / {requisitoObjetivo(r.target, r.unit, r.mode)}
                </span>
              ))}
            </li>
          );
        })}
      </ul>

      <p className="border-t border-line-soft px-4 py-3 text-[11px] text-muted">
        Se calculan solas de las partidas y los torneos de {owner}: nadie las concede ni las
        quita. Cada medalla exige cumplir dos objetivos en cada escalón; debajo se muestra el
        progreso hacia el siguiente.
      </p>
    </section>
  );
}
