import { Suspense } from "react";
import { FilterMemory } from "@/components/FilterMemory";
import { SeasonFx } from "@/components/SeasonFx";
import { SeasonPokemonTrigger } from "@/components/SeasonPokemonTrigger";
import { estacionDe } from "@/lib/estacion";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav, Sidebar } from "@/components/Nav";
import { Wordmark } from "@/components/Wordmark";
import { subtituloLiga } from "@/lib/marca";
import { Avatar } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangToggle } from "@/components/LangToggle";
import { LangProvider } from "@/components/LangProvider";
import { getLang, inglesDisponible } from "@/lib/lang";
import { tr } from "@/lib/i18n";
import { Icon } from "@/components/icons";
import { Snackbar } from "@/components/Snackbar";
import { readSession } from "@/lib/auth";
import { currentPlayer, loadConfig } from "@/lib/data";
import { logout } from "@/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect("/entrar");

  // v0.28: el layout envuelve TODAS las pantallas, así que lo que pida aquí lo
  // paga cada visita a cualquier página. Antes pedía `loadSnapshot()` —las 13
  // tablas, con todas las partidas y todos los juegos— para sacar dos cosas: el
  // jugador de la sesión y el nombre de la liga. Ahora son dos consultas
  // pequeñas. Una pantalla que de verdad necesite el snapshot lo sigue pidiendo
  // por su cuenta, y `cache()` evita repetir la fila de ajustes.
  const [me, cfg, lang] = await Promise.all([currentPlayer(), loadConfig(), getLang()]);
  // v0.48 — el botón de idioma solo sale donde el inglés está disponible.
  const conIngles = inglesDisponible();
  const estacion = estacionDe(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date()));
  if (!me) redirect("/entrar");

  return (
    // v0.49 — el idioma, para que cualquier componente de cliente lo pida con
    // `useLang()` en vez de recibirlo por props de componente en componente.
    <LangProvider lang={lang}>
    <div className="app-shell md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      {/* v0.22: partículas de temporada al fondo (detrás de todo). */}
      <SeasonFx estacion={estacion} />
      {/* ------------------------------ escritorio ------------------------------ */}
      {/* v0.22: barra lateral oscura en los dos temas, a lo Argo CD. */}
      <aside className="shell-dark sticky top-0 hidden h-dvh flex-col gap-1 overflow-y-auto border-r border-line p-3 md:flex">
        <div className="season-strip -mx-3 -mt-3 mb-2" aria-hidden="true" />
        <div className="px-2 pb-4 pt-2">
          {/* v0.17: la marca es la app; la liga y la temporada van debajo. */}
          {/* v0.19: debajo solo la temporada («SEASON 1»), sin repetir la marca. */}
          <Wordmark name={tr(lang, "app.name")} season={subtituloLiga(cfg.name, cfg.season)} compact />
          <SeasonPokemonTrigger
            estacion={estacion}
            className="meta-kv mt-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-info"
          >
            <span aria-hidden="true">{estacion.emblema}</span> <b>ESTACI&Oacute;N</b> {estacion.nombre.toLowerCase()}
          </SeasonPokemonTrigger>
        </div>

        <Sidebar meId={me.id} lang={lang} />

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <Link className="btn btn-brand w-full" href="/partidas/nueva">
            <Icon name="plus" className="size-4" /> {tr(lang, "shell.newMatch")}
          </Link>
                    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-2">
            <div className="flex items-center gap-2">
              <Avatar player={me} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold leading-tight">{me.name}</span>
                <span className="block truncate text-[11px] text-muted">
                  {tr(lang, me.role === "owner" ? "role.owner" : me.role === "admin" ? "role.admin" : "role.player")}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-end gap-1 border-t border-line-soft pt-2">
              {/* v0.50 — versión, rama y commit de ESTE despliegue. En producción, la
                  versión y el commit; en una vista previa, también la rama, en ámbar,
                  para que no se confunda con producción. Toca para ver todo. */}
              <span
                className={`mr-auto pl-1 text-[10px] font-mono ${process.env.NEXT_PUBLIC_DEPLOY_ENV === "preview" ? "text-brand" : "text-muted"}`}
                title={`v${process.env.NEXT_PUBLIC_APP_VERSION} · ${process.env.NEXT_PUBLIC_DEPLOY_ENV}${process.env.NEXT_PUBLIC_GIT_REF ? ` · ${process.env.NEXT_PUBLIC_GIT_REF}` : ""}${process.env.NEXT_PUBLIC_GIT_SHA ? ` @ ${process.env.NEXT_PUBLIC_GIT_SHA}` : ""}`}
              >
                v{process.env.NEXT_PUBLIC_APP_VERSION}
                {process.env.NEXT_PUBLIC_DEPLOY_ENV === "preview" && process.env.NEXT_PUBLIC_GIT_REF ? ` · ${process.env.NEXT_PUBLIC_GIT_REF}` : ""}
                {process.env.NEXT_PUBLIC_GIT_SHA ? ` @${process.env.NEXT_PUBLIC_GIT_SHA}` : ""}
              </span>
              {conIngles && <LangToggle lang={lang} />}
              <ThemeToggle />
              <form action={logout}>
                <button className="btn btn-ghost btn-sm px-2 text-muted hover:text-loss" type="submit" title={tr(lang, "shell.logout")} aria-label={tr(lang, "shell.logout")}>
                  <Icon name="logout" className="size-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* --------------------------------- móvil -------------------------------- */}
      <div className="min-w-0">
        {/* `viewportFit: "cover"` en el layout raíz hace que la web pinte por
            debajo de la muesca; sin `safe-top`, en un iPhone el título queda
            medio tapado. `--safe-extra` es el padding que tendría de todas
            formas, porque en un móvil sin muesca `env()` vale 0. */}
        <header
          className="shell-dark safe-top sticky top-0 z-30 flex items-center gap-2 border-b border-line px-4 pb-2 md:hidden"
          style={{ "--safe-extra": "0.5rem" } as React.CSSProperties}
        >
          {/* `min-w-0 flex-1` y no un hueco aparte: con un nombre de liga largo
              lo que se recorta es el texto, no los botones de la derecha. */}
          <div className="min-w-0 flex-1">
            <Wordmark name={tr(lang, "app.name")} season={subtituloLiga(cfg.name, cfg.season)} compact />
          </div>
          <SeasonPokemonTrigger
            estacion={estacion}
            className="flex-none rounded-md p-1 text-lg outline-none focus-visible:ring-2 focus-visible:ring-info"
          >
            <span aria-hidden="true">{estacion.emblema}</span>
          </SeasonPokemonTrigger>
          {conIngles && <LangToggle lang={lang} />}
          <ThemeToggle />
          <Link className="btn btn-ghost btn-sm px-2" href="/mas" aria-label={tr(lang, "nav.moreSections")}>
            <Icon name="more" className="size-5" />
          </Link>
        </header>

        {/* v0.20: 12px de margen lateral por debajo de 400px (antes 16): en un
            móvil de 360px son 8px más de tarjeta para tablas y gráficas. */}
        <main className="mx-auto w-full max-w-5xl px-3 pb-nav-safe pt-3 xs:px-4 xs:pt-4 sm:px-6 md:pb-10 md:pt-6">
          {children}
        </main>
      </div>

      <BottomNav meId={me.id} lang={lang} />

      {/* El aviso de «guardado correctamente» / «no se ha podido guardar».
          Va aquí, en el layout, y no en cada pantalla: el mensaje lo deja una
          Server Action en la URL justo antes de redirigir, así que tiene que
          haber alguien escuchando en CUALQUIER página a la que se redirija.

          Existía desde la v0.5.0 pero no estaba montado en ningún sitio, que
          es exactamente por qué no aparecía nunca.

          El <Suspense> no es opcional: `useSearchParams` lo exige, y sin él
          `next build` falla al prerenderizar. */}
      <Suspense fallback={null}>
        <Snackbar />
        {/* v0.21: recuerda los filtros de Ranking, Estadísticas y Resultados. */}
        <FilterMemory />
      </Suspense>
    </div>
    </LangProvider>
  );
}
