import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { currentPlayer, loadModoTorneo } from "@/lib/data";
import { roundResult } from "@/lib/stats";
import { bestOfDeRonda, maxRondasDe } from "@/lib/estructura";
import { esNoPresentado } from "@/lib/causasDerrota";
import { ARCHETYPE_PREFIX, asStatus } from "@/lib/types";
import { spriteUrl, typeOf } from "@/lib/pokemon";
import { isOtherArchetype } from "@/components/ui";
import { ModoTorneo, type OpcionMazo, type RondaVista } from "@/components/ModoTorneo";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Modo torneo" };

/* =========================================================================
   v0.125 — MODO TORNEO (`/torneos/<id>/modo`): apuntar rondas con el pulgar,
   y que funcione sin cobertura.

   Esta página solo prepara los datos, con una tanda de consultas pequeñas
   (`loadModoTorneo`, nada del snapshot). Todo lo demás pasa en el navegador
   (`ModoTorneo`): la ronda se guarda en el teléfono al momento y sube sola
   cuando hay red. La propia pantalla se guarda para abrirse sin conexión
   (es la ÚNICA página de la app que se guarda; ver `public/sw.js`).

   Solo rondas propias y solo en modo rápido. El desglose juego a juego, las
   rondas de otros y el resultado final siguen en la ficha.
   ========================================================================= */
export default async function ModoTorneoPage({ params }: { params: Promise<{ id: string }> }) {
  // El id del jugador ya viene en la cookie: los datos no esperan a validar la sesión.
  const [{ id }, session, lng] = await Promise.all([params, readSession(), getLang()]);
  if (!session) redirect("/entrar");
  const [me, d] = await Promise.all([currentPlayer(), loadModoTorneo(id, session.playerId)]);
  if (!me) redirect("/entrar");
  const t = d.torneo;
  if (!t) notFound();

  const arqPorId = new Map<string, { id: string; name: string }>(d.arquetipos.map((a) => [a.id, a]));
  const mazoPorId = new Map<string, { id: string; name: string; archetypeId: string }>(d.mazos.map((m) => [m.id, m]));
  const nombreDeMazo = (deckId: string | null, archId: string | null): string =>
    (deckId && (mazoPorId.get(deckId)?.name ?? arqPorId.get(mazoPorId.get(deckId)?.archetypeId ?? "")?.name))
    || (archId && arqPorId.get(archId)?.name) || "";

  const rondas: RondaVista[] = d.misRondas.map((m) => {
    const r = roundResult(m);
    const np = esNoPresentado(m.note);
    return {
      ronda: m.round, r: r === "d" ? "t" : r,
      rival: m.opponentName ?? "",
      mazoRival: nombreDeMazo(m.deckBId, m.opponentArchetypeId),
      /* v0.128 — lo que ya estaba guardado, para que «Corregir» abra la ronda
         con sus datos (y con el detalle, que si no se perdería al volver a guardar). */
      rivalValor: m.deckBId ?? (m.opponentArchetypeId ? `${ARCHETYPE_PREFIX}${m.opponentArchetypeId}` : ""),
      primero: (m.games[0]?.first === "a" || m.games[0]?.first === "b" ? m.games[0].first
        : m.firstTurn === "a" || m.firstTurn === "b" ? m.firstTurn : "") as "" | "a" | "b",
      especial: (m.opponentName === "BYE" ? "bye" : np ? (r === "w" ? "np-rival" : "np-yo") : "") as "" | "bye" | "np-rival" | "np-yo",
      juegos: m.games.flatMap((g) => (g.winner === "a" || g.winner === "b" || g.winner === "tie"
        ? [{ g: g.winner as "a" | "b" | "tie", pa: g.prizesA ?? null, pb: g.prizesB ?? null, ma: g.mulligansA ?? 0, mb: g.mulligansB ?? 0 }] : [])),
    };
  });

  // El mazo del torneo: fijado en mi resultado o, si no, en la primera ronda.
  const fijado = nombreDeMazo(d.miResultado?.deckId ?? null, d.miResultado?.archetypeId ?? null)
    || nombreDeMazo(d.misRondas[0]?.deckAId ?? null, d.misRondas[0]?.archetypeAId ?? null);

  /* v0.126 — cada mazo con su sprite y el color de su tipo de energía (sin red
     el sprite no carga y se queda el nombre con su color). */
  const arquetipos: OpcionMazo[] = d.arquetipos.map((a) => ({
    valor: `${ARCHETYPE_PREFIX}${a.id}`, nombre: a.name, color: typeOf(a.type).color,
    sprite: a.main && !isOtherArchetype(a.name) ? spriteUrl(a.main) : "",
  }));
  const misMazos: OpcionMazo[] = d.mazos.filter((m) => m.playerId === me.id && !m.retired)
    .map((m) => ({ valor: m.id, nombre: m.name, color: "", sprite: "" }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const frecuentes = d.masVistos.filter((a) => arqPorId.has(a)).map((a) => `${ARCHETYPE_PREFIX}${a}`);

  const estado = asStatus(t.status);
  const tope = maxRondasDe({ kind: t.kind, playerCount: t.playerCount, rounds: t.rounds, topCut: t.topCut });
  // v0.128 — el formato de cada ronda (el del top cut puede ser otro): para el detalle juego a juego.
  const bestOfPorRonda = Array.from({ length: Math.max(tope ?? 0, 20) }, (_, i) => bestOfDeRonda(t, i + 1));

  return (
    /* v0.126 — siempre en oscuro (`data-theme`), sea cual sea el tema: es una
       pantalla tipo HUD, y en una sala con focos el oscuro deslumbra menos. */
    <div className="modo-torneo" data-theme="dark">
      <div className="mb-2 flex items-center gap-2">
        <span className="directo-punto" aria-hidden="true" />
        <span className="mt-rotulo">{tr(lng, "v125.modo")}</span>
        <Link href={`/torneos/${t.id}`} className="btn btn-ghost btn-sm ml-auto">{tr(lng, "v125.ficha")}</Link>
      </div>
      <h1 className="mt-titulo">{t.name}</h1>
      <ModoTorneo
        torneoId={t.id} playerId={me.id} abierto={estado === "open"} dropped={Boolean(d.miResultado?.dropped)}
        tope={tope} rondas={rondas} mazoFijado={fijado} bestOfPorRonda={bestOfPorRonda}
        arquetipos={arquetipos} misMazos={misMazos} frecuentes={frecuentes}
        buildId={process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"}
      />
    </div>
  );
}
