import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPlayer } from "@/lib/data";
import { db } from "@/db";
import { players, settings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { LoginForm } from "@/components/LoginForm";
import { Wordmark } from "@/components/Wordmark";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const lng = await getLang(); // v0.49

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
      <Wordmark name={cfg?.name ?? tr(lng, "x.1a4ba822")} season={cfg?.season ?? tr(lng, "x.825cc744")} />

      {empty ? (
        <div className="card mt-7 p-5">
          <h2 className="text-2xl font-bold">{tr(lng, "x.12afd7a3")}</h2>
          <p className="mt-2 text-sm text-ink-2">
            Esta liga está recién instalada. Crea la primera invitación con{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[13px]">{tr(lng, "x.261d9269")}</code>{" "}
            y ábrela para darte de alta: el primero en entrar se queda como organizador.
          </p>
        </div>
      ) : (
        <div className="card mt-7 p-5">
          <LoginForm />
        </div>
      )}

      <p className="mt-5 text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-ink underline underline-offset-2">
          {tr(lng, "x.86684350")}
        </Link>
      </p>
      <p className="mt-1 text-center text-sm text-muted">
        <Link href="/" className="underline underline-offset-2">{tr(lng, "x.84a715a7")}</Link>
      </p>
    </main>
  );
}
