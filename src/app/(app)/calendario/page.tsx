import Link from "next/link";
import { currentPlayer, loadSnapshot } from "@/lib/data";
import { canManageLeague } from "@/lib/auth";
import { isPlayed, outcome } from "@/lib/stats";
import { CALENDAR_KINDS, kindsPresent, toneOf } from "@/lib/calendar";
import { DOWS, MONTHS, byAgenda, relDays, todayISO } from "@/lib/format";
import { Empty, PageHead, TournamentEmblem } from "@/components/ui";
import { EventForm } from "@/components/EventForm";
import { Icon } from "@/components/icons";
import { importEuropeanEvents, importPastedEvents } from "@/actions";

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
  const q = await searchParams;
  const now = new Date();
  const year = Number(q.y) || now.getFullYear();
  const month = q.m != null && q.m !== "" ? Number(q.m) : now.getMonth();

  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  const manager = me ? canManageLeague(me.role) : false;
  const today = todayISO();

  const tipo = q.tipo && CALENDAR_KINDS[q.tipo] ? q.tipo : "";
  /** v0.16 — Calendario (rejilla del mes) o Agenda (lista grande de lo que viene). */
  const vista: "calendario" | "agenda" = q.vista === "agenda" ? "agenda" : "calendario";
  const vistaQs = vista === "agenda" ? "&vista=agenda" : "";

  /* Los tipos que de verdad hay entre los eventos y los torneos apuntados.
     Ofrecer un filtro de «Mundial» cuando no hay ninguno es ruido. */
  const disponibles = kindsPresent([
    ...snap.events.map((e) => e.tournamentKind),
    ...snap.tournaments.map((t) => t.kind),
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
  const eventos = snap.events.filter((e) => !(e.tournamentId && snap.toursById.has(e.tournamentId)));

  for (const e of eventos) {
    if (tipo && e.tournamentKind !== tipo) continue;
    const t = toneOf(e.tournamentKind, e.kind === "deadline" ? "deadline" : e.kind === "round" ? "round" : "event");
    pushRange(e.date, e.endDate, { text: e.title, color: t.color, label: t.label, url: e.url || undefined, kind: e.tournamentKind });
  }
  for (const t of snap.tournaments) {
    if (tipo && t.kind !== tipo) continue;
    const tone = toneOf(t.kind, "event");
    // v0.16: un torneo del calendario lleva a su ficha.
    pushRange(t.date, t.endDate, { text: t.name, color: tone.color, label: tone.label, href: `/torneos/${t.id}`, kind: t.kind, scope: t.scope });
  }
  // Las partidas solo cuando no hay filtro de tipo puesto: si alguien está
  // mirando «Regionales», las partidas del martes no le interesan.
  if (!tipo) {
    for (const m of snap.matches.filter(isPlayed)) {
      const o = outcome(m);
      push(m.date, {
        text: `${snap.playersById.get(m.playerAId)?.name ?? "?"} ${o.ga}–${o.gb} ${m.playerBId ? snap.playersById.get(m.playerBId)?.name ?? "?" : m.opponentName ?? "?"}`,
        color: "var(--muted)",
        label: "Partida",
        href: `/partidas/${m.id}`,
      });
    }
  }

  const first = new Date(year, month, 1);
  const start = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const tail = (7 - ((start + days) % 7)) % 7;
  const iso = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };

  const mesHref = (y: number, m: number) =>
    `/calendario?y=${y}&m=${m}${tipo ? `&tipo=${tipo}` : ""}`;
  const tipoHref = (t: string) =>
    `/calendario?y=${year}&m=${month}${t ? `&tipo=${t}` : ""}${vistaQs}`;
  const vistaHref = (v: "calendario" | "agenda") =>
    `/calendario?y=${year}&m=${month}${tipo ? `&tipo=${tipo}` : ""}${v === "agenda" ? "&vista=agenda" : ""}`;

  /* La agenda: todo lo que viene por delante, del más cercano al más lejano.
     Antes solo enseñaba los eventos; ahora también los torneos apuntados,
     que es lo que la gente busca aquí. */
  const agenda = [
    ...eventos
      .filter((e) => (e.endDate ?? e.date) >= today)
      .filter((e) => !tipo || e.tournamentKind === tipo)
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
    ...snap.tournaments
      .filter((t) => (t.endDate ?? t.date) >= today)
      .filter((t) => !tipo || t.kind === tipo)
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
        title="Calendario"
        sub="Vuestras jornadas y fechas límite, los torneos apuntados, los oficiales de Europa y las partidas ya jugadas. Cada tipo, con su color."
        actions={
          <div className="flex flex-wrap items-center gap-2">
          {/* v0.16 — selector de vista */}
          <div className="seg" role="tablist" aria-label="Vista">
            <Link href={vistaHref("calendario")} data-on={vista === "calendario"} aria-current={vista === "calendario" ? "page" : undefined}>
              <Icon name="calendar" className="size-4" /> Calendario
            </Link>
            <Link href={vistaHref("agenda")} data-on={vista === "agenda"} aria-current={vista === "agenda" ? "page" : undefined}>
              <Icon name="results" className="size-4" /> Agenda
            </Link>
          </div>
          {vista === "calendario" && (
          <div className="flex items-center gap-1.5">
            <Link className="btn btn-sm px-3" href={mesHref(prev.y, prev.m)} aria-label="Mes anterior">
              <Icon name="back" className="size-4" />
            </Link>
            {/* Más estrecho en el móvil: con 320px de ancho, 8rem aquí más los
                tres botones dejaba la fila sin sitio. */}
            <span className="min-w-24 text-center font-display text-base font-bold capitalize sm:min-w-32 sm:text-lg">
              {MONTHS[month]} {year}
            </span>
            <Link className="btn btn-sm px-3" href={mesHref(next.y, next.m)} aria-label="Mes siguiente">
              <Icon name="back" className="size-4 rotate-180" />
            </Link>
            <Link className="btn btn-sm" href={tipo ? `/calendario?tipo=${tipo}` : "/calendario"}>Hoy</Link>
          </div>
          )}
          </div>
        }
      />

      {/* ------------------------------ filtros ------------------------------ */}
      {disponibles.length > 0 && (
        <div className="scroll-x mb-3 flex gap-2 pb-1">
          <Link
            href={tipoHref("")}
            aria-current={!tipo ? "page" : undefined}
            className={`chip flex-none ${!tipo ? "chip-brand" : ""}`}
          >
            Todo
          </Link>
          {disponibles.map((k) => (
            <Link
              key={k}
              href={tipoHref(k)}
              aria-current={tipo === k ? "page" : undefined}
              className="chip flex-none"
              style={tipo === k
                ? { background: CALENDAR_KINDS[k].color, color: "var(--ground)", borderColor: "transparent" }
                : { borderColor: CALENDAR_KINDS[k].color, color: CALENDAR_KINDS[k].color }}
            >
              <i className="size-2 rounded-full" style={{ background: CALENDAR_KINDS[k].color }} aria-hidden="true" />
              {CALENDAR_KINDS[k].label}
            </Link>
          ))}
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
              <div className="card-head"><h2 className="text-lg font-bold">Añadir al calendario</h2></div>
              <div className="p-4"><EventForm competitions={snap.competitions} tournaments={snap.tournaments} /></div>
            </section>

            <section className="card">
              <div className="card-head"><h2 className="text-lg font-bold">Eventos oficiales de Europa</h2></div>
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
                    <Icon name="globe" className="size-4" /> Importar eventos de Europa
                  </button>
                </form>
                <p className="mt-2 text-[11px] text-muted">
                  Alguna fecha está marcada como «por confirmar» porque las fuentes no
                  coinciden. Míralas en la web oficial antes de sacar vuelos.
                </p>
              </div>
            </section>

            {/* v0.14 — Challenges y Cups de la zona, pegando el buscador oficial.
                No se consulta pokemon.com desde la app: sus condiciones prohíben
                la extracción automatizada. */}
            <section className="card">
              <div className="card-head"><h2 className="text-lg font-bold">Challenges y Cups de la zona</h2></div>
              <form action={importPastedEvents} className="flex flex-col gap-3 p-4">
                <p className="text-sm text-muted">
                  Abre el{" "}
                  <a className="underline" href="https://events.pokemon.com/EventLocator/" target="_blank" rel="noopener noreferrer">
                    buscador de eventos oficial
                  </a>, busca <b>Barcelona</b> con TCG, League Challenge y League Cup, selecciona la
                  lista de resultados, cópiala y pégala aquí. Se quedan solo los Challenges y Cups de
                  TCG; pegar otra vez la misma lista actualiza y no duplica.
                </p>
                <textarea className="input min-h-32 font-mono text-xs" name="texto" required
                  placeholder={"League Challenge\nSat, Oct 4, 2026 10:00 AM\nTienda\nCarrer…, Barcelona"} />
                <button className="btn btn-brand w-full" type="submit">
                  <Icon name="calendar" className="size-4" /> Añadir al calendario
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

function AgendaGrande({ agenda, tipo }: { agenda: ItemAgenda[]; tipo: string }) {
  if (!agenda.length) {
    return (
      <div className="card mb-5">
        <Empty icon="calendar" title={tipo ? "Nada de ese tipo por delante" : "Agenda vacía"}>
          {tipo ? "Prueba a quitar el filtro." : "Cuando haya torneos o eventos por delante, saldrán aquí."}
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
