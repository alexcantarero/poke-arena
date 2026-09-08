import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPlayer } from "@/lib/data";
import { db } from "@/db";
import { players, settings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { LoginForm } from "@/components/LoginForm";
import { Wordmark } from "@/components/Wordmark";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  // Solo rebotamos a la portada si la sesión corresponde a alguien que de
  // verdad puede entrar. Si no, se enseña el formulario.
  if (await currentPlayer()) redirect("/");

  const [cfgRows, count] = await Promise.all([
    db.select().from(settings).where(eq(settings.id, "default")),
    db.select({ n: sql<number>`count(*)::int` }).from(players),
  ]);
  const cfg = cfgRows[0];
  const empty = (count[0]?.n ?? 0) === 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <Wordmark name={cfg?.name ?? "Arena"} season={cfg?.season ?? "Liga privada de Pokémon TCG"} />

      {empty ? (
        <div className="card mt-7 p-5">
          <h2 className="text-2xl font-bold">Aún no hay nadie</h2>
          <p className="mt-2 text-sm text-ink-2">
            Esta liga está recién instalada. Crea la primera invitación con{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[13px]">npm run invite</code>{" "}
            y ábrela para darte de alta: el primero en entrar se queda como organizador.
          </p>
        </div>
      ) : (
        <div className="card mt-7 p-5">
          <LoginForm />
        </div>
      )}

      <p className="mt-5 text-center text-sm text-muted">
        ¿Tienes un enlace de invitación? Ábrelo y te das de alta desde ahí.
      </p>
      <p className="mt-1 text-center text-sm text-muted">
        <Link href="/" className="underline underline-offset-2">Volver</Link>
      </p>
    </main>
  );
}
