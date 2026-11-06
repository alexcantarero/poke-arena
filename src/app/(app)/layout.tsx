import { HuevosGlobales } from "@/components/Huevos";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { FilterMemory } from "@/components/FilterMemory";
import { SeasonFx } from "@/components/SeasonFx";
import { SeasonPokemonTrigger } from "@/components/SeasonPokemonTrigger";
import { estacionDe } from "@/lib/estacion";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav, Sidebar } from "@/components/Nav";
import { DISCORD_INVITATION_URL } from "@/lib/nav";
import { Wordmark } from "@/components/Wordmark";
import { subtituloLiga } from "@/lib/marca";
import { Avatar } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangToggle } from "@/components/LangToggle";
import { LangProvider } from "@/components/LangProvider";
import { BarraToggle } from "@/components/BarraToggle";
import { LideresMargen } from "@/components/LideresMargen";
import { Tutorial } from "@/components/Tutorial";
import { TutorialPagina } from "@/components/TutorialPagina";
import { getLang, inglesDisponible } from "@/lib/lang";
import { tr } from "@/lib/i18n";
import { Icon } from "@/components/icons";
import { urlDeObjeto } from "@/lib/objetos";
import { nivelDeUso } from "@/lib/logros";
import { usoLigeroDeJugador } from "@/lib/perfilUso";
import { tituloParaBarra } from "@/lib/perfilTituloBarra";
import { Snackbar } from "@/components/Snackbar";
import { LogroAviso } from "@/components/LogroAviso";
import { CelebrarBall } from "@/components/CelebrarBall";
import { AvisoVersion } from "@/components/AvisoVersion";
import { readSession } from "@/lib/auth";
import { cargarPendientesDe, currentPlayer, loadConfig, tutorialPendiente, tutorialesVistos } from "@/lib/data";
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
  // v0.56 — la barra lateral plegada o no: la cookie se lee aquí para que la página llegue ya bien, sin parpadeo.
  const barraMini = (await cookies()).get("arena-barra")?.value === "mini";
  if (!me) redirect("/entrar");
  /* v0.95 — las cuatro lecturas del jugador, A LA VEZ. Iban una detrás de otra
     (tutorial v0.60, páginas vistas v0.61, pendientes v0.54 y la Ball de la
     v0.94): cuatro viajes seguidos a Neon en CADA página. En paralelo, la espera
     es la del más lento. */
  const [verTutorial, paginasVistas, misPendientes, usoLigero, tituloBarra] = await Promise.all([
    tutorialPendiente(me.id), // v0.60
    tutorialesVistos(me.id), // v0.61
    cargarPendientesDe(me.id), // v0.54 — mis partidas sin resultado: el número del menú.
    usoLigeroDeJugador(me.id, me.logros), // v0.94
    barraMini ? null : tituloParaBarra(me, cfg),
  ]);
  const estacion = estacionDe(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date()));
  const ballUso = nivelDeUso(usoLigero);
  const nombreBall = tr(lang, `logro.ball.${ballUso.nivel.ball}`);

  return (
    // v0.49 — el idioma, para que cualquier componente de cliente lo pida con
    // `useLang()` en vez de recibirlo por props de componente en componente.
    <LangProvider lang={lang}>
    <div className="app-shell md:grid md:grid-cols-[13.5rem_minmax(0,1fr)]" data-barra={barraMini ? "mini" : undefined}>
      {/* v0.22: partículas de temporada al fondo (detrás de todo). */}
      <SeasonFx estacion={estacion} />
      {/* ------------------------------ escritorio ------------------------------ */}
      {/* v0.22: barra lateral oscura en los dos temas, a lo Argo CD. */}
      <aside className="shell-dark barra-lateral sticky top-0 hidden h-dvh flex-col gap-1 overflow-y-auto border-r border-line p-3 md:flex">
        <div className="season-strip -mx-3 -mt-3 mb-2" aria-hidden="true" />
        {/* v0.65 — el botón de plegar ya no va aquí arriba: es la Poké Ball del
            borde de la barra, a la altura de «Análisis» (ver BarraToggle). */}
        <BarraToggle mini={barraMini} />
        <div className="barra-texto px-2 pb-4 pt-2">
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

        <Sidebar meId={me.id} lang={lang} pendientes={misPendientes.length} />

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <Link className="btn btn-brand w-full" href="/partidas/nueva" data-tour="registrar">
            <Icon name="plus" className="size-4" /> <span className="barra-texto">{tr(lang, "shell.newMatch")}</span>
          </Link>
          {/* v0.68 — la tarjeta del pie con fondo propio (`.barra-pie`) e iconos más grandes. */}
          <div className="barra-pie flex flex-col gap-2 rounded-xl border p-2">
            {/* v0.106 — orden pedido: el avatar a la izquierda con el nombre y el
                rol a su derecha, la Poké Ball (más grande) al final de esa fila,
                y la etiqueta del título DEBAJO del avatar, en su propia línea. */}
            <Link href={`/perfil/${me.id}`} className="flex flex-col gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <span className="flex min-w-0 items-center gap-2">
                <Avatar player={me} size="sm" />
                <span className="barra-texto flex min-w-0 flex-1 items-center gap-1">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold leading-tight">{me.name}</span>
                    <span className="block truncate text-[13px] leading-tight text-muted">
                      {tr(lang, me.role === "owner" ? "role.owner" : me.role === "admin" ? "role.admin" : "role.player")}
                    </span>
                  </span>
                  <span className="flex flex-none items-center" title={nombreBall} aria-label={nombreBall}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urlDeObjeto(ballUso.nivel.ball)} alt={nombreBall} width={44} height={44} className="ball-uso-img size-11" />
                  </span>
                </span>
              </span>
              {tituloBarra && (
                <span className="barra-texto block min-w-0">
                  <span className="perfil-titulo max-w-full truncate text-[10px]" data-tono={tituloBarra.tono}>
                    {tr(lang, tituloBarra.clave)}
                  </span>
                </span>
              )}
            </Link>
            <div className="barra-fila flex items-center justify-end gap-1 border-t border-line-soft pt-2">
              <Link
                href={DISCORD_INVITATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={tr(lang, "dc.discord")}
                className="btn btn-ghost btn-sm px-2 text-xs font-bold"
              >
                <Icon name="globe" className="size-4" />
                <span className="barra-texto">{tr(lang, "dc.discord")}</span>
              </Link>
              {conIngles && <LangToggle lang={lang} />}
              <ThemeToggle />
              <form action={logout}>
                <button className="barra-salir btn btn-ghost btn-sm" type="submit" title={tr(lang, "shell.logout")} aria-label={tr(lang, "shell.logout")}>
                  <Icon name="logout" className="size-5" />
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
          <Link className="btn btn-ghost btn-sm px-2" href="/mas" aria-label={tr(lang, "nav.moreSections")} data-tour="mas">
            <Icon name="more" className="size-5" />
          </Link>
        </header>

        {/* v0.20: 12px de margen lateral por debajo de 400px (antes 16): en un
            móvil de 360px son 8px más de tarjeta para tablas y gráficas. */}
        {/* v0.60 — el tutorial de primera vez: una vez por cuenta, también a los que ya estaban. */}
        {verTutorial && <Tutorial />}
        {/* v0.61 — el de cada página, la primera vez que se entra; no se apila con el general. */}
        {me && <TutorialPagina vistos={paginasVistas} bloqueado={verTutorial} />}
        {/* v0.58 — los líderes de la pestaña, en los márgenes de las pantallas anchas. */}
        <LideresMargen />
        <main className="mx-auto w-full max-w-5xl px-3 xl:max-w-6xl 2xl:max-w-7xl pb-nav-safe pt-3 xs:px-4 xs:pt-4 sm:px-6 md:pb-10 md:pt-6">
          {children}
        </main>
      </div>

      <BottomNav meId={me.id} lang={lang} pendientes={misPendientes.length} />

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
        <LogroAviso />
        {/* v0.106 — si has subido de Ball desde la última visita, ¡fiesta! */}
        <CelebrarBall ball={ballUso.nivel.ball} nombre={nombreBall} etiqueta={tr(lang, "cel.nuevaBall")} img={urlDeObjeto(ballUso.nivel.ball)} />
        <HuevosGlobales />
        <AvisoVersion />
        {/* v0.21: recuerda los filtros de Ranking, Estadísticas y Resultados. */}
        <FilterMemory />
      </Suspense>
    </div>
    </LangProvider>
  );
}
