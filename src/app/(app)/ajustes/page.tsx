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
import { clearEloReset, limpiarTorneosAbandonados, purgePlayer, resetElo, resetLadderSeason, resetLeague, saveSettings, syncLimitlessIrl, wipeSeason } from "@/actions";
import { deleteMetaEvent } from "@/actions";
import { Icon } from "@/components/icons";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MotionToggle } from "@/components/MotionToggle";

export const metadata = { title: "Ajustes" };

/**
 * Sincronizar el catálogo son varias decenas de llamadas encadenadas a
 * Limitless y a PokéAPI. Con el límite por defecto de Vercel se quedaba a
 * medias; 60 segundos es lo máximo del plan gratuito y sobra de largo.
 */
export const maxDuration = 60;

export default async function SettingsPage() {
  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  if (!me) redirect("/entrar");
  const manager = canManageLeague(me.role);
  const owner = isOwner(me.role);
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
        title="Ajustes"
        sub={manager
          ? "Puntuación, invitaciones y jugadores. Los puntos y el Elo se recalculan desde el historial, así que cambiar la puntuación reordena el ranking al momento."
          : "Tu cuenta. Para cambiar la configuración de la liga habla con el organizador."}
      />

      {manager && (
        <>
          <Grupo titulo="Invitaciones" aside="cualquiera con el enlace puede darse de alta">
          <InviteManager invites={invites} />

          </Grupo>
          <Grupo titulo="La liga">
          <form action={saveSettings} className="card mb-6 flex flex-col gap-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-name">Nombre</label>
                <input className="input" id="s-name" name="name" defaultValue={snap.config.name} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-season">Temporada</label>
                <input className="input" id="s-season" name="season" defaultValue={snap.config.season} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {([["ptsWin", "Pts victoria"], ["ptsTie", "Pts empate"], ["ptsLoss", "Pts derrota"]] as const).map(([n, l]) => (
                <div className="flex flex-col gap-1.5" key={n}>
                  <label className="label" htmlFor={`s-${n}`}>{l}</label>
                  <input className="input" id={`s-${n}`} name={n} type="number" inputMode="numeric"
                    defaultValue={snap.config[n]} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-eloStart">Elo inicial</label>
                <input className="input" id="s-eloStart" name="eloStart" type="number" inputMode="numeric" defaultValue={snap.config.eloStart} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-eloK">Factor K</label>
                <input className="input" id="s-eloK" name="eloK" type="number" inputMode="numeric" defaultValue={snap.config.eloK} />
                <p className="text-xs text-muted">Cuánto mueve una partida el Elo. 24 va bien para grupos pequeños.</p>
              </div>
            </div>

            {/* Qué partidas mueven el Elo. Cambiarlo no migra nada: el Elo se
                recalcula entero desde las partidas en cada carga, así que el
                ranking sale distinto en la siguiente pantalla y se puede
                volver atrás cuando se quiera. */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-eloScope">Qué partidas mueven el Elo</label>
                <select className="input" id="s-eloScope" name="eloScope" defaultValue={eloScope}>
                  {Object.entries(ELO_SCOPES).map(([v, d]) => (
                    <option key={v} value={v}>{d.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted">{ELO_SCOPES[eloScope].hint}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-eloSince">Contar el Elo desde</label>
                <input
                  className="input" id="s-eloSince" name="eloSince" type="date"
                  defaultValue={snap.config.eloSince ?? ""}
                />
                <p className="text-xs text-muted">
                  Vacío = desde el principio. Es la forma de reiniciar el Elo sin borrar
                  ninguna partida.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-cpSeason">Temporada de Championship Points</label>
                <select className="input" id="s-cpSeason" name="cpSeason" defaultValue={String(snap.config.cpSeason)}>
                  {availableSeasons().map((y) => (
                    <option key={y} value={y}>
                      {y}{getSeason(y).confirmed ? "" : " (cifras provisionales)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-zone">Zona de clasificación</label>
                <select className="input" id="s-zone" name="ratingZone" defaultValue={snap.config.ratingZone}>
                  <option value="europe">Europa</option>
                  <option value="us-canada">EE. UU. y Canadá</option>
                  <option value="latam">Latinoamérica</option>
                  <option value="oceania">Oceanía</option>
                  <option value="mesa">Oriente Medio y Sudáfrica</option>
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="registrationOpen" className="size-4" defaultChecked={snap.config.registrationOpen} />
              Permitir altas nuevas con enlace de invitación
            </label>

            <button className="btn btn-brand w-full sm:w-auto" type="submit">Guardar ajustes</button>
          </form>

          {/* --- reiniciar el Elo ---
              Va fuera del formulario de ajustes y no dentro: son acciones, no
              campos, y meter un botón que cambia el ranking entre dos inputs
              es pedir que alguien lo pulse sin querer. */}
          <div className="card mb-6 p-4">
            <p className="label mb-2">Reiniciar el Elo</p>
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
                  <Icon name="refresh" className="size-4" /> Empezar de cero hoy
                </button>
              </form>
              {snap.config.eloSince && (
                <form action={clearEloReset}>
                  <button className="btn btn-ghost" type="submit">
                    Volver a contar desde el principio
                  </button>
                </form>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              No se borra ninguna partida. El Elo no está guardado en la base: se calcula desde
              las partidas cada vez que se pinta el ranking, así que esto es del todo
              reversible.
            </p>
          </div>

          {/* --- v0.19: limpieza de torneos abandonados --- */}
          <div className="card mb-4 p-4">
            <p className="label mb-2">Torneos abandonados</p>
            <p className="mb-3 text-sm text-muted">
              Cada noche se borran solos los torneos creados hace más de 3 días sin ninguna
              participación (ni resultado ni ronda). Los que todavía no se han jugado no se
              tocan hasta 3 días después de su fecha. Aquí puedes lanzarlo ahora.
            </p>
            <form action={limpiarTorneosAbandonados}>
              <ConfirmButton className="btn" message="¿Borrar ahora los torneos sin participación de hace más de 3 días?">
                <Icon name="trash" className="size-4" /> Limpiar ahora
              </ConfirmButton>
            </form>
          </div>

          {/* --- v0.18: reset global para el cambio de temporada --- */}
          <details className="card mb-6 border-loss/40">
            <summary className="tap cursor-pointer justify-between px-4 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Icon name="refresh" className="size-4 text-loss" /> Nueva temporada: reset de todos
              </span>
              <span className="text-[11px] font-normal text-muted">organizador</span>
            </summary>
            <form action={resetLadderSeason} className="flex flex-col gap-3 border-t border-line-soft p-4">
              <p className="text-sm text-ink-2">
                Quita el rango del ladder a <b>todos</b> los jugadores ({snap.players.filter((p) => p.ladderElo != null).length}{" "}
                con rango ahora mismo) y empieza la temporada hoy. El historial no se borra: la
                gráfica del líder empezará a contar desde aquí.
                {snap.config.ladderSince && (
                  <> Última temporada empezada el <b className="font-mono">{snap.config.ladderSince.toISOString().slice(0, 10)}</b>.</>
                )}
              </p>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" name="elo" value="1" className="size-4" defaultChecked />
                Reiniciar también el Elo de la liga (contar desde hoy; reversible)
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" name="puestos" value="1" className="size-4" />
                Borrar también los puestos de España y Europa
              </label>
              <label className="label" htmlFor="reset-confirm">Escribe «nueva temporada» para confirmar</label>
              <input className="input" id="reset-confirm" name="confirm" required autoComplete="off" placeholder="nueva temporada" />
              <button className="btn btn-danger w-full sm:w-auto" type="submit">Empezar temporada nueva</button>
            </form>
          </details>

          </Grupo>
          <Grupo titulo="Datos del metagame" aside="desde Limitless">
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
                  Familias de arquetipos
                  <span className="text-[11px] font-normal text-muted">{variantes} variante(s) agrupada(s)</span>
                </summary>
                <form action={saveArchetypeParents} className="border-t border-line-soft">
                  <p className="px-4 pt-3 text-xs text-muted">
                    Las variantes se agrupan SOLAS por su primer Pokémon («Dragapult / Dudunsparce»
                    y «Dragapult / Blaziken» → Dragapult). Aquí solo hace falta lo que no se puede
                    deducir así, como «Grookey / Applin» → «Festival Lead»: lo que pongas manda.
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
                          <option value="">— Es principal —</option>
                          {lista.filter((p) => p.id !== a.id).map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-line-soft p-4">
                    <button className="btn btn-brand w-full sm:w-auto" type="submit">Guardar familias</button>
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
          <Grupo titulo="Regionales y City Leagues automáticos" aside="limitlesstcg.com">
          <div className="card mb-3 p-4 text-sm">
            <p className="text-ink-2">
              Trae de <b>Limitless TCG</b> los Regionales de la temporada y las últimas City Leagues
              de Japón que aún no estén: el recuento de mazos del Día 2 y el top cut, puesto a
              puesto. <b>Sin ningún nombre de jugador.</b> Lo que ya está no se vuelve a pedir.
            </p>
            <p className="mt-1 text-xs text-muted">
              Hasta 6 Regionales y 15 City Leagues por pulsación. Los torneos online ya llegan
              solos por la API oficial. Si Limitless pidiera que no, se apaga y se vuelve a pegar
              a mano aquí debajo.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[["todo", "Traer todo"], ["regionales", "Solo Regionales"], ["city", "Solo City Leagues"]].map(([v, l]) => (
                <form key={v} action={syncLimitlessIrl}>
                  <input type="hidden" name="que" value={v} />
                  <button className={`btn btn-sm ${v === "todo" ? "btn-brand" : ""}`} type="submit">{l}</button>
                </form>
              ))}
            </div>
          </div>

          </Grupo>
          <Grupo titulo="Eventos importados del metagame" aside={`${metaEventos.length} eventos`}>
            {metaEventos.length === 0 ? (
              <p className="card p-4 text-sm text-muted">Aún no se ha importado ningún evento.</p>
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
          </Grupo>
          <Grupo titulo="Jugadores" aside={`${snap.players.length} en total`}>
          <PlayerAdmin
            players={snap.players} counts={counts} emails={emails}
            meId={me.id} meRole={me.role}
          />
          </Grupo>
        </>
      )}

      {/* v0.22: preferencia de animaciones, de cada uno (vive en el navegador). */}
      <Grupo titulo="Apariencia">
      <div className="card mb-6 p-4">
        <MotionToggle />
      </div>

      </Grupo>
      <Grupo titulo="Tu cuenta">
      <PasswordForm />

      </Grupo>
      {/* ---------------------------------------------------------------
          Zona de riesgo.

          Todo esto es solo del propietario y todo pide escribir a mano lo que
          se va a borrar. Es el patrón de GitHub al borrar un repositorio, y
          está por un motivo concreto: nada de esto tiene deshacer, y un botón
          sin fricción se pulsa sin leer.

          Va al final de la página y detrás de un `details` por lo mismo: no
          es algo con lo que uno se tropiece buscando otra cosa.
          --------------------------------------------------------------- */}
      {owner && (
        <>
          <Grupo titulo="Zona de riesgo" aside="solo el propietario">
          <div className="flex flex-col gap-3">

            {seasonsWithTournaments.length > 0 && (
              <details className="card border-loss/40">
                <summary className="tap cursor-pointer justify-start px-4 text-sm font-semibold text-loss">
                  Vaciar una temporada
                </summary>
                <form action={wipeSeason} className="flex flex-col gap-3 border-t border-line-soft p-4">
                  <p className="text-sm text-ink-2">
                    Borra los torneos de esa temporada, los resultados de todos y las rondas
                    apuntadas. No toca jugadores, mazos, arquetipos ni la liga interna.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <label className="label" htmlFor="wipeSeason">Temporada</label>
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
                      Si cambias la temporada de arriba, la frase también cambia: es
                      «borrar temporada» y el año que hayas elegido.
                    </p>
                  </div>
                  <button className="btn btn-danger" type="submit">Vaciar la temporada</button>
                </form>
              </details>
            )}

            <details className="card border-loss/40">
              <summary className="tap cursor-pointer justify-start px-4 text-sm font-semibold text-loss">
                Borrar todo el historial
              </summary>
              <form action={resetLeague} className="flex flex-col gap-3 border-t border-line-soft p-4">
                <p className="text-sm text-ink-2">
                  Empezar de cero manteniendo a la gente. Se van las {played.length} partidas,
                  las competiciones, los {snap.tournaments.length} torneos, el calendario y el
                  ladder. Se quedan los jugadores con sus cuentas, sus mazos y los arquetipos.
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="resetConfirm">Escribe «borrar todo el historial»</label>
                  <input
                    className="input font-mono text-sm" id="resetConfirm" name="confirm" required
                    autoComplete="off" placeholder="borrar todo el historial"
                  />
                </div>
                <button className="btn btn-danger" type="submit">Borrar el historial</button>
              </form>
            </details>

            <details className="card border-loss/40">
              <summary className="tap cursor-pointer justify-start px-4 text-sm font-semibold text-loss">
                Borrar una persona del todo
              </summary>
              <form action={purgePlayer} className="flex flex-col gap-3 border-t border-line-soft p-4">
                <p className="text-sm text-ink-2">
                  Arriba, en «Jugadores», lo normal es <b>desactivar</b>: la persona deja de
                  aparecer pero su historial sigue ahí y el ranking cuadra. Esto es lo otro —no
                  queda rastro—, y es para cuentas de prueba o altas duplicadas.
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="purgeId">Quién</label>
                  <select className="input" id="purgeId" name="id" required defaultValue="">
                    <option value="" disabled>— elegir —</option>
                    {snap.players.filter((p) => p.id !== me.id).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {counts[p.id] ?? 0} partida(s)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="label" htmlFor="purgeConfirm">Escribe su nombre exacto</label>
                  <input
                    className="input" id="purgeConfirm" name="confirm" required
                    autoComplete="off" placeholder="Nombre tal como aparece arriba"
                  />
                </div>
                <button className="btn btn-danger" type="submit">Borrar a esa persona y todo lo suyo</button>
              </form>
            </details>
          </div>
          </Grupo>
        </>
      )}

      <section className="card mt-6 p-4">
        <h2 className="mb-2 text-lg font-bold">Cómo se calcula todo</h2>
        <div className="flex flex-col gap-2 text-sm text-ink-2">
          <p><b>Puntos.</b> Cuenta la serie, no los juegos: ganar 2–0 y 2–1 valen lo mismo.</p>
          <p><b>%V.</b> Victorias más medio empate, entre partidas jugadas.</p>
          <p><b>Resistencia.</b> Media del % de victorias de tus rivales, con suelo del 25% por rival, como en el reglamento de Play! Pokémon.</p>
          <p><b>Elo.</b> Recalculado en orden cronológico sobre todas las partidas <i>internas</i> de la liga. Las partidas contra gente de fuera no puntúan, porque no habría contra quién compensar.</p>
          <p><b>Championship Points.</b> Se calculan con la tabla de la temporada y descartando lo que se sale del Best Finish Limit. Los límites de esta liga son de casa: <b>4 mejores Challenges, 4 mejores Cups y 5 mejores Regionales</b>. Las tablas están en <code className="rounded bg-surface-2 px-1 font-mono text-xs">src/lib/cp.ts</code>.</p>
          <p><b>Rango del ladder.</b> Ese número lo pone cada uno en su perfil y no sale de ningún cálculo. Es aparte del Elo justamente para que se vea que son dos cosas distintas.</p>
          <p><b>Papeles.</b> <i>Jugador</i> gestiona lo suyo: su perfil, sus mazos, sus partidas, sus torneos y su rango. <i>Admin</i> además crea y borra competiciones y torneos, edita las partidas de cualquiera y genera invitaciones. <i>Propietario</i> es el único que reparte papeles, desactiva gente y usa la zona de riesgo.</p>
        </div>
      </section>
    </>
  );
}

/**
 * v0.24 — Un grupo de Ajustes, plegado por defecto (acordeón nativo con
 * <details>: funciona sin JavaScript). La cabecera dice qué hay dentro.
 */
function Grupo({ titulo, aside, children }: { titulo: string; aside?: string; children: ReactNode }) {
  return (
    <details className="group mb-3">
      <summary className="card tap cursor-pointer list-none justify-between gap-3 px-4">
        <span className="font-display text-lg font-bold">{titulo}</span>
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
          {aside && <span className="hidden truncate sm:inline">{aside}</span>}
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
