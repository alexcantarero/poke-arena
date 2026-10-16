import Link from "next/link";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/* El 404 de las URLs que no encajan con ninguna ruta —las de fuera del grupo
   con sesión incluidas—. No lleva barra lateral ni barra inferior porque a
   este punto se llega sin saber todavía si hay alguien dentro; el enlace va a
   la portada y allí ya decide el layout si toca entrar. */
export default async function NotFound() {
  const lng = await getLang(); // v0.49

  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm">
        <p className="label">{tr(lng, "x.1a4ba822")}</p>
        <h1 className="mt-2 font-display text-6xl font-extrabold leading-none text-muted">404</h1>
        <h2 className="mt-3 text-xl font-bold">{tr(lng, "x.2e2919d6")}</h2>
        <p className="mt-2 text-sm text-muted">
          {tr(lng, "x.cffaa262")}
        </p>
        <Link className="btn btn-brand mt-6" href="/">{tr(lng, "x.099af5f0")}</Link>
      </div>
    </main>
  );
}
