"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";
import { MOBILE_HREFS, NAV_ITEMS, type NavItem as Item } from "@/lib/nav";

function useActive() {
  const path = usePathname();
  return (href: string) => {
    if (href === "/") return path === "/";
    return path === href || path.startsWith(href + "/");
  };
}

/** Barra lateral: solo en pantallas anchas. */
export function Sidebar({ meId }: { meId: string }) {
  const isActive = useActive();
  const items = [...NAV_ITEMS, { href: `/perfil/${meId}`, label: "Mi perfil", icon: "user" }];
  return (
    <nav aria-label="Secciones" className="flex flex-col gap-0.5">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={isActive(it.href) ? "page" : undefined}
          className={`tap justify-start rounded-lg px-3 text-sm font-medium transition-colors
            ${isActive(it.href)
              ? "bg-surface-3 font-semibold text-ink"
              : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
        >
          <Icon name={it.icon} className={isActive(it.href) ? "size-5 text-brand" : "size-5 text-muted"} />
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Barra inferior en móvil. Cuatro destinos y un botón central grande para lo
 * que más se hace: registrar una partida durante el torneo.
 */
export function BottomNav({ meId }: { meId: string }) {
  const isActive = useActive();
  const items = NAV_ITEMS.filter((i) => MOBILE_HREFS.includes(i.href));

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur
                 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-1 pt-1">
        {items.slice(0, 2).map((it) => <Tab key={it.href} item={it} active={isActive(it.href)} />)}

        <div className="flex justify-center">
          <Link
            href="/partidas/nueva"
            aria-label="Registrar partida"
            className="-mt-5 flex size-14 items-center justify-center rounded-full border-4 border-ground
                       bg-brand text-on-brand shadow-lg active:scale-95"
          >
            <Icon name="plus" className="size-7" />
          </Link>
        </div>

        {items.slice(2).map((it) => <Tab key={it.href} item={it} active={isActive(it.href)} />)}
        <Tab item={{ href: `/perfil/${meId}`, label: "Perfil", icon: "user" }} active={isActive("/perfil")} />
      </div>
    </nav>
  );
}

function Tab({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-semibold
        ${active ? "text-brand" : "text-muted"}`}
    >
      <Icon name={item.icon} className="size-6" />
      <span className="leading-none">{item.label}</span>
    </Link>
  );
}
