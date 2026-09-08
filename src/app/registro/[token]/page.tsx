import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invites, settings } from "@/db/schema";
import { INVITE_MESSAGES, inviteState } from "@/lib/auth";
import { currentPlayer } from "@/lib/data";
import { RegisterForm } from "@/components/RegisterForm";
import { Wordmark } from "@/components/Wordmark";

export const dynamic = "force-dynamic";
export const metadata = { title: "Unirte a la liga" };

export default async function RegisterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (await currentPlayer()) redirect("/");

  const [inviteRows, cfgRows] = await Promise.all([
    db.select().from(invites).where(eq(invites.token, token)),
    db.select().from(settings).where(eq(settings.id, "default")),
  ]);
  const cfg = cfgRows[0];
  const state = cfg && !cfg.registrationOpen
    ? ({ ok: false, reason: "closed" } as const)
    : inviteState(inviteRows[0]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <Wordmark name={cfg?.name ?? "Arena"} season={cfg?.season ?? "Liga privada de Pokémon TCG"} />

      <div className="card mt-7 p-5">
        {state.ok ? (
          <>
            <h1 className="text-2xl font-bold">Te has apuntado a la liga</h1>
            <p className="mt-1.5 mb-5 text-sm text-ink-2">
              Rellena esto y ya estás dentro. Podrás cambiarlo todo después desde tu perfil.
            </p>
            <RegisterForm token={token} />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">
              {state.reason === "closed" ? "Las altas están cerradas" : "Esta invitación no sirve"}
            </h1>
            <p className="mt-2 text-sm text-ink-2">
              {state.reason === "closed"
                ? "El organizador ha cerrado las inscripciones. Habla con él si crees que es un error."
                : INVITE_MESSAGES[state.reason]}
            </p>
            <Link className="btn mt-5 w-full" href="/entrar">Ir a la pantalla de acceso</Link>
          </>
        )}
      </div>
    </main>
  );
}
