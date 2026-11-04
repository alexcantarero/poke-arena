import Link from "next/link";
import { resumenUsoRapido } from "@/lib/usoDb";
import { estadoEsquema } from "@/lib/esquemaDb";
import { estadoDe, LIMITES, type ClaveUso } from "@/lib/usoLimites";
import { MiniMedidor, Rotom } from "@/components/uso/GraficosUso";
import { tr, trf, type Lang } from "@/lib/i18n";

/* =========================================================================
   v0.95 — El acceso a «Uso y límites» desde Ajustes, ahora a la vista.

   Antes era una línea de texto entre otras. Ahora es la primera tarjeta del
   bloque de organizar: tres Rotom y, si el cron ya ha guardado alguna lectura
   de Neon (o alguien apuntó Vercel), los medidores de lo que más importa.

   Sale de las lecturas GUARDADAS: una consulta pequeña y ninguna llamada a
   Neon ni a Vercel. Abrir Ajustes no cuesta más que antes.
   ========================================================================= */

export async function AccesoUso({ lng }: { lng: Lang }) {
  let r: Awaited<ReturnType<typeof resumenUsoRapido>> = { neon: null, vercel: null };
  // v0.96 — y si falta alguna migración en esta base, se avisa aquí, a la vista.
  const [res, esquema] = await Promise.all([resumenUsoRapido().catch(() => null), estadoEsquema()]);
  if (res) r = res;
  const medidas: Array<[ClaveUso, number]> = [];
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  for (const k of ["cuHoras", "transferGB", "almacenGB"] as const) {
    const v = n(r.neon?.datos[k]);
    if (v != null) medidas.push([k, v / LIMITES[k]]);
  }
  const inv = n(r.vercel?.datos.invocaciones);
  if (inv != null) medidas.push(["invocaciones", inv / LIMITES.invocaciones]);

  return (
    <Link href="/ajustes/uso"
      className="card mb-4 flex flex-col gap-3 overflow-hidden border-info/30 p-4 hover:ring-1 hover:ring-info/50 sm:flex-row sm:items-center">
      <span className="flex flex-none items-end -space-x-2" aria-hidden="true">
        <Rotom forma="lavado" size={48} flota={1} />
        <Rotom forma="calor" size={40} flota={2} />
        <Rotom forma="ventilador" size={40} flota={1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-bold">{tr(lng, "uso.titulo")}</span>
        <span className="block text-xs text-muted">{tr(lng, "uso.enlace")}</span>
        {esquema && esquema.length > 0 && (
          <span className="mt-2 block rounded-lg bg-loss-soft px-2 py-1 text-xs font-semibold text-loss" role="status">
            {trf(lng, "esq.aviso", { m: esquema.map((m) => m.migracion.replace("drizzle/", "")).join(", ") })}
          </span>
        )}
        {medidas.length > 0 ? (
          <span className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {medidas.map(([k, pct]) => (
              <MiniMedidor key={k} pct={pct} estado={estadoDe(pct)} etiqueta={tr(lng, `uso.corto.${k}`)} />
            ))}
          </span>
        ) : (
          <span className="mt-2 block text-xs text-ink-2">{tr(lng, "uso.acceso.sinLecturas")}</span>
        )}
      </span>
      <span className="btn btn-sm flex-none self-start sm:self-center">{tr(lng, "uso.acceso.ver")} →</span>
    </Link>
  );
}
