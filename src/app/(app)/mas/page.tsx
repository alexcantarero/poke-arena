import Link from "next/link";
import { currentPlayer } from "@/lib/data";
import { moreGroups } from "@/lib/nav";
import { Icon } from "@/components/icons";
import { NavIcono } from "@/components/NavIcono";
import { Avatar, PageHead } from "@/components/ui";
import { logout } from "@/actions";
import { getLang } from "@/lib/lang";
import { tr } from "@/lib/i18n";

export const metadata = { title: "Más" };

/** Las secciones que no caben en la barra inferior del móvil. */
export default async function MorePage() {
  // v0.28: de aquí solo salía el jugador de la sesión.
  const [player, lang] = await Promise.all([currentPlayer(), getLang()]);
  const me = player ?? undefined;

  return (
    <>
      <PageHead title={tr(lang, "nav.more")} />

      {me && (
        <Link href={`/perfil/${me.id}`} className="card mb-4 flex items-center gap-3 p-4 hover:bg-surface-2">
          <Avatar player={me} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-lg font-bold">{me.name}</span>
            <span className="block text-sm text-muted">
              {tr(lang, me.role === "owner" ? "role.owner" : me.role === "admin" ? "role.admin" : "role.player")}
            </span>
          </span>
          <Icon name="back" className="size-5 rotate-180 text-muted" />
        </Link>
      )}

      {moreGroups().map((g) => (
        <section key={g.key} className="mb-4">
          <h2 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{tr(lang, g.key)}</h2>
          <nav className="card divide-y divide-line-soft">
            {g.items.map((s) => (
              <Link key={s.href} href={s.href} className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface-2">
                <NavIcono sprite={s.sprite} icon={s.icon} className="size-7" />
                <span className="flex-1 font-medium">{tr(lang, `nav.${s.href}`)}</span>
                <Icon name="back" className="size-4 rotate-180 text-muted" />
              </Link>
            ))}
          </nav>
        </section>
      ))}

      <form action={logout} className="mt-4">
        <button className="btn btn-danger w-full" type="submit">
          <Icon name="logout" className="size-4" /> {tr(lang, "shell.logoutLong")}
        </button>
      </form>
    </>
  );
}
