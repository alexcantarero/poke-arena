"use client";
import { useState } from "react";
import {
  collapseOut,
  cutOutlook,
  matchPoints,
  recordLabel,
  isRegionalTournament,
  regionalStructure,
  day1Outlook,
  type CutLine,
  type Record3,
  type Scenario,
  type Day1Outlook,
  type RegionalStructure,
} from "@/lib/cut";
import { cpForPlacement, resolveEventDef } from "@/lib/cp";
import { Icon } from "./icons";

/* =========================================================================
   «¿Qué me hace falta para entrar en el corte?»

   La pantalla que se mira entre ronda y ronda. Toda la aritmética está en
   `src/lib/cut.ts`, con la explicación de cómo se estima la línea y la
   lógica dinámica para torneos Regionales (Día 1, Día 2 y Top Cut).

   LÓGICA REGIONAL (PLAY! POKÉMON):
   · 256 a 2048 participantes: 8 rondas Día 1 (umbral 16 pts), 4 rondas Día 2.
   · Más de 2048 participantes: 9 rondas Día 1 (umbral 19 pts), 5 rondas Día 2.
   · Condicionante general: avanza quien cumpla el umbral de puntos o termine
     dentro del Top 32 global (mínimo 32 jugadores en Día 2).
   · Top Cut: Top 8 (Cuartos, Semifinal, Final).
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

export function CutOutlook({
  season,
  kind,
  playerCount,
  swissRounds,
  topCut,
  record,
}: Props) {
  const players = playerCount ?? 0;
  const isRegional = isRegionalTournament(kind, players > 0 ? players : null);
  const reg = isRegional && players > 0 ? regionalStructure(players) : null;
  const rounds = swissRounds ?? (reg ? reg.totalSwissRounds : 0);
  const cut = topCut ?? (reg ? 8 : 0);
  const jugadas = record.wins + record.losses + record.ties;

  const [regionalTab, setRegionalTab] = useState<"day1" | "day2">(() =>
    reg && jugadas >= reg.day1Rounds ? "day2" : "day1",
  );

  if (!players || (!rounds && !reg)) {
    return (
      <section className="card mb-5 p-4">
        <h2 className="text-lg font-bold">Camino al corte</h2>
        <p className="mt-1 text-sm text-muted">
          Para estimar la línea de corte hacen falta dos datos que todavía no
          están: {!players && <b>cuánta gente hay</b>}
          {!players && !rounds && " y "}
          {!rounds && <b>cuántas rondas de suizo se juegan</b>}. Se ponen al
          editar el torneo.
        </p>
      </section>
    );
  }

  // Vista para torneos Regionales (dos fases según el reglamento oficial)
  if (reg && reg.hasDay2) {
    const isDay1Tab = regionalTab === "day1";
    const d1 = day1Outlook({ players, current: record });
    const d1Resumen = collapseOut(d1.scenarios);

    const o2 = cutOutlook({
      players,
      swissRounds: reg.totalSwissRounds,
      topCut: 8,
      current: record,
    });
    const d2Resumen = collapseOut(o2.scenarios);

    return (
      <section className="card mb-5">
        <div className="card-head">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">
              {isDay1Tab ? "Camino al Día 2" : "Camino al Top Cut (Top 8)"}
            </h2>
            <p className="text-xs text-muted">
              {isDay1Tab
                ? `Día 1 · ronda ${Math.min(jugadas + 1, reg.day1Rounds)} de ${reg.day1Rounds} · umbral ${reg.pointsThreshold} pts o Top 32`
                : `Día 2 · ronda ${Math.min(jugadas + 1, reg.totalSwissRounds)} de ${reg.totalSwissRounds} · top 8`}
            </p>
          </div>
          <span className="chip chip-brand flex-none text-[11px] font-semibold">
            {reg.day1Rounds} + {reg.day2Rounds} Rondas
          </span>
        </div>

        <div className="p-4">
          <div className="seg seg-brand mb-4 w-full">
            <button
              type="button"
              data-on={isDay1Tab}
              onClick={() => setRegionalTab("day1")}
            >
              Día 1 ({reg.day1Rounds} rondas · {reg.pointsThreshold} pts)
            </button>
            <button
              type="button"
              data-on={!isDay1Tab}
              onClick={() => setRegionalTab("day2")}
            >
              Día 2 y Top Cut ({reg.day2Rounds} rondas suizas + Top 8)
            </button>
          </div>

          {isDay1Tab ? (
            <>
              <TitularDia1 d1={d1} record={record} reg={reg} />
              <UmbralDia1 reg={reg} />

              {d1.remaining > 0 && (
                <>
                  <ul className="mt-4 flex flex-col gap-1.5">
                    {d1Resumen.shown.map((s, i) => (
                      <Fila key={i} s={s} remaining={d1.remaining} />
                    ))}
                  </ul>
                  {d1Resumen.hiddenOut > 0 && (
                    <p className="mt-1.5 text-[11px] text-muted">
                      Se enseña solo el mejor de los finales que se quedan
                      fuera; hay {d1Resumen.hiddenOut} peor
                      {d1Resumen.hiddenOut === 1 ? "" : "es"} y dicen lo mismo.
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <Titular outlook={o2} record={record} cut={8} />
              {o2.line && (
                <Umbral
                  line={o2.line}
                  rounds={reg.totalSwissRounds}
                  players={players}
                  cut={8}
                />
              )}

              {o2.remaining > 0 && (
                <>
                  <ul className="mt-4 flex flex-col gap-1.5">
                    {d2Resumen.shown.map((s, i) => (
                      <Fila key={i} s={s} remaining={o2.remaining} />
                    ))}
                  </ul>
                  {d2Resumen.hiddenOut > 0 && (
                    <p className="mt-1.5 text-[11px] text-muted">
                      Se enseña solo el mejor de los finales que se quedan
                      fuera; hay {d2Resumen.hiddenOut} peor
                      {d2Resumen.hiddenOut === 1 ? "" : "es"} y dicen lo mismo.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          <Premio season={season} kind={kind} players={players} cut={8} />

          <p className="mt-3 text-[11px] text-muted">
            {isDay1Tab
              ? `Estructura oficial para ${players} participantes: ${reg.day1Rounds} rondas en Día 1 (se requieren ${reg.pointsThreshold} pts o Top 32 para pasar) y ${reg.day2Rounds} rondas adicionales en Día 2 (${reg.totalSwissRounds} totales).`
              : "La estimación del Top 8 supone que el suizo empareja por puntos. El corte final a 8 jugadores se jugará por eliminatoria directa (Cuartos, Semifinal y Final)."}
          </p>
        </div>
      </section>
    );
  }

  // Vista para torneos estándar de un solo día
  const o = cutOutlook({
    players,
    swissRounds: rounds,
    topCut: cut,
    current: record,
  });
  const resumen = collapseOut(o.scenarios);

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
          <Umbral line={o.line} rounds={rounds} players={players} cut={cut} />
        )}

        {o.remaining > 0 && (
          <>
            <ul className="mt-4 flex flex-col gap-1.5">
              {resumen.shown.map((s, i) => (
                <Fila key={i} s={s} remaining={o.remaining} />
              ))}
            </ul>
            {resumen.hiddenOut > 0 && (
              <p className="mt-1.5 text-[11px] text-muted">
                Se enseña solo el mejor de los finales que se quedan fuera; hay{" "}
                {resumen.hiddenOut} peor{resumen.hiddenOut === 1 ? "" : "es"} y
                dicen lo mismo.
              </p>
            )}
          </>
        )}

        <Premio season={season} kind={kind} players={players} cut={cut} />

        <p className="mt-3 text-[11px] text-muted">
          Es una estimación, no la clasificación real. Supone que cada ronda la
          puede ganar cualquiera de los dos; el suizo empareja por puntos, así
          que el reparto de verdad sale algo más plano. Y el desempate lo decide
          la resistencia, que depende de contra quién te haya tocado.
        </p>
      </div>
    </section>
  );
}

/**
 * Los umbrales de corte para el Día 1 de un Regional:
 * 1. Puntos de partido requeridos (16 o 19 pts).
 * 2. Garantía Top 32 global.
 */
function UmbralDia1({ reg }: { reg: RegionalStructure }) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <div className="rounded-xl border border-win/40 bg-win-soft p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-win">
          <Icon name="check" className="size-3.5" /> Corte al Día 2 (Match
          Points)
        </p>
        <p className="font-display text-2xl font-extrabold tabular leading-none text-win">
          {reg.pointsThreshold} puntos o más
        </p>
        <p className="mt-1 text-[11px] text-ink-2">
          Se requieren al menos <b>{reg.pointsThreshold} puntos</b> al finalizar
          la ronda {reg.day1Rounds} (3 por victoria, 1 por empate).
        </p>
      </div>

      <div className="rounded-xl border border-info/40 bg-info-soft p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-info">
          <Icon name="compare" className="size-3.5" /> Garantía Top 32 Global
        </p>
        <p className="font-display text-2xl font-extrabold tabular leading-none text-info">
          Mínimo 32 jugadores
        </p>
        <p className="mt-1 text-[11px] text-ink-2">
          Un jugador avanza si cumple el umbral de puntos o si termina en el{" "}
          <b>Top 32</b>, asegurando al menos 32 clasificados.
        </p>
      </div>
    </div>
  );
}

/**
 * Resumen del estado hacia el Día 2 en una línea.
 */
function TitularDia1({
  d1,
  record,
  reg,
}: {
  d1: Day1Outlook;
  record: Record3;
  reg: RegionalStructure;
}) {
  const base = (
    <span className="text-muted">
      Vas <b className="text-ink tabular">{recordLabel(record)}</b> (
      {d1.currentPoints} pts).
    </span>
  );

  if (d1.remaining === 0) {
    if (d1.currentPoints >= reg.pointsThreshold) {
      return (
        <p className="flex items-start gap-2 text-sm font-semibold text-win">
          <Icon name="check" className="mt-0.5 size-4 flex-none" />
          {base} ¡Día 1 completado! Has alcanzado los {d1.currentPoints} puntos
          (umbral {reg.pointsThreshold} pts) y estás clasificado al Día 2.
        </p>
      );
    }
    return (
      <p className="text-sm">
        {base} Día 1 finalizado con {d1.currentPoints} pts (umbral:{" "}
        {reg.pointsThreshold} pts). Clasificas al Día 2 si quedas clasificado en
        el Top 32 global.
      </p>
    );
  }

  if (d1.clinched) {
    return (
      <p className="flex items-start gap-2 text-sm font-semibold text-win">
        <Icon name="check" className="mt-0.5 size-4 flex-none" />
        {base} ¡Pase al Día 2 asegurado! Tienes {d1.currentPoints} puntos
        (umbral {reg.pointsThreshold} pts superado) pase lo que pase en{" "}
        {d1.remaining === 1
          ? "la ronda que queda"
          : `las ${d1.remaining} que quedan`}
        .
      </p>
    );
  }

  if (d1.eliminated) {
    return (
      <p className="flex items-start gap-2 text-sm font-semibold text-loss">
        <Icon name="alert" className="mt-0.5 size-4 flex-none" />
        {base} Ni ganando las {d1.remaining} que quedan de Día 1 se llega a{" "}
        {reg.pointsThreshold} puntos. Solo queda opción de clasificar por
        terminar en el Top 32.
      </p>
    );
  }

  if (d1.cheapestIn) {
    const w = d1.cheapestIn.need.wins;
    const t = d1.cheapestIn.need.ties;
    const partes = [
      w > 0 ? `${w} victoria${w > 1 ? "s" : ""}` : null,
      t > 0 ? `${t} empate${t > 1 ? "s" : ""}` : null,
    ]
      .filter(Boolean)
      .join(" y ");

    return (
      <p className="text-sm">
        {base}{" "}
        <b className="text-ink">
          {w === 0 && t === 0
            ? "Ya estás dentro del umbral."
            : `Con ${partes} en ${d1.remaining === 1 ? "la ronda que queda" : `las ${d1.remaining} que quedan`} aseguras el Día 2.`}
        </b>
      </p>
    );
  }

  return (
    <p className="text-sm">
      {base} Quedan {d1.remaining} rondas en Día 1. Ninguna combinación directa
      garantiza {reg.pointsThreshold} puntos: toca ganar y buscar puesto en Top
      32.
    </p>
  );
}

/**
 * Las dos cifras que de verdad se buscan: con qué entras seguro y con qué
 * dependes del desempate.
 *
 * Iban en un párrafo de texto corrido y se leían mal. Son dos números, se
 * miran de reojo entre ronda y ronda, y merecen estar separados y en grande.
 *
 * El «depende» no es un fallo de la estimación: en un suizo, con el récord
 * justo de la línea siempre hay más gente que huecos, y quién pasa lo decide
 * la resistencia — contra quién te tocó jugar. Eso no se puede saber desde
 * aquí, y decirlo es más útil que fingir un sí o un no.
 */
function Umbral({
  line,
  rounds,
  players,
  cut,
}: {
  line: CutLine;
  rounds: number;
  players: number;
  cut: number;
}) {
  const label = (v: number) => `${v}-${rounds - v}`;
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <div className="rounded-xl border border-win/40 bg-win-soft p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-win">
          <Icon name="check" className="size-3.5" /> Entrada segura
        </p>
        <p className="font-display text-2xl font-extrabold tabular leading-none text-win">
          {label(line.safeWins)} o mejor
        </p>
        <p className="mt-1 text-[11px] text-ink-2">
          Se esperan <b className="tabular">{line.expectedSafe.toFixed(0)}</b>{" "}
          personas con {line.safeWins} victorias o más, y en el top {cut} caben{" "}
          {cut}.
        </p>
      </div>

      {line.bubbleWins != null && line.expectedBubble != null ? (
        <div className="rounded-xl border border-info/40 bg-info-soft p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-info">
            <Icon name="compare" className="size-3.5" /> Depende del desempate
          </p>
          <p className="font-display text-2xl font-extrabold tabular leading-none text-info">
            {label(line.bubbleWins)}
          </p>
          <p className="mt-1 text-[11px] text-ink-2">
            Ahí se esperan unas{" "}
            <b className="tabular">{line.expectedBubble.toFixed(0)}</b> para{" "}
            {cut} plazas: entra quien tenga mejor resistencia.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-ground p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
            Sin burbuja
          </p>
          <p className="mt-1 text-[11px] text-ink-2">
            Con {players} jugadores y {rounds} rondas no hay un récord
            intermedio que se juegue el corte: o entras o no.
          </p>
        </div>
      )}
    </div>
  );
}

/** La respuesta en una línea, que es a lo que se viene. */
function Titular({
  outlook: o,
  record,
  cut,
}: {
  outlook: ReturnType<typeof cutOutlook>;
  record: Record3;
  cut: number;
}) {
  const base = (
    <span className="text-muted">
      Vas <b className="text-ink tabular">{recordLabel(record)}</b> (
      {matchPoints(record)} pts).
    </span>
  );

  if (o.remaining === 0) {
    return <p className="text-sm">{base} Se acabó el suizo.</p>;
  }
  if (!o.line) {
    return (
      <p className="text-sm">
        {base} Quedan {o.remaining} ronda{o.remaining === 1 ? "" : "s"}. Este
        torneo no tiene top cut, así que lo que decide es el puesto final del
        suizo.
      </p>
    );
  }
  if (o.clinched) {
    return (
      <p className="flex items-start gap-2 text-sm font-semibold text-win">
        <Icon name="check" className="mt-0.5 size-4 flex-none" />
        Ya estás en el top {cut} pase lo que pase en{" "}
        {o.remaining === 1
          ? "la ronda que queda"
          : `las ${o.remaining} que quedan`}
        .
      </p>
    );
  }
  if (o.eliminated) {
    return (
      <p className="flex items-start gap-2 text-sm font-semibold text-loss">
        <Icon name="alert" className="mt-0.5 size-4 flex-none" />
        Ni ganando las {o.remaining} que quedan se llega al top {cut}. A jugar
        por los puntos de abajo y por la resistencia.
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
      {base} Quedan {o.remaining}. Ninguna combinación entra segura: toca ganar
      y esperar al desempate.
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
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-line-soft bg-ground px-3 py-2 text-sm">
      <span className="w-24 flex-none font-semibold tabular">
        {partes || `0 de ${remaining}`}
      </span>
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
function Premio({
  season,
  kind,
  players,
  cut,
}: {
  season: number;
  kind: string;
  players: number;
  cut: number;
}) {
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
      <p className="label mb-2">
        Lo que da cada puesto con {players} jugadores
      </p>
      <div className="flex flex-wrap gap-1.5">
        {filas.map((f) => (
          <span
            key={f.label}
            className={`chip tabular ${f.invite ? "chip-brand" : f.bloqueado ? "" : "chip-win"}`}
            title={
              f.bloqueado
                ? `Este tramo necesita ${f.minPlayers} jugadores y hay ${players}.`
                : undefined
            }
          >
            {f.label} · {f.cp} CP
            {f.invite && <Icon name="trophy" className="size-3" />}
          </span>
        ))}
      </div>
      {filas.some((f) => f.bloqueado) && (
        <p className="mt-1.5 text-[11px] text-muted">
          Los tramos en gris no puntúan: su kicker pide más gente de la que hay.
          No es un fallo de la app, es cómo funcionan los CP.
        </p>
      )}
    </div>
  );
}
