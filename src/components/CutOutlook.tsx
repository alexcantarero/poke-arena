import { cutOutlook, matchPoints, recordLabel, type Record3, type Scenario } from "@/lib/cut";
import { cpForPlacement, resolveEventDef } from "@/lib/cp";
import { Icon } from "./icons";

/* =========================================================================
   «¿Qué me hace falta para entrar en el corte?»

   La pantalla que se mira entre ronda y ronda. Toda la aritmética está en
   `src/lib/cut.ts`, con la explicación de cómo se estima la línea; aquí solo
   se pinta.

   Dos decisiones de presentación que importan:

   · **Primero la respuesta, después la tabla.** Lo que se quiere saber en
     treinta segundos es «gana dos de tres». La tabla de escenarios va
     debajo, para quien quiera mirarse los empates.
   · **La burbuja se llama burbuja.** Es tentador pintar un sí o un no para
     cada récord, pero quién entra con el récord del corte lo decide la
     resistencia, y eso no se sabe desde aquí. Decir «depende» es la única
     respuesta honesta, y además es la que la gente entiende.

   No se enseña si falta la asistencia: sin saber cuánta gente hay no hay
   línea de corte que estimar, y una cuenta inventada sería peor que nada.
   ========================================================================= */

type Props = {
  season: number;
  kind: string;
  playerCount: number | null | undefined;
  swissRounds: number | null | undefined;
  topCut: number | null | undefined;
  record: Record3;
};

const TONO: Record<string, { chip: string; texto: string }> = {
  in: { chip: "chip-win", texto: "dentro" },
  bubble: { chip: "chip-info", texto: "depende" },
  out: { chip: "chip-loss", texto: "fuera" },
  unknown: { chip: "", texto: "—" },
};

export function CutOutlook({ season, kind, playerCount, swissRounds, topCut, record }: Props) {
  const players = playerCount ?? 0;
  const rounds = swissRounds ?? 0;
  const cut = topCut ?? 0;

  if (!players || !rounds) {
    return (
      <section className="card mb-5 p-4">
        <h2 className="text-lg font-bold">Camino al corte</h2>
        <p className="mt-1 text-sm text-muted">
          Para estimar la línea de corte hacen falta dos datos que todavía no están:{" "}
          {!players && <b>cuánta gente hay</b>}
          {!players && !rounds && " y "}
          {!rounds && <b>cuántas rondas de suizo se juegan</b>}. Se ponen al editar el torneo.
        </p>
      </section>
    );
  }

  const o = cutOutlook({ players, swissRounds: rounds, topCut: cut, current: record });
  const jugadas = record.wins + record.losses + record.ties;

  return (
    <section className="card mb-5">
      <div className="card-head">
        <h2 className="text-lg font-bold">Camino al corte</h2>
        <span className="text-xs text-muted">
          ronda {Math.min(jugadas + 1, rounds)} de {rounds}
          {cut > 0 ? ` · top ${cut}` : " · sin top cut"}
        </span>
      </div>

      <div className="p-4">
        <Titular outlook={o} record={record} cut={cut} />

        {o.line && (
          <p className="mt-2 text-xs text-muted">
            Con {players} jugadores y {rounds} rondas, se espera que{" "}
            <b className="tabular">{o.line.expectedSafe.toFixed(0)}</b> personas acaben con{" "}
            <b>{o.line.safeWins}</b> victorias o más — caben en el top {cut}.
            {o.line.bubbleWins != null && o.line.expectedBubble != null && (
              <> Con <b>{o.line.bubbleWins}</b> victorias serían unas{" "}
              <b className="tabular">{o.line.expectedBubble.toFixed(0)}</b>, así que ese récord es
              la burbuja: entra quien tenga mejor resistencia.</>
            )}
          </p>
        )}

        {o.remaining > 0 && (
          <ul className="mt-4 flex flex-col gap-1.5">
            {o.scenarios.map((s, i) => <Fila key={i} s={s} remaining={o.remaining} />)}
          </ul>
        )}

        <Premio season={season} kind={kind} players={players} cut={cut} />

        <p className="mt-3 text-[11px] text-muted">
          Es una estimación, no la clasificación real. Supone que cada ronda la puede ganar
          cualquiera de los dos; el suizo empareja por puntos, así que el reparto de verdad sale
          algo más plano. Y el desempate lo decide la resistencia, que depende de contra quién
          te haya tocado.
        </p>
      </div>
    </section>
  );
}

/** La respuesta en una línea, que es a lo que se viene. */
function Titular({ outlook: o, record, cut }: { outlook: ReturnType<typeof cutOutlook>; record: Record3; cut: number }) {
  const base = (
    <span className="text-muted">
      Vas <b className="text-ink tabular">{recordLabel(record)}</b>
      {" "}({matchPoints(record)} pts).
    </span>
  );

  if (o.remaining === 0) {
    return <p className="text-sm">{base} Se acabó el suizo.</p>;
  }
  if (!o.line) {
    return (
      <p className="text-sm">
        {base} Quedan {o.remaining} ronda{o.remaining === 1 ? "" : "s"}. Este torneo no tiene top
        cut, así que lo que decide es el puesto final del suizo.
      </p>
    );
  }
  if (o.clinched) {
    return (
      <p className="flex items-start gap-2 text-sm font-semibold text-win">
        <Icon name="check" className="mt-0.5 size-4 flex-none" />
        Ya estás en el top {cut} pase lo que pase en{" "}
        {o.remaining === 1 ? "la ronda que queda" : `las ${o.remaining} que quedan`}.
      </p>
    );
  }
  if (o.eliminated) {
    return (
      <p className="flex items-start gap-2 text-sm font-semibold text-loss">
        <Icon name="alert" className="mt-0.5 size-4 flex-none" />
        Ni ganando las {o.remaining} que quedan se llega al top {cut}. A jugar por los puntos de
        abajo y por la resistencia.
      </p>
    );
  }
  if (o.cheapestIn) {
    const g = o.cheapestIn.need.wins;
    return (
      <p className="text-sm">
        {base}{" "}
        <b className="text-ink">
          {g === 0
            ? `Con no perder ninguna de las ${o.remaining} que quedan, entras.`
            : g === o.remaining
              ? `Hay que ganar ${g === 1 ? "la que queda" : `las ${g} que quedan`}.`
              : `Gana ${g} de ${o.remaining} y estás dentro.`}
        </b>
      </p>
    );
  }
  return (
    <p className="text-sm">
      {base} Quedan {o.remaining}. Ninguna combinación entra segura: toca ganar y esperar al
      desempate.
    </p>
  );
}

/** Un final posible. */
function Fila({ s, remaining }: { s: Scenario; remaining: number }) {
  const t = TONO[s.verdict];
  const partes = [
    s.need.wins > 0 ? `${s.need.wins}V` : null,
    s.need.ties > 0 ? `${s.need.ties}E` : null,
    s.need.losses > 0 ? `${s.need.losses}D` : null,
  ].filter(Boolean).join(" ");

  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-line-soft bg-ground px-3 py-2 text-sm">
      <span className="w-24 flex-none font-semibold tabular">{partes || `0 de ${remaining}`}</span>
      <span className="min-w-0 flex-1 text-muted">
        acabas <b className="text-ink tabular">{recordLabel(s.final)}</b>
        <span className="tabular"> · {s.points} pts</span>
      </span>
      <span className={`chip flex-none ${t.chip}`}>{t.texto}</span>
    </li>
  );
}

/**
 * Lo que da cada puesto, con el kicker ya aplicado.
 *
 * Es la otra mitad de la pregunta: entrar en el corte está muy bien, pero lo
 * que se lleva uno a casa depende del puesto Y de cuánta gente hubo. Un tramo
 * cuyo kicker no llega se enseña tachado a cero, que es lo que pasa de
 * verdad y lo que confunde a todo el mundo la primera vez.
 */
function Premio({ season, kind, players, cut }: { season: number; kind: string; players: number; cut: number }) {
  const def = resolveEventDef(season, kind);
  if (!def?.tiers?.length) return null;

  const filas = def.tiers
    .filter((t) => t.from <= Math.max(cut || 0, 8) || t.from <= 8)
    .slice(0, 5)
    .map((t) => ({
      label: t.from === t.to ? `${t.from}.º` : `${t.from}.º–${t.to}.º`,
      cp: cpForPlacement(season, kind, t.from, players) ?? 0,
      bloqueado: t.minPlayers > 0 && players < t.minPlayers,
      minPlayers: t.minPlayers,
      invite: Boolean(t.invite),
    }));

  if (!filas.length) return null;

  return (
    <div className="mt-4 border-t border-line-soft pt-3">
      <p className="label mb-2">Lo que da cada puesto con {players} jugadores</p>
      <div className="flex flex-wrap gap-1.5">
        {filas.map((f) => (
          <span
            key={f.label}
            className={`chip tabular ${f.invite ? "chip-brand" : f.bloqueado ? "" : "chip-win"}`}
            title={f.bloqueado
              ? `Este tramo necesita ${f.minPlayers} jugadores y hay ${players}.`
              : undefined}
          >
            {f.label} · {f.cp} CP
            {f.invite && <Icon name="trophy" className="size-3" />}
          </span>
        ))}
      </div>
      {filas.some((f) => f.bloqueado) && (
        <p className="mt-1.5 text-[11px] text-muted">
          Los tramos en gris no puntúan: su kicker pide más gente de la que hay. No es un fallo
          de la app, es cómo funcionan los CP.
        </p>
      )}
    </div>
  );
}
