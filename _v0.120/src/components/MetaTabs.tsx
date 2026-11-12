import Link from "next/link";
import { Icon } from "@/components/icons";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/* =========================================================================
   Las pestañas de la zona de metagame: Online · Presencial · Mazos.

   v0.40. «Mazos» salió del menú lateral en la v0.38 y vive aquí. Para que
   eso funcione, las pestañas tienen que verse IGUAL en las dos pantallas:
   si en /mazos no estuvieran, la pestaña sería una puerta de un solo
   sentido y no habría forma de volver al metagame sin pasar por el menú.

   Por eso es un componente y no un trozo de JSX dentro de Top Decks.
   ========================================================================= */

export type MetaTab = "online" | "presencial" | "city" | "evento" | "mazos";

export async function MetaTabs({ actual, query = "" }: { actual: MetaTab; query?: string }) {
  const lng = await getLang(); // v0.49

  const q = query ? `q=${encodeURIComponent(query)}` : "";

  return (
    <nav className="pestanas mb-4" aria-label={tr(lng, "x.3a2db4f1")}>
      <Link
        href={`/topdecks${q ? `?${q}` : ""}`}
        aria-current={actual === "online" ? "page" : undefined}
        className="pestana" data-on={actual === "online"}
      >
        <Icon name="globe" className="size-4" />
        Online
      </Link>

      <Link
        href={`/topdecks?fuente=presencial${q ? `&${q}` : ""}`}
        aria-current={actual === "presencial" ? "page" : undefined}
        className="pestana" data-on={actual === "presencial"}
      >
        <Icon name="trophy" className="size-4" />
        {tr(lng, "x.4bb0ddec")}
      </Link>

      {/* v0.120 — City Leagues y el último torneo online grande, que antes estaban
          en Estadísticas: todos los mazos de fuera viven ahora aquí. */}
      <Link
        href={`/topdecks?fuente=city${q ? `&${q}` : ""}`}
        aria-current={actual === "city" ? "page" : undefined}
        className="pestana" data-on={actual === "city"}
      >
        <Icon name="pin" className="size-4" />
        {tr(lng, "v120.tabCity")}
      </Link>
      <Link
        href="/topdecks?fuente=evento"
        aria-current={actual === "evento" ? "page" : undefined}
        className="pestana" data-on={actual === "evento"}
      >
        <Icon name="trophy" className="size-4" />
        {tr(lng, "v120.tabEvento")}
      </Link>

      {/* `<nav>` con `aria-current` y no `tablist` con `role="tab"`: las
          tres son navegación entre páginas, no paneles dentro de una. Un
          lector de pantalla que oye «pestaña» espera que el contenido cambie
          sin salir de la página, y aquí se sale. */}
      <Link
        href="/mazos"
        aria-current={actual === "mazos" ? "page" : undefined}
        className="pestana" data-on={actual === "mazos"}
      >
        <Icon name="deck" className="size-4" />
        {tr(lng, "x.78f2cee5")}
      </Link>
    </nav>
  );
}
