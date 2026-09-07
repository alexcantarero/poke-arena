import { redirect } from "next/navigation";
import { db } from "@/db";
import { players, settings } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { effectiveInviteCode, readSession } from "@/lib/auth";
import { EnterForm } from "@/components/EnterForm";

export const dynamic = "force-dynamic";

export default async function EnterPage() {
  const session = await readSession();
  if (session) redirect("/");

  const [cfgRows, list] = await Promise.all([
    db.select().from(settings).where(eq(settings.id, "default")),
    db.select().from(players).where(eq(players.active, true)).orderBy(asc(players.name)),
  ]);
  const needsCode = Boolean(effectiveInviteCode(cfgRows[0]?.inviteCode ?? ""));

  return (
    <div className="pagebox">
      <div className="row" style={{ gap: 12, marginBottom: 18 }}>
        <div className="brand-mark" style={{ width: 38, height: 38 }} aria-hidden="true" />
        <div>
          <div className="brand-txt" style={{ fontSize: 26 }}>{cfgRows[0]?.name ?? "Arena"}</div>
          <div className="brand-sub">{cfgRows[0]?.season ?? "Liga privada de Pokémon TCG"}</div>
        </div>
      </div>
      <div className="card card-pad">
        {list.length === 0 ? (
          <>
            <h2>Todavía no hay jugadores</h2>
            <p className="hint" style={{ marginTop: 8 }}>
              Ejecuta <code>npm run db:seed</code> para crear la liga con datos de ejemplo, o añade
              el primer jugador directamente en la base de datos.
            </p>
          </>
        ) : (
          <EnterForm players={list} needsCode={needsCode} />
        )}
      </div>
      <p className="hint" style={{ marginTop: 14, textAlign: "center" }}>
        El acceso se guarda en este navegador. Para entrar como otra persona, sal desde la barra lateral.
      </p>
    </div>
  );
}
