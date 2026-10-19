import Link from "next/link";
import { fetchMetaSnapshot, top4Rate, type MetaRow } from "@/lib/sources/limitless";
import { loadMetaIrl, loadArchetypes } from "@/lib/data";
import { irlMeta } from "@/lib/metaIrl";
import { MetaIrlEvents, MetaIrlTable } from "@/components/MetaIrlTable";
import { spriteUrl } from "@/lib/pokemon";
import { pct, wrColor } from "@/lib/format";
import { MetaTabs } from "@/components/MetaTabs";
import { Empty, isOtherArchetype, Kpi, OtherMark, PageHead } from "@/components/ui";
import { Icon } from "@/components/icons";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Top Decks" };

/* =========================================================================
   Qué se está jugando en el mundo, y qué está ganando.

   La pantalla de Estadísticas responde «cómo nos va a nosotros» y, de paso,
   compara con el mundo. Esta responde otra pregunta distinta: **con qué me
   voy al próximo torneo**. Por eso el orden es por cuota de metagame y las
   columnas son las que se miran para elegir mazo — cuánto se juega, cuánto
   gana, y cuántas veces llega al top 4, que no es lo mismo.

   La diferencia entre %V y top 4 es justo lo interesante: hay mazos que
   ganan muchas rondas y se atascan en la burbuja, y mazos con un %V discreto
   que cierran torneos. Un solo número no lo distingue.

   Tarda unos segundos: son varias llamadas a Limitless. La caché no se pone
   aquí sino en el cliente de Limitless —`next: { revalidate }` en cada
   `fetch`, seis horas—, y por dos razones: el layout de este grupo es
   `force-dynamic` (hay sesión de por medio), así que un `revalidate` de
   página no pintaría nada; y cachear la respuesta de la API en vez de la
   página deja que los filtros de arriba cambien al instante sin volver a
   pedir nada. Mientras tanto se ve el esqueleto de `loading.tsx`.

   DOS METAGAMES, NO UNO
   ---------------------
   Desde la v0.12.0 la pantalla tiene dos pestañas, porque son dos realidades
   distintas y mezclarlas sería peor que tener dos:

   · **Online** — sale de la API pública de Limitless. Son miles de listas a
     la semana y se mueve antes, pero es su plataforma por internet.
   · **Presencial** — lo que se ha importado a mano de los Regionales. Va con
     semanas de retraso y es una muestra del corte, no del torneo, pero es el
     metagame contra el que de verdad se juega un sábado.

   Nada de scraping, en ninguna de las dos. La online sale de la API pública
   de Limitless, que no pide clave para esto; la presencial la pega una
   persona desde una web pública. RK9 y pokemon.com quedan fuera: sus
   condiciones prohíben expresamente la extracción automatizada.
   ========================================================================= */

const FORMATOS = [
  { value: "STANDARD", label: "Estándar" },
  { value: "EXPANDED", label: "Expandido" },
];

const VENTANAS = [
  { value: "14", label: "14 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
];

export default async function TopDecksPage({
  searchParams,
}: { searchParams: Promise<{ formato?: string; dias?: string; fuente?: string; q?: string }> }) {
  const lng = await getLang(); // v0.49

  const q = await searchParams;
  const formato = FORMATOS.some((f) => f.value === q.formato) ? q.formato! : "STANDARD";
  const dias = VENTANAS.some((v) => v.value === q.dias) ? Number(q.dias) : 30;
  const presencial = q.fuente === "presencial";
  const query = (q.q ?? "").trim();
  const needle = query.toLowerCase();

  // v0.28: de todo el snapshot aquí solo se usaban los arquetipos.
  const archetypes = await loadArchetypes();

  /* Cuáles de estos mazos jugáis vosotros. Se cruza por nombre normalizado
     porque los arquetipos importados de Limitless traen su id, pero los
     apuntados a mano no. Hace falta en las dos pestañas. */
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nuestros = new Set(archetypes.map((a) => norm(a.name)));

  // v0.40 — las tres pestañas, compartidas con /mazos (ver MetaTabs).
  const pestanas = <MetaTabs actual={presencial ? "presencial" : "online"} query={query} />;

  /* ------------------------------------------------------------ presencial */
  if (presencial) {
    const todo = await loadMetaIrl();
    // v0.14: las City Leagues van aparte (formato japonés, por delante del
    // internacional): mezclarlas aquí movería las cuotas del meta de papel.
    const events = todo.events.filter((e) => e.kind !== "city_league");
    const vivos = new Set(events.map((e) => e.id));
    const entries = todo.entries.filter((r) => vivos.has(r.eventId));
    // Nombre distinto del `meta` de la vista online, aunque estén en bloques
    // separados: tener dos cosas distintas llamadas igual en el mismo fichero
    // es cómo se cuelan los errores al editarlo dentro de seis meses.
    const metaIrl = irlMeta(
      events.map((e) => ({
        id: e.id, name: e.name, date: e.date, kind: e.kind,
        coverage: e.coverage, playerCount: e.playerCount, topCut: e.topCut,
      })),
      entries.map((r) => ({
        eventId: r.eventId, placement: r.placement, copies: r.copies,
        archetypeId: r.archetypeId, archetypeName: r.archetypeName,
        main: r.main, secondary: r.secondary,
      })),
    );

    return (
      <>
        <PageHead
          title="Top Decks"
          sub={tr(lng, "x.8283eb44")}
          back={{ href: "/mas", label: tr(lng, "x.e4f75d52") }}
        />
        {pestanas}
        <form action="/topdecks" method="get" className="mb-4 flex gap-2">
          {presencial && <input type="hidden" name="fuente" value="presencial" />}
          {formato !== "STANDARD" && <input type="hidden" name="formato" value={formato} />}
          {dias !== 30 && <input type="hidden" name="dias" value={dias} />}
          <input
            className="input min-w-0 flex-1" type="search" name="q" defaultValue={query}
            placeholder={tr(lng, "x.2a9aa536")} aria-label={tr(lng, "x.ea31e365")}
            autoComplete="off" autoCapitalize="none" spellCheck={false}
          />
          <button className="btn shrink-0" type="submit" aria-label={tr(lng, "x.a62405e2")}>
            <Icon name="search" className="size-4" />
          </button>
        </form>
        <MetaIrlTable meta={metaIrl} nuestros={nuestros} query={query} />
        <MetaIrlEvents eventos={events.map((e) => ({
          id: e.id, name: e.name, date: e.date, kind: e.kind, location: e.location,
          coverage: e.coverage, playerCount: e.playerCount,
          sourceName: e.sourceName, sourceUrl: e.sourceUrl,
        }))} />
      </>
    );
  }

  /* ---------------------------------------------------------------- online */

  let meta: Awaited<ReturnType<typeof fetchMetaSnapshot>> | null = null;
  let error: string | null = null;
  try {
    meta = await fetchMetaSnapshot({
      days: dias,
      limit: 100,
      minPlayers: 16,
      format: formato,
      apiKey: process.env.LIMITLESS_API_KEY,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : tr(lng, "x.e95fcee8");
  }

  const href = (cambios: Record<string, string>) => {
    const sp = new URLSearchParams({ formato, dias: String(dias), ...(query ? { q: query } : {}), ...cambios });
    return `/topdecks?${sp.toString()}`;
  };

  const filas = (meta?.rows ?? []).filter((r) => {
    if (!needle) return true;
    return r.name.toLowerCase().includes(needle) || (r.main ?? "").includes(needle) || (r.secondary ?? "").includes(needle);
  }).slice(0, 100);
  const campeon = mejorTop4(filas);

  return (
    <>
      <PageHead
        title="Top Decks"
        sub={tr(lng, "x.1efb782b")}
        back={{ href: "/mas", label: tr(lng, "x.e4f75d52") }}
      />

      {pestanas}
        <form action="/topdecks" method="get" className="mb-4 flex gap-2">
          {presencial && <input type="hidden" name="fuente" value="presencial" />}
          {formato !== "STANDARD" && <input type="hidden" name="formato" value={formato} />}
          {dias !== 30 && <input type="hidden" name="dias" value={dias} />}
          <input
            className="input min-w-0 flex-1" type="search" name="q" defaultValue={query}
            placeholder={tr(lng, "x.2a9aa536")} aria-label={tr(lng, "x.ea31e365")}
            autoComplete="off" autoCapitalize="none" spellCheck={false}
          />
          <button className="btn shrink-0" type="submit" aria-label={tr(lng, "x.a62405e2")}>
            <Icon name="search" className="size-4" />
          </button>
        </form>

      {/* Precisión que hay que dar, porque cambia cómo se lee todo lo de
          abajo: la API de Limitless sirve **su plataforma de torneos
          online**. Los Regionales presenciales están en su web, no en la API,
          y sacarlos de ahí sería hacer scraping. Llamar «meta mundial» a esto
          sin más sería vender otra cosa. */}
      <p className="mb-4 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-ink-2">
        <b>{tr(lng, "x.455863bd")}</b> La API de Limitless cubre su plataforma de torneos por
        internet, no los Regionales presenciales. Como metagame sirve —son miles de listas a la
        semana y se mueve antes que el presencial—, pero no es lo mismo.{" "}
        <Link className="underline" href={`/topdecks?fuente=presencial${query ? "&q=" + query : ""}`}>{tr(lng, "x.12dcba0c")}</Link>{" "}
        está en la otra pestaña, y entra pegando la clasificación a mano: no hay forma legítima
        de traerlo solo.
      </p>

      <div className="scroll-x mb-4 flex gap-2 pb-1">
        {FORMATOS.map((f) => (
          <Link key={f.value} href={href({ formato: f.value })}
            aria-current={formato === f.value ? "page" : undefined}
            className={`chip flex-none ${formato === f.value ? "chip-brand" : ""}`}>
            {f.label}
          </Link>
        ))}
        <span className="w-2 flex-none" aria-hidden="true" />
        {VENTANAS.map((v) => (
          <Link key={v.value} href={href({ dias: v.value })}
            aria-current={dias === Number(v.value) ? "page" : undefined}
            className={`chip flex-none ${dias === Number(v.value) ? "chip-info" : ""}`}>
            {v.label}
          </Link>
        ))}
      </div>

      {error || !meta ? (
        <section className="card p-4">
          <p className="text-sm font-semibold text-loss">
            No se ha podido leer el metagame: {error ?? tr(lng, "x.e0919c92")}.
          </p>
          <p className="mt-1 text-xs text-muted">
            {tr(lng, "x.e8cfa447")}
          </p>
        </section>
      ) : !filas.length ? (
        <section className="card">
          <Empty icon="globe" title={tr(lng, "x.2a570e3a")}>
            {tr(lng, "x.b55c86ca")}
          </Empty>
        </section>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <Kpi tone="global" icon="globe" label={tr(lng, "x.f02a0f3c")} value={meta.tournaments}
              note={`${meta.entries.toLocaleString("es")} listas`} />
            <Kpi tone="global" icon="trophy" label={tr(lng, "x.ab2a0aaa")}
              value={filas[0] ? `${Math.round(filas[0].share * 100)}%` : "—"}
              note={filas[0]?.name ?? ""} />
            <Kpi tone="global" icon="star" label={tr(lng, "x.94fa659c")}
              value={campeon?.name ?? "—"}
              note={campeon ? `${pct(top4Rate(campeon), 0)} de sus listas` : ""} />
            <Kpi tone="diff" icon="deck" label={tr(lng, "x.36ac3172")}
              value={`${filas.filter((r) => nuestros.has(norm(r.name))).length} de ${filas.length}`}
              note={tr(lng, "x.baa743b3")} />
          </div>

          <section className="card">
            <div className="card-head">
              <h2 className="text-lg font-bold">Los {filas.length} más jugados</h2>
              <span className="text-xs text-muted">últimos {meta.days} días</span>
            </div>

            {/* En móvil es una lista de tarjetas y en escritorio una tabla: con
                seis columnas de números, una tabla a 375px no se lee. */}
            <ul className="divide-y divide-line-soft">
              {filas.map((r, i) => (
                <li key={r.identifier} className="relative flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60">
                  <span className="w-5 flex-none text-right font-mono text-xs text-muted tabular">
                    {i + 1}
                  </span>
                  {isOtherArchetype(r.name) ? (
                    <OtherMark size="md" />
                  ) : (
                    <span className="flex flex-none items-center" aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={spriteUrl(r.main)} alt="" loading="lazy" className="size-8 object-contain" />
                      {r.secondary && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={spriteUrl(r.secondary)} alt="" loading="lazy"
                          className="-ml-2.5 size-6 object-contain" />
                      )}
                    </span>
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{r.name}</span>
                      {nuestros.has(norm(r.name)) && (
                        <span className="chip chip-diff flex-none text-[10px]">{tr(lng, "x.84ef7ea0")}</span>
                      )}
                    </span>
                    <span className="block text-[11px] text-muted tabular">
                      {r.entries} lista{r.entries === 1 ? "" : "s"}
                      {r.firsts > 0 && ` · ${r.firsts} victoria${r.firsts === 1 ? "" : "s"}`}
                      {r.best && ` · mejor ${r.best.placing}.º en ${acorta(r.best.tournament)}`}
                    </span>
                  </span>

                  <span className="flex flex-none items-center gap-3 text-right">
                    <span className="w-12">
                      <span className="block font-display text-base font-extrabold tabular"
                        style={{ color: "var(--source-global)" }}>
                        {Math.round(r.share * 100)}%
                      </span>
                      <span className="block text-[10px] text-muted">{tr(lng, "x.cdd02ce6")}</span>
                    </span>
                    <span className="w-12">
                      <span className="block font-display text-base font-extrabold tabular"
                        style={{ color: wrColor(r.winRate) }}>
                        {pct(r.winRate, 0)}
                      </span>
                      <span className="block text-[10px] text-muted">{tr(lng, "x.39683ef7")}</span>
                    </span>
                    <span className="hidden w-12 sm:block">
                      <span className="block font-display text-base font-extrabold tabular">
                        {pct(top4Rate(r), 0)}
                      </span>
                      <span className="block text-[10px] text-muted">{tr(lng, "x.26c8e96f")}</span>
                    </span>
                  </span>
                  {/* v0.51 — toda la fila lleva a las mejores listas de ese arquetipo, con
                      sus cartas, conservando los días y el formato que se están mirando. */}
                  <Link
                    href={`/topdecks/${encodeURIComponent(r.identifier)}?n=${encodeURIComponent(r.name)}&m=${encodeURIComponent(r.main ?? "")}&s=${encodeURIComponent(r.secondary ?? "")}&dias=${dias}&formato=${formato}`}
                    className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-info"
                    aria-label={trf(lng, "td.verMejores", { n: r.name })}
                  />
                </li>
              ))}
            </ul>

            <div className="border-t border-line-soft px-4 py-3 text-xs text-muted">
              <p>
                <b>{tr(lng, "x.d344b5b2")}</b> {tr(lng, "x.8fa3f853")} <b>{tr(lng, "x.39683ef7")}</b> {tr(lng, "x.55396024")} <b>{tr(lng, "x.045b64f6")}</b> {tr(lng, "x.3d3af019")}
              </p>
              {meta.failed > 0 && (
                <p className="mt-1.5">
                  {meta.failed} torneo(s) no respondieron, así que la foto está algo coja.
                </p>
              )}
              <p className="mt-1.5">
                Solo torneos de 16 personas o más. Sale de la API pública de Limitless; no se
                raspa ninguna web.
              </p>
            </div>
          </section>

          <Link className="btn mt-4 w-full sm:w-auto" href="/estadisticas?fuente=both">
            <Icon name="compare" className="size-4" />
            {tr(lng, "x.93569ced")}
          </Link>
        </>
      )}

    </>
  );
}


/** El mazo con mejor porcentaje de top 4, entre los que tienen listas suficientes. */
function mejorTop4(rows: MetaRow[]): MetaRow | null {
  // Con menos de cinco listas, un 100% de top 4 es una casualidad, no un dato.
  const con = rows.filter((r) => r.entries >= 5);
  if (!con.length) return null;
  return con.reduce((best, r) => ((top4Rate(r) ?? 0) > (top4Rate(best) ?? 0) ? r : best));
}

/** Los nombres de torneo de Limitless son largos y en la línea no caben. */
const acorta = (s: string) => (s.length > 26 ? `${s.slice(0, 25)}…` : s);
