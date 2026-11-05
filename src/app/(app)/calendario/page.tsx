import { limpiezaPerezosa } from "@/lib/limpiezaDb";
import Link from "next/link";
import { cargarAsistenciaGrupo, cargarAsistencias, cargarDatosCpDe, currentPlayer, loadCompetitionHeads, loadEvents, loadTournamentHeads, playerCp } from "@/lib/data";
import { getSeason } from "@/lib/cp";
import { canManageLeague } from "@/lib/auth";
// v0.38: ya no se pintan partidas aquí, así que no hace falta leerlas.
import {
  CALENDAR_KINDS, alternarTipo, ciudadesPresentes, kindsPresent, parseCiudad, parseTipos, pasaCiudad,
  pasaTipos, tiposAParam, toneOf,
} from "@/lib/calendar";
import { DOWS, MONTHS, byAgenda, relDays, todayISO } from "@/lib/format";
import { Empty, PageHead, TournamentEmblem } from "@/components/ui";
import { CityPicker } from "@/components/CityPicker";
import { EventForm } from "@/components/EventForm";
import { Icon } from "@/components/icons";
import { AsistenciaBotones } from "@/components/AsistenciaBotones";
import { FiltroAsistencia as FiltroAsistenciaSelect } from "@/components/FiltroAsistencia";
import { importEuropeanEvents, importPastedEvents } from "@/actions";
import {
  claveAsistencia, contarAsistencia, parseFiltroAsistencia, pasaAsistencia, FILTROS_ASISTENCIA,
  type EstadoAsistencia, type FiltroAsistencia,
} from "@/lib/asistencia";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Calendario" };

/* =========================================================================
   El calendario, ahora con color por tipo de torneo y filtro.

   Tres cosas que cambian respecto a antes:

   · **Cada tipo de evento tiene su color**, de la paleta de series de
     `globals.css` —la que está validada para daltonismo y tiene versión
     clara y oscura—. Un calendario monocromo obliga a abrir cada cosa para
     saber qué es; con color, se ve de un vistazo que noviembre tiene un
     Regional.
   · **Se puede filtrar por tipo**, por URL como el resto de la app: el
     enlace se comparte y la flecha de volver atrás funciona.
   · **Los eventos de varios días ocupan varios días.** Un Regional es sábado
     y domingo, y hasta ahora solo salía el sábado.
   ========================================================================= */

export default async function CalendarPage({
  searchParams,
}: { searchParams: Promise<{ y?: string; m?: string; tipo?: string; ciudad?: string | string[]; vista?: string; asist?: string }> }) {
  const lng = await getLang(); // v0.49
  await limpiezaPerezosa(); // v0.78 — borra/cierra torneos aunque no corra el cron

  const q = await searchParams;
  const now = new Date();
  const year = Number(q.y) || now.getFullYear();
  const month = q.m != null && q.m !== "" ? Number(q.m) : now.getMonth();

  /* v0.39 — Fase B. Desde que la v0.38 quitó las partidas de aquí, esta
     pantalla solo necesita tres tablas pequeñas y estables. Cargaba el
     snapshot entero —con `matches` y `games`, las dos únicas que crecen sin
     parar— para pintar un mes de calendario. */
  const [eventos_, tours, comps, me] = await Promise.all([
    loadEvents(), loadTournamentHeads(), loadCompetitionHeads(), currentPlayer(),
  ]);
  const toursById = new Map(tours.map((t) => [t.id, t]));
  // Agrupado para no reescribir el cuerpo de la pantalla, pero NO es el
  // snapshot: son tres consultas sueltas y se llama distinto por eso.
  const datos = { events: eventos_, tournaments: tours, competitions: comps, toursById };
  const manager = me ? canManageLeague(me.role) : false;
  /* v0.106 — «Iré / Quizá / No iré»: mis marcas y el filtro (`?asist=`). Sin
     sesión no hay marcas y el filtro no se ofrece. */
  const [asis, grupo] = me ? await Promise.all([cargarAsistencias(me.id), cargarAsistenciaGrupo()]) : [null, new Map<string, { si: number; quiza: number }>()];
  /** v0.108 — cuántos del grupo van (sin nombres). */
  const grupoDe = (tipo: "evento" | "torneo", id: string) => grupo.get(claveAsistencia(tipo, id)) ?? null;
  const marcas = asis?.marcas ?? new Map<string, EstadoAsistencia>();
  const filtroAsis: FiltroAsistencia = me ? parseFiltroAsistencia(q.asist) : "todo";
  const asisDe = (tipo: "evento" | "torneo", id: string) => marcas.get(claveAsistencia(tipo, id)) ?? null;
  const today = todayISO();

  /* v0.90 — Camino al Mundial en el calendario: los tipos de torneo en los que
     aún tienes HUECOS LIBRES de CP (Challenges, Cups, Regionales/IC) se marcan
     con ★ en los próximos días: ahí cualquier puesto con CP te suma entero. */
  const conviene = new Set<string>();
  if (me) {
    try {
      // v0.108 — rendimiento: solo mis resultados, no el snapshot entero.
      const cp = playerCp(await cargarDatosCpDe(me.id), me.id);
      const tabla = getSeason(cp.season);
      const TIPOS: Record<string, string[]> = {
        league_challenge: ["league_challenge", "pokemon_challenge"],
        league_cup: ["league_cup", "pokemon_cup"],
        regional: ["regional", "international", "special"],
      };
      for (const [cubo, kinds] of Object.entries(TIPOS)) {
        const bfl = tabla.events[cubo]?.bfl ?? 0;
        const usados = cp.rows.filter((r) => r.bucket === cubo && !r.excluded && r.counted > 0).length;
        if (bfl && usados < bfl) kinds.forEach((k) => conviene.add(k));
      }
    } catch { /* sin CP: sin marcas */ }
  }

  /* v0.63 — varios tipos a la vez (`?tipo=regional,league_cup`). `tipo` es el
     valor tal cual va en la URL; `tipos`, la lista para filtrar. */
  const tipos = parseTipos(q.tipo);
  const tipo = tiposAParam(tipos);
  const ciudades = ciudadesPresentes([
    ...datos.events.filter((e) => e.tournamentKind !== "online").map((e) => e.location),
    ...datos.tournaments.filter((t) => t.kind !== "online" && t.scope !== "online").map((t) => t.city),
  ]);
  const ciudad = parseCiudad(q.ciudad);
  /** v0.16 — Calendario (rejilla del mes) o Agenda (lista grande de lo que viene). */
  const vista: "calendario" | "agenda" = q.vista === "agenda" ? "agenda" : "calendario";

  /* Los tipos que de verdad hay entre los eventos y los torneos apuntados.
     Ofrecer un filtro de «Mundial» cuando no hay ninguno es ruido. */
  const disponibles = kindsPresent([
    ...datos.events.map((e) => e.tournamentKind),
    ...datos.tournaments.map((t) => t.kind),
  ]);
  const ubicacionEventoPorTorneo = new Map(
    datos.events.filter((e) => e.tournamentId && e.location.trim() && e.tournamentKind !== "online")
      .map((e) => [e.tournamentId!, e.location.trim()]),
  );
  const ciudadTorneo = (t: typeof datos.tournaments[number]) =>
    t.city?.trim() || ubicacionEventoPorTorneo.get(t.id) || "";

  /** v0.18: `kind`/`scope` para el emblema (Regional, Challenge, Cup, Online). */
  type Mark = { text: string; color: string; label: string; url?: string; href?: string; kind?: string | null; scope?: string | null; conviene?: boolean; asis?: EstadoAsistencia | null; van?: number };
  const byDay = new Map<string, Mark[]>();
  const push = (date: string, m: Mark) => {
    const list = byDay.get(date);
    if (list) list.push(m); else byDay.set(date, [m]);
  };

  /** Un evento de varios días se pinta en todos ellos, con un tope sano. */
  const pushRange = (from: string, to: string | null, m: Mark) => {
    push(from, m);
    if (!to || to <= from) return;
    const d = new Date(`${from}T00:00:00Z`);
    const fin = new Date(`${to}T00:00:00Z`);
    for (let i = 0; i < 10; i++) {
      d.setUTCDate(d.getUTCDate() + 1);
      if (d > fin) break;
      push(d.toISOString().slice(0, 10), m);
    }
  };

  /* v0.15 — un evento enlazado a un torneo que existe ya sale como torneo:
     pintarlo también como evento ponía Niza dos veces en el mismo día. */
  const eventos = datos.events.filter((e) => !(e.tournamentId && datos.toursById.has(e.tournamentId)));

  for (const e of eventos) {
    if (!pasaTipos(tipos, e.tournamentKind) || !pasaCiudad(ciudad, e.location)) continue;
    if (!pasaAsistencia(filtroAsis, asisDe("evento", e.id))) continue; // v0.106
    const t = toneOf(e.tournamentKind, e.kind === "deadline" ? "deadline" : e.kind === "round" ? "round" : "event");
    pushRange(e.date, e.endDate, { text: e.title, color: t.color, label: t.label, url: e.url || undefined, kind: e.tournamentKind,
      conviene: e.date >= today && Boolean(e.tournamentKind && conviene.has(e.tournamentKind)), asis: asisDe("evento", e.id), van: grupoDe("evento", e.id)?.si ?? 0 });
  }
  for (const t of datos.tournaments) {
    if (!pasaTipos(tipos, t.kind) || !pasaCiudad(ciudad, ciudadTorneo(t))) continue;
    if (!pasaAsistencia(filtroAsis, asisDe("torneo", t.id))) continue; // v0.106
    const tone = toneOf(t.kind, "event");
    // v0.16: un torneo del calendario lleva a su ficha.
    pushRange(t.date, t.endDate, { text: t.name, color: tone.color, label: tone.label, href: `/torneos/${t.id}`, kind: t.kind, scope: t.scope,
      conviene: t.date >= today && conviene.has(t.kind), asis: asisDe("torneo", t.id), van: grupoDe("torneo", t.id)?.si ?? 0 });
  }
  /* v0.38 — las partidas ya NO salen en el calendario.

     Un calendario sirve para ver qué viene y cuándo, y cada jornada metía
     veinte líneas de «Ibai 1–2 Alex» que tapaban los torneos, que es lo
     único que hay que planificar. El historial de partidas ya tiene su
     pantalla, con filtros y paginación: Resultados.

     Aquí quedan torneos y eventos oficiales, y nada más. */

  const first = new Date(year, month, 1);
  const start = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const tail = (7 - ((start + days) % 7)) % 7;
  const iso = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };

  const filtrosHref = (y: number, m: number, v: "calendario" | "agenda" = vista) => {
    const params = new URLSearchParams({ y: String(y), m: String(m) });
    if (tipo) params.set("tipo", tipo);
    if (ciudad) params.set("ciudad", ciudad);
    if (v === "agenda") params.set("vista", "agenda");
    if (filtroAsis !== "todo") params.set("asist", filtroAsis); // v0.106
    return `/calendario?${params.toString()}`;
  };
  const mesHref = (y: number, m: number) => filtrosHref(y, m);
  /** v0.63 — la URL de un chip: la selección con ese tipo puesto o quitado. */
  const tipoHref = (sel: string[]) => {
    const params = new URLSearchParams({ y: String(year), m: String(month) });
    const seleccion = tiposAParam(sel);
    if (seleccion) params.set("tipo", seleccion);
    if (ciudad) params.set("ciudad", ciudad);
    if (vista === "agenda") params.set("vista", "agenda");
    if (filtroAsis !== "todo") params.set("asist", filtroAsis); // v0.106
    return `/calendario?${params.toString()}`;
  };
  /** v0.106 — la URL de un chip de asistencia: el resto de filtros se conserva. */
  const asisHref = (fa: FiltroAsistencia) => {
    const params = new URLSearchParams({ y: String(year), m: String(month) });
    if (tipo) params.set("tipo", tipo);
    if (ciudad) params.set("ciudad", ciudad);
    if (vista === "agenda") params.set("vista", "agenda");
    if (fa !== "todo") params.set("asist", fa);
    return `/calendario?${params.toString()}`;
  };
  const vistaHref = (v: "calendario" | "agenda") =>
    filtrosHref(year, month, v);
  const sinFiltrosHref = (() => {
    const params = new URLSearchParams({ y: String(year), m: String(month) });
    if (vista === "agenda") params.set("vista", "agenda");
    return `/calendario?${params.toString()}`;
  })();

  /* La agenda: todo lo que viene por delante, del más cercano al más lejano.
     Antes solo enseñaba los eventos; ahora también los torneos apuntados,
     que es lo que la gente busca aquí. */
  const agenda = [
    ...eventos
      .filter((e) => (e.endDate ?? e.date) >= today)
      .filter((e) => pasaTipos(tipos, e.tournamentKind))
      .filter((e) => pasaCiudad(ciudad, e.location))
      .filter((e) => pasaAsistencia(filtroAsis, asisDe("evento", e.id)))
      .map((e) => ({
        clave: claveAsistencia("evento", e.id), asis: asisDe("evento", e.id), grupo: grupoDe("evento", e.id),
        id: e.id, date: e.date, endDate: e.endDate, title: e.title,
        kindLabel: toneOf(e.tournamentKind, e.kind === "deadline" ? "deadline" : "event").label,
        color: toneOf(e.tournamentKind, e.kind === "deadline" ? "deadline" : "event").color,
        sub: [e.location, e.note].filter(Boolean).join(" · "),
        url: e.url || undefined,
        href: undefined as string | undefined,
        kind: e.tournamentKind as string | null,
        scope: null as string | null,
      })),
    ...datos.tournaments
      .filter((t) => (t.endDate ?? t.date) >= today)
      .filter((t) => pasaTipos(tipos, t.kind))
      .filter((t) => pasaCiudad(ciudad, ciudadTorneo(t)))
      .filter((t) => pasaAsistencia(filtroAsis, asisDe("torneo", t.id)))
      .map((t) => ({
        clave: claveAsistencia("torneo", t.id), asis: asisDe("torneo", t.id), grupo: grupoDe("torneo", t.id),
        id: t.id, date: t.date, endDate: t.endDate, title: t.name,
        kindLabel: toneOf(t.kind, "event").label,
        color: toneOf(t.kind, "event").color,
        sub: [t.city, t.venue].filter(Boolean).join(" · "),
        kind: t.kind as string | null,
        scope: t.scope as string | null,
        url: undefined,
        href: `/torneos/${t.id}`,
      })),
  ].sort(byAgenda(today));

  /* v0.106 — recuento de lo que viene (con los filtros de tipo y ciudad, sin
     el de asistencia) para los números de los chips. */
  const porVenir = [
    ...eventos.filter((e) => (e.endDate ?? e.date) >= today && pasaTipos(tipos, e.tournamentKind) && pasaCiudad(ciudad, e.location))
      .map((e) => claveAsistencia("evento", e.id)),
    ...datos.tournaments.filter((t) => (t.endDate ?? t.date) >= today && pasaTipos(tipos, t.kind) && pasaCiudad(ciudad, ciudadTorneo(t)))
      .map((t) => claveAsistencia("torneo", t.id)),
  ];
  const cuenta = contarAsistencia(porVenir, marcas);
  const cuantos: Record<FiltroAsistencia, number> = {
    todo: porVenir.length, "sin-no": porVenir.length - cuenta.no, mios: cuenta.si + cuenta.quiza, si: cuenta.si, no: cuenta.no,
  };
  return (
    <>
      <PageHead
        title={tr(lng, "x.df824e6b")}
        sub={tr(lng, "x.c765d337")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
          {/* v0.16 — selector de vista */}
          <div className="seg" role="tablist" aria-label={tr(lng, "x.462d2dd3")}>
            <Link href={vistaHref("calendario")} data-on={vista === "calendario"} aria-current={vista === "calendario" ? "page" : undefined}>
              <Icon name="calendar" className="size-4" /> {tr(lng, "x.df824e6b")}
            </Link>
            <Link href={vistaHref("agenda")} data-on={vista === "agenda"} aria-current={vista === "agenda" ? "page" : undefined}>
              <Icon name="results" className="size-4" /> {tr(lng, "x.891e9d6d")}
            </Link>
          </div>
          {vista === "calendario" && (
          <div className="flex items-center gap-1.5">
            <Link className="btn btn-sm px-3" href={mesHref(prev.y, prev.m)} aria-label={tr(lng, "x.7baa92d4")}>
              <Icon name="back" className="size-4" />
            </Link>
            {/* Más estrecho en el móvil: con 320px de ancho, 8rem aquí más los
                tres botones dejaba la fila sin sitio. */}
            <span className="min-w-24 text-center font-display text-base font-bold capitalize sm:min-w-32 sm:text-lg">
              {MONTHS[month]} {year}
            </span>
            <Link className="btn btn-sm px-3" href={mesHref(next.y, next.m)} aria-label={tr(lng, "x.b1f6f76f")}>
              <Icon name="back" className="size-4 rotate-180" />
            </Link>
            <Link className="btn btn-sm" href={filtrosHref(now.getFullYear(), now.getMonth())}>{tr(lng, "x.565e9824")}</Link>
          </div>
          )}
          </div>
        }
      />

      {/* ------------------------------ filtros ------------------------------ */}
      {(disponibles.length > 0 || ciudades.length > 0 || me) && (
        <div className="card mb-4 flex flex-col gap-3 p-3 sm:p-4" data-paso="calendario-2">
          {disponibles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={tr(lng, "v63.calFiltro")}>
              <span className="label mr-1">{tr(lng, "v63.calFiltro")}</span>
              <Link
                href={tipoHref([])}
                aria-current={!tipos.length ? "page" : undefined}
                className={`chip flex-none ${!tipos.length ? "chip-brand" : ""}`}
              >
                {tr(lng, "x.fdebf667")}
              </Link>
              {disponibles.map((k) => (
                <Link
                  key={k}
                  href={tipoHref(alternarTipo(tipos, k))}
                  aria-pressed={tipos.includes(k)}
                  className="chip flex-none"
                  style={tipos.includes(k)
                    ? { background: CALENDAR_KINDS[k].color, color: "var(--ground)", borderColor: "transparent" }
                    : { borderColor: CALENDAR_KINDS[k].color, color: CALENDAR_KINDS[k].color }}
                >
                  {tipos.includes(k)
                    ? <span aria-hidden="true">✓</span>
                    : <i className="size-2 rounded-full" style={{ background: CALENDAR_KINDS[k].color }} aria-hidden="true" />}
                  {CALENDAR_KINDS[k].label}
                </Link>
              ))}
              <span className="text-[11px] text-muted">
                {tipos.length > 1 ? trf(lng, "v63.calVarios", { n: tipos.length }) : tr(lng, "v63.calPista")}
              </span>
            </div>
          )}

          {/* v0.106 — «Iré / Quizá / No iré»: quitar lo descartado y ver lo demás. */}
          {me && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={tr(lng, "asis.filtro")}>
              <FiltroAsistenciaSelect
                etiqueta={tr(lng, "asis.filtro")}
                valor={filtroAsis}
                opciones={FILTROS_ASISTENCIA.map((fa) => ({
                  value: fa,
                  label: `${tr(lng, `asis.f.${fa}`)} · ${cuantos[fa]}`,
                  href: asisHref(fa),
                }))}
                ayuda={tr(lng, vista === "agenda" ? "asis.pistaAgenda" : "asis.pista")}
              />
              {asis && !asis.tabla && <span className="text-[11px] font-semibold text-loss">{tr(lng, "asis.sinTabla")}</span>}
            </div>
          )}

          {ciudades.length > 0 && (
            <form method="get" action="/calendario" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="y" value={year} />
              <input type="hidden" name="m" value={month} />
              {tipo && <input type="hidden" name="tipo" value={tipo} />}
              {vista === "agenda" && <input type="hidden" name="vista" value="agenda" />}
              {filtroAsis !== "todo" && <input type="hidden" name="asist" value={filtroAsis} />}
              <label className="flex min-w-48 flex-col gap-1">
                <span className="label">{tr(lng, "cal.ciudad")}</span>
                <CityPicker name="ciudad" options={ciudades} defaultValue={ciudad} />
              </label>
              <button className="btn btn-sm" type="submit">{tr(lng, "cal.aplicarFiltro")}</button>
            </form>
          )}
          {(tipo || ciudad || filtroAsis !== "todo") && (
            <Link className="btn btn-ghost btn-sm self-start" href={sinFiltrosHref}>
              {tr(lng, "cal.limpiarFiltros")}
            </Link>
          )}
        </div>
      )}

      {/* ------------------------------ la rejilla ---------------------------- */}
      {vista === "calendario" && (
      <div className="card mb-5 overflow-hidden">
        <div className="grid grid-cols-7">
          {DOWS.map((d) => (
            <div key={d} className="border-b border-r border-line-soft bg-surface-2 px-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted last:border-r-0">
              <span className="hidden sm:inline">{d}</span><span className="sm:hidden">{d[0]}</span>
            </div>
          ))}
          {Array.from({ length: start }, (_, i) => (
            <div key={`p${i}`} className="min-h-20 sm:min-h-28 border-b border-r border-line-soft bg-surface-2/60 p-1" />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const d = i + 1;
            const key = iso(d);
            const marks = byDay.get(key) ?? [];
            const isToday = key === today;
            return (
              <div key={key} className="flex min-h-20 flex-col gap-0.5 border-b border-r border-line-soft p-1 last:border-r-0 sm:min-h-28 lg:min-h-32">
                <span className={`text-[11px] font-mono ${isToday
                  ? "grid size-5 place-items-center rounded-full bg-brand font-bold text-on-brand"
                  : "text-muted"}`}>{d}</span>
                {/* v0.17: la rejilla es la vista principal, así que caben tres. */}
                {marks.slice(0, 3).map((m, j) => {
                  const estilo = {
                    // Fondo tintado y texto del color: el contraste depende
                    // solo del par color/página, que es el que está medido.
                    background: `color-mix(in oklab, ${m.color} 16%, transparent)`,
                    color: m.color,
                  };
                  const clase = "flex min-w-0 items-center gap-0.5 rounded px-0.5 py-px text-[9px] font-semibold sm:px-1 sm:text-[10px]";
                  // v0.16: torneos y partidas llevan a su ficha; un evento con web, a su web.
                  return m.href ? (
                    <Link key={j} href={m.href} title={`${m.label}: ${m.text}`} className={`${clase} hover:brightness-125`} style={estilo}>
                      <TournamentEmblem kind={m.kind} scope={m.scope} size="xs" />
                      <span className={`truncate ${m.asis === "no" ? "line-through opacity-60" : ""}`}><MarcaAsis estado={m.asis} lng={lng} />{m.conviene && <span title={tr(lng, "v90.conviene")} className="mr-0.5 text-brand">★</span>}{m.text}</span>{m.van ? <span className="ml-0.5 flex-none rounded bg-surface-2 px-0.5 font-mono text-[9px] tabular text-ink-2" title={trf(lng, "asis.grupo.van", { n: m.van })}>{m.van}</span> : null}
                    </Link>
                  ) : m.url ? (
                    <a key={j} href={m.url} target="_blank" rel="noopener noreferrer" title={`${m.label}: ${m.text}`} className={clase} style={estilo}>
                      <TournamentEmblem kind={m.kind} scope={m.scope} size="xs" />
                      <span className={`truncate ${m.asis === "no" ? "line-through opacity-60" : ""}`}><MarcaAsis estado={m.asis} lng={lng} />{m.conviene && <span title={tr(lng, "v90.conviene")} className="mr-0.5 text-brand">★</span>}{m.text}</span>{m.van ? <span className="ml-0.5 flex-none rounded bg-surface-2 px-0.5 font-mono text-[9px] tabular text-ink-2" title={trf(lng, "asis.grupo.van", { n: m.van })}>{m.van}</span> : null}
                    </a>
                  ) : (
                    <span key={j} title={`${m.label}: ${m.text}`} className={clase} style={estilo}>
                      <TournamentEmblem kind={m.kind} scope={m.scope} size="xs" />
                      <span className={`truncate ${m.asis === "no" ? "line-through opacity-60" : ""}`}><MarcaAsis estado={m.asis} lng={lng} />{m.conviene && <span title={tr(lng, "v90.conviene")} className="mr-0.5 text-brand">★</span>}{m.text}</span>{m.van ? <span className="ml-0.5 flex-none rounded bg-surface-2 px-0.5 font-mono text-[9px] tabular text-ink-2" title={trf(lng, "asis.grupo.van", { n: m.van })}>{m.van}</span> : null}
                    </span>
                  );
                })}
                {marks.length > 3 && <span className="text-[9px] text-muted">+{marks.length - 3}</span>}
              </div>
            );
          })}
          {Array.from({ length: tail }, (_, i) => (
            <div key={`n${i}`} className="min-h-20 sm:min-h-28 border-b border-r border-line-soft bg-surface-2/60 p-1 last:border-r-0" />
          ))}
        </div>
      </div>
      )}

      {/* --------------------------- la agenda grande ------------------------ */}
      {vista === "agenda" && <AgendaGrande agenda={agenda} filtroActivo={Boolean(tipo || ciudad || filtroAsis !== "todo")} puedeMarcar={Boolean(me && asis?.tabla)} />}

      {/* v0.17 — con «Calendario» se ve la rejilla y lo suyo (añadir e
          importar eventos, para organizadores); la agenda ya NO sale debajo:
          para eso está la vista «Agenda». Y con «Agenda» solo sale la agenda. */}
      {vista === "calendario" && manager && (
          <div className="grid items-start gap-4 lg:grid-cols-3">
            <section className="card">
              <div className="card-head"><h2 className="text-lg font-bold">{tr(lng, "x.52501db8")}</h2></div>
              <div className="p-4"><EventForm competitions={datos.competitions} tournaments={datos.tournaments} /></div>
            </section>

            <section className="card">
              <div className="card-head"><h2 className="text-lg font-bold">{tr(lng, "x.4566e25f")}</h2></div>
              <div className="p-4">
                <p className="mb-3 text-sm text-muted">
                  Mete de una vez los Regionales, Special Events y el Internacional de la
                  temporada 2027 en Europa. La lista está escrita a mano en{" "}
                  <code className="font-mono text-xs">src/data/eventos-europa.ts</code>, con sus
                  fuentes; no se consulta ninguna web. Se puede pulsar las veces que haga falta:
                  actualiza en vez de duplicar.
                </p>
                <form action={importEuropeanEvents}>
                  <button className="btn btn-brand w-full" type="submit">
                    <Icon name="globe" className="size-4" /> {tr(lng, "x.63d55da9")}
                  </button>
                </form>
                <p className="mt-2 text-[11px] text-muted">
                  {tr(lng, "x.1169d7b0")}
                </p>
              </div>
            </section>

            {/* v0.14 — Challenges y Cups de la zona, pegando el buscador oficial.
                No se consulta pokemon.com desde la app: sus condiciones prohíben
                la extracción automatizada. */}
            <section className="card">
              <div className="card-head"><h2 className="text-lg font-bold">{tr(lng, "x.e806562b")}</h2></div>
              <form action={importPastedEvents} className="flex flex-col gap-3 p-4">
                <p className="text-sm text-muted">
                  Pega aquí la lista copiada del{" "}
                  <a className="underline" href="https://events.pokemon.com/EventLocator/" target="_blank" rel="noopener noreferrer">
                    {tr(lng, "x.1c7dda4e")}
                  </a>{" "}
                  o un mensaje de WhatsApp/chat organizado por meses (ej. OCTUBRE con CHALLENGE, CUP y REGIONAL).
                  Pegar otra vez la misma lista actualiza y no duplica.
                </p>
                <textarea className="input min-h-32 font-mono text-xs" name="texto" required
                  placeholder={"OCTUBRE\nCHALLENGE Sábado 3 - 16:30 Freakshow (Girona)\nCUP Domingo 4 - 10:30 Mythic (Calella)\nREGIONAL NIZA 17-18"} />
                <button className="btn btn-brand w-full" type="submit">
                  <Icon name="calendar" className="size-4" /> {tr(lng, "x.52501db8")}
                </button>
              </form>
            </section>
          </div>
        )}

    </>
  );
}

/* =========================================================================
   v0.16 — La agenda grande.

   Pensada para mirarse de un vistazo, con el móvil en la mano. Por cada
   evento, en este orden de importancia:

     1. LA FECHA — un bloque grande: día del mes, mes y día de la semana.
     2. El nombre, en grande.
     3. El tipo, como chip de color, debajo, junto a dónde y cuánto falta.

   Va agrupada por mes, y respeta el filtro de tipo de arriba.
   ========================================================================= */
type ItemAgenda = {
  /** v0.106 — `evento:<id>` o `torneo:<id>`, y mi marca. */
  clave: string; asis: EstadoAsistencia | null;
  /** v0.108 — cuántos del grupo van / quizá (sin nombres). */
  grupo: { si: number; quiza: number } | null;
  id: string; date: string; endDate: string | null; title: string;
  kindLabel: string; color: string; sub: string; url?: string; href?: string;
  kind?: string | null; scope?: string | null;
};

async function AgendaGrande({ agenda, filtroActivo, puedeMarcar }: {
  agenda: ItemAgenda[]; filtroActivo: boolean; puedeMarcar: boolean;
}) {
  const lng = await getLang(); // v0.49

  if (!agenda.length) {
    return (
      <div className="card mb-5">
        <Empty icon="calendar" title={filtroActivo ? tr(lng, "cal.nadaFiltrado") : tr(lng, "x.2944d831")}>
          {filtroActivo ? tr(lng, "cal.quitarFiltros") : tr(lng, "x.969b4a0d")}
        </Empty>
      </div>
    );
  }
  const porMes = new Map<string, ItemAgenda[]>();
  for (const e of agenda) {
    const k = e.date.slice(0, 7);
    const l = porMes.get(k);
    if (l) l.push(e); else porMes.set(k, [e]);
  }
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const dia = (iso: string) => DIAS[new Date(`${iso}T12:00:00Z`).getUTCDay()];

  return (
    <div className="mb-5 flex flex-col gap-5">
      {[...porMes.entries()].map(([mes, items]) => {
        const [y, m] = mes.split("-").map(Number);
        return (
          <section key={mes}>
            <h2 className="mb-2 px-1 font-display text-xl font-bold capitalize">
              {MONTHS[m - 1]} <span className="text-muted">{y}</span>
            </h2>
            <ul className="card divide-y divide-line-soft">
              {items.map((e) => {
                const varios = e.endDate && e.endDate !== e.date;
                const contenido = (
                  <>
                    <span
                      className="flex w-16 flex-none flex-col items-center rounded-xl border py-1.5 text-center sm:w-20"
                      style={{ borderColor: `color-mix(in oklab, ${e.color} 45%, transparent)`, background: `color-mix(in oklab, ${e.color} 10%, transparent)` }}
                    >
                      <span className="font-display text-3xl font-extrabold leading-none tabular sm:text-4xl">
                        {Number(e.date.slice(8, 10))}
                        {varios ? <span className="text-lg">–{Number(e.endDate!.slice(8, 10))}</span> : null}
                      </span>
                      <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-2">
                        {dia(e.date).slice(0, 3)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        {/* v0.18: el emblema del tipo, a juego con el del Regional. */}
                        <TournamentEmblem kind={e.kind} scope={e.scope} size="sm" />
                        <span className="block min-w-0 font-display text-xl font-bold leading-tight sm:text-2xl">{e.title}</span>
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                        <span
                          className="chip"
                          style={{ background: `color-mix(in oklab, ${e.color} 16%, transparent)`, color: e.color, borderColor: "transparent" }}
                        >
                          {e.kindLabel}
                        </span>
                        <span>{relDays(e.date)}</span>
                        {e.grupo && (e.grupo.si > 0 || e.grupo.quiza > 0) && (
                          <span className="chip chip-win" title={tr(lng, "asis.grupo.ayuda")}>
                            <Icon name="user" className="size-3.5" />
                            {e.grupo.si > 0 ? trf(lng, "asis.grupo.van", { n: e.grupo.si }) : null}
                            {e.grupo.si > 0 && e.grupo.quiza > 0 ? " · " : null}
                            {e.grupo.quiza > 0 ? trf(lng, "asis.grupo.quiza", { n: e.grupo.quiza }) : null}
                          </span>
                        )}
                        {e.sub && <span className="truncate">· {e.sub}</span>}
                      </span>
                    </span>
                    {(e.href || e.url) && <Icon name="back" className="size-5 flex-none rotate-180 text-muted" />}
                  </>
                );
                const clase = "flex items-center gap-4 px-4 py-4 hover:bg-surface-2";
                return (
                  <li key={e.id} className={e.asis === "no" ? "opacity-60" : ""}>
                    {e.href
                      ? <Link href={e.href} className={clase}>{contenido}</Link>
                      : e.url
                        ? <a href={e.url} target="_blank" rel="noopener noreferrer" className={clase}>{contenido}</a>
                        : <div className={`${clase} hover:bg-transparent`}>{contenido}</div>}
                    {puedeMarcar && <AsistenciaBotones elemento={e.clave} estado={e.asis} />}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* =========================================================================
   v0.106 — «Iré / Quizá / No iré».
   ========================================================================= */

const TONO_ASIS: Record<EstadoAsistencia, { color: string; simbolo: string }> = {
  si: { color: "var(--color-win)", simbolo: "✓" },
  quiza: { color: "var(--color-brand)", simbolo: "?" },
  no: { color: "var(--color-loss)", simbolo: "✕" },
};

/** El símbolo de mi marca delante del nombre, en la rejilla. */
function MarcaAsis({ estado, lng }: { estado?: EstadoAsistencia | null; lng: Awaited<ReturnType<typeof getLang>> }) {
  if (!estado) return null;
  const t = TONO_ASIS[estado];
  return <span title={tr(lng, `asis.e.${estado}`)} aria-label={tr(lng, `asis.e.${estado}`)} className="mr-0.5 font-black" style={{ color: t.color }}>{t.simbolo}</span>;
}
