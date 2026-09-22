import { explainCp, resolveEventDef } from "@/lib/cp";
import { setTournamentAttendance } from "@/actions";
import { Icon } from "./icons";

/* =========================================================================
   «¿Cuánta gente hubo?» — el campo que nunca se rellenaba.

   Un torneo se crea días antes del evento y la asistencia no se sabe hasta
   que cierra el registro. Hasta ahora ese campo vivía en el formulario de
   editar, entre otros veinte, así que en la práctica se quedaba vacío. Y sin
   él, el kicker deja a cero los tramos bajos: un 15.º puesto que vale 6 CP
   aparece como 0, que es justo lo que te pasó.

   Aquí está donde se mira: en la propia ficha del torneo, con un campo y un
   botón. Y debajo, lo que importa de verdad — **cuántos CP se está dejando
   cada uno por no haberlo puesto**. Un aviso que dice «falta la asistencia»
   se ignora; uno que dice «te estás dejando 6 CP», no.

   Es un componente de servidor: un formulario y una cuenta, sin estado.
   ========================================================================= */

type Result = {
  playerId: string;
  placement: number | null;
  cpEarned: number;
  cpManual: boolean;
};

type Props = {
  tournamentId: string;
  season: number;
  kind: string;
  playerCount: number | null;
  rounds: number | null;
  topCut: number | null;
  results: Result[];
  nameOf: (playerId: string) => string;
  canEdit: boolean;
};

export function AttendanceForm({
  tournamentId, season, kind, playerCount, rounds, topCut, results, nameOf, canEdit,
}: Props) {
  const def = resolveEventDef(season, kind);
  const daCp = Boolean(def?.tiers?.length);

  /* Qué se está dejando cada uno. Solo tiene sentido preguntarlo cuando hay
     puestos apuntados: sin puesto no hay tramo, y sin tramo no hay cifra que
     perder. */
  const pendientes = daCp
    ? results
        .filter((r) => r.placement != null && !r.cpManual)
        .map((r) => ({ r, motivo: explainCp(season, kind, r, playerCount) }))
        .filter((x) => x.motivo.kind === "no-attendance" || x.motivo.kind === "kicker")
    : [];

  const perdidos = pendientes.reduce(
    (a, x) => a + (x.motivo.kind === "no-attendance" || x.motivo.kind === "kicker" ? x.motivo.wouldBe : 0),
    0,
  );

  // Con la asistencia puesta y sin nadie perdiendo puntos, esto no pinta nada
  // en pantalla: que no salga es la señal de que está todo bien.
  if (playerCount != null && !pendientes.length) return null;
  if (!canEdit && !pendientes.length) return null;

  return (
    <section className={`card mb-5 ${playerCount == null && perdidos > 0 ? "border-brand-line" : ""}`}>
      <div className="card-head">
        <h2 className="text-lg font-bold">
          {playerCount == null ? "Falta la asistencia" : "Asistencia y estructura"}
        </h2>
        {playerCount != null && <span className="text-xs text-muted">{playerCount} jugadores</span>}
      </div>

      <div className="p-4">
        {perdidos > 0 && (
          <p className="mb-3 flex items-start gap-2 rounded-lg border border-brand-line bg-brand-soft p-3 text-sm">
            <Icon name="alert" className="mt-0.5 size-4 flex-none text-brand" />
            <span>
              <b>
                {pendientes.length === 1
                  ? `${nameOf(pendientes[0].r.playerId)} se está dejando ${perdidos} CP.`
                  : `Se están dejando ${perdidos} CP entre ${pendientes.length} resultados.`}
              </b>{" "}
              {pendientes[0].motivo.kind === "no-attendance"
                ? `Los tramos bajos solo puntúan a partir de cierta asistencia, y sin el número no se pueden dar por buenos. Pon cuánta gente hubo y se recalculan solos.`
                : `El tramo de ese puesto necesita más gente de la apuntada. Si la cifra está mal, corrígela aquí.`}
            </span>
          </p>
        )}

        {pendientes.length > 0 && (
          <ul className="mb-3 flex flex-col gap-1">
            {pendientes.map(({ r, motivo }) => (
              <li key={r.playerId} className="flex items-center gap-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate">
                  <b>{nameOf(r.playerId)}</b>
                  <span className="text-muted"> · {r.placement}.º puesto</span>
                </span>
                <span className="chip chip-brand tabular flex-none">
                  0 → {motivo.kind === "no-attendance" || motivo.kind === "kicker" ? motivo.wouldBe : 0} CP
                </span>
                <span className="hidden flex-none text-[11px] text-muted sm:inline">
                  con {motivo.kind === "no-attendance" || motivo.kind === "kicker" ? motivo.needs : 0}+ jugadores
                </span>
              </li>
            ))}
          </ul>
        )}

        {canEdit ? (
          <form action={setTournamentAttendance} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={tournamentId} />
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="att-count">Cuánta gente</label>
              <input
                className="input w-28 tabular" id="att-count" name="playerCount"
                type="number" min={1} inputMode="numeric"
                defaultValue={playerCount ?? ""} placeholder="32"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="att-rounds">Rondas suizas</label>
              <input
                className="input w-24 tabular" id="att-rounds" name="rounds"
                type="number" min={1} max={50} inputMode="numeric"
                defaultValue={rounds ?? ""} placeholder="5"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="label" htmlFor="att-cut">Top cut</label>
              <input
                className="input w-24 tabular" id="att-cut" name="topCut"
                type="number" min={0} max={512} inputMode="numeric"
                defaultValue={topCut ?? ""} placeholder="8"
              />
            </div>
            <button className="btn btn-brand" type="submit">
              <Icon name="check" className="size-4" /> Guardar y recalcular
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted">
            Esto lo rellena quien creó el torneo o un organizador.
          </p>
        )}

        <p className="mt-2 text-[11px] text-muted">
          Al guardar se vuelven a calcular los CP de todos los resultados del torneo con la
          tabla de la temporada {season}. Los que alguien haya puesto a mano no se tocan.
          Las rondas y el top cut alimentan además el «Camino al corte».
        </p>
      </div>
    </section>
  );
}
