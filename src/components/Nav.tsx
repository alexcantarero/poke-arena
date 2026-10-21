"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";
import { MOBILE_HREFS, NAV_GROUPS_VISIBLES, NAV_ITEMS, type NavItem as Item } from "@/lib/nav";
import { tr, type Lang } from "@/lib/i18n";

/** v0.17: el texto de una sección en el idioma elegido (la clave es la ruta). */
const labelOf = (lang: Lang, it: Item) => (it.href.startsWith("/perfil/") ? it.label : tr(lang, `nav.${it.href}`));

function useActive() {
  const path = usePathname();
  return (href: string) => {
    if (href === "/") return path === "/";
    if (path === href || path.startsWith(href + "/")) return true;
    // v0.40 — /mazos vive dentro de Top Decks: ya no tiene entrada propia en
    // el menú, así que estando en la biblioteca se ilumina Top Decks. Si no,
    // el menú no marcaría nada y parecería que estás fuera de la app.
    return href === "/topdecks" && (path === "/mazos" || path.startsWith("/mazos/"));
  };
}

/** Barra lateral: solo en pantallas anchas. Agrupada (v0.16, ver `lib/nav.ts`). */
export function Sidebar({ meId, lang = "es", pendientes = 0 }: { meId: string; lang?: Lang; pendientes?: number }) {
  const isActive = useActive();
  const groups = NAV_GROUPS_VISIBLES.map((g) =>
    g.key === "nav.group.account"
      ? { ...g, items: [{ href: `/perfil/${meId}`, label: tr(lang, "nav.myProfile"), icon: "user" }, ...g.items] }
      : g);
  return (
    <nav aria-label={tr(lang, "nav.sections")} className="flex flex-col gap-3">
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-0.5">
          <span className="px-3 pb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            {tr(lang, g.key)}
          </span>
          {g.items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive(it.href) ? "page" : undefined}
              data-on={isActive(it.href) ? "true" : "false"}
              className={`nav-side tap relative justify-start rounded-lg px-3 text-sm font-medium transition-colors
                ${isActive(it.href)
                  ? "bg-surface-3 font-semibold text-ink"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
            >
              <Icon name={it.icon} className={isActive(it.href) ? "size-5 text-brand" : "size-5 text-muted"} />
              {labelOf(lang, it)}
              {/* v0.54 — tus partidas sin resultado, sobre «Liga». */}
              {it.href === "/competiciones" && pendientes > 0 && (
                <span className="ml-auto rounded-full bg-brand px-1.5 text-[11px] font-bold tabular text-on-brand" aria-label={`${pendientes}`}>{pendientes}</span>
              )}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

/**
 * Barra inferior en móvil. Cuatro destinos y un botón central grande para lo
 * que más se hace: registrar una partida durante el torneo.
 */
export function BottomNav({ meId, lang = "es", pendientes = 0 }: { meId: string; lang?: Lang; pendientes?: number }) {
  const isActive = useActive();
  // En el orden de MOBILE_HREFS, no en el de la barra lateral: Estadísticas
  // ocupa el hueco que tenía Ranking, a la izquierda del «+».
  const items = MOBILE_HREFS
    .map((h) => NAV_ITEMS.find((i) => i.href === h))
    .filter((i): i is Item => Boolean(i));

  return (
    <nav
      aria-label={tr(lang, "nav.sections")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur
                 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-1 pt-1">
        {items.slice(0, 2).map((it) => <Tab key={it.href} item={{ ...it, label: labelOf(lang, it) }} active={isActive(it.href)} badge={it.href === "/" ? pendientes : 0} />)}

        <div className="flex justify-center">
          <Link
            href="/partidas/nueva"
            aria-label={tr(lang, "shell.newMatch")}
            className="press -mt-5 flex size-14 items-center justify-center rounded-full border-4 border-ground
                       bg-brand text-on-brand active:scale-95"
            style={{ boxShadow: "var(--shadow-3)" }}
          >
            <Icon name="plus" className="size-7" />
          </Link>
        </div>

        {items.slice(2).map((it) => <Tab key={it.href} item={{ ...it, label: labelOf(lang, it) }} active={isActive(it.href)} />)}
        <Tab item={{ href: `/perfil/${meId}`, label: tr(lang, "nav.profile"), icon: "user" }} active={isActive("/perfil")} />
      </div>
    </nav>
  );
}

/**
 * Una pestaña de la barra inferior.
 *
 * La activa no cambia solo de color: lleva una pastilla tenue detrás. El
 * color solo se pierde en cuanto la pantalla está a pleno sol, y esto se usa
 * de pie, en un torneo, con el móvil en la mano. La forma sí se ve.
 *
 * La pastilla, el hundido al tocar y el color están en `.nav-tab`
 * (globals.css), para que se toquen en un sitio y no en cuatro.
 */
function Tab({ item, active, badge = 0 }: { item: Item; active: boolean; badge?: number }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      data-on={active ? "true" : "false"}
      className="nav-tab relative"
    >
      <Icon name={item.icon} className="size-6" />
      {/* v0.54 — el número de partidas tuyas sin resultado. */}
      {badge > 0 && (
        <span className="absolute right-[calc(50%-1.1rem)] top-1 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] font-bold leading-4 tabular text-on-brand">{badge}</span>
      )}
      <span className="leading-none">{item.label}</span>
    </Link>
  );
}
