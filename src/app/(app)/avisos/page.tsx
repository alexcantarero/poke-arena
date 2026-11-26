import Link from "next/link";
import { redirect } from "next/navigation";
import { cargarPendientesDe, currentPlayer, loadConfig, regionalReciente, torneosProximosDe, torneosSinResultadoDe } from "@/lib/data";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { avisoLigaPara } from "@/lib/ligaTemporadaDb";
import { avisosDe, esCuentaNueva, type Aviso } from "@/lib/avisos";
import { nombreOficialDe } from "@/lib/nombreOficialDb";
import { confirmacionesPendientes } from "@/lib/ligaAutoDb";
import { confirmarResultadoLiga } from "@/actions";
import { cookies } from "next/headers";
import { resetReciente, tocaRecordarLadder, LADDER_CADA_DIAS } from "@/lib/recordatorios";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Avisos" };

/* =========================================================================
   v0.131 — EL CENTRO DE AVISOS (`/avisos`): lo que tienes pendiente.

   Cada aviso se deduce del estado real al abrir la página (`lib/avisos.ts`):
   no hay nada guardado ni que marcar como leído. Desaparece al hacer lo que
   pide. La campana del menú enseña cuántos hay.
   ========================================================================= */
export default async function AvisosPage() {
  const me = await currentPlayer();
  if (!me) redirect("/entrar");
  const [lng, cfg, sinResultado, pendientes, inscripcion, oficial, proximos, regionalNuevo, porConfirmar, jar] = await Promise.all([
    getLang(), loadConfig(), torneosSinResultadoDe(me.id), cargarPendientesDe(me.id), avisoLigaPara(me.id), nombreOficialDe(me.id),
    torneosProximosDe(me.id), regionalReciente(), confirmacionesPendientes(me.id), cookies(),
  ]);
  // v0.136 — con quién es tu próxima partida de liga.
  const primera = pendientes[0];
  const rivalId = primera ? (primera.playerAId === me.id ? primera.playerBId : primera.playerAId) : null;
  const rival = rivalId
    ? (await db.select({ name: players.name }).from(players).where(eq(players.id, rivalId)).limit(1))[0]?.name ?? null
    : primera?.opponentName ?? null;
  const ahora = Date.now();
  const avisos = avisosDe({
    playerId: me.id,
    torneosSinResultado: sinResultado,
    pendientesLiga: pendientes.length,
    resetLadder: me.ladderElo == null && resetReciente(cfg.ladderSince, ahora),
    ladderToca: tocaRecordarLadder(me.ladderEloUpdatedAt, null, ahora),
    inscripcion,
    faltaNick: !(me.limitlessHandle ?? "").trim(),
    faltaOficial: !oficial, cuentaNueva: esCuentaNueva(me.joined, ahora),
    torneosProximos: proximos, proximoLiga: rival ? { rival } : null, regionalNuevo,
    porConfirmar, sinInstalar: jar.get("arena-app")?.value !== "1",
  });

  const texto = (a: Aviso): { titulo: string; detalle: string; boton: string } => {
    switch (a.tipo) {
      case "resultado": return { titulo: trf(lng, "v131.a.resultado", { n: a.nombre ?? "" }), detalle: trf(lng, "v131.a.resultadoD", { f: a.fecha ?? "" }), boton: tr(lng, "v131.a.resultadoB") };
      case "liga": return { titulo: trf(lng, "v131.a.liga", { n: a.n ?? 0 }), detalle: a.nombre ? trf(lng, "v136.a.ligaRival", { r: a.nombre }) : tr(lng, "v131.a.ligaD"), boton: tr(lng, "v131.a.ligaB") };
      case "torneo": return { titulo: trf(lng, "v136.a.torneo", { n: a.nombre ?? "" }), detalle: trf(lng, "v136.a.torneoD", { f: a.fecha ?? "" }), boton: tr(lng, "v129.preparar") };
      case "confirmar": return { titulo: trf(lng, "v140.a.confirmar", { n: a.nombre ?? "" }), detalle: tr(lng, "v140.a.confirmarD"), boton: "" };
      case "instalar": return { titulo: tr(lng, "v140.a.instalar"), detalle: tr(lng, "v140.a.instalarD"), boton: tr(lng, "v140.a.instalarB") };
      case "regional": return { titulo: trf(lng, "v136.a.regional", { n: a.nombre ?? "" }), detalle: tr(lng, "v136.a.regionalD"), boton: tr(lng, "v136.a.regionalB") };
      case "reset": return { titulo: tr(lng, "v124.resetTitulo"), detalle: tr(lng, "v124.resetTexto"), boton: tr(lng, "v124.resetBoton") };
      case "ladder": return { titulo: tr(lng, "v120.ladderTitulo"), detalle: trf(lng, "v131.a.ladderD", { n: LADDER_CADA_DIAS }), boton: tr(lng, "v120.ladderBoton") };
      case "inscripcion": return { titulo: trf(lng, "v131.a.inscripcion", { n: a.nombre ?? "" }), detalle: tr(lng, "v131.a.inscripcionD"), boton: tr(lng, "v131.a.inscripcionB") };
      case "oficial": return { titulo: tr(lng, "v135.a.oficial"), detalle: tr(lng, "v135.a.oficialD"), boton: tr(lng, "v131.a.nickB") };
      default: return { titulo: tr(lng, "v131.a.nick"), detalle: tr(lng, "v131.a.nickD"), boton: tr(lng, "v131.a.nickB") };
    }
  };

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-black leading-tight">{tr(lng, "v131.avisos")}</h1>
      <p className="mb-4 text-sm text-muted">{tr(lng, "v131.avisosSub")}</p>
      {avisos.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">{tr(lng, "v131.sinAvisos")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {avisos.map((a) => {
            const x = texto(a);
            return (
              <li key={a.id} className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4" data-aviso={a.tipo}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{x.titulo}</p>
                  <p className="text-sm text-muted">{x.detalle}</p>
                </div>
                {a.tipo === "confirmar" ? (
                  /* v0.140 — confirmar o discutir aquí mismo el resultado que apuntó el rival. */
                  <form action={confirmarResultadoLiga} className="flex flex-none gap-2">
                    <input type="hidden" name="matchId" value={a.id.slice("confirmar:".length)} />
                    <a href={`/partidas/${a.id.slice("confirmar:".length)}`} className="btn btn-ghost btn-sm">{tr(lng, "v140.verPartida")}</a>
                    <button className="btn btn-sm" type="submit" name="discutir" value="1">{tr(lng, "v140.discutir")}</button>
                    <button className="btn btn-brand btn-sm" type="submit">{tr(lng, "v140.confirmar")}</button>
                  </form>
                ) : (
                  <Link href={a.href} className="btn btn-brand btn-sm flex-none">{x.boton}</Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
