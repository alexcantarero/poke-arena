import { getLang } from "@/lib/lang";
import { tr, trf } from "@/lib/i18n";
import { num, pct } from "@/lib/format";
import { spriteUrl } from "@/lib/pokemon";
import { fetchMatrizMeta } from "@/lib/sources/limitless";
import { celdaDe, pctDe, type FilaMeta } from "@/lib/emparejamientosOnline";
import { Termino } from "@/components/Termino";
import { isOtherArchetype, OtherMark } from "@/components/ui";

/* =========================================================================
   Meta online: % de victorias y matriz de emparejamientos, con partidas
   reales de la API de Limitless (`/standings` + `/pairings`). v0.52.

   Componente de SERVIDOR y sin Recharts: barras y matriz son HTML, así que
   no añade nada al móvil. Va dentro de un <Suspense> en Estadísticas: son
   unas cuarenta llamadas (con caché), y la página no debe esperar por ellas.
   ========================================================================= */

/** Fondo de la celda: verde si la fila gana, rojo si pierde, y más intenso cuanto más se aleja del 50 %. */
function fondo(p: number | null): string {
  if (p == null) return "transparent";
  const fuerza = Math.min(1, Math.abs(p - 0.5) * 2.5);
  const color = p >= 0.5 ? "var(--win)" : "var(--loss)";
  // v0.61 — más fondo de partida (26 % y no 12 %): en tema claro las barras casi no se veían.
  return `color-mix(in oklab, ${color} ${Math.round(26 + fuerza * 44)}%, transparent)`;
}

function Icono({ f, size = "size-7" }: { f: FilaMeta; size?: string }) {
  // v0.58 — «Other» no tiene sprite en Limitless (salía una imagen rota): el Sustituto.
  if (isOtherArchetype(f.name)) return <OtherMark size={size === "size-6" ? "sm" : "md"} />;
  const slug = f.icons?.[0];
  return slug ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={spriteUrl(slug)} alt="" className={`${size} flex-none object-contain [image-rendering:pixelated]`} />
  ) : <span className={`${size} flex-none`} />;
}

export async function MetaOnline({ dias = 30, formato = "STANDARD" }: { dias?: number; formato?: string }) {
  const lng = await getLang(); // v0.49
  let datos: Awaited<ReturnType<typeof fetchMatrizMeta>> | null = null;
  try {
    datos = await fetchMatrizMeta({ days: dias, format: formato, apiKey: process.env.LIMITLESS_API_KEY });
  } catch { /* Limitless caído: se dice abajo y el resto de la página sigue. */ }

  if (!datos || datos.filas.length === 0) {
    return <section className="card p-5 text-sm text-muted">{tr(lng, "mo.sinDatos")}</section>;
  }
  const { acc, filas, torneos, fallidos } = datos;
  const porPct = [...filas].filter((f) => f.pct != null).sort((a, b) => b.pct! - a.pct!);

  return (
    <section className="card min-w-0 overflow-hidden">
      <div className="card-head">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{tr(lng, "mo.titulo")}</h2>
          <p className="text-xs text-muted">
            {trf(lng, "mo.sub", { dias, torneos, partidas: num(acc.partidas) })}
          </p>
        </div>
      </div>

      {/* 1. % de victorias por arquetipo, de mejor a peor */}
      <div className="border-b border-line-soft p-4">
        <h3 className="label mb-3">{tr(lng, "mo.pctTitulo")}</h3>
        <p className="-mt-2 mb-3 text-xs text-muted"><Termino id="espejo">{tr(lng, "glo.esp")}</Termino> · <Termino id="bye">{tr(lng, "glo.bye")}</Termino></p>
        <ol className="flex flex-col gap-1.5">
          {porPct.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-sm">
              <Icono f={f} size="size-6" />
              <span className="w-28 flex-none truncate xs:w-40">{f.name}</span>
              <span className="relative h-4 min-w-0 flex-1 overflow-hidden rounded bg-surface-2">
                {/* La línea del 50 %, para leer de un vistazo quién gana más de lo que pierde. */}
                <span className="absolute inset-y-0 left-1/2 w-px bg-line" aria-hidden="true" />
                <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${(f.pct! * 100).toFixed(1)}%`, background: fondo(f.pct) }} />
              </span>
              <span className="w-12 flex-none text-right font-mono text-xs font-semibold tabular">{pct(f.pct, 1)}</span>
              <span className="hidden w-14 flex-none text-right text-[11px] text-muted tabular xs:block">{num(f.n)}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 2. Matriz: la fila contra la columna */}
      <div className="p-4">
        <h3 className="label mb-1">{tr(lng, "mo.matrizTitulo")}</h3>
        <p className="mb-3 text-xs text-muted">{tr(lng, "mo.matrizSub")}</p>
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="border-separate border-spacing-0.5 text-center text-[11px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-surface px-1 text-left text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {tr(lng, "mo.contra")}
                </th>
                {filas.map((c) => (
                  <th key={c.id} className="px-0.5" title={c.name}>
                    <span className="flex justify-center"><Icono f={c} size="size-7" /></span>
                    <span className="sr-only">{c.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id}>
                  <th className="sticky left-0 z-10 bg-surface pr-1 text-left font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Icono f={f} size="size-6" />
                      <span className="max-w-[6.5rem] truncate">{f.name}</span>
                    </span>
                  </th>
                  {filas.map((c) => {
                    if (c.id === f.id) return <td key={c.id} className="size-11 rounded bg-surface-2 text-muted">—</td>;
                    const cel = celdaDe(acc, f.id, c.id);
                    const n = cel ? cel.w + cel.l + cel.t : 0;
                    const p = cel && n >= 5 ? pctDe(cel) : null; // con menos de 5, el % es ruido
                    return (
                      <td key={c.id} className="size-11 rounded" style={{ background: fondo(p) }}
                        title={cel ? `${f.name} vs ${c.name}: ${cel.w}–${cel.l}${cel.t ? `–${cel.t}` : ""}` : undefined}>
                        {n ? (
                          <span className="flex flex-col leading-tight">
                            <b className="tabular">{p == null ? "·" : `${Math.round(p * 100)}`}</b>
                            <span className="text-[9px] tabular opacity-70">{n}</span>
                          </span>
                        ) : <span className="text-muted">·</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted">
          {trf(lng, "mo.pie", { espejos: num(acc.espejos), descartadas: num(acc.descartadas) })}
          {fallidos > 0 ? ` ${trf(lng, "mo.fallidos", { n: fallidos })}` : ""}
        </p>
      </div>
    </section>
  );
}
