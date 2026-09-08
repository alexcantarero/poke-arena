import Link from "next/link";
import { currentPlayer, loadSnapshot } from "@/lib/data";
import { canManageLeague } from "@/lib/auth";
import { isPlayed, outcome } from "@/lib/stats";
import { DOWS, MONTHS, fmtDateLong, relDays, todayISO } from "@/lib/format";
import { Empty, PageHead, SectionTitle } from "@/components/ui";
import { EventForm } from "@/components/EventForm";
import { Icon } from "@/components/icons";

export const metadata = { title: "Calendario" };

const EVENT_NAMES: Record<string, string> = {
  round: "Jornada", tourney: "Torneo", deadline: "Fecha límite", other: "Evento",
};

export default async function CalendarPage({
  searchParams,
}: { searchParams: Promise<{ y?: string; m?: string }> }) {
  const q = await searchParams;
  const now = new Date();
  const year = Number(q.y) || now.getFullYear();
  const month = q.m != null && q.m !== "" ? Number(q.m) : now.getMonth();

  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  const manager = me ? canManageLeague(me.role) : false;
  const today = todayISO();

  type Mark = { text: string; tone: "event" | "match" | "tournament" };
  const byDay = new Map<string, Mark[]>();
  const push = (date: string, m: Mark) => {
    const list = byDay.get(date);
    if (list) list.push(m); else byDay.set(date, [m]);
  };
  for (const e of snap.events) push(e.date, { text: e.title, tone: "event" });
  for (const t of snap.tournaments) push(t.date, { text: t.name, tone: "tournament" });
  for (const m of snap.matches.filter(isPlayed)) {
    const o = outcome(m);
    push(m.date, {
      text: `${snap.playersById.get(m.playerAId)?.name ?? "?"} ${o.ga}–${o.gb} ${m.playerBId ? snap.playersById.get(m.playerBId)?.name ?? "?" : m.opponentName ?? "?"}`,
      tone: "match",
    });
  }

  const first = new Date(year, month, 1);
  const start = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const tail = (7 - ((start + days) % 7)) % 7;
  const iso = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };

  const upcoming = snap.events.filter((e) => e.date >= today);

  const TONE: Record<Mark["tone"], string> = {
    event: "bg-info-soft text-info",
    tournament: "bg-brand-soft text-brand",
    match: "bg-surface-2 text-ink-2",
  };

  return (
    <>
      <PageHead
        title="Calendario"
        sub="Jornadas y fechas límite que añadáis, torneos apuntados y las partidas ya jugadas."
        actions={
          <div className="flex items-center gap-1.5">
            <Link className="btn btn-sm px-3" href={`/calendario?y=${prev.y}&m=${prev.m}`} aria-label="Mes anterior">
              <Icon name="back" className="size-4" />
            </Link>
            <span className="min-w-32 text-center font-display text-lg font-bold capitalize">{MONTHS[month]} {year}</span>
            <Link className="btn btn-sm px-3" href={`/calendario?y=${next.y}&m=${next.m}`} aria-label="Mes siguiente">
              <Icon name="back" className="size-4 rotate-180" />
            </Link>
            <Link className="btn btn-sm" href="/calendario">Hoy</Link>
          </div>
        }
      />

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
                  <span key={j} className={`truncate rounded px-1 py-px text-[9px] font-semibold sm:text-[10px] ${TONE[m.tone]}`} title={m.text}>
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
          <section className="card">
            <div className="card-head"><h2 className="text-lg font-bold">Añadir al calendario</h2></div>
            <div className="p-4"><EventForm competitions={snap.competitions} tournaments={snap.tournaments} /></div>
          </section>
        )}

        <section className="card">
          <div className="card-head">
            <h2 className="text-lg font-bold">Agenda</h2>
            <span className="text-xs text-muted">{upcoming.length} por delante</span>
          </div>
          {upcoming.length ? (
            <ul className="divide-y divide-line-soft">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`chip flex-none ${e.kind === "round" ? "chip-brand" : e.kind === "tourney" ? "chip-info" : ""}`}>
                    {EVENT_NAMES[e.kind] ?? "Evento"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{e.title}</span>
                    <span className="block text-xs text-muted">
                      {fmtDateLong(e.date)} · {relDays(e.date)}{e.note ? ` · ${e.note}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : <Empty title="Agenda vacía">Añade la próxima jornada para que todos la vean.</Empty>}
        </section>
      </div>
    </>
  );
}
