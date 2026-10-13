import Link from "next/link";
import { spriteUrl } from "@/lib/pokemon";
import { fmtDate, pct } from "@/lib/format";
import { mejorConversion, top4Rate, top8Rate, type IrlRow, type IrlSummary } from "@/lib/metaIrl";
import { Empty, isOtherArchetype, Kpi, OtherMark } from "@/components/ui";
import { CALENDAR_KINDS } from "@/lib/calendar";

/* =========================================================================
   El metagame de papel: lo que cortó en los Regionales.

   Es la hermana de la tabla del metagame online, y a propósito se parecen:
   las mismas columnas en el mismo orden, para poder saltar de una a otra y
   comparar sin volver a aprenderse la pantalla.

   LO QUE NO ES, Y SE DICE ARRIBA DEL TODO
   ---------------------------------------
   Esto **no es el metagame del torneo**: es el del corte. Lo que se importa
   es el top 32 o el top 64, no las mil doscientas personas que fueron. Un
   mazo que juega mucha gente y que no corta casi nunca sale aquí hundido, y
   eso no es un fallo del cálculo: es que la muestra está elegida por
   resultados.

   Decirlo en el encabezado y no en una nota al pie es deliberado. Un número
   sin su contexto se cita luego sin él.
   ========================================================================= */

export function MetaIrlTable({ meta, nuestros, query = "" }: { meta: IrlSummary; nuestros: Set<string>; query?: string }) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const needle = query.toLowerCase();
  const filas = meta.rows.filter((r) => {
    if (!needle) return true;
    return r.name.toLowerCase().includes(needle) || (r.main ?? "").includes(needle) || (r.secondary ?? "").includes(needle);
  }).slice(0, 100);
  const campeon = mejorConversion(meta.rows);
  const cobertura = meta.coverage;

  if (!meta.events) {
    return (
      <section className="card">
        <Empty icon="trophy" title="Todavía no has importado ningún Regional">
          En Ajustes → «Metagame presencial» se pega la clasificación de un Regional y la app se
          queda con los mazos. Con un evento al mes ya se ve por dónde va el formato de papel,
          que no siempre es por donde va el online.
        </Empty>
        <div className="border-t border-line-soft px-4 py-3">
          <Link className="btn btn-brand w-full sm:w-auto" href="/ajustes">
            Ir a importar el primero
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <p className="mb-4 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-ink-2">
        <b>Esto es el metagame del corte, no el del torneo.</b>{" "}
        {cobertura != null
          ? `Lo importado llega hasta el puesto ${cobertura}, así que lo que se ve son los mazos que llegaron ahí.`
          : "Lo importado son desgloses por mazo, sin puestos."}{" "}
        Un mazo que juega mucha gente y que no corta sale aquí bajo, y es correcto: la muestra
        está elegida por resultados. Todo se ha metido a mano desde webs públicas; la app no
        raspa ninguna.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi tone="brand" icon="trophy" label="Eventos" value={meta.events}
          note={meta.latest ? `último: ${fmtDate(meta.latest.date)}` : ""} />
        <Kpi tone="brand" icon="deck" label="Listas" value={meta.entries.toLocaleString("es")}
          note={meta.attendance ? `de ${meta.attendance.toLocaleString("es")} asistentes` : "importadas"} />
        <Kpi tone="brand" icon="star" label="Más jugado"
          value={filas[0] ? `${Math.round(filas[0].share * 100)}%` : "—"}
          note={filas[0]?.name ?? ""} />
        <Kpi tone="diff" icon="compare" label="Mejor en top 4"
          value={campeon?.name ?? "—"}
          note={campeon ? `${pct(top4Rate(campeon), 0)} de sus listas` : "hacen falta más datos"} />
      </div>

      <section className="card">
        <div className="card-head">
          <h2 className="text-lg font-bold">Lo que cortó</h2>
          <span className="text-xs text-muted">
            {meta.events} evento{meta.events === 1 ? "" : "s"} importado{meta.events === 1 ? "" : "s"}
          </span>
        </div>

        <ul className="divide-y divide-line-soft">
          {filas.map((r, i) => (
            <li key={r.key} className="flex items-center gap-3 px-4 py-3">
              <span className="w-5 flex-none text-right font-mono text-xs text-muted tabular">
                {i + 1}
              </span>
              <Sprites row={r} />

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{r.name}</span>
                  {nuestros.has(norm(r.name)) && (
                    <span className="chip chip-diff flex-none text-[10px]">lo tenéis</span>
                  )}
                </span>
                <span className="block text-[11px] text-muted tabular">
                  {r.entries} lista{r.entries === 1 ? "" : "s"}
                  {r.events > 1 && ` · en ${r.events} eventos`}
                  {r.top1 > 0 && ` · ${r.top1} victoria${r.top1 === 1 ? "" : "s"}`}
                  {r.top1 === 0 && r.best && ` · mejor ${r.best.placement}.º`}
                </span>
              </span>

              <span className="flex flex-none items-center gap-3 text-right">
                <span className="w-12">
                  <span className="block font-display text-base font-extrabold tabular text-brand">
                    {Math.round(r.share * 100)}%
                  </span>
                  <span className="block text-[10px] text-muted">cuota</span>
                </span>
                <span className="w-12">
                  <span className="block font-display text-base font-extrabold tabular">
                    {pct(top8Rate(r), 0)}
                  </span>
                  <span className="block text-[10px] text-muted">top 8</span>
                </span>
                <span className="hidden w-12 sm:block">
                  <span className="block font-display text-base font-extrabold tabular">
                    {pct(top4Rate(r), 0)}
                  </span>
                  <span className="block text-[10px] text-muted">top 4</span>
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="border-t border-line-soft px-4 py-3 text-xs text-muted">
          <p>
            <b>Cuota</b> es qué parte de las listas importadas es ese mazo. <b>Top 8</b> y{" "}
            <b>top 4</b> son cuántas de sus listas llegaron ahí — solo cuentan las filas que
            traían puesto, así que un evento metido como desglose suma cuota pero no conversión.
          </p>
        </div>
      </section>
    </>
  );
}

/** La ficha de un evento importado, con lo justo para citarlo. */
export type EventoCitado = {
  id: string;
  name: string;
  date: string;
  kind: string;
  location: string;
  coverage: number | null;
  playerCount: number | null;
  sourceName: string;
  sourceUrl: string;
};

/**
 * De dónde sale la foto.
 *
 * No es adorno: un metagame importado a mano vale lo que valga su fuente, y
 * dentro de seis meses nadie se acuerda de si el top 32 de Lille lo sacó de
 * Limitless o de otro sitio. La cita va debajo de la tabla, siempre.
 */
export function MetaIrlEvents({ eventos }: { eventos: EventoCitado[] }) {
  if (!eventos.length) return null;
  return (
    <section className="card mt-4">
      <div className="card-head">
        <h2 className="text-base font-bold">De dónde sale</h2>
        <span className="text-xs text-muted tabular">{eventos.length}</span>
      </div>
      <ul className="divide-y divide-line-soft">
        {eventos.map((e) => (
          <li key={e.id} className="px-4 py-2.5">
            <span className="flex items-center gap-2">
              <span
                className="size-2 flex-none rounded-full"
                style={{ background: CALENDAR_KINDS[e.kind]?.color ?? "var(--muted)" }}
                aria-hidden="true"
              />
              <span className="min-w-0 truncate text-sm font-semibold">{e.name}</span>
            </span>
            <span className="mt-0.5 block text-[11px] text-muted tabular">
              {fmtDate(e.date)}
              {e.location && ` · ${e.location}`}
              {e.playerCount != null && ` · ${e.playerCount.toLocaleString("es")} asistentes`}
              {e.coverage != null && ` · top ${e.coverage} importado`}
            </span>
            {e.sourceName && (
              <span className="mt-0.5 block text-[11px] text-muted">
                Fuente:{" "}
                {e.sourceUrl ? (
                  <a className="underline" href={e.sourceUrl} target="_blank" rel="noreferrer noopener">
                    {e.sourceName}
                  </a>
                ) : e.sourceName}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Sprites({ row }: { row: IrlRow }) {
  if (isOtherArchetype(row.name) || !row.main) return <OtherMark size="md" />;
  return (
    <span className="flex flex-none items-center" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={spriteUrl(row.main)} alt="" loading="lazy" className="size-8 object-contain" />
      {row.secondary && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={spriteUrl(row.secondary)} alt="" loading="lazy"
          className="-ml-2.5 size-6 object-contain" />
      )}
    </span>
  );
}
