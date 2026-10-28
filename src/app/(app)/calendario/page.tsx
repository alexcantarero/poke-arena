import Link from "next/link";
import { currentPlayer, loadCompetitionHeads, loadEvents, loadTournamentHeads } from "@/lib/data";
import { canManageLeague } from "@/lib/auth";
// v0.38: ya no se pintan partidas aquí, así que no hace falta leerlas.
import { CALENDAR_KINDS, alternarTipo, kindsPresent, parseTipos, pasaTipos, tiposAParam, toneOf } from "@/lib/calendar";
import { DOWS, MONTHS, byAgenda, relDays, todayISO } from "@/lib/format";
import { Empty, PageHead, TournamentEmblem } from "@/components/ui";
import { EventForm } from "@/components/EventForm";
import { Icon } from "@/components/icons";
import { importEuropeanEvents, importPastedEvents } from "@/actions";
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
}: { searchParams: Promise<{ y?: string; m?: string; tipo?: string; vista?: string }> }) {
  const lng = await getLang(); // v0.49

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
  const today = todayISO();

  /* v0.63 — varios tipos a la vez (`?tipo=regional,league_cup`). `tipo` es el
     valor tal cual va en la URL; `tipos`, la lista para filtrar. */
  const tipos = parseTipos(q.tipo);
  const tipo = tiposAParam(tipos);
  /** v0.16 — Calendario (rejilla del mes) o Agenda (lista grande de lo que viene). */
  const vista: "calendario" | "agenda" = q.vista === "agenda" ? "agenda" : "calendario";
  const vistaQs = vista === "agenda" ? "&vista=agenda" : "";

  /* Los tipos que de verdad hay entre los eventos y los torneos apuntados.
     Ofrecer un filtro de «Mundial» cuando no hay ninguno es ruido. */
  const disponibles = kindsPresent([
    ...datos.events.map((e) => e.tournamentKind),
    ...datos.tournaments.map((t) => t.kind),
  ]);

  /** v0.18: `kind`/`scope` para el emblema (Regional, Challenge, Cup, Online). */
  type Mark = { text: string; color: string; label: string; url?: string; href?: string; kind?: string | null; scope?: string | null };
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
    if (!pasaTipos(tipos, e.tournamentKind)) continue;
    const t = toneOf(e.tournamentKind, e.kind === "deadline" ? "deadline" : e.kind === "round" ? "round" : "event");
    pushRange(e.date, e.endDate, { text: e.title, color: t.color, label: t.label, url: e.url || undefined, kind: e.tournamentKind });
  }
  for (const t of datos.tournaments) {
    if (!pasaTipos(tipos, t.kind)) continue;
    const tone = toneOf(t.kind, "event");
    // v0.16: un torneo del calendario lleva a su ficha.
    pushRange(t.date, t.endDate, { text: t.name, color: tone.color, label: tone.label, href: `/torneos/${t.id}`, kind: t.kind, scope: t.scope });
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

  const mesHref = (y: number, m: number) =>
    `/calendario?y=${y}&m=${m}${tipo ? `&tipo=${tipo}` : ""}`;
  /** v0.63 — la URL de un chip: la selección con ese tipo puesto o quitado. */
  const tipoHref = (sel: string[]) => {
    const t = tiposAParam(sel);
    return `/calendario?y=${year}&m=${month}${t ? `&tipo=${t}` : ""}${vistaQs}`;
  };
  const vistaHref = (v: "calendario" | "agenda") =>
    `/calendario?y=${year}&m=${month}${tipo ? `&tipo=${tipo}` : ""}${v === "agenda" ? "&vista=agenda" : ""}`;

  /* La agenda: todo lo que viene por delante, del más cercano al más lejano.
     Antes solo enseñaba los eventos; ahora también los torneos apuntados,
     que es lo que la gente busca aquí. */
  const agenda = [
    ...eventos
      .filter((e) => (e.endDate ?? e.date) >= today)
      .filter((e) => pasaTipos(tipos, e.tournamentKind))
      .map((e) => ({
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
      .map((t) => ({
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
            <Link className="btn btn-sm" href={tipo ? `/calendario?tipo=${tipo}` : "/calendario"}>{tr(lng, "x.565e9824")}</Link>
          </div>
          )}
          </div>
        }
      />

      {/* ------------------------------ filtros ------------------------------ */}
      {disponibles.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label={tr(lng, "v63.calFiltro")} data-paso="calendario-2">
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
                      <span className="truncate">{m.text}</span>
                    </Link>
                  ) : m.url ? (
                    <a key={j} href={m.url} target="_blank" rel="noopener noreferrer" title={`${m.label}: ${m.text}`} className={clase} style={estilo}>
                      <TournamentEmblem kind={m.kind} scope={m.scope} size="xs" />
                      <span className="truncate">{m.text}</span>
                    </a>
                  ) : (
                    <span key={j} title={`${m.label}: ${m.text}`} className={clase} style={estilo}>
                      <TournamentEmblem kind={m.kind} scope={m.scope} size="xs" />
                      <span className="truncate">{m.text}</span>
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
      {vista === "agenda" && <AgendaGrande agenda={agenda} tipo={tipo} />}

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
  id: string; date: string; endDate: string | null; title: string;
  kindLabel: string; color: string; sub: string; url?: string; href?: string;
  kind?: string | null; scope?: string | null;
};

async function AgendaGrande({ agenda, tipo }: { agenda: ItemAgenda[]; tipo: string }) {
  const lng = await getLang(); // v0.49

  if (!agenda.length) {
    return (
      <div className="card mb-5">
        <Empty icon="calendar" title={tipo ? "Nada de ese tipo por delante" : tr(lng, "x.2944d831")}>
          {tipo ? "Prueba a quitar el filtro." : tr(lng, "x.969b4a0d")}
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
                        {e.sub && <span className="truncate">· {e.sub}</span>}
                      </span>
                    </span>
                    {(e.href || e.url) && <Icon name="back" className="size-5 flex-none rotate-180 text-muted" />}
                  </>
                );
                const clase = "flex items-center gap-4 px-4 py-4 hover:bg-surface-2";
                return (
                  <li key={e.id}>
                    {e.href
                      ? <Link href={e.href} className={clase}>{contenido}</Link>
                      : e.url
                        ? <a href={e.url} target="_blank" rel="noopener noreferrer" className={clase}>{contenido}</a>
                        : <div className={`${clase} hover:bg-transparent`}>{contenido}</div>}
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
