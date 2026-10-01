import Link from "next/link";
import { readSession } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { moreGroups } from "@/lib/nav";
import { Icon } from "@/components/icons";
import { Avatar, PageHead } from "@/components/ui";
import { logout } from "@/actions";

export const metadata = { title: "Más" };

/** Las secciones que no caben en la barra inferior del móvil. */
export default async function MorePage() {
  const [snap, session] = await Promise.all([loadSnapshot(), readSession()]);
  const me = session ? snap.playersById.get(session.playerId) : undefined;

  return (
    <>
      <PageHead title="Más" />

      {me && (
        <Link href={`/perfil/${me.id}`} className="card mb-4 flex items-center gap-3 p-4 hover:bg-surface-2">
          <Avatar player={me} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-lg font-bold">{me.name}</span>
            <span className="block text-sm text-muted">
              {me.role === "owner" ? "Organizador" : me.role === "admin" ? "Administrador" : "Jugador"}
            </span>
          </span>
          <Icon name="back" className="size-5 rotate-180 text-muted" />
        </Link>
      )}

      {moreGroups().map((g) => (
        <section key={g.title} className="mb-4">
          <h2 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{g.title}</h2>
          <nav className="card divide-y divide-line-soft">
            {g.items.map((s) => (
              <Link key={s.href} href={s.href} className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface-2">
                <Icon name={s.icon} className="size-5 text-muted" />
                <span className="flex-1 font-medium">{s.label}</span>
                <Icon name="back" className="size-4 rotate-180 text-muted" />
              </Link>
            ))}
          </nav>
        </section>
      ))}

      <form action={logout} className="mt-4">
        <button className="btn btn-danger w-full" type="submit">
          <Icon name="logout" className="size-4" /> Salir de la cuenta
        </button>
      </form>
    </>
  );
}
