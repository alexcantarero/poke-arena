import { redirect } from "next/navigation";
import Link from "next/link";
import { canManageLeague } from "@/lib/auth";
import { currentPlayer } from "@/lib/data";
import { medirUso } from "@/lib/usoDb";
import { estadoEsquema } from "@/lib/esquemaDb";
import { estimarUso, proyectarPeriodo, serieDelPeriodo, SUPUESTOS, LIMITES, type ClaveUso, type FilaUso } from "@/lib/usoLimites";
import { ROTOM_DE } from "@/lib/rotom";
import { PageHead } from "@/components/ui";
import { BarrasDias, BarrasHoras, BarrasTablas, CurvaPeriodo, Medidor, Rotom } from "@/components/uso/GraficosUso";
import { guardarLecturaVercel } from "@/actions/ajustes";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { todayISO } from "@/lib/format";

/* v0.86 — Uso y límites del plan gratuito. Solo organizadores.
   v0.95 — Rehecha: medidores con su Rotom, la curva del periodo de Neon con
   la proyección a fin de mes (lecturas del cron), la actividad por día y por
   hora, despliegues de Vercel, el formulario para apuntar el panel Usage de
   Vercel y qué falta configurar. Cómo se consiguen los datos:
   docs/15-uso-vercel-neon.md. */
export const dynamic = "force-dynamic";
export const metadata = { title: "Uso y límites" };

const fmt = (n: number, d = 0) => n.toLocaleString("es-ES", { maximumFractionDigits: d, minimumFractionDigits: d });
const mb = (b: number) => (b >= 1e9 ? `${fmt(b / 1e9, 2)} GB` : `${fmt(b / 1e6, 1)} MB`);

const UNIDAD: Record<ClaveUso, (v: number) => string> = {
  invocaciones: (v) => (v >= 1e6 ? `${fmt(v / 1e6, 2)} M` : v >= 1e4 ? `${fmt(v / 1e3, 0)} k` : fmt(v)),
  cpuHoras: (v) => `${fmt(v, 2)} h`,
  memoriaGBh: (v) => `${fmt(v, 10 > v ? 1 : 0)} GB·h`,
  cuHoras: (v) => `${fmt(v, 1)} h`,
  transferGB: (v) => `${fmt(v, 2)} GB`,
  almacenGB: (v) => (1 > v ? `${fmt(v * 1000, 0)} MB` : `${fmt(v, 2)} GB`),
};

export default async function UsoPage() {
  const lng = await getLang(); // v0.49
  const me = await currentPlayer();
  if (!me) redirect("/entrar");
  if (!canManageLeague(me.role)) redirect("/ajustes");

  const ahora = new Date();
  const [u, esquema] = await Promise.all([medirUso(ahora), estadoEsquema()]);
  const est = estimarUso(u);
  const fila = (k: ClaveUso) => est.filas.find((f) => f.clave === k) as FilaUso;

  // Neon: proyección a fin de periodo con el inicio que da su API.
  const inicio = u.neonLectura?.inicioPeriodo ? new Date(u.neonLectura.inicioPeriodo) : null;
  const proy = (k: ClaveUso) => {
    const f = fila(k);
    if (!f.real || (k !== "cuHoras" && k !== "transferGB")) return null;
    const p = proyectarPeriodo(f.usado, inicio, ahora);
    return p ? trf(lng, "uso.proyeccion", { v: UNIDAD[k](p.proyeccion), d: fmt(p.quedan, 0) }) : null;
  };
  const serieCu = serieDelPeriodo(u.lecturas, "neon", "cuHoras");
  const pCu = fila("cuHoras").real ? proyectarPeriodo(fila("cuHoras").usado, inicio, ahora) : null;
  const peor = [...est.filas].sort((a, b) => b.pct - a.pct)[0];

  const medidor = (k: ClaveUso) => {
    const f = fila(k);
    return (
      <Medidor key={k} pct={f.pct} estado={f.estado} etiqueta={tr(lng, `uso.l.${k}`)}
        usado={UNIDAD[k](f.usado)} limite={UNIDAD[k](f.limite)} real={f.real}
        forma={ROTOM_DE[k]} lng={lng} proyeccion={proy(k)} />
    );
  };
  const vm = u.vercelManual?.datos ?? {};
  const valor = (k: string) => (typeof vm[k] === "number" ? String(vm[k]).replace(".", ",") : "");

  return (
    <>
      <PageHead title={tr(lng, "uso.titulo")} sub={tr(lng, "uso.sub")} back={{ href: "/ajustes", label: tr(lng, "x.9751f876") }} />

      {/* v0.96 — Estado de la base: qué migraciones faltan en ESTA base. El 4/11
          producción se cayó por una sin aplicar; aquí se ve antes de que pase. */}
      <section className={`card mb-4 p-4 ${esquema && esquema.length ? "border-loss/50" : ""}`} aria-labelledby="uso-esquema" id="esquema">
        <h2 id="uso-esquema" className="mb-1 font-display text-lg font-bold">{tr(lng, "esq.titulo")}</h2>
        {esquema == null ? (
          <p className="text-sm text-muted">{tr(lng, "esq.noSe")}</p>
        ) : esquema.length === 0 ? (
          <p className="text-sm text-ink-2"><span className="chip chip-win mr-2 text-[10px]">{tr(lng, "uso.f.si")}</span>{tr(lng, "esq.ok")}</p>
        ) : (
          <>
            <p className="mb-2 text-sm font-semibold text-loss">{trf(lng, "esq.faltan", { n: esquema.length })}</p>
            <ul className="flex flex-col gap-1 text-sm">
              {esquema.map((m) => (
                <li key={m.migracion} className="flex flex-wrap gap-x-2">
                  <code className="font-mono text-xs">{m.migracion}</code>
                  <span className="text-muted">v{m.version} · {m.que.join(", ")}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">{tr(lng, "esq.como")}</p>
          </>
        )}
      </section>

      {/* La cabecera: el estado en una frase, con los Rotom. */}
      <section className="card mb-4 flex items-center gap-3 overflow-hidden p-4" aria-labelledby="uso-resumen">
        <span className="flex flex-none -space-x-3" aria-hidden="true">
          <Rotom forma="base" size={56} flota={1} />
          <Rotom forma="lavado" size={48} flota={2} className="hidden xs:block" />
        </span>
        <div className="min-w-0">
          <h2 id="uso-resumen" className="font-display text-lg font-bold">
            {tr(lng, `uso.estado.${peor.estado}`)}
          </h2>
          <p className="text-sm text-ink-2">
            {trf(lng, "uso.estado.detalle", { l: tr(lng, `uso.l.${peor.clave}`), p: fmt(peor.pct * 100, 0) })}
          </p>
        </div>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          [tr(lng, "uso.jugadores"), `${u.jugadoresActivos} / ${u.jugadores}`, tr(lng, "uso.jugadoresAyuda")],
          [tr(lng, "uso.activos"), `${u.activos7} · ${u.activos30}`, tr(lng, "uso.activosAyuda")],
          [tr(lng, "uso.horas"), `${fmt(u.horasActivasDia, 1)} h`, tr(lng, "uso.horasAyuda")],
          [tr(lng, "uso.base"), u.bytesBase != null ? mb(u.bytesBase) : "—", tr(lng, "uso.baseAyuda")],
        ].map(([t, v, a]) => (
          <div key={t} className="card p-3">
            <p className="label">{t}</p>
            <p className="font-display text-2xl font-black tabular">{v}</p>
            <p className="text-[11px] text-muted">{a}</p>
          </div>
        ))}
      </section>

      <h2 className="mb-2 font-display text-lg font-bold">{tr(lng, "uso.limites")}</h2>
      <p className="mb-2 text-sm font-semibold text-muted">{tr(lng, "uso.grupoVercel")}</p>
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">{(["invocaciones", "cpuHoras", "memoriaGBh"] as const).map(medidor)}</div>
      <p className="mb-2 text-sm font-semibold text-muted">{tr(lng, "uso.grupoNeon")}</p>
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">{(["cuHoras", "transferGB", "almacenGB"] as const).map(medidor)}</div>
      <p className="mb-6 rounded-lg bg-surface-2 px-3 py-2 text-sm">
        {est.maxActivos != null ? trf(lng, "uso.capacidad", { n: fmt(est.maxActivos), a: u.activos30 }) : tr(lng, "uso.sinActivos")}
      </p>

      <section className="card mb-4 p-4" aria-labelledby="uso-curva">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h2 id="uso-curva" className="font-display text-lg font-bold">{tr(lng, "uso.g.curvaTitulo")}</h2>
            <p className="text-xs text-muted">{tr(lng, "uso.g.curvaSub")}</p>
          </div>
          <Rotom forma="lavado" size={44} flota={2} />
        </div>
        <CurvaPeriodo serie={serieCu} limite={LIMITES.cuHoras} proyeccion={pCu?.proyeccion ?? null} unidad="CU·h" lng={lng} />
        {u.neonLectura?.horasEncendida != null && (
          <p className="mt-2 text-xs text-muted">
            {trf(lng, "uso.g.encendida", { h: fmt(u.neonLectura.horasEncendida, 1), cu: fmt(u.neonLectura.cuHoras ?? 0, 1) })}
          </p>
        )}
      </section>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <section className="card min-w-0 p-4" aria-labelledby="uso-dias">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="uso-dias" className="font-display text-lg font-bold">{tr(lng, "uso.g.diasTitulo")}</h2>
            <Rotom forma="corte" size={40} flota={1} />
          </div>
          <BarrasDias datos={u.porDia} lng={lng} />
        </section>
        <section className="card min-w-0 p-4" aria-labelledby="uso-horas">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h2 id="uso-horas" className="font-display text-lg font-bold">{tr(lng, "uso.g.horasTitulo")}</h2>
              <p className="text-xs text-muted">{tr(lng, "uso.g.horasSub")}</p>
            </div>
            <Rotom forma="calor" size={40} flota={2} />
          </div>
          <BarrasHoras datos={u.porHora} lng={lng} />
        </section>
      </div>

      {/* Vercel: lo que se apunta a mano y los despliegues. */}
      <section id="vercel" className="card mb-4 scroll-mt-20 p-4" aria-labelledby="uso-vercel">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h2 id="uso-vercel" className="font-display text-lg font-bold">{tr(lng, "uso.v.titulo")}</h2>
            <p className="text-xs text-muted">
              {u.vercelManual ? trf(lng, "uso.v.ultima", { f: u.vercelManual.fecha }) : tr(lng, "uso.v.nunca")}
            </p>
          </div>
          <Rotom forma="ventilador" size={44} flota={1} />
        </div>
        <p className="mb-3 text-sm text-ink-2">{tr(lng, "uso.v.ayuda")}</p>
        <form action={guardarLecturaVercel} className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:items-end">
          {([
            ["invocaciones", "uso.v.invocaciones", "12.345"],
            ["cpuHoras", "uso.v.cpu", "0,25"],
            ["memoriaGBh", "uso.v.memoria", "3,5"],
            ["transferenciaGB", "uso.v.transferencia", "1,2"],
          ] as const).map(([name, k, ph]) => (
            <label key={name} className="flex flex-col gap-1">
              <span className="label">{tr(lng, k)}</span>
              <input className="input" name={name} inputMode="decimal" autoComplete="off" placeholder={ph} defaultValue={valor(name)} />
            </label>
          ))}
          <label className="flex flex-col gap-1">
            <span className="label">{tr(lng, "uso.v.fecha")}</span>
            <input className="input" type="date" name="fecha" defaultValue={todayISO()} />
          </label>
          <button type="submit" className="btn btn-brand col-span-2 sm:col-span-5 sm:justify-self-start">{tr(lng, "uso.v.guardar")}</button>
        </form>
        <div className="mt-4 border-t border-line-soft pt-3 text-sm">
          <p className="label mb-1">{tr(lng, "uso.v.despliegues")}</p>
          {u.despliegues ? (
            <p className="text-ink-2">
              {trf(lng, "uso.v.desplieguesDato", {
                n: u.despliegues.total, p: u.despliegues.produccion, e: u.despliegues.fallidos,
                b: u.despliegues.buildMedioSeg != null ? fmt(u.despliegues.buildMedioSeg / 60, 1) : "—",
              })}
            </p>
          ) : (
            <p className="text-muted">{u.vercelError ? trf(lng, "uso.v.error", { e: u.vercelError }) : tr(lng, "uso.v.sinToken")}</p>
          )}
        </div>
      </section>

      {u.tablas.length > 0 && (
        <section className="card mb-4 p-4" aria-labelledby="uso-tablas">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="uso-tablas" className="font-display text-lg font-bold">{tr(lng, "uso.tablas")}</h2>
            <Rotom forma="frio" size={40} flota={2} />
          </div>
          <BarrasTablas tablas={u.tablas.slice(0, 10)} lng={lng} />
        </section>
      )}

      {/* Qué está conectado y qué falta, sin enseñar nunca un valor. */}
      <section className="card mb-4 p-4 text-sm" aria-labelledby="uso-fuentes">
        <h2 id="uso-fuentes" className="mb-2 font-display text-lg font-bold">{tr(lng, "uso.f.titulo")}</h2>
        <ul className="flex flex-col gap-1.5">
          {([
            [u.neonConfigurado && !u.neonError, u.neonConfigurado ? (u.neonError ? trf(lng, "uso.neonError", { e: u.neonError }) : tr(lng, "uso.neonOk")) : tr(lng, "uso.neonNo")],
            [serieCu.length >= 2, serieCu.length >= 2 ? trf(lng, "uso.f.lecturas", { n: serieCu.length }) : tr(lng, "uso.f.sinLecturas")],
            [Boolean(u.vercelManual), u.vercelManual ? trf(lng, "uso.v.ultima", { f: u.vercelManual.fecha }) : tr(lng, "uso.v.nunca")],
            [u.vercelConfigurado && !u.vercelError, u.vercelConfigurado ? (u.vercelError ? trf(lng, "uso.v.error", { e: u.vercelError }) : tr(lng, "uso.f.vercelOk")) : tr(lng, "uso.v.sinToken")],
          ] as const).map(([ok, texto], i) => (
            <li key={i} className="flex gap-2">
              <span className={`chip flex-none text-[10px] ${ok ? "chip-win" : ""}`}>{tr(lng, ok ? "uso.f.si" : "uso.f.no")}</span>
              <span className="text-ink-2">{texto}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">{tr(lng, "uso.f.doc")}</p>
        <p className="mt-2 text-xs">
          <a className="text-info underline" href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">{tr(lng, "uso.f.panelVercel")}</a>
          {" · "}
          <a className="text-info underline" href="https://console.neon.tech" target="_blank" rel="noopener noreferrer">{tr(lng, "uso.f.panelNeon")}</a>
        </p>
      </section>

      <section className="card mb-4 p-4 text-sm">
        <h2 className="mb-2 font-display text-lg font-bold">{tr(lng, "uso.supuestosTitulo")}</h2>
        <ul className="ml-5 list-disc space-y-1 text-ink-2">
          <li>{trf(lng, "uso.s.paginas", { n: SUPUESTOS.paginasPorPersonaDia })}</li>
          <li>{trf(lng, "uso.s.cpu", { n: SUPUESTOS.msCpuPorPagina })}</li>
          <li>{trf(lng, "uso.s.memoria", { n: SUPUESTOS.msDuracionPorEjecucion, g: SUPUESTOS.memoriaGB })}</li>
          <li>{trf(lng, "uso.s.cu", { n: fmt(SUPUESTOS.cu, 2) })}</li>
          <li>{trf(lng, "uso.s.cargas", { n: SUPUESTOS.cargasPorHora, t: mb(u.bytesCarga) })}</li>
        </ul>
        <p className="mt-2 text-xs text-muted">{tr(lng, "uso.consejo")}</p>
      </section>
      <p className="text-xs text-muted"><Link href="/ajustes" className="underline">← {tr(lng, "x.9751f876")}</Link></p>
    </>
  );
}
