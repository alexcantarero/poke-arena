import { EXPANSIONES, FORMATO_ESTANDAR } from "@/data/formatoEstandar";
import { estadoFormato, legalDe, type ExpansionDato } from "@/lib/formato";
import { todayISO } from "@/lib/format";
import { spriteUrl } from "@/lib/pokemon";
import { tr, trf, type Lang } from "@/lib/i18n";

/* =========================================================================
   v0.110 — «¿En qué formato estamos?», arriba de Top Decks y del recomendador.

   Server Component sin estado: lee la fecha de hoy y los datos escritos a
   mano en `src/data/formatoEstandar.ts`, y lo cuenta en cuatro bloques:
   la expansión que vale hoy (y la que ya está a la venta pero aún no vale),
   la siguiente, qué cartas se pueden jugar, y la rotación y el final de
   temporada. Plegable con `<details>`: abierto de entrada; cerrado, la
   línea de resumen sigue diciendo lo importante.

   Lo que no es oficial se dice: una fecha calculada con el reglamento o una
   expansión que solo ha publicado la prensa llevan su aviso al lado.
   ========================================================================= */

function fecha(iso: string, lang: Lang, conAno: boolean): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "es-ES", {
    day: "numeric", month: "short", ...(conAno ? { year: "numeric" } : {}), timeZone: "UTC",
  }).format(d);
}

function Portada({ e }: { e: ExpansionDato }) {
  if (!e.portada) return <span className="formato-portada formato-portada-vacia" aria-hidden="true" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={spriteUrl(e.portada)} alt="" aria-hidden="true" width={96} height={96}
      loading="lazy" decoding="async" className="formato-portada" />
  );
}

/** «abril de 2027» / «April 2027», de un «2027-04». */
function mes(aaaamm: string, lang: Lang): string {
  const d = new Date(`${aaaamm.slice(0, 7)}-01T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return aaaamm;
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

/** «faltan 14 días», «mañana», «hoy». */
function cuenta(dias: number, lang: Lang): string {
  if (dias <= 0) return tr(lang, "v110.fmt.hoy");
  if (dias === 1) return tr(lang, "v110.fmt.manana");
  return trf(lang, "v110.fmt.faltan", { n: dias });
}

export function FormatoActual({ lang, className = "" }: { lang: Lang; className?: string }) {
  const hoy = todayISO();
  const anoHoy = hoy.slice(0, 4);
  const e = estadoFormato(hoy, EXPANSIONES, FORMATO_ESTANDAR);
  const f = (iso: string) => fecha(iso, lang, iso.slice(0, 4) !== anoHoy);
  const marcas = e.marcas.join(" · ");

  const resumen = [
    trf(lang, "v110.fmt.resumenMarcas", { m: marcas }),
    e.actual ? trf(lang, "v110.fmt.resumenActual", { n: e.actual.nombre }) : null,
    e.enEspera
      ? trf(lang, "v110.fmt.resumenEspera", { n: e.enEspera.nombre, c: cuenta(e.enEspera.diasParaLegal, lang) })
      : e.proxima ? trf(lang, "v110.fmt.resumenProxima", { n: e.proxima.nombre, c: cuenta(e.proxima.diasParaSalida, lang) }) : null,
  ].filter(Boolean).join(" · ");

  return (
    <details className={`card formato-actual ${className}`} open>
      <summary className="formato-summary">
        <span className="formato-titulo">{tr(lang, "v110.fmt.titulo")}</span>
        <span className="formato-resumen">{resumen}</span>
      </summary>

      <div className="formato-rejilla">
        {/* 1 — la expansión que vale hoy, y la que espera */}
        <div className="formato-bloque" data-tono="actual">
          <p className="formato-etiqueta">{tr(lang, "v110.fmt.actual")}</p>
          {e.actual ? (
            <div className="formato-exp">
              <Portada e={e.actual} />
              <div className="min-w-0">
                <p className="formato-nombre">
                  {e.actual.nombre}{e.actual.codigo && <span className="formato-codigo">{e.actual.codigo}</span>}
                </p>
                <p className="formato-dato">{trf(lang, "v110.fmt.legalDesde", { f: f(legalDe(e.actual)) })}</p>
                {e.actual.notaClave && <p className="formato-nota">{tr(lang, e.actual.notaClave)}</p>}
              </div>
            </div>
          ) : <p className="formato-dato">—</p>}
          {e.enEspera && (
            <div className="formato-exp formato-espera">
              <Portada e={e.enEspera} />
              <div className="min-w-0">
                <p className="formato-nombre">
                  {e.enEspera.nombre}{e.enEspera.codigo && <span className="formato-codigo">{e.enEspera.codigo}</span>}
                </p>
                <p className="formato-dato">
                  {trf(lang, "v110.fmt.aLaVenta", { f: f(e.enEspera.salida) })}{" "}
                  <b>{trf(lang, "v110.fmt.legalEl", { f: f(legalDe(e.enEspera)) })}</b>
                  {" "}<span className="formato-cuenta">{cuenta(e.enEspera.diasParaLegal, lang)}</span>
                </p>
                {e.enEspera.legalCalculada && <p className="formato-nota">{tr(lang, "v110.fmt.calculada")}</p>}
              </div>
            </div>
          )}
        </div>

        {/* 2 — la siguiente */}
        <div className="formato-bloque" data-tono="proxima">
          <p className="formato-etiqueta">{tr(lang, "v110.fmt.proxima")}</p>
          {e.proxima ? (
            <div className="formato-exp">
              <Portada e={e.proxima} />
              <div className="min-w-0">
                <p className="formato-nombre">
                  {e.proxima.nombre}{e.proxima.codigo && <span className="formato-codigo">{e.proxima.codigo}</span>}
                </p>
                <p className="formato-dato">
                  {f(e.proxima.salida)} <span className="formato-cuenta">{cuenta(e.proxima.diasParaSalida, lang)}</span>
                </p>
                <p className="formato-nota">
                  {e.proxima.oficial ? tr(lang, "v110.fmt.legalTras") : tr(lang, "v110.fmt.noOficial")}
                </p>
              </div>
            </div>
          ) : <p className="formato-dato">{tr(lang, "v110.fmt.sinProxima")}</p>}
        </div>

        {/* 3 — qué cartas valen */}
        <div className="formato-bloque" data-tono="cartas">
          <p className="formato-etiqueta">{tr(lang, "v110.fmt.cartas")}</p>
          <p className="formato-marcas" aria-label={trf(lang, "v110.fmt.resumenMarcas", { m: marcas })}>
            {e.marcas.map((m) => <span key={m} className="formato-marca">{m}</span>)}
          </p>
          <p className="formato-dato">{trf(lang, "v110.fmt.desde", { s: e.desde })}</p>
          <p className="formato-nota">{tr(lang, "v110.fmt.reimpresiones")}</p>
        </div>

        {/* 4 — rotación y fin de temporada */}
        <div className="formato-bloque" data-tono="temporada">
          <p className="formato-etiqueta">{tr(lang, "v110.fmt.temporada")}</p>
          <p className="formato-dato">
            <b>{tr(lang, "v110.fmt.rotacion")}</b>{" "}
            {e.rotacion.fecha && e.rotacion.dias != null
              ? <>{trf(lang, "v110.fmt.rotacionEl", { f: f(e.rotacion.fecha), m: e.rotacion.sale })} <span className="formato-cuenta">{cuenta(e.rotacion.dias, lang)}</span></>
              : trf(lang, "v110.fmt.rotacionSin", { e: e.rotacion.estimada ? mes(e.rotacion.estimada, lang) : "—", m: e.rotacion.sale })}
          </p>
          <p className="formato-dato">
            <b>{tr(lang, "v110.fmt.fin")}</b>{" "}
            {trf(lang, "v110.fmt.finEl", {
              n: e.finTemporada.nombre, l: e.finTemporada.lugar,
              f: `${fecha(e.finTemporada.desde, lang, false)} – ${fecha(e.finTemporada.hasta, lang, true)}`,
            })}{" "}
            {e.finTemporada.dias > 0 && <span className="formato-cuenta">{cuenta(e.finTemporada.dias, lang)}</span>}
          </p>
        </div>
      </div>

      <p className="formato-pie">
        {trf(lang, "v110.fmt.revisado", { f: fecha(FORMATO_ESTANDAR.revisado, lang, true) })}
        {e.diasDesdeRevision > 75 && <> {tr(lang, "v110.fmt.revisar")}</>}
      </p>
    </details>
  );
}
