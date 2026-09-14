import Link from "next/link";
import {
  awardsCp, bflBucket, getSeason, tierFor,
  type CpBreakdownRow, type CpTotals,
} from "@/lib/cp";
import { fmtDate } from "@/lib/format";

/* =========================================================================
   Championship Points, explicados.

   El total de CP es un número que no dice nada por sí solo. Lo que de verdad
   se pregunta uno antes de decidir si coge un tren el sábado es:

     · ¿cuántos huecos me quedan libres en cada cubo?
     · ¿qué resultado mío se está quedando fuera por Best Finish Limit?
     · ¿este puesto me daba plaza para el Mundial?

   Así que esto no enseña una lista plana de torneos: enseña un cubo por
   contador de límite, con sus huecos, y dentro los resultados que lo ocupan.

   Los cubos salen de la tabla de la temporada y no de lo que el jugador tenga
   registrado, a propósito: un cubo vacío es justo el que más interesa ver,
   porque son cuatro huecos esperando a que alguien vaya a una League Cup.

   Lo que NO hay aquí, y no por olvido: un «te faltan N CP para el Mundial».
   Desde 2025 la invitación es por Top N del ranking de tu zona y ese corte
   solo se conoce al acabar la temporada. Cualquier umbral que pintáramos
   sería inventado, y la gente organiza viajes con esto.
   ========================================================================= */

type BucketRow = {
  row: CpBreakdownRow;
  /** Ese puesto da plaza para el Mundial al margen de los puntos. */
  invite: boolean;
  /** Gente que le faltó al torneo para que ese tramo pagara. 0 = pagó. */
  needed: number;
};

type BucketView = {
  bucket: string;
  label: string;
  /** Eventos distintos que gastan de este mismo contador. */
  mainKinds: string[];
  /** Los que solo son otro nombre del mismo evento (Pokémon Cup = League Cup). */
  aliasKinds: string[];
  bfl: number;
  counting: number;
  spare: number | null;
  total: number;
  rows: BucketRow[];
};

/** "A", "A y B", "A, B y C" — que se lea como lo diría una persona. */
function listAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

export function CpBreakdown({ cp }: { cp: CpTotals }) {
  const table = getSeason(cp.season);

  const views: BucketView[] = [];
  const byBucket = new Map<string, BucketView>();

  const open = (key: string, label: string) => {
    let v = byBucket.get(key);
    if (v) return v;
    const head = table.events[key];
    const live = cp.buckets.find((b) => b.bucket === key);
    const bfl = head?.bfl ?? 0;
    const counting = live?.counting ?? 0;
    v = {
      bucket: key,
      label: head?.label ?? label,
      mainKinds: [],
      aliasKinds: [],
      bfl,
      counting,
      spare: bfl > 0 ? Math.max(0, bfl - counting) : null,
      total: live?.total ?? 0,
      rows: cp.rows
        .filter((r) => r.bucket === key)
        .map((row) => {
          const t = tierFor(cp.season, row.kind, row.placement, row.playerCount);
          return {
            row,
            invite: Boolean(t?.invite),
            needed: t?.blockedByKicker ? t.needed : 0,
          };
        })
        // Primero lo que puntúa, de más a menos; los excluidos al final, que es
        // donde se leen como lo que son: lo que te estás dejando fuera.
        .sort((a, b) =>
          Number(a.row.excluded) - Number(b.row.excluded) ||
          b.row.value - a.row.value ||
          b.row.date.localeCompare(a.row.date)),
    };
    byBucket.set(key, v);
    views.push(v);
    return v;
  };

  for (const [kind, def] of Object.entries(table.events)) {
    if (!awardsCp(cp.season, kind)) continue;
    const v = open(bflBucket(cp.season, kind), def.label);
    if (def.aliasOf) v.aliasKinds.push(def.label);
    else v.mainKinds.push(def.label);
  }

  // Red de seguridad: un CP apuntado a mano en un torneo que no es del
  // circuito suma al total aunque su tipo no tenga tabla. Si no lo recogiéramos
  // aquí, ese resultado estaría en el total y en ninguna parte del desglose.
  for (const b of cp.buckets) {
    if (!byBucket.has(b.bucket) && b.total !== 0) open(b.bucket, b.label);
  }

  const invites = views.flatMap((v) => v.rows.filter((r) => r.invite));

  return (
    <section className="card mb-5">
      <div className="card-head">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">Championship Points {cp.season}</h2>
          <p className="text-xs text-muted">
            {cp.total} CP en total
            {cp.confirmed ? "" : " · las cifras de esta temporada aún no son oficiales"}
          </p>
        </div>
        <Link className="btn btn-ghost btn-sm" href="/torneos">Torneos</Link>
      </div>

      {/* La invitación va la primera porque es lo más importante que le puede
          pasar a alguien en una temporada, y porque no se deduce del total:
          se entra por el puesto, tenga los CP que tenga. */}
      {invites.length > 0 && (
        <div className="border-b border-line-soft p-4">
          <div className="rounded-xl border border-brand-line bg-brand-soft p-3.5">
            <h3 className="font-display text-xl font-extrabold text-brand">
              Invitación directa al Mundial
            </h3>
            <p className="mt-1 text-sm text-ink-2">
              Este puesto da plaza al margen de los puntos:
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {invites.map(({ row }) => (
                <li key={row.id} className="text-sm font-semibold text-ink">
                  {row.tournamentName}
                  <span className="font-normal text-ink-2">
                    {row.placement ? ` · puesto ${row.placement}` : ""} · {fmtDate(row.date)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-3 p-4 lg:grid-cols-2">
        {views.map((v) => <Bucket key={v.bucket} view={v} />)}
      </div>

      <div className="flex flex-col gap-2 border-t border-line-soft p-4 text-xs text-muted">
        {table.note && <p>{table.note}</p>}
        <p>
          Esta pantalla no puede decirte cuántos CP hacen falta para ir al Mundial, y no
          se lo inventa: desde 2025 la invitación es por Top N del ranking de tu zona, y
          ese corte solo se conoce cuando termina la temporada.
        </p>
      </div>
    </section>
  );
}

function Bucket({ view }: { view: BucketView }) {
  const shared = view.mainKinds.length > 1;

  return (
    <div className="rounded-xl border border-line-soft bg-ground p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate font-display text-lg font-bold">{view.label}</h3>
        <span className="flex-none font-display text-2xl font-extrabold tabular leading-none">
          {view.total}
          <span className="ml-1 text-xs font-semibold text-muted">CP</span>
        </span>
      </div>

      <p className="mt-1 text-xs text-muted">
        {view.bfl > 0 ? (
          <>
            Cuentan los <b className="text-ink-2">{view.bfl} mejores</b> ·{" "}
            {view.counting} {view.counting === 1 ? "ocupado" : "ocupados"} ·{" "}
            <b className="text-ink-2">{view.spare} {view.spare === 1 ? "libre" : "libres"}</b>
          </>
        ) : (
          <>Sin Best Finish Limit: cuentan todos los resultados.</>
        )}
      </p>

      {/* Los huecos, dibujados. Cuatro barritas se cuentan de un vistazo y un
          «3/4» hay que leerlo. */}
      {view.bfl > 0 && (
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {Array.from({ length: view.bfl }, (_, i) => (
            <i
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < view.counting ? "bg-brand" : "bg-surface-3"}`}
            />
          ))}
        </div>
      )}

      {/* Que dos torneos distintos gasten del mismo contador es lo más
          contraintuitivo de las reglas de 2027, así que se dice con todas las
          letras y no en una nota al pie. */}
      {shared && (
        <p className="mt-2.5 rounded-lg bg-info-soft px-2.5 py-2 text-xs text-info">
          Ojo: {listAnd(view.mainKinds)} comparten estos {view.bfl} huecos. No son{" "}
          {view.bfl} de cada uno — un buen resultado de cualquiera de ellos ocupa un hueco
          que podría ser del otro.
        </p>
      )}

      {view.aliasKinds.length > 0 && (
        <p className="mt-1.5 text-xs text-muted">
          {listAnd(view.aliasKinds)} {view.aliasKinds.length === 1 ? "cuenta" : "cuentan"} aquí también.
        </p>
      )}

      {view.rows.length ? (
        <ul className="mt-3 divide-y divide-line-soft border-t border-line-soft">
          {view.rows.map(({ row, invite, needed }) => (
            <li key={row.id} className="flex items-start gap-2.5 py-2.5">
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-medium ${row.excluded ? "text-muted" : ""}`}>
                  {row.tournamentName}
                </span>
                <span className="block text-xs text-muted">
                  {fmtDate(row.date)}
                  {row.placement ? ` · puesto ${row.placement}` : ""}
                  {row.playerCount ? ` · ${row.playerCount} jugadores` : ""}
                </span>
                {(invite || row.excluded || needed > 0 || row.cpManual) && (
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {invite && <span className="chip chip-brand">invitación al Mundial</span>}
                    {row.excluded && (
                      <span className="chip chip-tie">no suma · fuera por Best Finish Limit</span>
                    )}
                    {needed > 0 && (
                      <span className="text-xs text-muted">
                        ese tramo necesitaba {needed} jugadores para pagar
                      </span>
                    )}
                    {row.cpManual && <span className="chip">CP a mano</span>}
                  </span>
                )}
              </span>
              <span className="flex-none font-mono text-sm font-semibold tabular">
                {row.excluded
                  ? <s className="text-muted">{row.value}</s>
                  : row.counted}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 border-t border-line-soft pt-3 text-xs text-muted">
          Todavía no hay ningún resultado aquí
          {view.bfl > 0 ? `: caben ${view.bfl}, y los ${view.bfl} están libres` : ""}.
        </p>
      )}
    </div>
  );
}
