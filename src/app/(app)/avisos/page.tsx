import Link from "next/link";
import { redirect } from "next/navigation";
import { cargarPendientesDe, currentPlayer, loadConfig, torneosSinResultadoDe } from "@/lib/data";
import { avisoLigaPara } from "@/lib/ligaTemporadaDb";
import { avisosDe, type Aviso } from "@/lib/avisos";
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
  const [lng, cfg, sinResultado, pendientes, inscripcion] = await Promise.all([
    getLang(), loadConfig(), torneosSinResultadoDe(me.id), cargarPendientesDe(me.id), avisoLigaPara(me.id),
  ]);
  const ahora = Date.now();
  const avisos = avisosDe({
    playerId: me.id,
    torneosSinResultado: sinResultado,
    pendientesLiga: pendientes.length,
    resetLadder: me.ladderElo == null && resetReciente(cfg.ladderSince, ahora),
    ladderToca: tocaRecordarLadder(me.ladderEloUpdatedAt, null, ahora),
    inscripcion,
    faltaNick: !(me.limitlessHandle ?? "").trim(),
  });

  const texto = (a: Aviso): { titulo: string; detalle: string; boton: string } => {
    switch (a.tipo) {
      case "resultado": return { titulo: trf(lng, "v131.a.resultado", { n: a.nombre ?? "" }), detalle: trf(lng, "v131.a.resultadoD", { f: a.fecha ?? "" }), boton: tr(lng, "v131.a.resultadoB") };
      case "liga": return { titulo: trf(lng, "v131.a.liga", { n: a.n ?? 0 }), detalle: tr(lng, "v131.a.ligaD"), boton: tr(lng, "v131.a.ligaB") };
      case "reset": return { titulo: tr(lng, "v124.resetTitulo"), detalle: tr(lng, "v124.resetTexto"), boton: tr(lng, "v124.resetBoton") };
      case "ladder": return { titulo: tr(lng, "v120.ladderTitulo"), detalle: trf(lng, "v131.a.ladderD", { n: LADDER_CADA_DIAS }), boton: tr(lng, "v120.ladderBoton") };
      case "inscripcion": return { titulo: trf(lng, "v131.a.inscripcion", { n: a.nombre ?? "" }), detalle: tr(lng, "v131.a.inscripcionD"), boton: tr(lng, "v131.a.inscripcionB") };
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
                <Link href={a.href} className="btn btn-brand btn-sm flex-none">{x.boton}</Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
