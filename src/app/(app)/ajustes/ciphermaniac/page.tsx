import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageLeague } from "@/lib/auth";
import { currentPlayer } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { tr } from "@/lib/i18n";
import { diagnostico } from "@/lib/sources/ciphermaniac";
import { resumenEstados, tipoDeEstado } from "@/lib/estadoFuente";

/* v0.52 — Diagnóstico de Ciphermaniac, solo para organizadores.

   Su documentación dice qué ficheros hay pero no los nombres exactos de sus
   campos. Esta página los pide de verdad y enseña qué responde cada uno y con
   qué campos, para ajustar el lector a lo real en vez de suponerlo. No pide
   los ficheros que traen nombres de jugadores. */

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export default async function DiagnosticoCiphermaniac() {
  const lng = await getLang(); // v0.49
  const me = await currentPlayer();
  if (!me) redirect("/entrar");
  if (!canManageLeague(me.role)) redirect("/ajustes");

  const { evento, lineas } = await diagnostico();
  const bien = lineas.filter((l) => l.estado === "200").length;
  // v0.63 — qué quiere decir lo que ha salido, en vez de un número a secas.
  const resumen = resumenEstados(lineas.map((l) => l.estado));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/ajustes" className="w-fit text-sm text-muted hover:text-info">← {tr(lng, "cm.volver")}</Link>
      <header>
        <h1 className="font-display text-2xl font-extrabold">{tr(lng, "cm.titulo")}</h1>
        <p className="text-sm text-muted">{tr(lng, "cm.sub")}</p>
      </header>

      <p className={`card p-4 text-sm font-semibold ${bien === lineas.length ? "text-win" : bien ? "text-brand" : "text-loss"}`}>
        {bien}/{lineas.length} · {evento ? `${tr(lng, "cm.evento")}: ${evento}` : tr(lng, "cm.sinCatalogo")}
      </p>

      {resumen !== "ok" && (
        <div className={`card p-4 text-sm ${resumen === "bloqueado" ? "border-loss/40" : ""}`}>
          <p className="font-semibold">{tr(lng, `cm.res.${resumen}`)}</p>
          <p className="mt-1 text-muted">{tr(lng, `cm.resSub.${resumen}`)}</p>
          {resumen === "bloqueado" && (
            <a className="btn btn-sm mt-3" href="https://ciphermaniac.com/feedback" target="_blank" rel="noopener noreferrer">
              {tr(lng, "cm.pedirAcceso")} →
            </a>
          )}
        </div>
      )}

      <div className="card overflow-x-auto overscroll-x-contain">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              <th className="p-2">{tr(lng, "cm.fichero")}</th>
              <th className="p-2">{tr(lng, "cm.estado")}</th>
              <th className="p-2">{tr(lng, "cm.campos")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft font-mono">
            {lineas.map((l) => (
              <tr key={l.fichero}>
                <td className="p-2 align-top">{l.fichero}</td>
                <td className={`p-2 align-top font-bold ${l.estado === "200" ? "text-win" : tipoDeEstado(l.estado) === "noExiste" ? "text-muted" : "text-loss"}`}>
                  {l.estado}
                  <span className="block font-sans text-[10px] font-normal text-muted">{tr(lng, `cm.tipo.${tipoDeEstado(l.estado)}`)}</span>
                </td>
                <td className="break-all p-2 align-top text-muted">{l.forma}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">{tr(lng, "cm.pie")}</p>
    </div>
  );
}
