import Link from "next/link";
import { loadSnapshot } from "@/lib/data";
import { isPlayed, outcome } from "@/lib/stats";
import { DOWS, MONTHS, fmtDateLong, relDays, todayISO } from "@/lib/format";
import { Empty, PageHead } from "@/components/ui";
import { EventForm } from "@/components/EventForm";

const EVENT_NAMES: Record<string, string> = {
  round: "Jornada", tourney: "Torneo", deadline: "Límite", other: "Evento",
};

export default async function CalendarPage({
  searchParams,
}: { searchParams: Promise<{ y?: string; m?: string }> }) {
  const q = await searchParams;
  const now = new Date();
  const year = Number(q.y) || now.getFullYear();
  const month = q.m != null && q.m !== "" ? Number(q.m) : now.getMonth();

  const snap = await loadSnapshot();
  const today = todayISO();

  const byDay = new Map<string, Array<{ text: string; cls: string }>>();
  const push = (date: string, text: string, cls: string) => {
    const list = byDay.get(date);
    if (list) list.push({ text, cls });
    else byDay.set(date, [{ text, cls }]);
  };
  for (const e of snap.events) push(e.date, e.title, e.kind === "round" ? "r" : "");
  for (const m of snap.matches.filter(isPlayed)) {
    const o = outcome(m);
    push(
      m.date,
      `${snap.playersById.get(m.playerAId)?.name ?? "?"} ${o.ga}–${o.gb} ${snap.playersById.get(m.playerBId)?.name ?? "?"}`,
      "m",
    );
  }

  const first = new Date(year, month, 1);
  const start = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const tail = (7 - ((start + days) % 7)) % 7;
  const iso = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
  const upcoming = snap.events.filter((e) => e.date >= today);

  return (
    <>
      <PageHead
        title="Calendario"
        sub="Jornadas, torneos y fechas límite que añadáis, más las partidas ya jugadas de cada día."
        actions={
          <div className="row">
            <Link className="btn btn-sm" href={`/calendario?y=${prev.y}&m=${prev.m}`}>◀</Link>
            <b style={{ fontFamily: "var(--f-display)", fontSize: 19, textTransform: "capitalize", minWidth: 150, textAlign: "center" }}>
              {MONTHS[month]} {year}
            </b>
            <Link className="btn btn-sm" href={`/calendario?y=${next.y}&m=${next.m}`}>▶</Link>
            <Link className="btn btn-sm" href="/calendario">Hoy</Link>
          </div>
        }
      />

      <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
        <div className="cal">
          {DOWS.map((d) => <div className="dow" key={d}>{d}</div>)}
          {Array.from({ length: start }, (_, i) => (
            <div className="day out" key={`p${i}`}><span className="dn">{prevDays - start + 1 + i}</span></div>
          ))}
          {Array.from({ length: days }, (_, i) => {
            const d = i + 1;
            const key = iso(d);
            const evs = byDay.get(key) ?? [];
            return (
              <div className={`day${key === today ? " today" : ""}`} key={key}>
                <span className="dn">{d}</span>
                {evs.slice(0, 3).map((e, j) => (
                  <div className={`ev ${e.cls}`} key={j} title={e.text}>{e.text}</div>
                ))}
                {evs.length > 3 && <div className="hint" style={{ fontSize: 10 }}>+{evs.length - 3} más</div>}
              </div>
            );
          })}
          {Array.from({ length: tail }, (_, i) => (
            <div className="day out" key={`n${i}`}><span className="dn">{i + 1}</span></div>
          ))}
        </div>
      </div>

      <div className="grid g-2-13">
        <div className="card">
          <div className="card-head"><h2>Nuevo evento</h2></div>
          <div className="card-pad">
            <EventForm competitions={snap.competitions} />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Agenda</h2>
            <span className="hint">{upcoming.length} fechas por delante</span>
          </div>
          {upcoming.length ? (
            <ul className="list-plain">
              {upcoming.map((e) => {
                const c = e.competitionId ? snap.compsById.get(e.competitionId) : undefined;
                return (
                  <li key={e.id}>
                    <span className={`chip ${e.kind === "round" ? "g" : e.kind === "tourney" ? "b" : ""}`}>
                      {EVENT_NAMES[e.kind] ?? "Evento"}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{e.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {fmtDateLong(e.date)} · {relDays(e.date)}
                        {c ? ` · ${c.name}` : ""}{e.note ? ` · ${e.note}` : ""}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty title="Agenda vacía">Añade la próxima jornada para que todos la vean.</Empty>
          )}
        </div>
      </div>
    </>
  );
}
