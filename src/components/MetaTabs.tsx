import Link from "next/link";
import { Icon } from "@/components/icons";

/* =========================================================================
   Las pestañas de la zona de metagame: Online · Presencial · Mazos.

   v0.40. «Mazos» salió del menú lateral en la v0.38 y vive aquí. Para que
   eso funcione, las pestañas tienen que verse IGUAL en las dos pantallas:
   si en /mazos no estuvieran, la pestaña sería una puerta de un solo
   sentido y no habría forma de volver al metagame sin pasar por el menú.

   Por eso es un componente y no un trozo de JSX dentro de Top Decks.
   ========================================================================= */

export type MetaTab = "online" | "presencial" | "mazos";

export function MetaTabs({ actual, query = "" }: { actual: MetaTab; query?: string }) {
  const q = query ? `q=${encodeURIComponent(query)}` : "";

  const base =
    "tap flex-none rounded-lg border px-3.5 text-sm font-semibold transition-colors";
  const apagada = "border-line bg-surface text-muted hover:text-ink";

  return (
    <nav className="scroll-x scroll-fade mb-4 flex gap-2" aria-label="Metagame y mazos">
      <Link
        href={`/topdecks${q ? `?${q}` : ""}`}
        aria-current={actual === "online" ? "page" : undefined}
        className={`${base} ${actual === "online"
          ? "border-source-global bg-source-global-soft text-source-global" : apagada}`}
      >
        <Icon name="globe" className="size-4" />
        Online
      </Link>

      <Link
        href={`/topdecks?fuente=presencial${q ? `&${q}` : ""}`}
        aria-current={actual === "presencial" ? "page" : undefined}
        className={`${base} ${actual === "presencial"
          ? "border-brand-line bg-brand-soft text-brand" : apagada}`}
      >
        <Icon name="trophy" className="size-4" />
        Presencial
      </Link>

      {/* `<nav>` con `aria-current` y no `tablist` con `role="tab"`: las
          tres son navegación entre páginas, no paneles dentro de una. Un
          lector de pantalla que oye «pestaña» espera que el contenido cambie
          sin salir de la página, y aquí se sale. */}
      <Link
        href="/mazos"
        aria-current={actual === "mazos" ? "page" : undefined}
        className={`${base} ${actual === "mazos"
          ? "border-series-1 bg-surface-2 text-ink" : apagada}`}
      >
        <Icon name="deck" className="size-4" />
        Mazos
      </Link>
    </nav>
  );
}
