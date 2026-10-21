import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageLeague } from "@/lib/auth";
import { currentPlayer } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { tr } from "@/lib/i18n";
import { diagnostico } from "@/lib/sources/ciphermaniac";

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
                <td className={`p-2 align-top font-bold ${l.estado === "200" ? "text-win" : "text-loss"}`}>{l.estado}</td>
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
