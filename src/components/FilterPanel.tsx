import { DATE_PRESETS, MATCH_SCOPES, countFilters, type DatePreset, type MatchFilter, type MatchScope } from "@/lib/filters";
import { Icon } from "./icons";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/* =========================================================================
   El panel de filtros, uno para todas las pantallas.

   Es un `<form method="get">` y no un componente cliente, y eso es una
   decisión, no una limitación:

   · El filtro acaba en la URL, así que se puede **compartir el enlace** con
     alguien y ve exactamente lo mismo.
   · La **vuelta atrás del navegador** deshace el filtro, que es lo que todo
     el mundo espera y lo que un `useState` rompe.
   · Funciona **sin JavaScript**, y en el móvil de la tienda con dos rayas de
     cobertura eso deja de ser un detalle de purista.

   El de antes (`Filters.tsx`) navegaba a cada cambio de un desplegable: en el
   móvil eso es una recarga por cada toque, y poner cuatro filtros eran cuatro
   viajes. Aquí se rellena todo y se envía una vez.

   Los campos vacíos no llegan a la URL porque un `<select>` con `value=""` no
   se envía... salvo que sí se envía, con valor vacío. Por eso el
   `key` de cada campo lleva su nombre y el servidor trata `""` como «sin
   filtro» en `parseMatchFilter`. Más simple que ir limpiando la query.
   ========================================================================= */

export type Option = { value: string; label: string };

type Props = {
  action: string;
  filter: MatchFilter;
  /** Qué campos enseñar. No todas las pantallas quieren todos. */
  show?: Array<
    "scope" | "date" | "tournament" | "competition" | "tournamentKind"
    | "competitionKind" | "archetype" | "player" | "format" | "round"
  >;
  tournaments?: Option[];
  competitions?: Option[];
  tournamentKinds?: Option[];
  competitionKinds?: Option[];
  archetypes?: Option[];
  players?: Option[];
  formats?: Option[];
  /** Parámetros que hay que conservar al enviar (la fuente de datos, por ejemplo). */
  keep?: Record<string, string>;
};

const TODOS = "— todos —";

export async function FilterPanel({
  action, filter, show = ["scope", "date", "tournament", "competition", "archetype", "player"],
  tournaments = [], competitions = [], tournamentKinds = [], competitionKinds = [],
  archetypes = [], players = [], formats = [], keep = {},
}: Props) {
  const lng = await getLang(); // v0.49

  const n = countFilters(filter);
  const ver = (k: NonNullable<Props["show"]>[number]) => show.includes(k);

  return (
    <details className="card mb-4" open={n > 0}>
      <summary className="tap cursor-pointer justify-between px-4 text-sm font-semibold">
        <span className="inline-flex items-center gap-2">
          <Icon name="search" className="size-4 text-muted" />
          Filtros
          {n > 0 && <span className="chip chip-brand tabular">{n}</span>}
        </span>
        <span className="text-xs font-normal text-muted">
          {n > 0 ? "toca para cambiarlos" : tr(lng, "x.b597b9b0")}
        </span>
      </summary>

      <form method="get" action={action} className="border-t border-line-soft p-4">
        {/* Lo que no es un filtro pero tiene que sobrevivir al envío. */}
        {Object.entries(keep).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ver("scope") && (
            <Campo label={tr(lng, "x.619d40ec")} id="f-ambito">
              <select id="f-ambito" name="ambito" className="input" defaultValue={filter.scope}>
                {(Object.entries(MATCH_SCOPES) as Array<[MatchScope, string]>).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Campo>
          )}

          {ver("date") && (
            <>
              <Campo label={tr(lng, "x.b2d383d2")} id="f-cuando">
                <select
                  id="f-cuando" name="cuando" className="input"
                  defaultValue={filter.preset === "custom" ? "all" : filter.preset}
                >
                  {(Object.entries(DATE_PRESETS) as Array<[DatePreset, { label: string }]>).map(([v, d]) => (
                    <option key={v} value={v}>{d.label}</option>
                  ))}
                </select>
              </Campo>

              <Campo label={tr(lng, "x.184419d0")} id="f-desde">
                <div className="flex items-center gap-1.5">
                  <input
                    id="f-desde" name="desde" type="date" className="input min-w-0 flex-1 px-2"
                    defaultValue={filter.preset === "custom" ? filter.from : ""}
                    aria-label={tr(lng, "x.966c7c4c")}
                  />
                  <span className="flex-none text-xs text-muted">a</span>
                  <input
                    name="hasta" type="date" className="input min-w-0 flex-1 px-2"
                    defaultValue={filter.preset === "custom" ? filter.to : ""}
                    aria-label={tr(lng, "x.ccdaad85")}
                  />
                </div>
              </Campo>
            </>
          )}

          {ver("tournament") && tournaments.length > 0 && (
            <Campo label={tr(lng, "x.250eff11")} id="f-torneo">
              <Select id="f-torneo" name="torneo" value={filter.tournamentId} options={tournaments} />
            </Campo>
          )}

          {ver("tournamentKind") && tournamentKinds.length > 0 && (
            <Campo label={tr(lng, "x.bd5fd7b1")} id="f-tipoTorneo">
              <Select id="f-tipoTorneo" name="tipoTorneo" value={filter.tournamentKind} options={tournamentKinds} />
            </Campo>
          )}

          {ver("competition") && competitions.length > 0 && (
            <Campo label={tr(lng, "x.c28ef3fd")} id="f-comp">
              <Select id="f-comp" name="comp" value={filter.competitionId} options={competitions} />
            </Campo>
          )}

          {ver("competitionKind") && competitionKinds.length > 0 && (
            <Campo label={tr(lng, "x.76ed4400")} id="f-tipoComp">
              <Select id="f-tipoComp" name="tipoComp" value={filter.competitionKind} options={competitionKinds} />
            </Campo>
          )}

          {ver("archetype") && archetypes.length > 0 && (
            <Campo label={tr(lng, "x.92fdb4c1")} id="f-arquetipo">
              <Select id="f-arquetipo" name="arquetipo" value={filter.archetypeId} options={archetypes} />
            </Campo>
          )}

          {ver("player") && players.length > 0 && (
            <Campo label={tr(lng, "x.588eb828")} id="f-jugador">
              <Select id="f-jugador" name="jugador" value={filter.playerId} options={players} />
            </Campo>
          )}

          {ver("round") && (
            <Campo label={tr(lng, "x.74d2b97e")} id="f-jornada">
              <input
                id="f-jornada"
                name="jornada"
                type="number"
                min="1"
                className="input"
                defaultValue={filter.round ?? ""}
                placeholder={tr(lng, "x.8a3c3440")}
              />
            </Campo>
          )}

          {ver("format") && formats.length > 0 && (
            <Campo label={tr(lng, "x.c25b742e")} id="f-formato">
              <Select id="f-formato" name="formato" value={filter.format} options={formats} />
            </Campo>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-brand min-w-36 flex-1 sm:flex-none" type="submit">
            <Icon name="check" className="size-4" /> {tr(lng, "x.4ac3b311")}
          </button>
          {n > 0 && (
            // Un enlace y no un botón: quitar los filtros es ir a la pantalla
            // sin query, y eso es navegar, no enviar un formulario.
            /* v0.21: `limpiar=1` borra también los filtros recordados (FilterMemory). */
            <a className="btn btn-ghost" href={queryOf(action, { ...keep, limpiar: "1" })}>{tr(lng, "x.632d4ca5")}</a>
          )}
        </div>

        {ver("date") && (
          <p className="mt-2 text-xs text-muted">
            {tr(lng, "x.c8b56d50")}
          </p>
        )}
      </form>
    </details>
  );
}

/** La ruta limpia, conservando lo que no es filtro. */
function queryOf(action: string, keep: Record<string, string>) {
  const p = new URLSearchParams(keep);
  const qs = p.toString();
  return qs ? `${action}?${qs}` : action;
}

function Campo({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="label" htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

function Select({
  id, name, value, options,
}: { id: string; name: string; value: string; options: Option[] }) {
  return (
    <select id={id} name={name} className="input" defaultValue={value}>
      <option value="">{TODOS}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
