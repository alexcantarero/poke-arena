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
export const metadata = {
  title: "PokeArena TCG · Liga de Pokémon TCG",
  description: "Liga de Pokémon TCG con ranking y Elo, torneos, Championship Points, modo torneo sin cobertura y estadísticas de mazos. Crea tu cuenta y apunta tus partidas.",
  robots: { index: true, follow: true }, // v0.135 — la portada pública: es la que tiene que salir en Google
  alternates: { canonical: "/entrar" },
};

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

      {/* v0.135 — qué es esto, para quien llega desde Google. */}
      <section className="mt-6 text-sm text-ink-2" aria-labelledby="que-es">
        <h2 id="que-es" className="mb-1.5 font-display text-lg font-bold text-ink">{tr(lng, "v135.queEs")}</h2>
        <p>{tr(lng, "v135.queEsTexto")}</p>
      </section>

      {/* v0.67 — no hay correo: la recuperación la da un organizador. */}
      {!empty && <p className="mt-4 text-center text-sm text-muted">{tr(lng, "rec.olvidaste")}</p>}
      <p className="mt-3 text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-ink underline underline-offset-2" /* v0.135 — con registro libre, sin invitación */>
          {tr(lng, "x.86684350")}
        </Link>
      </p>
      <p className="mt-1 text-center text-sm text-muted">
        <Link href="/" className="underline underline-offset-2">{tr(lng, "x.84a715a7")}</Link>
      </p>
      {/* v0.134 — lo legal, a la vista antes de entrar. */}
      <p className="mt-6 text-center text-xs text-muted">
        <Link href="/privacidad" className="underline underline-offset-2">{tr(lng, "v134.privacidad")}</Link>
        {" · "}
        <Link href="/condiciones" className="underline underline-offset-2">{tr(lng, "v134.condiciones")}</Link>
      </p>
    </main>
  );
}
