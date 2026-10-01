import Link from "next/link";
import { currentPlayer, loadSnapshot } from "@/lib/data";
import { canManageLeague } from "@/lib/auth";
import { isPlayed, outcome } from "@/lib/stats";
import { CALENDAR_KINDS, kindsPresent, toneOf } from "@/lib/calendar";
import { DOWS, MONTHS, byAgenda, fmtDateLong, relDays, todayISO } from "@/lib/format";
import { Empty, PageHead } from "@/components/ui";
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
}: { searchParams: Promise<{ y?: string; m?: string; tipo?: string }> }) {
  const q = await searchParams;
  const now = new Date();
  const year = Number(q.y) || now.getFullYear();
  const month = q.m != null && q.m !== "" ? Number(q.m) : now.getMonth();

  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  const manager = me ? canManageLeague(me.role) : false;
  const today = todayISO();

  const tipo = q.tipo && CALENDAR_KINDS[q.tipo] ? q.tipo : "";

  /* Los tipos que de verdad hay entre los eventos y los torneos apuntados.
     Ofrecer un filtro de «Mundial» cuando no hay ninguno es ruido. */
  const disponibles = kindsPresent([
    ...snap.events.map((e) => e.tournamentKind),
    ...snap.tournaments.map((t) => t.kind),
  ]);

  type Mark = { text: string; color: string; label: string; url?: string };
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
    pushRange(e.date, e.endDate, { text: e.title, color: t.color, label: t.label, url: e.url || undefined });
  }
  for (const t of snap.tournaments) {
    if (tipo && t.kind !== tipo) continue;
    const tone = toneOf(t.kind, "event");
    pushRange(t.date, t.endDate, { text: t.name, color: tone.color, label: tone.label });
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
    `/calendario?y=${year}&m=${month}${t ? `&tipo=${t}` : ""}`;

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
      })),
    ...snap.tournaments
      .filter((t) => (t.endDate ?? t.date) >= today)
      .filter((t) => !tipo || t.kind === tipo)
      .map((t) => ({
        id: t.id, date: t.date, endDate: t.endDate, title: t.name,
        kindLabel: toneOf(t.kind, "event").label,
        color: toneOf(t.kind, "event").color,
        sub: [t.city, t.venue].filter(Boolean).join(" · "),
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
      <div className="card mb-5 overflow-hidden">
        <div className="grid grid-cols-7">
          {DOWS.map((d) => (
            <div key={d} className="border-b border-r border-line-soft bg-surface-2 px-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted last:border-r-0">
              <span className="hidden sm:inline">{d}</span><span className="sm:hidden">{d[0]}</span>
            </div>
          ))}
          {Array.from({ length: start }, (_, i) => (
            <div key={`p${i}`} className="min-h-16 border-b border-r border-line-soft bg-surface-2/60 p-1" />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const d = i + 1;
            const key = iso(d);
            const marks = byDay.get(key) ?? [];
            const isToday = key === today;
            return (
              <div key={key} className="flex min-h-16 flex-col gap-0.5 border-b border-r border-line-soft p-1 last:border-r-0 sm:min-h-20">
                <span className={`text-[11px] font-mono ${isToday
                  ? "grid size-5 place-items-center rounded-full bg-brand font-bold text-on-brand"
                  : "text-muted"}`}>{d}</span>
                {marks.slice(0, 2).map((m, j) => (
                  <span
                    key={j}
                    title={`${m.label}: ${m.text}`}
                    className="truncate rounded px-1 py-px text-[9px] font-semibold sm:text-[10px]"
                    style={{
                      // Fondo tintado y texto del color: el contraste depende
                      // solo del par color/página, que es el que está medido.
                      background: `color-mix(in oklab, ${m.color} 16%, transparent)`,
                      color: m.color,
                    }}
                  >
                    {m.text}
                  </span>
                ))}
                {marks.length > 2 && <span className="text-[9px] text-muted">+{marks.length - 2}</span>}
              </div>
            );
          })}
          {Array.from({ length: tail }, (_, i) => (
            <div key={`n${i}`} className="min-h-16 border-b border-r border-line-soft bg-surface-2/60 p-1 last:border-r-0" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        {manager && (
          <div className="flex flex-col gap-4">
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

        <section className="card">
          <div className="card-head">
            <h2 className="text-lg font-bold">Agenda</h2>
            <span className="text-xs text-muted">{agenda.length} por delante</span>
          </div>
          {agenda.length ? (
            <ul className="divide-y divide-line-soft">
              {agenda.map((e) => {
                const fila = (
                  <>
                    <span
                      className="chip flex-none"
                      style={{
                        background: `color-mix(in oklab, ${e.color} 16%, transparent)`,
                        color: e.color,
                        borderColor: "transparent",
                      }}
                    >
                      {e.kindLabel}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{e.title}</span>
                      <span className="block text-xs text-muted">
                        {fmtDateLong(e.date)}
                        {e.endDate && e.endDate !== e.date ? ` – ${fmtDateLong(e.endDate)}` : ""}
                        {" · "}{relDays(e.date)}{e.sub ? ` · ${e.sub}` : ""}
                      </span>
                    </span>
                    {e.url && <Icon name="share" className="size-4 flex-none text-muted" />}
                  </>
                );
                const clase = "flex items-center gap-3 px-4 py-3 hover:bg-surface-2";
                return (
                  <li key={e.id}>
                    {e.href
                      ? <Link href={e.href} className={clase}>{fila}</Link>
                      : e.url
                        ? <a href={e.url} target="_blank" rel="noopener noreferrer" className={clase}>{fila}</a>
                        : <div className={`${clase} hover:bg-transparent`}>{fila}</div>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty icon="calendar" title={tipo ? "Nada de ese tipo por delante" : "Agenda vacía"}>
              {tipo
                ? "Prueba a quitar el filtro, o mira meses siguientes."
                : "Añade la próxima jornada para que todos la vean. Y si eres organizador, importa de una vez los eventos oficiales de Europa."}
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
