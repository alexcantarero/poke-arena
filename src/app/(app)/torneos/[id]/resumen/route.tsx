import { ImageResponse } from "next/og";
import { readSession } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { archetypesOfMatch, roundsOf } from "@/lib/stats";
import { effectiveCp, getSeason, seasonOfDate, cpKindOf } from "@/lib/cp";
import { resumenTorneo } from "@/lib/resumenTorneo";

/* v0.90 — La imagen del resumen de tu torneo (1080×1080), para compartirla por
   WhatsApp. Solo con sesión, y solo la tuya. Sin fuentes externas: las del
   sistema de la imagen. */
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

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: 72,
        background: "linear-gradient(160deg, #13203a 0%, #0d1526 60%, #2a1f0a 100%)", color: "#f1f4fa", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 30, color: "#f3c34b", fontWeight: 800, letterSpacing: 4 }}>POKEARENA TCG</div>
        <div style={{ display: "flex", fontSize: 58, fontWeight: 900, marginTop: 24, lineHeight: 1.1 }}>{t.name.slice(0, 60)}</div>
        <div style={{ display: "flex", fontSize: 30, color: "#a9b5cc", marginTop: 12 }}>{tipo} · {t.date}{t.playerCount ? ` · ${t.playerCount} jugadores` : ""}</div>
        <div style={{ display: "flex", fontSize: 34, marginTop: 48 }}>{yo.name}</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 48, marginTop: 8 }}>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 900, lineHeight: 1 }}>{resumen.w}-{resumen.l}{resumen.t ? `-${resumen.t}` : ""}</div>
          {res?.placement ? <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#f3c34b", marginBottom: 14 }}>{res.placement}.º</div> : null}
          {cp > 0 ? <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#5fd39a", marginBottom: 14 }}>+{cp} CP</div> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 56, fontSize: 34 }}>
          {resumen.mejor ? <div style={{ display: "flex" }}>Mejor cruce: {resumen.mejor.nombre} ({resumen.mejor.w}-{resumen.mejor.l})</div> : null}
          {resumen.peor ? <div style={{ display: "flex" }}>Peor cruce: {resumen.peor.nombre} ({resumen.peor.w}-{resumen.peor.l})</div> : null}
        </div>
      </div>
    ),
    { width: 1080, height: 1080 },
  );
}
