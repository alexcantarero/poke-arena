import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, settings } from "@/db/schema";
import { hashResetToken } from "@/lib/auth";
import { currentPlayer } from "@/lib/data";
import { estadoRecuperacion } from "@/lib/recuperacion";
import { RecuperarForm } from "@/components/RecuperarForm";
import { Wordmark } from "@/components/Wordmark";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/* v0.67 — Poner contraseña nueva con el enlace que te ha pasado un
   organizador. Fuera del grupo (app): es para quien NO puede entrar. Se busca
   por el hash del token; el token nunca se guarda tal cual. */

export const dynamic = "force-dynamic";
export const metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default async function RecuperarPage({ params }: { params: Promise<{ token: string }> }) {
  const lng = await getLang(); // v0.49
  const { token } = await params;
  if (await currentPlayer()) redirect("/");

  const [filas, cfgRows] = await Promise.all([
    db.select({ expiresAt: passwordResets.expiresAt, usedAt: passwordResets.usedAt })
      .from(passwordResets).where(eq(passwordResets.tokenHash, hashResetToken(token))),
    db.select().from(settings).where(eq(settings.id, "default")),
  ]);
  const cfg = cfgRows[0];
  const estado = estadoRecuperacion(filas[0]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <Wordmark name={cfg?.name ?? tr(lng, "x.1a4ba822")} season={cfg?.season ?? tr(lng, "x.825cc744")} />
      <div className="card mt-7 p-5">
        {estado.ok ? (
          <>
            <h1 className="text-2xl font-bold">{tr(lng, "rec.titulo")}</h1>
            <p className="mb-5 mt-1.5 text-sm text-ink-2">{tr(lng, "rec.sub")}</p>
            <RecuperarForm token={token} />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{tr(lng, "rec.noVale")}</h1>
            <p className="mt-2 text-sm text-ink-2">{tr(lng, `rec.motivo.${estado.motivo}`)}</p>
            <Link className="btn mt-5 w-full" href="/entrar">{tr(lng, "x.0015cd6d")}</Link>
          </>
        )}
      </div>
    </main>
  );
}
