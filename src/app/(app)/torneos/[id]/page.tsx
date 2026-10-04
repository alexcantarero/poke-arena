import Link from "next/link";
import { notFound } from "next/navigation";
import { canManageLeague } from "@/lib/auth";
import {
  archetypeOptions,
  currentPlayer,
  deckOptions,
  loadSnapshot,
} from "@/lib/data";
import { awardsCp, cpKindOf, effectiveCp, getSeason, tierFor } from "@/lib/cp";
import { fmtDateLong } from "@/lib/format";
import { recordOf, roundsOf } from "@/lib/stats";
import { primerTurno, textoLado } from "@/lib/primerTurno";
import { TOURNAMENT_FORMATS, archetypeValue, asStatus } from "@/lib/types";
import { Avatar, Empty, Kpi, PageHead, TournamentEmblem } from "@/components/ui";
import { getLang } from "@/lib/lang";
import { tr } from "@/lib/i18n";
import { AttendanceForm } from "@/components/AttendanceForm";
import { CaminoAlCorte } from "@/components/CaminoAlCorte";
import { TournamentLifecycle } from "@/components/TournamentLifecycle";
import { TournamentResultForm } from "@/components/TournamentResultForm";
import { RondasDelGrupo } from "@/components/RondasDelGrupo";
import { RoundForm } from "@/components/TournamentRounds";
import { etapaDeRonda, familiaDe, formaDe, maxRondasDe } from "@/lib/estructura";
import type { Pestana } from "@/components/CaminoAlCorte";
import { deleteTournament, deleteTournamentResult, deleteTournamentRound, undoDrop } from "@/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Icon } from "@/components/icons";

/* =========================================================================
   La ficha del torneo, que es donde se hace el trabajo.

   El orden de la página es el orden en que pasan las cosas, no el orden en
   que están los datos en la base:

     1. En qué punto está y qué falta        (TournamentLifecycle)
     2. Rondas del grupo                     ← tú primero y abierto, los demás plegables.
                                               Desde la v0.13 cada cabecera lleva también
                                               el resultado final (puesto, CP, comentario):
                                               la lista «Resultados del grupo» ya no existe.
     3. Tu resultado final                   ← se rellena una vez, al acabar

   Las rondas van casi lo primero porque el caso real es estar de pie en la
   tienda con dos minutos entre rondas. Y el formulario de edición de la
   cabecera ya no está aquí —se fue a /torneos/[id]/editar—: colgando debajo
   de la información parecía parte de ella.
   ========================================================================= */

export default async function TournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fase?: string; anadir?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const [snap, me, lang] = await Promise.all([loadSnapshot(), currentPlayer(), getLang()]);
  const t = snap.toursById.get(id);
  if (!t) notFound();

  const season = t.season ?? snap.config.cpSeason;
  const table = getSeason(season);
  /** El tipo a efectos de CP: un torneo online no da puntos (v0.15). */
  const cpKind = cpKindOf(t);
  const status = asStatus(t.status);
  const manager = me ? canManageLeague(me.role) : false;
  // Mover el estado y editar la cabecera: quien lo creó y los organizadores.
  const canManage = Boolean(me && (manager || t.createdBy === me.id));

  const myResult = me ? t.results.find((r) => r.playerId === me.id) : undefined;
  const ordered = [...t.results].sort(
    (a, b) => (a.placement ?? 9e9) - (b.placement ?? 9e9),
  );
  /* Los CP se calculan aquí y NO se leen de la columna `cp_earned`.
     Esa columna es una caché que se rellena al guardar; si la asistencia se
     corrige por cualquier otro camino, se queda vieja y la ficha enseñaba una
     cifra distinta de la del perfil —que sí recalcula—. Con `effectiveCp` las
     dos pantallas no pueden discrepar nunca. */
  const cpDe = (r: {
    placement: number | null;
    cpEarned: number;
    cpManual: boolean;
  }) => effectiveCp(season, cpKind, r, t.playerCount);
  const totalCp = t.results.reduce((a, r) => a + cpDe(r), 0);

  // Mis rondas. El récord sale de ellas, nunca se teclea.
  const myRounds = me ? roundsOf(snap.matches, t.id, me.id) : [];
  const myRecord = recordOf(myRounds);
  // v0.15: contado desde tu lado (ver `lib/primerTurno.ts` para el fallo de antes).
  const firstTurn = primerTurno(myRounds);

  // Para «con qué jugué yo», los míos y los de la liga. Para «qué llevaba el
  // rival», todo lo que haya, porque el mazo de otra persona es exactamente lo
  // que te cruzas en una ronda.
  const myDecks = me ? deckOptions(snap, me.id, { includeOthers: false }) : [];
  const rivalDecks = me ? deckOptions(snap, me.id) : [];
  const archOptions = archetypeOptions(snap);
  /* v0.15 — el rival puede ser alguien del grupo. Se ofrecen las cuentas
     activas menos la tuya; con eso la ronda queda enlazada a su perfil y entra
     en el mapa de enfrentamientos directos. */
  const rivalPlayers = snap.players
    .filter((p) => p.active && p.id !== me?.id)
    .map((p) => ({ id: p.id, name: p.name }));
  /* El mazo fijado se resuelve aquí, contra la tabla entera: un mazo retirado
     no sale en los selectores pero sigue siendo el que se jugó. Y puede no
     haber mazo en absoluto: "bloquear el mismo mazo para todo el torneo"
     también funciona fijando solo el arquetipo, sin lista de 60 cartas. Las
     dos cosas viajan en el mismo valor —con el prefijo "arch:" cuando es solo
     arquetipo— porque así el mismo campo de formulario (`deckAId`) sirve para
     las dos, sin duplicar el picker ni la Server Action. */
  const lockValueOf = (r?: {
    deckId: string | null;
    archetypeId: string | null;
  }) => r?.deckId ?? (r?.archetypeId ? archetypeValue(r.archetypeId) : null);
  const lockLabelOf = (r?: {
    deckId: string | null;
    archetypeId: string | null;
  }) => {
    if (r?.deckId) return snap.decksById.get(r.deckId)?.name ?? null;
    if (r?.archetypeId) return snap.archById.get(r.archetypeId)?.name ?? null;
    return null;
  };

  /* La forma del torneo, para etiquetar rondas y poner el tope. Lo tecleado
     (rondas, corte) manda; la tabla del reglamento rellena lo que falte. */
  const forma = {
    kind: t.kind,
    playerCount: t.playerCount,
    rounds: t.rounds,
    topCut: t.topCut,
  };
  const familia = familiaDe(t.kind);
  const maxRonda = maxRondasDe(forma);
  const { fase1: rondasFase1, suizo: rondasSuizo } = formaDe(forma);

  /* v0.14 — la pestaña de fase (Día 1 / Día 2 / General, o Suizo / General)
     va por URL y filtra TAMBIÉN las rondas de cada jugador de abajo. Antes
     solo cambiaba la tarjeta de resumen y la lista enseñaba siempre todas.

     Sin `?fase=`, se abre en la fase en la que vas: en el Día 2 si ya has
     apuntado rondas de Día 2, en General si el torneo está cerrado. */
  const misRondasMax = myRounds.length ? Math.max(...myRounds.map((r) => r.round)) : 0;
  const hayDia2 = familia === "dosFases" && rondasFase1 != null && rondasSuizo != null && rondasSuizo > rondasFase1;
  const faseUrl: Pestana | null =
    q.fase === "dia1" || q.fase === "general" || (q.fase === "dia2" && hayDia2) ? q.fase : null;
  const fase: Pestana = faseUrl
    ?? (t.status === "closed" ? "general"
      : hayDia2 && rondasFase1 != null && misRondasMax > rondasFase1 ? "dia2"
      : !hayDia2 && rondasSuizo != null && misRondasMax > rondasSuizo ? "general"
      : "dia1");
  const enFase = (round: number) =>
    fase === "general" || rondasFase1 == null
      ? true
      : fase === "dia1" ? round <= rondasFase1 : round > rondasFase1;

  // Jugadores del grupo con presencia en el torneo (por resultado o por rondas apuntadas, más tú si estás logueado)
  const participantIds = new Set<string>();
  if (me) participantIds.add(me.id);
  for (const r of t.results) participantIds.add(r.playerId);
  for (const m of snap.matches) {
    if (m.tournamentId === t.id && m.playerBId === null) {
      participantIds.add(m.playerAId);
    }
  }

  /* v0.17 — «Añadir participante». Un organizador elige a alguien del grupo
     que todavía no sale aquí (`?anadir=<id>`) y su bloque aparece abierto con
     el panel «Gestionar a X»: ronda 1 y resultado final. No se guarda nada al
     elegir: la persona queda en el torneo en cuanto se le apunta la primera
     ronda o el resultado, con las mismas Server Actions de siempre (que ya
     comprueban que quien escribe es organizador). */
  const candidatos = manager && status !== "draft"
    ? snap.players
      .filter((p) => p.active && !participantIds.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
    : [];
  const anadido = manager && status !== "draft" && q.anadir && candidatos.some((p) => p.id === q.anadir)
    ? q.anadir
    : null;
  if (anadido) participantIds.add(anadido);

  /* v0.16 — Panel de organizador en el bloque de cada jugador: apuntarle la
     siguiente ronda y editar su resultado final, como si fuera él. Las Server
     Actions ya aceptaban `playerId` de otro para un organizador; faltaba la
     pantalla. */
  const gestionDe = (
    pid: string,
    res: (typeof t.results)[number] | undefined,
    rondasHechas: number[],
  ) => {
    const nombre = snap.playersById.get(pid)?.name ?? "esta persona";
    const hechas = new Set(rondasHechas);
    let siguiente = 1;
    while (hechas.has(siguiente)) siguiente++;
    const tope = maxRonda != null && siguiente > maxRonda;
    const susDecks = deckOptions(snap, pid, { includeOthers: false });
    return (
      <details className="rounded-lg border border-info/40 bg-info-soft/40">
        <summary className="tap cursor-pointer justify-between px-3 text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Icon name="edit" className="size-4 text-info" /> Gestionar a {nombre}
          </span>
          <span className="text-[11px] font-normal text-muted">organizador</span>
        </summary>
        <div className="flex flex-col gap-4 border-t border-line-soft p-3">
          {res?.dropped ? (
            <p className="text-xs text-muted">
              <span className="chip chip-drop mr-1">DROP</span>
              Está retirado: no se apuntan rondas nuevas.
            </p>
          ) : tope ? (
            <p className="text-xs text-muted">Tiene todas las rondas apuntadas.</p>
          ) : (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Apuntarle la ronda {siguiente}
              </h4>
              <RoundForm
                tournamentId={t.id}
                playerId={pid}
                round={siguiente}
                bestOf={t.bestOf}
                rivalDecks={deckOptions(snap, pid)}
                archetypeOptions={archOptions}
                myDecks={susDecks}
                lockedDeckId={lockValueOf(res)}
                maxRound={maxRonda}
                rivalPlayers={snap.players
                  .filter((x) => x.active && x.id !== pid)
                  .map((x) => ({ id: x.id, name: x.name }))}
              />
            </div>
          )}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Su resultado final
            </h4>
            <TournamentResultForm
              season={season}
              tournament={t}
              result={res}
              deckOptions={susDecks}
              archetypeOptions={archOptions}
              roundRecord={rondasHechas.length ? recordOf(roundsOf(snap.matches, t.id, pid)) : null}
              playerId={pid}
            />
          </div>
        </div>
      </details>
    );
  };

  const participantes = Array.from(participantIds).map((pid) => {
    const p = snap.playersById.get(pid);
    const theirResult = t.results.find((r) => r.playerId === pid);
    const pRounds = roundsOf(snap.matches, t.id, pid);
    const pRecord = recordOf(pRounds);

    const arch = theirResult?.deckId
      ? snap.archIndex.get(theirResult.deckId)
      : theirResult?.archetypeId
        ? snap.archById.get(theirResult.archetypeId)
        : undefined;

    const roundArch =
      !arch && pRounds[0]?.match
        ? pRounds[0].match.archetypeAId
          ? snap.archById.get(pRounds[0].match.archetypeAId)
          : pRounds[0].match.deckAId
            ? snap.archIndex.get(pRounds[0].match.deckAId)
            : undefined
        : undefined;
    const finalArch = arch ?? roundArch;

    const mazoNombre = theirResult?.deckId
      ? (snap.decksById.get(theirResult.deckId)?.name ?? finalArch?.name)
      : finalArch?.name;

    const pRoundsEnFase = pRounds.filter((r) => enFase(r.round));
    const pRecordFase = recordOf(pRoundsEnFase);

    const wins = fase === "general"
      ? (pRounds.length ? pRecord.wins : (theirResult?.wins ?? 0))
      : pRecordFase.wins;
    const losses = fase === "general"
      ? (pRounds.length ? pRecord.losses : (theirResult?.losses ?? 0))
      : pRecordFase.losses;
    const ties = fase === "general"
      ? (pRounds.length ? pRecord.ties : (theirResult?.ties ?? 0))
      : pRecordFase.ties;

    // v0.16: el organizador corrige rondas de cualquiera, también con el torneo cerrado.
    const canEditPlayerRounds = Boolean(
      me && (manager || (pid === me.id && status !== "closed")),
    );
    const canEditResult = Boolean(me && theirResult && (pid === me.id || manager));
    const tier =
      theirResult?.placement != null
        ? tierFor(season, cpKind, theirResult.placement, t.playerCount)
        : null;

    return {
      id: pid,
      name: p?.name ?? "Alguien",
      perfilHref: p ? `/perfil/${pid}` : undefined,
      pendiente: pid === anadido,
      mazo: mazoNombre,
      main: finalArch?.main || undefined,
      secondary: finalArch?.secondary || undefined,
      avatar: p ? <Avatar player={p} size="sm" /> : undefined,
      cp: theirResult ? cpDe(theirResult) : 0,
      cpManual: theirResult?.cpManual ?? false,
      comentario: theirResult?.notes || undefined,
      premios: theirResult?.prizes || undefined,
      retirado: theirResult?.dropped ?? false,
      invitacion: Boolean(tier?.invite),
      acciones: canEditResult && theirResult ? (
        <form action={deleteTournamentResult}>
          <input type="hidden" name="id" value={theirResult.id} />
          {/* v0.16 — borra resultado Y rondas: ver `deleteTournamentResult`. */}
          <ConfirmButton
            message={`¿Borrar la participación de ${pid === me?.id ? "ti" : (p?.name ?? "esta persona")} en este torneo? Se borran el resultado y las ${pRounds.length} ronda(s) apuntadas.`}
          >
            {pid === me?.id ? "Borrar mi participación" : "Borrar su participación"} (resultado y rondas)
          </ConfirmButton>
        </form>
      ) : undefined,
      gestion: manager && pid !== me?.id && status !== "draft"
        ? gestionDe(pid, theirResult, pRounds.map((x) => x.round))
        : undefined,
      wins,
      losses,
      ties,
      puntos: wins * 3 + ties,
      // v0.16: el puesto final se enseña siempre que esté puesto (a la derecha).
      placement: theirResult?.placement ?? null,
      apuntadas: pRounds.length,
      rondas: pRoundsEnFase.map((r) => {
        const oppArch = r.match.opponentArchetypeId
          ? snap.archById.get(r.match.opponentArchetypeId)
          : r.match.deckBId
            ? snap.archIndex.get(r.match.deckBId)
            : undefined;

        let ganados = r.ga;
        let perdidos = r.gb;
        if (ganados === 0 && perdidos === 0) {
          if (r.result === "w") {
            ganados = 1;
            perdidos = 0;
          } else if (r.result === "l") {
            ganados = 0;
            perdidos = 1;
          } else if (r.result === "d") {
            ganados = 0;
            perdidos = 0;
          }
        }

        const primero =
          r.firstGameOne === true ? "a" : r.firstGameOne === false ? "b" : "";
        const etapa = etapaDeRonda(r.round, forma);
        const etiquetaEtapa =
          fase === "dia2" && etapa.etiqueta === "Día 2" ? null : etapa.etiqueta;

        return {
          round: r.round,
          rival: (r.match.opponentPlayerId && snap.playersById.get(r.match.opponentPlayerId)?.name)
            || r.match.opponentName || "Rival sin nombre",
          rivalHref: r.match.opponentPlayerId && snap.playersById.get(r.match.opponentPlayerId)
            ? `/perfil/${r.match.opponentPlayerId}`
            : undefined,
          rivalAvatar: r.match.opponentPlayerId && snap.playersById.get(r.match.opponentPlayerId)
            ? <Avatar player={snap.playersById.get(r.match.opponentPlayerId)} size="xs" />
            : undefined,
          mazoRival: oppArch?.name ?? undefined,
          main: oppArch?.main,
          secondary: oppArch?.secondary,
          ganados,
          perdidos,
          primero: primero as "a" | "b" | "",
          nota: r.match.note || undefined,
          etapa: etiquetaEtapa,
          corte: etapa.tipo === "corte",
          editar: canEditPlayerRounds ? (
            <span className="flex items-center gap-0.5">
              <Link
                href={`/partidas/${r.match.id}`}
                className="btn btn-ghost btn-sm text-xs"
                title="Editar ronda"
              >
                Editar
              </Link>
              {/* v0.16 — borrar la ronda desde aquí mismo. */}
              <form action={deleteTournamentRound}>
                <input type="hidden" name="id" value={r.match.id} />
                <ConfirmButton
                  message={`¿Eliminar la ronda ${r.round}? No se puede deshacer.`}
                  className="btn btn-ghost btn-sm text-xs text-loss"
                  title="Eliminar ronda"
                >
                  Eliminar
                </ConfirmButton>
              </form>
            </span>
          ) : undefined,
        };
      }),
    };
  });

  /* v0.15.1 — la siguiente ronda es el primer HUECO, no «la última + 1».
     Con R1, R2 y R4 apuntadas se pedía la 5 y la ficha decía a la vez «te
     falta 1» y «tienes las 4»: la que falta es la 3. */
  const apuntadas = new Set(myRounds.map((r) => r.round));
  let nextRound = 1;
  while (apuntadas.has(nextRound)) nextRound++;
  const finished = t.rounds != null && t.rounds > 0 && nextRound > t.rounds;
  /* Con el tope alcanzado no hay formulario: en un Challenge de 5 rondas no
     existe la 6. La Server Action lo vuelve a comprobar, porque esconder el
     formulario no protege nada. */
  const topeAlcanzado = maxRonda != null && nextRound > maxRonda;

  const avisoFin = !finished ? null : familia === "challenge" ? (
    <p className="text-xs text-muted">
      Tienes las {t.rounds} rondas apuntadas. Un League Challenge es solo suizo,
      sin top cut (reglamento §5.5.6.1, Variante #2): ya no hay más rondas que
      apuntar. Falta tu puesto final, justo debajo.
    </p>
  ) : topeAlcanzado ? (
    <p className="text-xs text-muted">
      Tienes todas las rondas apuntadas, suizo y top cut incluidos.
    </p>
  ) : (
    <p className="text-xs text-muted">
      Tienes las {t.rounds} rondas de suizo apuntadas. Si pasaste al top cut,
      sigue con la ronda {nextRound}
      {maxRonda ? ` (la última posible es la ${maxRonda})` : ""}.
    </p>
  );

  /* v0.15 — el drop. Con «No he acabado el torneo» guardado no hay más
     rondas que apuntar: en vez del formulario sale el aviso, y la Server
     Action rechaza una ronda nueva aunque llegue por un POST a mano. */
  const yoDrop = Boolean(myResult?.dropped);
  const avisoDrop = me ? (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-loss/40 bg-loss-soft px-3 py-2 text-xs text-ink-2">
      <span className="chip chip-drop flex-none">DROP</span>
      <span className="min-w-0 flex-1">
        Te retiraste del torneo: ya no se apuntan más rondas. Las que tienes se pueden corregir.
      </span>
      <form action={undoDrop}>
        <input type="hidden" name="tournamentId" value={t.id} />
        <input type="hidden" name="playerId" value={me.id} />
        <button type="submit" className="btn btn-ghost btn-sm">Deshacer</button>
      </form>
    </div>
  ) : null;

  const roundFormNode =
    me && status !== "closed" && status !== "draft" ? (
      yoDrop ? avisoDrop : (
      <div className="flex flex-col gap-2">
        {avisoFin}
        {!topeAlcanzado && <RoundForm
          tournamentId={t.id}
          playerId={me.id}
          round={nextRound}
          bestOf={t.bestOf}
          rivalDecks={rivalDecks}
          archetypeOptions={archOptions}
          myDecks={myDecks}
          lockedDeckId={lockValueOf(myResult)}
          maxRound={maxRonda}
          rivalPlayers={rivalPlayers}
        />}
      </div>
      )
    ) : undefined;

  const myTier =
    myResult?.placement != null
      ? tierFor(season, cpKind, myResult.placement, t.playerCount)
      : null;

  /* Lo que falta por hacer. Se deduce de los datos y no del estado: un torneo
     cerrado al que le falte la asistencia sigue teniendo los CP mal. */
  const steps = [
    {
      label: "Falta la asistencia",
      done: t.playerCount != null && t.playerCount > 0,
      hint: awardsCp(season, cpKind)
        ? "Sin ella no se pueden calcular los Championship Points."
        : "Cuánta gente hubo.",
      href: `/torneos/${t.id}/editar`,
    },
    {
      label: "No has apuntado ninguna ronda",
      done: myRounds.length > 0 || !me,
      hint: "Rival, mazo y resultado de cada ronda. Alimenta la matriz de emparejamientos.",
    },
    {
      label: "Falta tu mazo",
      done: Boolean(myResult?.deckId || myResult?.archetypeId) || !me,
      hint: "Con qué jugaste el torneo.",
    },
    {
      label: "Falta tu puesto final",
      done: myResult?.placement != null || !me,
      hint: "Es lo que decide los CP.",
    },
  ];

  return (
    <>
      <PageHead
        title={t.name}
        icon={<TournamentEmblem kind={t.kind} scope={t.scope} size="lg" />}
        back={{ href: "/torneos", label: "Torneos" }}
        sub={
          <>
            {table.events[t.kind]?.label ?? t.kind} · {fmtDateLong(t.date)}
            {t.startTime ? ` · ${t.startTime}` : ""} · Bo{t.bestOf} ·{" "}
            {TOURNAMENT_FORMATS[t.format as keyof typeof TOURNAMENT_FORMATS] ??
              t.format}
            {t.venue ? ` · ${t.venue}` : ""}
            {t.city ? `, ${t.city}` : ""}
            {t.entryFeeCents != null
              ? ` · ${(t.entryFeeCents / 100).toFixed(2).replace(".", ",")} €`
              : ""}
          </>
        }
        actions={
          /* En el móvil el «‹ Torneos» va encima del título (`back`); este
             botón ocupaba una fila entera debajo de la cabecera. */
          <Link className="btn btn-ghost btn-sm hidden md:inline-flex" href="/torneos">
            <Icon name="back" className="size-4" /> Torneos
          </Link>
        }
      />

      <TournamentLifecycle
        id={t.id}
        status={status}
        closedAt={t.closedAt}
        canManage={canManage}
        steps={steps}
        roundsDone={myRounds.length}
        totalRounds={t.rounds ?? null}
      />

      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi
          label="Asistencia"
          value={t.playerCount ?? "—"}
          note={t.rounds ? `${t.rounds} rondas` : "sin dato"}
        />
        <Kpi label="Del grupo" value={t.results.length} note="participaron" />
        <Kpi
          label="CP repartidos"
          value={totalCp}
          note={
            awardsCp(season, cpKind)
              ? `temporada ${season}`
              : "este tipo no da CP"
          }
          highlight={totalCp > 0}
        />
        <Kpi
          label="Mejor puesto"
          value={ordered[0]?.placement ?? "—"}
          note={
            ordered[0] ? (
              <Link href={`/perfil/${ordered[0].playerId}`} className="hover:text-info hover:underline">
                {snap.playersById.get(ordered[0].playerId)?.name ?? ""}
              </Link>
            ) : "sin resultados"
          }
        />
      </div>

      {myTier?.invite && (
        <p className="card mb-5 flex items-start gap-2.5 border-brand-line bg-brand-soft p-4 text-sm font-semibold text-brand">
          <Icon name="trophy" className="mt-0.5 size-5 flex-none" />
          Ese puesto da invitación directa al Campeonato Mundial, al margen de
          los puntos.
        </p>
      )}

      {/* La asistencia va lo primero cuando falta: es lo que desbloquea los
          CP de todo el mundo, y mientras no esté, el resto de la ficha miente
          por omisión. Cuando está puesta y nadie pierde puntos, no se pinta. */}
      <AttendanceForm
        tournamentId={t.id}
        season={season}
        kind={cpKind}
        playerCount={t.playerCount ?? null}
        rounds={t.rounds ?? null}
        topCut={t.topCut ?? null}
        results={t.results}
        nameOf={(id) => snap.playersById.get(id)?.name ?? "Alguien"}
        canEdit={canManage}
      />

      {/* Entre ronda y ronda, lo que se quiere saber es qué hace falta para
          entrar. Va antes que las rondas y no después: mientras el torneo está
          abierto es lo primero que se mira, y cuando ya está cerrado deja de
          enseñarse solo. */}
      {me && status !== "draft" && (
        <CaminoAlCorte
          kind={t.kind}
          playerCount={t.playerCount}
          rondasTotales={t.rounds} // lo configurado a mano manda sobre la tabla
          topCut={t.topCut}
          storageKey={`torneo-${t.id}`} // para que recuerde el plegado por torneo
          pestana={fase}
          hrefFase={`/torneos/${t.id}?fase=`}
          rondas={myRounds.flatMap((m) =>
            m.result
              ? [{ round: m.round, result: m.result === "d" ? "t" : m.result }]
              : [],
          )}
        />
      )}

      {t.url && (
        <a
          className="btn mb-5 w-full sm:w-auto"
          href={t.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="share" className="size-4" /> Ver el torneo en su web
        </a>
      )}

      {/* --------------------- 2. rondas del grupo --------------------------- */}
      {status === "draft" ? (
        me && (
          <div className="card mb-6">
            <Empty title="El torneo todavía no ha empezado">
              Cuando llegue el día, dale a «Empezar el torneo» ahí arriba y
              podrás ir apuntando las rondas.
            </Empty>
          </div>
        )
      ) : (
        <div className="mb-6">
          <RondasDelGrupo
            yoId={me?.id ?? ""}
            total={t.rounds ?? 0}
            asistencia={t.playerCount}
            filtro={
              fase === "general" ? null
                : fase === "dia1" ? (hayDia2 ? "Solo rondas del Día 1" : "Solo rondas del suizo")
                : "Solo rondas del Día 2 y el top cut"
            }
            jugadores={participantes}
            formulario={roundFormNode}
            abrir={anadido}
            textos={{ verPerfil: tr(lang, "tour.viewProfile"), pendiente: tr(lang, "tour.addPlayerPending") }}
          />

          {/* Aquí ya no puede ser borrador (estamos en la otra rama). */}
          {manager && (
            <details className="card mt-3" open={Boolean(q.anadir) && !anadido}>
              <summary className="tap cursor-pointer justify-between px-4 text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <Icon name="plus" className="size-4 text-info" /> {tr(lang, "tour.addPlayer")}
                </span>
                <span className="text-[11px] font-normal text-muted">{tr(lang, "role.owner").toLowerCase()}</span>
              </summary>
              <div className="border-t border-line-soft p-4">
                {candidatos.length ? (
                  /* GET y no Server Action: elegir no escribe nada, solo
                     abre el bloque. Funciona sin JavaScript y el enlace se
                     puede compartir con otro organizador. */
                  <form method="get" action={`/torneos/${t.id}`} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    {fase !== "dia1" && <input type="hidden" name="fase" value={fase} />}
                    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="label">{tr(lang, "tour.addPlayerPick")}</span>
                      <select className="input" name="anadir" required defaultValue={anadido ?? ""}>
                        <option value="" disabled>—</option>
                        {candidatos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </label>
                    <button className="btn btn-brand" type="submit">{tr(lang, "tour.addPlayerGo")}</button>
                  </form>
                ) : (
                  <p className="text-sm text-muted">{tr(lang, "tour.addPlayerNone")}</p>
                )}
                <p className="mt-2 text-xs text-muted">{tr(lang, "tour.addPlayerHint")}</p>
              </div>
            </details>
          )}

          {firstTurn.total >= 2 && (
            <p className="mt-2 px-1 text-xs text-muted">
              Tus rondas con el turno apuntado: saliendo <b className="text-ink-2">1.º</b>{" "}
              ganaste {textoLado(firstTurn.primero)} · saliendo{" "}
              <b className="text-ink-2">2.º</b> ganaste {textoLado(firstTurn.segundo)}.
            </p>
          )}
        </div>
      )}

      {/* ------------------------- 3. tu resultado --------------------------- */}
      {me && status !== "draft" && (
        <details className="card mb-6" open={!myResult?.placement}>
          <summary className="tap cursor-pointer justify-between px-4 font-display text-lg font-bold">
            {myResult?.placement
              ? "Editar tu resultado final"
              : "Poner tu resultado final"}
            <span className="text-xs font-normal text-muted">
              puesto, mazo, CP y premios
            </span>
          </summary>
          <div className="border-t border-line-soft p-4">
            <TournamentResultForm
              season={season}
              tournament={t}
              result={myResult}
              deckOptions={myDecks}
              archetypeOptions={archOptions}
              roundRecord={myRounds.length ? myRecord : null}
            />
          </div>
        </details>
      )}

      {t.notes && (
        <div className="card mb-6 p-4">
          <h3 className="mb-1 font-bold">Notas del torneo</h3>
          <p className="text-sm text-ink-2">{t.notes}</p>
        </div>
      )}

      {manager && (
        <details className="card border-loss/40">
          <summary className="tap cursor-pointer justify-start px-4 text-sm font-semibold text-loss">
            Borrar este torneo
          </summary>
          <form
            action={deleteTournament}
            className="flex flex-col gap-3 border-t border-line-soft p-4"
          >
            <input type="hidden" name="id" value={t.id} />
            <p className="text-sm text-ink-2">
              Se van el torneo, los {t.results.length} resultado(s) del grupo y
              todas las rondas apuntadas. No hay deshacer. Escribe el nombre del
              torneo para confirmar:
            </p>
            <input
              className="input"
              name="confirm"
              required
              autoComplete="off"
              placeholder={t.name}
              aria-label={`Escribe «${t.name}» para confirmar`}
            />
            <button className="btn btn-danger" type="submit">
              Borrar «{t.name}»
            </button>
          </form>
        </details>
      )}
    </>
  );
}
