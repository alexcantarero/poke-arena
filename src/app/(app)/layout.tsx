import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav, Sidebar } from "@/components/Nav";
import { Wordmark } from "@/components/Wordmark";
import { Avatar } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon } from "@/components/icons";
import { readSession } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { logout } from "@/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect("/entrar");

  const snap = await loadSnapshot();
  const me = snap.playersById.get(session.playerId);
  if (!me || !me.active) redirect("/entrar");

  return (
    <div className="md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      {/* ------------------------------ escritorio ------------------------------ */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-1 overflow-y-auto border-r border-line bg-surface p-3 md:flex">
        <div className="px-2 pb-4 pt-2">
          <Wordmark name={snap.config.name} season={snap.config.season} compact />
        </div>

        <Sidebar meId={me.id} />

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <Link className="btn btn-brand w-full" href="/partidas/nueva">
            <Icon name="plus" className="size-4" /> Registrar partida
          </Link>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-2">
            <Avatar player={me} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-tight">{me.name}</span>
              <span className="block text-[11px] text-muted">
                {me.role === "owner" ? "organizador" : me.role === "admin" ? "admin" : "jugador"}
              </span>
            </span>
            <ThemeToggle />
            <form action={logout}>
              <button className="btn btn-ghost btn-sm px-2" type="submit" title="Salir" aria-label="Salir">
                <Icon name="logout" className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* --------------------------------- móvil -------------------------------- */}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur md:hidden">
          <Wordmark name={snap.config.name} compact />
          <div className="flex-1" />
          <ThemeToggle />
          <Link className="btn btn-ghost btn-sm px-2" href="/mas" aria-label="Más secciones">
            <Icon name="more" className="size-5" />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-nav pt-4 sm:px-6 md:pb-10 md:pt-6">
          {children}
        </main>
      </div>

      <BottomNav meId={me.id} />
    </div>
  );
}
