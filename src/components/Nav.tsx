"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5",
  rank: "M4 20h4V9H4zM10 20h4V4h-4zM16 20h4v-7h-4z",
  res: "M4 6h16M4 12h16M4 18h10",
  cal: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  stats: "M4 19V5m0 14h16M8 16v-5m4 5V8m4 8v-3",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-6 8-6s8 2 8 6",
  deck: "M8 4h11v13H8zM5 7v13h11",
  cup: "M7 4h10v4a5 5 0 0 1-10 0zM9 18h6M12 13v5M5 6H3v2a4 4 0 0 0 4 4M19 6h2v2a4 4 0 0 1-4 4",
  cog: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM12 2v3m0 14v3M2 12h3m14 0h3M4.5 4.5 6.6 6.6m10.8 10.8 2.1 2.1M19.5 4.5 17.4 6.6M6.6 17.4 4.5 19.5",
};

export function Nav({ meId }: { meId: string }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "Inicio", icon: "home" },
    { href: "/ranking", label: "Ranking", icon: "rank" },
    { href: "/resultados", label: "Resultados", icon: "res" },
    { href: "/calendario", label: "Calendario", icon: "cal" },
    { href: "/estadisticas", label: "Estadísticas", icon: "stats" },
    { href: `/perfil/${meId}`, label: "Perfil", icon: "user" },
    { href: "/mazos", label: "Mazos", icon: "deck" },
    { href: "/competiciones", label: "Competiciones", icon: "cup" },
    { href: "/ajustes", label: "Ajustes", icon: "cog" },
  ];
  return (
    <div className="nav">
      {items.map((it) => {
        const base = it.href.split("?")[0];
        const on = base === "/" ? path === "/" : path.startsWith(base.split("/").slice(0, 2).join("/"));
        return (
          <Link key={it.label} href={it.href} className={on ? "on" : ""}>
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICONS[it.icon]} />
            </svg>
            <span className="lbl">{it.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
