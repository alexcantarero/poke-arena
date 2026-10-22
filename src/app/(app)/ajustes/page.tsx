import Link from "next/link";
import { AbrirAncla } from "@/components/AbrirAncla";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { fmtDate } from "@/lib/format";
import { canManageLeague } from "@/lib/auth";
import { currentPlayer, loadInvites, loadMetaEvents, loadPlayerEmails, loadSnapshot } from "@/lib/data";
import { availableSeasons, getSeason } from "@/lib/cp";
import { asEloScope, ELO_SCOPES, isPlayed, sideOf } from "@/lib/stats";
import { PageHead, Sprites } from "@/components/ui";
import { ArchetypeSync } from "@/components/ArchetypeSync";
import { EVENTOS_EUROPA_2027 } from "@/data/eventos-europa";
import { InviteManager } from "@/components/InviteManager";
import { PlayerAdmin } from "@/components/PlayerAdmin";
import { PasswordForm } from "@/components/PasswordForm";
import { isOwner } from "@/lib/auth";
import { saveArchetypeParents } from "@/actions";
import { importarTorneosLimitless, sincronizarSeriesAhora } from "@/actions";
import { clearEloReset, limpiarTorneosAbandonados, purgePlayer, resetElo, resetLadderSeason, resetLeague, saveSettings, syncLimitlessIrl, wipeSeason } from "@/actions";
import { deleteMetaEvent } from "@/actions";
import { Icon } from "@/components/icons";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MotionToggle } from "@/components/MotionToggle";
import { ServiceWorkerOff } from "@/components/ServiceWorkerOff";
import { type Lang, tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { canalesConfigurados } from "@/lib/discord";
import { probarDiscord } from "@/actions/ajustes";

export const metadata = { title: "Ajustes" };

/**
 * Sincronizar el catálogo son varias decenas de llamadas encadenadas a
 * Limitless y a PokéAPI. Con el límite por defecto de Vercel se quedaba a
 * medias; 60 segundos es lo máximo del plan gratuito y sobra de largo.
 */
export const maxDuration = 60;

export default async function SettingsPage() {
  const lng = await getLang(); // v0.49

  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  if (!me) redirect("/entrar");
  const manager = canManageLeague(me.role);
  const owner = isOwner(me.role);
  const discord = canalesConfigurados(); // v0.59 — solo sí/no: la URL es un secreto
  const invites = manager ? await loadInvites() : [];
  const eloScope = asEloScope(snap.config.eloScope);
  const emails: Record<string, string> = manager ? await loadPlayerEmails() : {};
  // Lo importado de los Regionales va aparte del snapshot: crece más deprisa
  // que el resto y solo hace falta aquí y en Top Decks.
  const metaEventos = manager ? await loadMetaEvents() : [];

  const played = snap.matches.filter(isPlayed);
  const counts = Object.fromEntries(
    snap.players.map((p) => [p.id, played.filter((m) => sideOf(m, p.id)).length]),
  );

  // Solo se ofrecen temporadas que de verdad tienen torneos: un desplegable
  // con años vacíos invita a borrar la equivocada.
  const seasonsWithTournaments = [...new Set(
    snap.tournaments.map((t) => t.season).filter((x): x is number => x != null),
  )].sort((a, b) => b - a);
  const tournamentsBySeason = Object.fromEntries(
    seasonsWithTournaments.map((y) => [y, snap.tournaments.filter((t) => t.season === y).length]),
  );


  return (
    <>
      <PageHead
        title={tr(lng, "x.9751f876")}
        sub={manager
          ? tr(lng, "v63.ajustesSub")
          : tr(lng, "x.d030dc04")}
      />

      <AbrirAncla />
      {/* v0.55 — menú de secciones a la izquierda (en el móvil, una tira arriba)
          y paneles a la derecha. Lo de cada uno primero; lo de organizar, después. */}
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
      <AjustesMenu manager={manager} owner={owner} lng={lng} />
      <div className="min-w-0">
      <h2 className="mb-3 font-display text-base font-bold">{tr(lng, "aj.bloqueCuenta")}</h2>
      {/* v0.22: preferencia de animaciones, de cada uno (vive en el navegador). */}
      {/* v0.63 — «Este dispositivo»: las animaciones y el modo sin conexión son
          de este navegador, no de la liga. El modo sin conexión antes solo lo
          veían los organizadores, y es la salida de emergencia de cualquiera. */}
      <Grupo id="apariencia" icono="📱" titulo={tr(lng, "v63.dispositivo")}>
      <div className="card mb-4 p-4">
        <MotionToggle />
      </div>
          {/* --- v0.35: la salida de emergencia del service worker --- */}
          <div className="card mb-6 p-4">
            <p className="label mb-2">{tr(lng, "x.f73a8413")}</p>
            <p className="mb-3 text-sm text-muted">
              {tr(lng, "x.6c0f91a4")}
            </p>
            <ServiceWorkerOff />
          </div>


      </Grupo>
      <Grupo id="cuenta" icono="🔑" titulo={tr(lng, "x.e92a19d9")}>
      <PasswordForm />

      </Grupo>
      <Link href="/reglas" className="card mb-3 flex w-full items-center justify-between px-4 py-3 hover:ring-1 hover:ring-info/50">
        <span className="font-display text-lg font-bold">{tr(lng, "reg.titulo")}</span>
        <span className="text-xs text-muted">{tr(lng, "reg.enlaceSub")} →</span>
      </Link>

      {manager && <h2 className="mb-3 mt-8 font-display text-base font-bold">{tr(lng, "aj.bloqueOrganizar")}</h2>}
      {manager && (
        <>
          {/* v0.63 — el «Resumen rápido» era una tarjeta grande con tres números;
              ahora es una línea: qué liga es y de qué tamaño. */}
          <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-sm text-muted">
            <b className="font-display text-base text-ink">{snap.config.name}</b>
            <span className="tabular">{snap.players.length} {tr(lng, "v63.jugadoresMin")}</span>
            <span className="tabular">{snap.tournaments.length} {tr(lng, "v63.torneosMin")}</span>
            <span>{snap.config.season}</span>
          </p>

          <Grupo id="jugadores" icono="👥" titulo={tr(lng, "x.b5291b8d")} aside={`${snap.players.length} en total`}>
          <PlayerAdmin
            players={snap.players} counts={counts} emails={emails}
            meId={me.id} meRole={me.role}
          />
          </Grupo>
          {/* v0.53 — el texto de antes («cualquiera con el enlace puede darse de alta»)
              asustaba con razón y no era verdad: cada enlace es de UN uso por defecto,
              caduca a los 14 días y se puede anular. Ahora lo dice. */}
          <Grupo id="invitaciones" icono="✉️" titulo={tr(lng, "x.4b1f6ef2")} aside={tr(lng, "aj.invitaAside")}>
          <InviteManager invites={invites} />

          </Grupo>
          {/* v0.63 — «La liga» solo tiene lo de la liga: nombre, temporada, Elo y
              altas. Lo de torneos, la importación de datos y el modo sin
              conexión se fueron a sus grupos. */}
          <Grupo id="liga" icono="🏅" titulo={tr(lng, "x.cdaf0f8a")} aside={tr(lng, "v63.ligaAside")}>
          <form action={saveSettings} className="card mb-4 flex flex-col gap-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-name">{tr(lng, "x.e68491e9")}</label>
                <input className="input" id="s-name" name="name" defaultValue={snap.config.name} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-season">{tr(lng, "x.b11349f6")}</label>
                <input className="input" id="s-season" name="season" defaultValue={snap.config.season} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-eloStart">{tr(lng, "x.9fe48020")}</label>
                <input className="input" id="s-eloStart" name="eloStart" type="number" inputMode="numeric" defaultValue={snap.config.eloStart} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-eloK">{tr(lng, "x.b947a311")}</label>
                <input className="input" id="s-eloK" name="eloK" type="number" inputMode="numeric" defaultValue={snap.config.eloK} />
                <p className="text-xs text-muted">{tr(lng, "x.2e77d937")}</p>
              </div>
            </div>

            {/* Qué partidas mueven el Elo. Cambiarlo no migra nada: el Elo se
                recalcula entero desde las partidas en cada carga, así que el
                ranking sale distinto en la siguiente pantalla y se puede
                volver atrás cuando se quiera. */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-eloScope">{tr(lng, "x.6dfc489f")}</label>
                <select className="input" id="s-eloScope" name="eloScope" defaultValue={eloScope}>
                  {Object.entries(ELO_SCOPES).map(([v, d]) => (
                    <option key={v} value={v}>{d.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted">{ELO_SCOPES[eloScope].hint}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-eloSince">{tr(lng, "x.9d399b12")}</label>
                <input
                  className="input" id="s-eloSince" name="eloSince" type="date"
                  defaultValue={snap.config.eloSince ?? ""}
                />
                <p className="text-xs text-muted">
                  {tr(lng, "x.c7826a7b")}
                </p>
              </div>
            </div>

            <input type="hidden" name="_registrationOpen" value="1" />
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="registrationOpen" className="size-4" defaultChecked={snap.config.registrationOpen} />
              {tr(lng, "x.ad0d114c")}
            </label>

            {/* v0.63 — sin los puntos por victoria/empate/derrota: se juega a los
                oficiales (3 / 1 / 0) y cambiarlos no aportaba. Al no enviarse, se
                conservan los guardados. */}
            <p className="text-xs text-muted">{tr(lng, "v63.puntosOficiales")}</p>
            <button className="btn btn-brand w-full sm:w-auto" type="submit">{tr(lng, "x.37daa9ec")}</button>
          </form>

          {/* --- reiniciar el Elo ---
              Va fuera del formulario de ajustes y no dentro: son acciones, no
              campos, y meter un botón que cambia el ranking entre dos inputs
              es pedir que alguien lo pulse sin querer. */}
          <div className="card mb-6 p-4">
            <p className="label mb-2">{tr(lng, "x.de50915c")}</p>
            <p className="mb-3 text-sm text-muted">
              {snap.config.eloSince
                ? <>Ahora mismo el Elo solo cuenta las partidas desde el{" "}
                    <b className="font-mono">{snap.config.eloSince}</b>. Todo lo anterior sigue
                    guardado y aparece en el resto de la app; simplemente no mueve el Elo.</>
                : <>El Elo cuenta todas las partidas desde el principio. Reiniciarlo pone a
                    todo el mundo en {snap.config.eloStart} y empieza a contar desde hoy.</>}
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={resetElo}>
                <button className="btn" type="submit">
                  <Icon name="refresh" className="size-4" /> {tr(lng, "x.9240311f")}
                </button>
              </form>
              {snap.config.eloSince && (
                <form action={clearEloReset}>
                  <button className="btn btn-ghost" type="submit">
                    {tr(lng, "x.5e4db128")}
                  </button>
                </form>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              {tr(lng, "x.4bf0ab49")}
            </p>
          </div>

          {/* --- v0.18: reset global para el cambio de temporada --- */}
          <details className="card mb-6 border-loss/40">
            <summary className="tap cursor-pointer justify-between px-4 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Icon name="refresh" className="size-4 text-loss" /> {tr(lng, "x.53ec2a48")}
              </span>
              <span className="text-[11px] font-normal text-muted">{tr(lng, "x.4e9effbb")}</span>
            </summary>
            <form action={resetLadderSeason} className="flex flex-col gap-3 border-t border-line-soft p-4">
              <p className="text-sm text-ink-2">
                {tr(lng, "x.213d64f3")} <b>{tr(lng, "x.a9010807")}</b> los jugadores ({snap.players.filter((p) => p.ladderElo != null).length}{" "}
                con rango ahora mismo) y empieza la temporada hoy. El historial no se borra: la
                gráfica del líder empezará a contar desde aquí.
                {snap.config.ladderSince && (
                  <> {tr(lng, "x.ad59a3b8")} <b className="font-mono">{snap.config.ladderSince.toISOString().slice(0, 10)}</b>.</>
                )}
              </p>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" name="elo" value="1" className="size-4" defaultChecked />
                Reiniciar también el Elo de la liga (contar desde hoy; reversible)
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" name="puestos" value="1" className="size-4" />
                {tr(lng, "x.46edb1f6")}
              </label>
              <label className="label" htmlFor="reset-confirm">{tr(lng, "x.4306a3b1")}</label>
              <input className="input" id="reset-confirm" name="confirm" required autoComplete="off" placeholder={tr(lng, "x.a6718c0e")} />
              <button className="btn btn-danger w-full sm:w-auto" type="submit">{tr(lng, "x.4aea0f5c")}</button>
            </form>
          </details>

          </Grupo>
          <Grupo id="torneos" icono="🏆" titulo={tr(lng, "v63.torneosTitulo")} aside={tr(lng, "v63.torneosAside")}>
          <form action={saveSettings} className="card mb-4 flex flex-col gap-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-cpSeason">{tr(lng, "x.0f7ff796")}</label>
                <select className="input" id="s-cpSeason" name="cpSeason" defaultValue={String(snap.config.cpSeason)}>
                  {availableSeasons().map((y) => (
                    <option key={y} value={y}>
                      {y}{getSeason(y).confirmed ? "" : " (cifras provisionales)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-zone">{tr(lng, "x.06c8dea9")}</label>
                <select className="input" id="s-zone" name="ratingZone" defaultValue={snap.config.ratingZone}>
                  <option value="europe">{tr(lng, "x.10bf7156")}</option>
                  <option value="us-canada">{tr(lng, "x.a419030b")}</option>
                  <option value="latam">{tr(lng, "x.8e6189a6")}</option>
                  <option value="oceania">{tr(lng, "x.0929a12c")}</option>
                  <option value="mesa">{tr(lng, "x.99fa5b06")}</option>
                </select>
              </div>
            </div>

            <button className="btn btn-brand w-full sm:w-auto" type="submit">{tr(lng, "x.37daa9ec")}</button>
          </form>

          {/* --- v0.19: limpieza de torneos abandonados --- */}
          <div className="card mb-4 p-4">
            <p className="label mb-2">{tr(lng, "x.3e9f2bdf")}</p>
            <p className="mb-3 text-sm text-muted">
              {tr(lng, "x.72e3c20a")}
            </p>
            <form action={limpiarTorneosAbandonados}>
              <ConfirmButton className="btn" message={tr(lng, "x.912a675c")}>
                <Icon name="trash" className="size-4" /> {tr(lng, "x.496832e0")}
              </ConfirmButton>
            </form>
          </div>

          </Grupo>
          <Grupo id="importar" icono="📥" titulo={tr(lng, "v63.importarTitulo")} aside={tr(lng, "v63.importarAside")}>
          {/* --- v0.36: importar los torneos online de Limitless --- */}
          <div className="card mb-4 p-4">
            <p className="label mb-2">{tr(lng, "x.4f4ec947")}</p>
            <p className="mb-3 text-sm text-muted">
              {tr(lng, "x.9edac8ac")}
            </p>
            <p className="mb-3 text-xs text-muted">
              {tr(lng, "x.b2e8a5e3")}
            </p>
            <form action={importarTorneosLimitless} className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted">{tr(lng, "x.f21ae80f")}</span>
                <input
                  className="input w-24 text-center tabular" type="number" name="cuantos"
                  min={1} max={50} defaultValue={25} inputMode="numeric"
                />
              </label>
              <button className="btn btn-brand" type="submit">
                <Icon name="refresh" className="size-4" /> {tr(lng, "x.0baa275c")}
              </button>
            </form>
          </div>

          {/* --- v0.44: torneos online semanales previstos en el calendario --- */}
          <div className="card mb-4 p-4">
            <p className="label mb-2">{tr(lng, "x.98fa9601")}</p>
            <p className="mb-3 text-sm text-muted">
              Busca en Limitless las series que se juegan cada semana o más a menudo, con más de
              100 jugadores de media, y pone en el calendario sus próximas ediciones. Crown of
              Spain y Mouji's Dojo entran siempre, tengan la gente que tengan. Se hace solo cada
              noche; esto es por si no quieres esperar.
            </p>
            <p className="mb-3 text-xs text-muted">
              {tr(lng, "x.4ac2cee2")}
            </p>
            <form action={sincronizarSeriesAhora}>
              <button className="btn btn-brand" type="submit">
                <Icon name="calendar" className="size-4" /> {tr(lng, "x.a892d3bb")}
              </button>
            </form>
          </div>

          <h3 className="mb-2 mt-2 px-1 text-sm font-bold">{tr(lng, "x.b96df8a7")}</h3>
          <div className="card mb-3 p-4 text-sm">
            <p className="text-ink-2">
              {tr(lng, "x.b17e0e52")} <b>{tr(lng, "x.af108644")}</b> {tr(lng, "x.066545c8")} <b>{tr(lng, "x.80a3a865")}</b> {tr(lng, "x.42da5c0b")}
            </p>
            <p className="mt-1 text-xs text-muted">
              {tr(lng, "x.d9fd4a94")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[["todo", tr(lng, "x.1ed46cfd")], ["regionales", tr(lng, "x.1b0a7db9")], ["city", tr(lng, "x.108fe4b5")]].map(([v, l]) => (
                <form key={v} action={syncLimitlessIrl}>
                  <input type="hidden" name="que" value={v} />
                  <button className={`btn btn-sm ${v === "todo" ? "btn-brand" : ""}`} type="submit">{l}</button>
                </form>
              ))}
            </div>
          </div>

          <h3 className="mb-2 mt-4 px-1 text-sm font-bold">{tr(lng, "x.657602e8")} <span className="font-normal text-muted">· {metaEventos.length}</span></h3>
            {metaEventos.length === 0 ? (
              <p className="card p-4 text-sm text-muted">{tr(lng, "x.b28a220d")}</p>
            ) : (
              <div className="card mb-6">
                <ul className="divide-y divide-line-soft">
                  {metaEventos.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{e.name}</span>
                        <span className="block text-[11px] text-muted tabular">
                          {fmtDate(e.date)}
                          {e.location && ` · ${e.location}`}
                          {e.entries && ` · ${e.entries} lista(s)`}
                          {e.coverage != null && ` · top ${e.coverage}`}
                          {e.sourceName && ` · ${e.sourceName}`}
                        </span>
                      </span>
                      <form action={deleteMetaEvent}>
                        <input type="hidden" name="id" value={e.id} />
                        <button className="btn btn-ghost btn-sm text-loss" type="submit"
                          aria-label={`Quitar ${e.name}`}>
                          <Icon name="trash" className="size-4" />
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          {/* --- v0.52: diagnóstico de Ciphermaniac --- */}
          <Link href="/ajustes/ciphermaniac" className="card mb-4 block p-4 hover:ring-1 hover:ring-info/50">
            <p className="label mb-1">{tr(lng, "cm.enlace")}</p>
            <p className="text-sm text-muted">{tr(lng, "cm.enlaceSub")}</p>
          </Link>

          </Grupo>
          <Grupo id="arquetipos" icono="🃏" titulo={tr(lng, "v63.arquetiposTitulo")} aside={tr(lng, "x.afee2f84")}>
          <ArchetypeSync total={snap.archetypes.length} />

          {/* --- v0.21: familias de arquetipos --- */}
          {(() => {
            // Solo los que de verdad salen en la liga: el catálogo de Limitless
            // trae cientos y la lista sería inmanejable en el móvil.
            const usados = new Set<string>();
            for (const d of snap.decks) if (d.archetypeId) usados.add(d.archetypeId);
            for (const t of snap.tournaments) for (const r of t.results) if (r.archetypeId) usados.add(r.archetypeId);
            for (const m of snap.matches) {
              if (m.archetypeAId) usados.add(m.archetypeAId);
              if (m.opponentArchetypeId) usados.add(m.opponentArchetypeId);
            }
            for (const a of snap.archetypes) if (a.parentId) { usados.add(a.id); usados.add(a.parentId); }
            const lista = snap.archetypes.filter((a) => usados.has(a.id))
              .sort((x, y) => x.name.localeCompare(y.name, "es"));
            const variantes = lista.filter((a) => a.parentId).length;
            return (
              <details className="card mb-6">
                <summary className="tap cursor-pointer justify-between px-4 text-sm font-semibold">
                  {tr(lng, "x.c813ee8f")}
                  <span className="text-[11px] font-normal text-muted">{variantes} variante(s) agrupada(s)</span>
                </summary>
                <form action={saveArchetypeParents} className="border-t border-line-soft">
                  <p className="px-4 pt-3 text-xs text-muted">
                    {tr(lng, "x.97893ac2")}
                  </p>
                  <ul className="divide-y divide-line-soft">
                    {lista.map((a) => (
                      <li key={a.id} className="flex flex-col gap-1.5 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <Sprites archetype={a} size="sm" />
                          <span className="truncate text-sm font-semibold">{a.name}</span>
                        </span>
                        <select className="input sm:w-64" name={`parent:${a.id}`} defaultValue={a.parentId ?? ""}
                          aria-label={`Arquetipo principal de ${a.name}`}>
                          <option value="">{tr(lng, "x.eb81cc00")}</option>
                          {lista.filter((p) => p.id !== a.id).map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-line-soft p-4">
                    <button className="btn btn-brand w-full sm:w-auto" type="submit">{tr(lng, "x.546c3c4c")}</button>
                  </div>
                </form>
              </details>
            );
          })()}

          {/* El metagame presencial. Va justo después del catálogo a
              propósito: el importador casa los mazos contra él, así que el
              orden en el que están los dos botones es el orden en el que
              conviene pulsarlos. */}
          {/* v0.14 — Regionales y City Leagues sin pegar nada. Solo mazos: ni
              los parsers leen nombres ni la tabla tiene dónde guardarlos. */}
          </Grupo>
        </>
      )}

      {/* ---------------------------------------------------------------
          Zona de riesgo.

          Todo esto es solo del propietario y todo pide escribir a mano lo que
          se va a borrar. Es el patrón de GitHub al borrar un repositorio, y
          está por un motivo concreto: nada de esto tiene deshacer, y un botón
          sin fricción se pulsa sin leer.

          Va al final de la página y detrás de un `details` por lo mismo: no
          es algo con lo que uno se tropiece buscando otra cosa.
          --------------------------------------------------------------- */}
      {/* v0.59 — Discord: qué avisos están puestos (sin enseñar nunca la URL, que
          es un secreto) y botones para mandar una prueba sin esperar al lunes. */}
      {manager && (
        <Grupo id="discord" icono="💬" titulo="Discord" aside={tr(lng, "dc.aside")}>
          <div className="flex flex-col gap-3 p-4 text-sm">
            <p className="text-muted">{tr(lng, "dc.explica")}</p>
            <ul className="flex flex-col gap-1.5">
              {([["resultados", "dc.resultados", "DISCORD_WEBHOOK_RESULTADOS"], ["liga", "dc.liga", "DISCORD_WEBHOOK_LIGA"], ["agenda", "dc.agenda", "DISCORD_WEBHOOK_AGENDA"]] as const).map(([c, k, v]) => (
                <li key={c} className="flex flex-wrap items-center gap-2">
                  <span className={`chip ${discord[c] ? "chip-win" : ""}`}>{discord[c] ? tr(lng, "dc.puesto") : tr(lng, "dc.sinPoner")}</span>
                  <span>{tr(lng, k)}</span>
                  <code className="text-[11px] text-muted">{v}</code>
                </li>
              ))}
            </ul>
            <form action={probarDiscord} className="flex flex-wrap gap-2">
              <button type="submit" name="tipo" value="liga" className="btn btn-sm" disabled={!discord.liga}>{tr(lng, "dc.probarLiga")}</button>
              <button type="submit" name="tipo" value="agenda" className="btn btn-sm" disabled={!discord.agenda}>{tr(lng, "dc.probarAgenda")}</button>
            </form>
            <p className="text-xs text-muted">{tr(lng, "dc.nota")}</p>
          </div>
        </Grupo>
      )}

      {owner && (
        <>
          <Grupo id="riesgo" icono="⚠️" titulo={tr(lng, "x.085b70dc")} aside={tr(lng, "x.39b1a2e2")}>
          <div className="flex flex-col gap-3">

            {seasonsWithTournaments.length > 0 && (
              <details className="card border-loss/40">
                <summary className="tap cursor-pointer justify-start px-4 text-sm font-semibold text-loss">
                  {tr(lng, "x.4bfb6ca1")}
                </summary>
                <form action={wipeSeason} className="flex flex-col gap-3 border-t border-line-soft p-4">
                  <p className="text-sm text-ink-2">
                    {tr(lng, "x.c0149702")}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <label className="label" htmlFor="wipeSeason">{tr(lng, "x.b11349f6")}</label>
                    <select className="input" id="wipeSeason" name="season" defaultValue={seasonsWithTournaments[0]}>
                      {seasonsWithTournaments.map((y) => (
                        <option key={y} value={y}>
                          {y} — {tournamentsBySeason[y]} torneo(s)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="label" htmlFor="wipeConfirm">
                      Escribe «borrar temporada {seasonsWithTournaments[0]}»
                    </label>
                    <input
                      className="input font-mono text-sm" id="wipeConfirm" name="confirm" required
                      autoComplete="off" placeholder={`borrar temporada ${seasonsWithTournaments[0]}`}
                    />
                    <p className="text-xs text-muted">
                      {tr(lng, "x.c148039c")}
                    </p>
                  </div>
                  <button className="btn btn-danger" type="submit">{tr(lng, "x.8e69763b")}</button>
                </form>
              </details>
            )}

            <details className="card border-loss/40">
              <summary className="tap cursor-pointer justify-start px-4 text-sm font-semibold text-loss">
                {tr(lng, "x.d6a16dd8")}
              </summary>
              <form action={resetLeague} className="flex flex-col gap-3 border-t border-line-soft p-4">
                <p className="text-sm text-ink-2">
                  Empezar de cero manteniendo a la gente. Se van las {played.length} partidas,
                  las competiciones, los {snap.tournaments.length} torneos, el calendario y el
                  ladder. Se quedan los jugadores con sus cuentas, sus mazos y los arquetipos.
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="resetConfirm">{tr(lng, "x.e84c560a")}</label>
                  <input
                    className="input font-mono text-sm" id="resetConfirm" name="confirm" required
                    autoComplete="off" placeholder={tr(lng, "x.5ebf5e99")}
                  />
                </div>
                <button className="btn btn-danger" type="submit">{tr(lng, "x.535d85f7")}</button>
              </form>
            </details>

            <details className="card border-loss/40">
              <summary className="tap cursor-pointer justify-start px-4 text-sm font-semibold text-loss">
                {tr(lng, "x.1d0b36ec")}
              </summary>
              <form action={purgePlayer} className="flex flex-col gap-3 border-t border-line-soft p-4">
                <p className="text-sm text-ink-2">
                  {tr(lng, "x.f6ce5b54")} <b>{tr(lng, "x.ac7fff22")}</b>: la persona deja de
                  aparecer pero su historial sigue ahí y el ranking cuadra. Esto es lo otro —no
                  queda rastro—, y es para cuentas de prueba o altas duplicadas.
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="purgeId">{tr(lng, "x.59e1f9e4")}</label>
                  <select className="input" id="purgeId" name="id" required defaultValue="">
                    <option value="" disabled>{tr(lng, "x.a618d99d")}</option>
                    {snap.players.filter((p) => p.id !== me.id).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {counts[p.id] ?? 0} partida(s)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="purgeConfirm">{tr(lng, "x.982dae13")}</label>
                  <input
                    className="input" id="purgeConfirm" name="confirm" required
                    autoComplete="off" placeholder={tr(lng, "x.14d6088e")}
                  />
                </div>
                <button className="btn btn-danger" type="submit">{tr(lng, "x.88c4d15f")}</button>
              </form>
            </details>
          </div>
          </Grupo>
        </>
      )}

      </div>
      </div>
    </>
  );
}

/**
 * v0.24 — Un grupo de Ajustes, plegado por defecto (acordeón nativo con
 * <details>: funciona sin JavaScript). La cabecera dice qué hay dentro.
 */
function Grupo({ id, titulo, aside, icono, children }: { id?: string; titulo: string; aside?: string; icono?: string; children: ReactNode }) {
  return (
    <details id={id} className="group mb-3">
      <summary className="card tap flex w-full cursor-pointer list-none items-center justify-between gap-3 px-4">
        <span className="flex items-center gap-2.5 font-display text-lg font-bold">
          {icono && <span aria-hidden="true" className="text-xl leading-none">{icono}</span>}
          {titulo}
        </span>
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
          {aside && <span className="hidden truncate sm:inline">{aside}</span>}
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

/** v0.55 — el menú de secciones de Ajustes: a la izquierda en el PC, una tira de chips en el móvil. */
function AjustesMenu({ manager, owner, lng }: { manager: boolean; owner: boolean; lng: Lang }) {
  const cuenta: Array<[string, string]> = [["apariencia", "v63.dispositivo"], ["cuenta", "x.e92a19d9"]];
  const organizar: Array<[string, string]> = manager ? [
    // v0.63 — por lo que se viene a hacer: la gente, la liga, los torneos, los
    // datos de fuera y los arquetipos.
    ["jugadores", "x.b5291b8d"], ["invitaciones", "x.4b1f6ef2"], ["liga", "x.cdaf0f8a"],
    ["torneos", "v63.torneosTitulo"], ["importar", "v63.importarTitulo"], ["arquetipos", "v63.arquetiposTitulo"],
    ["discord", "dc.menu"],
    ...(owner ? [["riesgo", "x.085b70dc"] as [string, string]] : []),
  ] : [];
  const enlace = ([id, k]: [string, string]) => (
    <a key={id} href={`#${id}`} className="chip flex-none whitespace-nowrap lg:w-full lg:justify-start lg:whitespace-normal lg:text-left lg:leading-snug lg:rounded-lg lg:border-0 lg:bg-transparent lg:px-2 lg:py-1.5 lg:hover:bg-surface-2">{tr(lng, k)}</a>
  );
  return (
    <nav aria-label={tr(lng, "aj.secciones")} className="mb-4 lg:sticky lg:top-4 lg:mb-0 lg:self-start">
      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible">
        <span className="label hidden lg:mb-1 lg:block">{tr(lng, "aj.bloqueCuenta")}</span>
        {cuenta.map(enlace)}
        <a href="/reglas" className="chip flex-none whitespace-nowrap lg:w-full lg:justify-start lg:whitespace-normal lg:text-left lg:leading-snug lg:rounded-lg lg:border-0 lg:bg-transparent lg:px-2 lg:py-1.5 lg:hover:bg-surface-2">{tr(lng, "reg.titulo")}</a>
        <a href="/glosario" className="chip flex-none whitespace-nowrap lg:w-full lg:justify-start lg:whitespace-normal lg:text-left lg:leading-snug lg:rounded-lg lg:border-0 lg:bg-transparent lg:px-2 lg:py-1.5 lg:hover:bg-surface-2">{tr(lng, "glo.enlace")}</a>
        {organizar.length > 0 && <span className="label hidden lg:mb-1 lg:mt-4 lg:block">{tr(lng, "aj.bloqueOrganizar")}</span>}
        {organizar.map(enlace)}
      </div>
    </nav>
  );
}
