import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { currentPlayer } from "@/lib/data";
import { RegisterForm } from "@/components/RegisterForm";
import { Wordmark } from "@/components/Wordmark";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";
export const metadata = { title: "Unirte a la liga" };

/**
 * Alta escribiendo el código a mano.
 *
 * `/registro/<token>` es el camino normal: abres el enlace y el código va ya
 * puesto. Esta pantalla es para quien llega a `/entrar` sin cuenta —el caso de
 * Alex— y tiene el código por WhatsApp pero no el enlace entero, o lo abrió en
 * otro móvil.
 *
 * El código es la última parte del enlace, así que se acepta pegado completo y
 * se recorta: nadie va a mirar dónde acaba la URL y dónde empieza el token.
 */
export default async function RegisterCodePage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const lng = await getLang(); // v0.49

  if (await currentPlayer()) redirect("/");
  const { codigo } = await searchParams;

  const cfgRows = await db.select().from(settings).where(eq(settings.id, "default"));
  const cfg = cfgRows[0];
  const open = cfg?.registrationOpen ?? true;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <Wordmark name={cfg?.name ?? tr(lng, "x.1a4ba822")} season={cfg?.season ?? tr(lng, "x.825cc744")} />

      <div className="card mt-7 p-5">
        {open ? (
          <>
            <h1 className="text-2xl font-bold">{tr(lng, "x.4ba24099")}</h1>
            <p className="mt-1.5 mb-5 text-sm text-ink-2">
              Necesitas un código de invitación. Si te han mandado un enlace, ábrelo y esto se
              rellena solo; si solo tienes el código, pégalo aquí.
            </p>
            <RegisterForm token={codigo ?? ""} askForToken />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{tr(lng, "x.7d76e082")}</h1>
            <p className="mt-2 text-sm text-ink-2">
              {tr(lng, "x.0fa08731")}
            </p>
          </>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/entrar" className="underline underline-offset-2">{tr(lng, "x.7573ba85")}</Link>
      </p>
    </main>
  );
}
