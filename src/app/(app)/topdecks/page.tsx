import Link from "next/link";
import { fetchMetaSnapshot, top4Rate, type MetaRow } from "@/lib/sources/limitless";
import { loadMetaIrl, loadSnapshot } from "@/lib/data";
import { irlMeta } from "@/lib/metaIrl";
import { MetaIrlEvents, MetaIrlTable } from "@/components/MetaIrlTable";
import { spriteUrl } from "@/lib/pokemon";
import { pct, wrColor } from "@/lib/format";
import { Empty, isOtherArchetype, Kpi, OtherMark, PageHead } from "@/components/ui";
import { Icon } from "@/components/icons";

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
}: { searchParams: Promise<{ formato?: string; dias?: string; fuente?: string }> }) {
  const q = await searchParams;
  const formato = FORMATOS.some((f) => f.value === q.formato) ? q.formato! : "STANDARD";
  const dias = VENTANAS.some((v) => v.value === q.dias) ? Number(q.dias) : 30;
  const presencial = q.fuente === "presencial";

  const snap = await loadSnapshot();

  /* Cuáles de estos mazos jugáis vosotros. Se cruza por nombre normalizado
     porque los arquetipos importados de Limitless traen su id, pero los
     apuntados a mano no. Hace falta en las dos pestañas. */
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nuestros = new Set(snap.archetypes.map((a) => norm(a.name)));

  const pestanas = (
    <div className="scroll-x mb-4 flex gap-2" role="tablist" aria-label="Metagame">
      <Link href="/topdecks" role="tab" aria-selected={!presencial}
        className={`tap flex-none rounded-lg border px-3.5 text-sm font-semibold transition-colors
          ${!presencial ? "border-source-global bg-source-global-soft text-source-global"
                        : "border-line bg-surface text-muted hover:text-ink"}`}>
        <Icon name="globe" className="size-4" />
        Online
      </Link>
      <Link href="/topdecks?fuente=presencial" role="tab" aria-selected={presencial}
        className={`tap flex-none rounded-lg border px-3.5 text-sm font-semibold transition-colors
          ${presencial ? "border-brand-line bg-brand-soft text-brand"
                       : "border-line bg-surface text-muted hover:text-ink"}`}>
        <Icon name="trophy" className="size-4" />
        Presencial
      </Link>
    </div>
  );

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
          sub="Lo que cortó en los Regionales: traído de Limitless TCG desde Ajustes, o pegado a mano."
          back={{ href: "/mas", label: "Más" }}
        />
        {pestanas}
        <MetaIrlTable meta={metaIrl} nuestros={nuestros} />
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
      limit: dias > 30 ? 40 : 25,
      minPlayers: 16,
      format: formato,
      apiKey: process.env.LIMITLESS_API_KEY,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "error de red";
  }

  const href = (cambios: Record<string, string>) => {
    const sp = new URLSearchParams({ formato, dias: String(dias), ...cambios });
    return `/topdecks?${sp.toString()}`;
  };

  const filas = (meta?.rows ?? []).slice(0, 24);
  const campeon = mejorTop4(filas);

  return (
    <>
      <PageHead
        title="Top Decks"
        sub="Lo que se está jugando en los torneos online de Limitless. Para decidir con qué ir al próximo."
        back={{ href: "/mas", label: "Más" }}
      />

      {pestanas}

      {/* Precisión que hay que dar, porque cambia cómo se lee todo lo de
          abajo: la API de Limitless sirve **su plataforma de torneos
          online**. Los Regionales presenciales están en su web, no en la API,
          y sacarlos de ahí sería hacer scraping. Llamar «meta mundial» a esto
          sin más sería vender otra cosa. */}
      <p className="mb-4 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-ink-2">
        <b>Son torneos online.</b> La API de Limitless cubre su plataforma de torneos por
        internet, no los Regionales presenciales. Como metagame sirve —son miles de listas a la
        semana y se mueve antes que el presencial—, pero no es lo mismo.{" "}
        <Link className="underline" href="/topdecks?fuente=presencial">El metagame presencial</Link>{" "}
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
            No se ha podido leer el metagame: {error ?? "sin datos"}.
          </p>
          <p className="mt-1 text-xs text-muted">
            Limitless es gratis y va bien casi siempre, pero cuando no responde aquí no hay nada
            que enseñar. El resto de la app no depende de esto.
          </p>
        </section>
      ) : !filas.length ? (
        <section className="card">
          <Empty icon="globe" title="No hay torneos en esta ventana">
            Prueba con más días, o con el otro formato. Se miran solo torneos de 16 personas
            para arriba: por debajo, los resultados son ruido.
          </Empty>
        </section>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <Kpi tone="global" icon="globe" label="Torneos" value={meta.tournaments}
              note={`${meta.entries.toLocaleString("es")} listas`} />
            <Kpi tone="global" icon="trophy" label="Más jugado"
              value={filas[0] ? `${Math.round(filas[0].share * 100)}%` : "—"}
              note={filas[0]?.name ?? ""} />
            <Kpi tone="global" icon="star" label="Mejor en top 4"
              value={campeon?.name ?? "—"}
              note={campeon ? `${pct(top4Rate(campeon), 0)} de sus listas` : ""} />
            <Kpi tone="diff" icon="deck" label="En vuestro catálogo"
              value={`${filas.filter((r) => nuestros.has(norm(r.name))).length} de ${filas.length}`}
              note="los demás no los tenéis dados de alta" />
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
                <li key={r.identifier} className="flex items-center gap-3 px-4 py-3">
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
                        <span className="chip chip-diff flex-none text-[10px]">lo tenéis</span>
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
                      <span className="block text-[10px] text-muted">cuota</span>
                    </span>
                    <span className="w-12">
                      <span className="block font-display text-base font-extrabold tabular"
                        style={{ color: wrColor(r.winRate) }}>
                        {pct(r.winRate, 0)}
                      </span>
                      <span className="block text-[10px] text-muted">%V</span>
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
                <b>Cuota</b> es qué parte de todas las listas es ese mazo. <b>%V</b> son las
                rondas que gana, contando el empate como media. <b>Top 4</b> es cuántas de sus
                listas llegaron a semifinales: es lo que distingue un mazo que gana rondas de
                uno que cierra torneos.
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
            Comparar esto con vuestra liga
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
