import { ImageResponse } from "next/og";
import { readSession } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { datosDeTemporada } from "@/lib/temporadaDatos";

/* v0.140 — La imagen de la temporada de un jugador (1080×1350, vertical, para
   compartir por WhatsApp o en historias). Solo con sesión. Lo mismo que la
   pantalla del resumen: marca, % de victorias, torneos, CP, mejor puesto,
   mazo más jugado, mejor racha y el Elo de principio a fin. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await readSession();
  if (!sesion) return new Response("Sin sesión", { status: 401 });
  const { id } = await params;
  const snap = await loadSnapshot();
  const yo = snap.playersById.get(id);
  if (!yo) return new Response("No encontrado", { status: 404 });
  const pedida = Number(new URL(req.url).searchParams.get("t"));
  const temporada = Number.isInteger(pedida) && pedida >= 2020 && pedida <= 2100 ? pedida : snap.config.cpSeason;
  const { r } = datosDeTemporada(snap, id, temporada);
  const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);
  const Dato = ({ k, v, c = "#f1f4fa" }: { k: string; v: string; c?: string }) => (
    <div style={{ display: "flex", flexDirection: "column", padding: "22px 26px", borderRadius: 20, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", width: 440 }}>
      <div style={{ display: "flex", fontSize: 24, color: "#a9b5cc", letterSpacing: 2 }}>{k}</div>
      <div style={{ display: "flex", fontSize: 64, fontWeight: 900, color: c, lineHeight: 1.1 }}>{v}</div>
    </div>
  );
  const Linea = ({ k, v }: { k: string; v: string | null }) => (v ? (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ display: "flex", color: "#a9b5cc" }}>{k}</div>
      <div style={{ display: "flex", fontWeight: 700, maxWidth: 640 }}>{v.slice(0, 40)}</div>
    </div>
  ) : null);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: 70,
        background: "linear-gradient(165deg, #13203a 0%, #0d1526 55%, #2a1f0a 100%)", color: "#f1f4fa", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 30, color: "#f3c34b", fontWeight: 800, letterSpacing: 4 }}>POKEARENA TCG · TEMPORADA {temporada}</div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 900, marginTop: 18 }}>{yo.name.slice(0, 24)}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 40 }}>
          <Dato k="PARTIDAS" v={`${r.w}-${r.l}${r.t ? `-${r.t}` : ""}`} />
          <Dato k="VICTORIAS" v={pct(r.pct)} c={r.pct != null && r.pct >= 0.5 ? "#5fd39a" : "#f2797e"} />
          <Dato k="TORNEOS" v={String(r.torneos)} />
          <Dato k="CHAMPIONSHIP POINTS" v={String(r.cp)} c="#f3c34b" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 44 }}>
          <Linea k="Mejor puesto" v={r.mejorPuesto ? `${r.mejorPuesto.puesto}.º · ${r.mejorPuesto.nombre}` : null} />
          <Linea k="Mazo más jugado" v={r.mazoMasJugado ? `${r.mazoMasJugado.mazo} · ${pct(r.mazoMasJugado.pct)}` : null} />
          <Linea k="Mejor racha" v={r.rachaVictorias >= 2 ? `${r.rachaVictorias} victorias seguidas` : null} />
          <Linea k="Mejor cruce" v={r.mejorCruce ? `${r.mejorCruce.mazo} · ${r.mejorCruce.w}-${r.mejorCruce.l}` : null} />
          <Linea k="Elo" v={r.elo ? `${r.elo.inicio} → ${r.elo.fin} (${r.elo.cambio >= 0 ? "+" : "−"}${Math.abs(r.elo.cambio)})` : null} />
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 24, color: "#a9b5cc" }}>{(process.env.APP_URL ?? "").replace(/^https?:\/\//, "") || "PokeArena TCG"}</div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
