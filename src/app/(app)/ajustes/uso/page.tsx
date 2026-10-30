import { redirect } from "next/navigation";
import Link from "next/link";
import { canManageLeague } from "@/lib/auth";
import { currentPlayer } from "@/lib/data";
import { medirUso } from "@/lib/usoDb";
import { estimarUso, SUPUESTOS } from "@/lib/usoLimites";
import { PageHead } from "@/components/ui";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/* v0.86 — Uso y límites del plan gratuito. Solo organizadores. */
export const dynamic = "force-dynamic";
export const metadata = { title: "Uso y límites" };

const fmt = (n: number, d = 0) => n.toLocaleString("es-ES", { maximumFractionDigits: d, minimumFractionDigits: d });
const mb = (b: number) => (b >= 1024 ** 3 ? `${fmt(b / 1024 ** 3, 2)} GB` : `${fmt(b / 1024 ** 2, 1)} MB`);

export default async function UsoPage() {
  const lng = await getLang(); // v0.49
  const me = await currentPlayer();
  if (!me) redirect("/entrar");
  if (!canManageLeague(me.role)) redirect("/ajustes");

  const u = await medirUso();
  const est = estimarUso(u);
  const unidad: Record<string, (v: number) => string> = {
    invocaciones: (v) => fmt(v), cpuHoras: (v) => `${fmt(v, 2)} h`, cuHoras: (v) => `${fmt(v, 1)} h`,
    transferGB: (v) => `${fmt(v, 2)} GB`, almacenGB: (v) => `${fmt(v * 1024, 1)} MB`,
  };
  const color = { ok: "bg-win", aviso: "bg-brand", riesgo: "bg-loss" } as const;

  return (
    <>
      <PageHead title={tr(lng, "uso.titulo")} sub={tr(lng, "uso.sub")} back={{ href: "/ajustes", label: tr(lng, "x.9751f876") }} />

      <section className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          [tr(lng, "uso.jugadores"), `${u.jugadoresActivos} / ${u.jugadores}`, tr(lng, "uso.jugadoresAyuda")],
          [tr(lng, "uso.activos"), `${u.activos7} · ${u.activos30}`, tr(lng, "uso.activosAyuda")],
          [tr(lng, "uso.horas"), `${fmt(u.horasActivasDia, 1)} h`, tr(lng, "uso.horasAyuda")],
          [tr(lng, "uso.base"), u.bytesBase != null ? mb(u.bytesBase) : "—", tr(lng, "uso.baseAyuda")],
        ].map(([t, v, a]) => (
          <div key={t} className="card p-3" title={a}>
            <p className="label">{t}</p>
            <p className="font-display text-2xl font-black tabular">{v}</p>
            <p className="text-[11px] text-muted">{a}</p>
          </div>
        ))}
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-3 font-display text-lg font-bold">{tr(lng, "uso.limites")}</h2>
        <ul className="flex flex-col gap-3">
          {est.filas.map((f) => (
            <li key={f.clave}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold">
                  {tr(lng, `uso.l.${f.clave}`)}{" "}
                  <span className={`chip text-[10px] ${f.real ? "chip-win" : ""}`}>{tr(lng, f.real ? "uso.real" : "uso.estimado")}</span>
                </span>
                <span className="font-mono text-xs tabular text-muted">
                  {unidad[f.clave](f.usado)} / {unidad[f.clave](f.limite)} · <b className="text-ink">{fmt(f.pct * 100, 0)} %</b>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(f.pct * 100)}>
                <div className={`h-full rounded-full ${color[f.estado]}`} style={{ width: `${Math.min(100, f.pct * 100).toFixed(1)}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted">{tr(lng, `uso.a.${f.clave}`)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-lg bg-surface-2 px-3 py-2 text-sm">
          {est.maxActivos != null ? trf(lng, "uso.capacidad", { n: fmt(est.maxActivos), a: u.activos30 }) : tr(lng, "uso.sinActivos")}
        </p>
      </section>

      <section className="card mb-4 p-4 text-sm">
        <h2 className="mb-2 font-display text-lg font-bold">{tr(lng, "uso.supuestosTitulo")}</h2>
        <ul className="ml-5 list-disc space-y-1 text-ink-2">
          <li>{trf(lng, "uso.s.paginas", { n: SUPUESTOS.paginasPorPersonaDia })}</li>
          <li>{trf(lng, "uso.s.cpu", { n: SUPUESTOS.msCpuPorPagina })}</li>
          <li>{trf(lng, "uso.s.cu", { n: fmt(SUPUESTOS.cu, 2) })}</li>
          <li>{trf(lng, "uso.s.cargas", { n: SUPUESTOS.cargasPorHora, t: mb(u.bytesCarga) })}</li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          {u.neonConfigurado
            ? (u.neonError ? trf(lng, "uso.neonError", { e: u.neonError }) : tr(lng, "uso.neonOk"))
            : tr(lng, "uso.neonNo")}
        </p>
        <p className="mt-2 text-xs text-muted">{tr(lng, "uso.consejo")}</p>
        <p className="mt-2 text-xs">
          <a className="text-info underline" href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">Vercel → Usage</a>
          {" · "}
          <a className="text-info underline" href="https://console.neon.tech" target="_blank" rel="noopener noreferrer">Neon → Monitoring</a>
        </p>
      </section>

      {u.tablas.length > 0 && (
        <section className="card mb-4 overflow-x-auto p-4">
          <h2 className="mb-2 font-display text-lg font-bold">{tr(lng, "uso.tablas")}</h2>
          <table className="w-full text-sm">
            <tbody>
              {u.tablas.slice(0, 12).map((t) => (
                <tr key={t.tabla} className="border-t border-line-soft first:border-t-0">
                  <td className="py-1.5 font-mono text-xs">{t.tabla}</td>
                  <td className="py-1.5 text-right font-mono text-xs tabular">{fmt(t.filas)} {tr(lng, "uso.filas")}</td>
                  <td className="py-1.5 text-right font-mono text-xs tabular text-muted">{mb(t.bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <p className="text-xs text-muted"><Link href="/ajustes" className="underline">← {tr(lng, "x.9751f876")}</Link></p>
    </>
  );
}
