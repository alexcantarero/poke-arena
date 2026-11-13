import { ImageResponse } from "next/og";
import { readSession } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { archetypesOfMatch, roundsOf } from "@/lib/stats";
import { effectiveCp, getSeason, seasonOfDate, cpKindOf } from "@/lib/cp";
import { columnasDeRondas, eloDeTorneo, resumenTorneo } from "@/lib/resumenTorneo";

/* v0.90 — La imagen del resumen de tu torneo (1080×1080), para compartirla por
   WhatsApp. Solo con sesión, y solo la tuya. Sin fuentes externas: las del
   sistema de la imagen.
   v0.129 — el informe completo: todas las rondas con el mazo de enfrente (en
   una o dos columnas) y el Elo que te llevaste, además del puesto y los CP. */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await readSession();
  if (!sesion) return new Response("Sin sesión", { status: 401 });
  const snap = await loadSnapshot();
  const t = snap.toursById.get(id);
  const yo = snap.playersById.get(sesion.playerId);
  if (!t || !yo) return new Response("No encontrado", { status: 404 });
  const res = t.results.find((r) => r.playerId === yo.id);
  const rondas = roundsOf(snap.matches, t.id, yo.id).filter((r) => r.result);
  const resumen = resumenTorneo(rondas.map((r) => {
    const b = archetypesOfMatch(r.match, snap.archIndex, snap.archById).b;
    return { rival: b?.main ?? "", nombre: b?.name ?? r.match.opponentName ?? "?", r: r.result === "d" ? "t" : r.result! };
  }));
  const temporada = t.season ?? seasonOfDate(t.date) ?? snap.config.cpSeason;
  const cp = res ? effectiveCp(temporada, cpKindOf(t), res, t.playerCount) : 0;
  const tipo = getSeason(temporada).events[cpKindOf(t)]?.label ?? t.kind;
  const elo = eloDeTorneo(snap.elo.history[yo.id] ?? [], t.id, new Set(rondas.map((r) => r.match.id)));
  const filas = rondas.map((r) => {
    const b = archetypesOfMatch(r.match, snap.archIndex, snap.archById).b;
    const bye = r.match.opponentName === "BYE";
    return { n: r.round, r: r.result!, rival: bye ? "Bye" : (b?.name ?? r.match.opponentName ?? "—").slice(0, 24) };
  });
  const columnas = columnasDeRondas(filas);
  const COLOR = { w: "#5fd39a", l: "#f2797e", d: "#9aa6c0" } as const;
  const LETRA = { w: "V", l: "D", d: "E" } as const;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: 72,
        background: "linear-gradient(160deg, #13203a 0%, #0d1526 60%, #2a1f0a 100%)", color: "#f1f4fa", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 30, color: "#f3c34b", fontWeight: 800, letterSpacing: 4 }}>POKEARENA TCG</div>
        <div style={{ display: "flex", fontSize: 50, fontWeight: 900, marginTop: 18, lineHeight: 1.1 }}>{t.name.slice(0, 52)}</div>
        <div style={{ display: "flex", fontSize: 28, color: "#a9b5cc", marginTop: 10 }}>{tipo} · {t.date}{t.playerCount ? ` · ${t.playerCount} jugadores` : ""}</div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 30 }}>{yo.name}</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 36, marginTop: 4 }}>
          <div style={{ display: "flex", fontSize: 128, fontWeight: 900, lineHeight: 1 }}>{resumen.w}-{resumen.l}{resumen.t ? `-${resumen.t}` : ""}</div>
          {res?.placement ? <div style={{ display: "flex", fontSize: 54, fontWeight: 800, color: "#f3c34b", marginBottom: 12 }}>{res.placement}.º</div> : null}
          {cp > 0 ? <div style={{ display: "flex", fontSize: 54, fontWeight: 800, color: "#5fd39a", marginBottom: 12 }}>+{cp} CP</div> : null}
          {elo && elo.total !== 0 ? (
            <div style={{ display: "flex", fontSize: 54, fontWeight: 800, color: elo.total > 0 ? "#6fb7ff" : "#f2797e", marginBottom: 12 }}>
              {elo.total > 0 ? "+" : "−"}{Math.abs(elo.total)} Elo
            </div>
          ) : null}
        </div>
        {filas.length > 0 ? (
          <div style={{ display: "flex", gap: 40, marginTop: 34 }}>
            {columnas.map((col, c) => (
              <div key={c} style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {col.map((f) => (
                  <div key={f.n} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 27 }}>
                    <div style={{ display: "flex", width: 54, color: "#a9b5cc", fontWeight: 700 }}>R{f.n}</div>
                    <div style={{ display: "flex", width: 40, height: 40, borderRadius: 8, background: COLOR[f.r], color: "#0d1526",
                      alignItems: "center", justifyContent: "center", fontWeight: 900 }}>{LETRA[f.r]}</div>
                    <div style={{ display: "flex" }}>{f.rival}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 26, fontSize: 27, color: "#a9b5cc" }}>
          {resumen.mejor ? <div style={{ display: "flex" }}>Mejor cruce: {resumen.mejor.nombre} ({resumen.mejor.w}-{resumen.mejor.l})</div> : null}
          {resumen.peor ? <div style={{ display: "flex" }}>Peor cruce: {resumen.peor.nombre} ({resumen.peor.w}-{resumen.peor.l})</div> : null}
        </div>
      </div>
    ),
    { width: 1080, height: 1080 },
  );
}
