import { isOtherArchetype, OtherMark } from "@/components/ui";
import { spriteUrl } from "@/lib/pokemon";
import { pct, wrColor } from "@/lib/format";
import type { TournamentReport } from "@/lib/sources/limitless";
import { Icon } from "@/components/icons";

/* =========================================================================
   El último torneo grande, con el detalle que se mira antes de elegir mazo.

   POR QUÉ NO SE LLAMA «ÚLTIMO REGIONAL»
   -------------------------------------
   Porque no lo es, y decirlo importa. La API de Limitless sirve **su
   plataforma de torneos online**: ligas semanales, torneos de tienda por
   internet, series de creadores. Los Regionales presenciales —Frankfurt,
   Niza— están en otra web suya que no tiene API, y traerlos de ahí sería
   raspar HTML.

   Como foto del metagame esto vale, y bastante: son torneos de cien o
   doscientas personas, salen varios por semana y el metagame online se mueve
   antes que el presencial. Lo que no vale es llamarlo otra cosa.

   LAS TRES CIFRAS Y QUÉ RESPONDE CADA UNA
   ---------------------------------------
   · **Play rate** — qué parte del torneo llevaba ese mazo. Cuánto te lo vas
     a cruzar.
   · **%V** — qué parte de sus rondas ganó. Si aguanta.
   · **Conversión** — qué parte de sus listas entró en el corte. Si cierra.

   Son tres preguntas distintas y el orden por defecto es por play rate,
   porque lo primero que se quiere saber es contra qué se va a jugar.
   ========================================================================= */

export function LastEvent({ report }: { report: TournamentReport | null }) {
  if (!report) {
    return (
      <section className="card mb-6 p-4">
        <h2 className="text-lg font-bold">Último torneo grande</h2>
        <p className="mt-1 text-sm text-muted">
          No hay ningún torneo de 64 personas o más en los últimos catorce días, o Limitless no
          ha respondido. Se mira su plataforma de torneos online; si acaba de haber uno, prueba
          dentro de un rato.
        </p>
      </section>
    );
  }

  const fecha = new Date(report.date);
  const cuando = Number.isFinite(fecha.getTime())
    ? fecha.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })
    : report.date;

  const filas = report.rows.slice(0, 16);
  const fuera = report.rows.length - filas.length;

  return (
    <>
      {/* ------------------------------ cabecera ------------------------------ */}
      <section className="card mb-4 border-brand-line bg-brand-soft p-4">
        <p className="label mb-1">Último torneo grande · online</p>
        <h2 className="font-display text-xl font-bold leading-tight">{report.name}</h2>
        <p className="mt-1 text-sm text-ink-2">
          {cuando}
          {report.organizer ? ` · ${report.organizer}` : ""}
          {" · "}<b className="tabular">{report.players}</b> jugadores
          {report.swissRounds > 0 && <> · {report.swissRounds} rondas</>}
          {report.topCut > 0 ? <> · top {report.topCut}</> : <> · sin top cut</>}
        </p>
        <p className="mt-2 text-xs text-muted">
          Sale de la plataforma de torneos <b>online</b> de Limitless, que es lo que su API
          sirve. Los Regionales presenciales están en su web y no hay forma legítima de
          traerlos automáticamente.
        </p>
        <a
          className="btn btn-sm mt-3"
          href={`https://play.limitlesstcg.com/tournament/${report.id}/standings`}
          target="_blank" rel="noopener noreferrer"
        >
          <Icon name="share" className="size-3.5" /> Ver el torneo entero
        </a>
      </section>

      {/* ----------------------------- jugadores top ---------------------------- */}
      {report.top.length > 0 && (
        <section className="card mb-4">
          <div className="card-head">
            <h3 className="text-lg font-bold">El top {report.top.length}</h3>
            <span className="text-xs text-muted">con lo que jugaron</span>
          </div>
          <ol className="divide-y divide-line-soft">
            {report.top.map((p) => (
              <li key={`${p.placing}-${p.name}`} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`w-7 flex-none text-center font-display text-lg font-extrabold tabular
                  ${p.placing === 1 ? "text-brand" : "text-muted"}`}>
                  {p.placing}
                </span>
                <Mazo name={p.deck} main={p.main} secondary={p.secondary} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="block truncate text-[11px] text-muted">
                    {p.deck}{p.country ? ` · ${p.country}` : ""}
                  </span>
                </span>
                {p.record && (
                  <span className="chip tabular flex-none">{p.record}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ------------------------------ arquetipos ------------------------------ */}
      <section className="card mb-4">
        <div className="card-head">
          <div className="min-w-0">
            <h3 className="text-lg font-bold">Qué se jugó y qué funcionó</h3>
            <p className="text-xs text-muted">
              {report.identified} listas con mazo identificado de {report.players} jugadores
            </p>
          </div>
        </div>

        <ul className="divide-y divide-line-soft">
          {filas.map((r) => (
            <li key={r.identifier} className="flex items-center gap-3 px-4 py-2.5">
              <Mazo name={r.name} main={r.main} secondary={r.secondary} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{r.name}</span>
                <span className="block text-[11px] text-muted tabular">
                  {r.entries} lista{r.entries === 1 ? "" : "s"}
                  {r.best != null && ` · mejor ${r.best}.º`}
                  {report.topCut > 0 && ` · ${r.cut} en el corte`}
                </span>
              </span>
              <span className="flex flex-none items-center gap-3 text-right">
                <Cifra label="Play" value={pct(r.share, 0)} color="var(--source-global)" />
                <Cifra label="%V" value={pct(r.winRate, 0)} color={wrColor(r.winRate)} />
                <Cifra label="Cut" value={pct(r.cutRate, 0)} color={wrColor(r.cutRate)} oculta />
              </span>
            </li>
          ))}
        </ul>

        <div className="border-t border-line-soft px-4 py-3 text-[11px] text-muted">
          <p>
            <b>Play</b> es qué parte del torneo llevaba ese mazo — cuánto te lo cruzas.
            <b> %V</b> es qué parte de sus rondas ganó — si aguanta. <b>Cut</b> es qué parte de
            sus listas entró en el corte — si cierra. Son tres preguntas distintas.
          </p>
          {report.topCut === 0 && (
            <p className="mt-1">Este torneo no tuvo top cut, así que la conversión sale en blanco.</p>
          )}
          {fuera > 0 && <p className="mt-1">Se enseñan los {filas.length} más jugados; quedan {fuera} fuera.</p>}
        </div>
      </section>
    </>
  );
}

function Mazo({ name, main, secondary }: { name: string; main: string; secondary: string }) {
  if (isOtherArchetype(name) || !main) return <OtherMark size="sm" />;
  return (
    <span className="flex flex-none items-center" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={spriteUrl(main)} alt="" loading="lazy" className="size-7 object-contain" />
      {secondary && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={spriteUrl(secondary)} alt="" loading="lazy" className="-ml-2 size-5 object-contain" />
      )}
    </span>
  );
}

function Cifra({ label, value, color, oculta }: {
  label: string; value: string; color: string; oculta?: boolean;
}) {
  return (
    <span className={`w-11 ${oculta ? "hidden sm:block" : "block"}`}>
      <span className="block font-display text-base font-extrabold tabular leading-none" style={{ color }}>
        {value}
      </span>
      <span className="block text-[10px] uppercase tracking-wide text-muted">{label}</span>
    </span>
  );
}
