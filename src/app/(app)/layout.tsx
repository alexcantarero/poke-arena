import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Avatar } from "@/components/ui";
import { readSession } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { logout } from "@/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect("/entrar");

  const snap = await loadSnapshot();
  const me = snap.playersById.get(session.playerId);
  if (!me) redirect("/entrar");

  return (
    <div className="app">
      <nav className="rail" aria-label="Navegación principal">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <div className="brand-txt">{snap.config.name.split(" ")[0] || "Arena"}</div>
            <div className="brand-sub">{snap.config.season}</div>
          </div>
        </div>
        <Nav meId={me.id} />
        <div className="rail-foot">
          <Link className="btn btn-gold" href="/partidas/nueva" style={{ width: "100%" }}>
            Registrar partida
          </Link>
          <form action={logout}>
            <button className="whoami" type="submit" title="Cambiar de jugador o salir">
              <Avatar player={me} size="sm" />
              <span style={{ minWidth: 0 }}>
                <span className="nm">{me.name}</span>
                <br />
                <span className="rl">{me.isAdmin ? "organizador · salir" : "jugador · salir"}</span>
              </span>
            </button>
          </form>
        </div>
      </nav>
      <div>
        <div className="topbar">
          <div className="brand-mark" style={{ width: 24, height: 24 }} aria-hidden="true" />
          <b style={{ fontFamily: "var(--f-display)", fontSize: 17, textTransform: "uppercase" }}>
            {snap.config.name.split(" ")[0] || "Arena"}
          </b>
          <div className="spacer" />
          <Link className="btn btn-gold btn-sm" href="/partidas/nueva">+ Partida</Link>
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}
