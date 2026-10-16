"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DESEMPATES, TOP_CUT_MAXIMO_TCG, estructuraDe, familiaDe, puntosDe, techoDe, umbralesDe,
  veredictoDe, victoriasNecesarias, recordLimpio, type Umbral, type Veredicto, formaDe, reglaDePaso, veredictoPaso } from "@/lib/estructura";
import { Icon } from "./icons";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   «¿Qué necesito?» — la pantalla que se mira de pie, entre ronda y ronda.

   QUÉ CAMBIA RESPECTO A LA VERSIÓN ANTERIOR
   -----------------------------------------
   · **Dos números, no seis.** Antes salía la entrada segura, la burbuja y la
     lista entera de finales posibles. Ocupaba media pantalla y no cambiaba
     ninguna decisión: si vas justo, tienes que ganar, y saber que existe un
     récord que entra más cómodo no te hace jugar distinto. Ahora hay
     exactamente dos umbrales: **el mínimo para pasar de fase** y **el mínimo
     para pelear el corte**.
   · **Cada fase en su pestaña.** El Día 1 solo habla del Día 1 y el Día 2
     solo del corte. En la ronda 4 no le importa a nadie el 12-2.
   · **Se pliega.** Con el panel cerrado, la cabecera sigue diciendo lo único
     urgente: cómo vas y si llegas.

   POR QUÉ «DEPENDE» Y NO «DENTRO»
   -------------------------------
   Estar exactamente en el mínimo del corte no es entrar. El reglamento
   (§5.5.6.2) limita el corte asimétrico de TCG a **16 plazas**, y quién de
   los empatados entra lo decide el desempate: primero el porcentaje de
   victorias de tus rivales, después el de los rivales de tus rivales
   (§5.5.2.1). Eso no se puede saber desde aquí, y decirlo es más útil que
   fingir un sí.

   El umbral de fase, en cambio, **sí es absoluto**: son puntos publicados y o
   los llegas o no. Por eso en la pestaña del Día 1 no hay ningún «depende».
   ========================================================================= */

export type RondaJugada = {
  /** Número de ronda, empezando en 1. */
  round: number;
  /** Resultado: victoria, derrota o empate. */
  result: "w" | "l" | "t";
};

type Props = {
  /** Tipo de torneo. Decide cuál de las tres tablas del reglamento se usa. */
  kind: string;
  playerCount: number | null | undefined;
  rondas: RondaJugada[];
  /**
   * Rondas y corte configurados a mano en el torneo.
   *
   * Mandan sobre la tabla del reglamento: si el organizador anunció otra
   * cosa, la pantalla tiene que decir lo que anunció el organizador, no lo
   * que dice el libro. Nulos = usar la tabla.
   */
  rondasTotales?: number | null;
  topCut?: number | null;
  /** v0.45 — cuántas de las rondas son de una segunda fase propia (online). */
  rondasFase2?: number | null;
  /** v0.47 — umbrales de paso de una estructura propia: puntos O top N. */
  paso2Puntos?: number | null;
  paso2Top?: number | null;
  cortePuntos?: number | null;
  /** Clave para recordar si lo dejaste plegado. */
  storageKey?: string;
  /**
   * v0.14 — la pestaña va por URL (`?fase=`) y la decide la página, porque
   * la misma elección filtra también las rondas de «Resultados del grupo».
   * Antes era estado interno y la lista de abajo enseñaba siempre todo.
   */
  pestana?: Pestana;
  /** Prefijo del enlace de cada pestaña: se le añade `dia1`, `dia2` o `general`.
   *  Es texto y no una función porque viene de un Server Component. */
  hrefFase?: string;
};

export type Pestana = "dia1" | "dia2" | "general";

export function CaminoAlCorte({
  kind, playerCount, rondas, rondasTotales, topCut, rondasFase2,
  paso2Puntos, paso2Top, cortePuntos, storageKey = "camino",
  pestana: pestanaUrl, hrefFase,
}: Props) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const [abierto, setAbierto] = useState(true);
  const [pestanaLocal, setPestana] = useState<Pestana>(pestanaUrl ?? "dia1");
  const pestana = pestanaUrl ?? pestanaLocal;

  /* El plegado se recuerda por navegador. Va en un efecto y no en el estado
     inicial porque el servidor no tiene localStorage: pintar distinto en el
     servidor y en el cliente es un error de hidratación. */
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(`arena:${storageKey}:abierto`);
      if (v === "0") setAbierto(false);
    } catch { /* navegación privada, o almacenamiento bloqueado. Da igual. */ }
  }, [storageKey]);

  const alternar = (v: boolean) => {
    setAbierto(v);
    try { window.localStorage.setItem(`arena:${storageKey}:abierto`, v ? "1" : "0"); }
    catch { /* lo mismo: es una comodidad, no un dato. */ }
  };

  const e = estructuraDe(playerCount, kind);
  const u = umbralesDe(playerCount, kind);

  const familia = familiaDe(kind);

  /* v0.45 — fases y corte salen de `formaDe`, la MISMA función que usa la
     ficha del torneo para filtrar y etiquetar las rondas. Antes este
     componente hacía su propia cuenta desde la tabla oficial, y un torneo con
     una estructura propia (8 + 3 rondas y top 8) no se podía describir. Lo
     tecleado manda sobre la tabla; un Challenge sigue sin corte salvo que
     tenga estructura propia (§5.5.6.1, Variante #2). */
  const forma = formaDe({
    kind, playerCount, rounds: rondasTotales, roundsPhase2: rondasFase2, topCut,
    phase2Points: paso2Puntos, phase2Top: paso2Top, cutPoints: cortePuntos,
  });
  const total = forma.suizo ?? 0;
  const fase1 = forma.fase1 ?? total;
  const corteReal = forma.corte;
  const fase2 = Math.max(0, total - fase1);
  /* «Día» es el nombre oficial de las fases; un online las llama «Fase». */
  // v0.49 — solo para ENSEÑAR. Para decidir, `forma.faseManual`: el texto cambia con el idioma.
  const F1 = forma.faseManual ? tr(lng, "camino.f1") : tr(lng, "camino.d1");
  const F2 = forma.faseManual ? tr(lng, "camino.f2") : tr(lng, "camino.d2");
  /* Sin asistencia no hay fila de la tabla, pero si se sabe el corte y las
     rondas el mínimo para pelearlo (X-2) sale igual. */
  /* v0.47 — un umbral tecleado manda sobre el oficial y sobre la estimación
     X-2. Con él, quien llega a los puntos pasa seguro (ver `veredictoPaso`). */
  const corteUmbral: Umbral | null = (forma.pasoCorte
    ? { puntos: forma.pasoCorte.puntos, record: recordLimpio(forma.pasoCorte.puntos, total) }
    : null)
    ?? u?.corte
    ?? (corteReal > 0 && total > 2
      ? { puntos: (total - 2) * 3, record: recordLimpio((total - 2) * 3, total) }
      : null);

  if (!total) {
    return (
      <section className="card mb-5 p-4">
        <h2 className="text-lg font-bold">{familiaDe(kind) === "challenge" ? "Tu Challenge" : tr(lng, "x.167080e8")}</h2>
        <p className="mt-1 text-sm text-muted">
          {tr(lng, "x.5f708bc2")} <b>{tr(lng, "x.fc20f49b")}</b> o <b>{tr(lng, "x.f545c172")}</b>{tr(lng, "x.e4e4bf4f")}
        </p>
      </section>
    );
  }

  /* --- el Challenge: suizo y se acabó ---
     No hay corte que perseguir, así que no se enseña ningún «mínimo» ni el
     «ni ganándolas todas llegas» que salía en rojo: en un Challenge siempre
     se llega a donde se llega, y lo que cuenta es el puesto final. */
  if (!forma.dosFases && (familia === "challenge" || !corteReal)) {
    const w = rondas.filter((r) => r.result === "w").length;
    const t = rondas.filter((r) => r.result === "t").length;
    const l = rondas.length - w - t;
    const quedan = Math.max(0, total - rondas.length);
    return (
      <section className="card mb-5 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">
            {familia === "challenge" ? "Tu Challenge" : tr(lng, "x.3899bbda")}
          </h2>
          <span className="text-xs text-muted tabular">
            {rondas.length} de {total} rondas
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-display text-3xl font-extrabold tabular leading-none">
            <span className="text-win">{w}</span>–<span className="text-loss">{l}</span>–<span className="text-tie">{t}</span>
          </span>
          <span className="text-sm text-muted tabular">{puntosDe(w, t)} puntos</span>
        </div>
        <p className="mt-3 text-sm text-ink-2">
          {quedan === 0
            ? tr(lng, "x.16f80c03")
            : `Quedan ${quedan} ${quedan === 1 ? "ronda" : "rondas"}.`}{" "}
          {familia === "challenge"
            ? tr(lng, "x.aadfeda6")
            : tr(lng, "x.57b44931")}
        </p>
      </section>
    );
  }

  /* --- lo jugado, partido por fases --- */
  const dia1 = rondas.filter((r) => r.round <= fase1);
  const dia2 = rondas.filter((r) => r.round > fase1);
  const acc = (list: RondaJugada[]) => {
    const wins = list.filter((r) => r.result === "w").length;
    const ties = list.filter((r) => r.result === "t").length;
    return { wins, losses: list.length - wins - ties, ties, jugadas: list.length };
  };
  const r1 = acc(dia1);
  const rT = acc(rondas);
  const pts1 = puntosDe(r1.wins, r1.ties);
  const ptsT = puntosDe(rT.wins, rT.ties);

  const hayDia2 = forma.dosFases;
  /* El umbral de la fase 2: el tecleado si lo hay, si no el del reglamento. */
  const umbralF2: Umbral | null = forma.paso2
    ? { puntos: forma.paso2.puntos, record: recordLimpio(forma.paso2.puntos, fase1) }
    : u?.diaDos ?? null;
  /* v0.47 — con la regla «puntos O top N», no llegar a los puntos NO es estar
     fuera: si menos de N llegan, pasan los N primeros. Ver `veredictoPaso`.
     El umbral oficial del Día 2, en cambio, sí es absoluto. */
  const vDia1 = forma.paso2
    ? veredictoPaso(pts1, forma.paso2)
    : u?.diaDos ? (pts1 >= u.diaDos.puntos ? "dentro" : "fuera") as Veredicto : null;
  const vCorte = forma.pasoCorte ? veredictoPaso(ptsT, forma.pasoCorte) : veredictoDe(ptsT, corteUmbral);

  const titular = hayDia2 && rT.jugadas <= fase1
    ? resumenFase(pts1, r1.jugadas, fase1, umbralF2, forma.faseManual ? tr(lng, "camino.laF2") : tr(lng, "camino.elD2"))
    : resumenFase(ptsT, rT.jugadas, total, corteUmbral, `el top ${corteReal}`);

  return (
    <section className="card mb-5">
      <button
        type="button"
        onClick={() => alternar(!abierto)}
        aria-expanded={abierto}
        className="card-head w-full text-left"
      >
        <span className="min-w-0">
          <span className="block text-lg font-bold">{tr(lng, "x.167080e8")}</span>
          <span className="block text-xs text-muted tabular">{titular}</span>
        </span>
        <Icon name={abierto ? "back" : "more"}
          className={`size-4 flex-none text-muted transition-transform ${abierto ? "-rotate-90" : ""}`} />
      </button>

      {abierto && (
        <div className="p-4 pt-0">
          <Pestanas actual={pestana} onPick={setPestana} href={hrefFase} hayDia2={hayDia2}
            fase1={fase1} fase2={fase2} corte={corteReal} f1={F1} f2={F2} />
          {/* v0.47 — la regla de paso, dicha tal cual: así se entiende por qué
              no llegar a los puntos sale como «depende» y no como «fuera». */}
          {(forma.paso2 || forma.pasoCorte) && (
            <div className="mb-3 space-y-0.5 text-xs text-muted">
              {forma.paso2 && <p>{reglaDePaso(forma.paso2, tr(lng, "x.0f4340d9"))}</p>}
              {forma.pasoCorte && <p>{reglaDePaso(forma.pasoCorte, `el top ${corteReal}`)}</p>}
            </div>
          )}

          {(pestana === "dia1" || !hayDia2) && (
            <Fase
              titulo={hayDia2 ? tr(lng, forma.faseManual ? "camino.res1f" : "camino.res1d") : tr(lng, "camino.resSuizo")}
              rondas={r1.jugadas} de={fase1}
              record={r1} puntos={pts1}
              umbral={hayDia2 ? umbralF2 : corteUmbral}
              veredicto={hayDia2 ? vDia1 : vCorte}
              etiquetaUmbral={hayDia2 ? tr(lng, forma.faseManual ? "camino.min2f" : "camino.min2d") : trf(lng, "camino.minTop", { n: corteReal })}
              absoluto={hayDia2 && !forma.paso2}
              total={hayDia2 ? fase1 : total}
            />
          )}

          {pestana === "dia2" && hayDia2 && (
            <>
              <Fase
                titulo={tr(lng, forma.faseManual ? "camino.res2f" : "camino.res2d")}
                rondas={rT.jugadas} de={total}
                record={rT} puntos={ptsT}
                umbral={corteUmbral}
                veredicto={vCorte}
                etiquetaUmbral={`Mínimo para pelear el top ${corteReal}`}
                absoluto={false}
                total={total}
              />
              <NotaCorte corte={corteReal} asimetrico={e?.asimetrico ?? false} />
            </>
          )}

          {pestana === "general" && (
            <>
              <div className={`grid gap-3 ${hayDia2 ? "sm:grid-cols-2" : ""}`}>
                {/* El Día 2 solo existe en Regionales: en una Cup ni se menciona. */}
                {hayDia2 && (
                  <Umbralito
                    etiqueta={tr(lng, "x.c410f12f")}
                    umbral={umbralF2}
                    veredicto={vDia1}
                    rondas={fase1}
                    nota={tr(lng, "x.f754a671")}
                  />
                )}
                <Umbralito
                  etiqueta={`Mínimo para pelear el top ${corteReal}`}
                  umbral={corteUmbral}
                  veredicto={vCorte}
                  rondas={total}
                  nota={corteReal ? "Ahí manda el desempate." : tr(lng, "x.c5e95c31")}
                />
              </div>
              <Ficha e={e} total={total} fase1={fase1} corte={corteReal} kind={kind}
                playerCount={playerCount ?? null} />
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* --------------------------------------------------------------- piezas -- */

function Pestanas({
  actual, onPick, href, hayDia2, fase1, fase2, corte, f1 = "Día 1", f2 = "Día 2",
}: {
  actual: Pestana; onPick: (p: Pestana) => void; href?: string;
  hayDia2: boolean; fase1: number; fase2: number; corte: number;
  /** v0.45 — «Día 1/2» oficial o «Fase 1/2» en una estructura propia. */
  f1?: string; f2?: string;
}) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const items: Array<{ id: Pestana; label: string; sub: string }> = [
    { id: "dia1", label: hayDia2 ? f1 : "Suizo", sub: `${fase1} rondas` },
    ...(hayDia2
      ? [{ id: "dia2" as const, label: corte ? `${f2} y corte` : f2,
           sub: corte ? `${fase2} rondas · top ${corte}` : `${fase2} rondas` }]
      : []),
    { id: "general", label: "General", sub: tr(lng, "x.c722ecd0") },
  ];

  return (
    // Desplazamiento propio y relleno por dentro: `.scroll-x` lleva margen
    // negativo y dentro de una tarjeta con overflow-hidden recorta la primera
    // y la última pestaña. Es el fallo que ya arreglamos en la v0.11.
    <div className="mb-4 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1"
      role="tablist" aria-label={tr(lng, "x.6e341850")}>
      {items.map((it) => {
        const on = actual === it.id;
        const cls = `tap flex-none rounded-lg border px-3 py-1.5 text-left transition-colors
              ${on ? "border-brand-line bg-brand-soft text-brand"
                   : "border-line bg-surface text-muted hover:text-ink"}`;
        const cuerpo = (
          <>
            <span className="block text-sm font-semibold">{it.label}</span>
            <span className="block text-[10px] opacity-80 tabular">{it.sub}</span>
          </>
        );
        // Con `href`, la pestaña es un enlace: filtra también las rondas de
        // abajo y funciona sin JavaScript.
        return href ? (
          <Link key={it.id} href={`${href}${it.id}`} scroll={false} replace role="tab"
            aria-selected={on} className={cls}>{cuerpo}</Link>
        ) : (
          <button key={it.id} type="button" role="tab" aria-selected={on}
            onClick={() => onPick(it.id)} className={cls}>{cuerpo}</button>
        );
      })}
    </div>
  );
}

const TONO: Record<Veredicto, { chip: string; texto: string; icono: string }> = {
  dentro: { chip: "chip-win", texto: "dentro", icono: "check" },
  depende: { chip: "chip-info", texto: "depende", icono: "compare" },
  fuera: { chip: "chip-loss", texto: "fuera", icono: "alert" },
};

/** Una fase: cómo vas, el único umbral que importa aquí, y el veredicto. */
function Fase({
  titulo, rondas, de, record, puntos, umbral, veredicto, etiquetaUmbral, absoluto, total,
}: {
  titulo: string;
  rondas: number; de: number;
  record: { wins: number; losses: number; ties: number };
  puntos: number;
  umbral: Umbral | null;
  veredicto: Veredicto | null;
  etiquetaUmbral: string;
  /** Si el umbral no admite «depende» — el de fase es absoluto. */
  absoluto: boolean;
  total: number;
}) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const quedan = Math.max(0, de - rondas);
  const faltan = umbral ? victoriasNecesarias(puntos, rondas, total, umbral) : null;
  const techo = techoDe(puntos, rondas, total);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="text-sm font-bold">{titulo}</h3>
        <span className="text-xs text-muted tabular">ronda {Math.min(rondas + 1, de)} de {de}</span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-display text-3xl font-extrabold tabular leading-none">
          {record.wins}–{record.losses}{record.ties > 0 ? `–${record.ties}` : ""}
        </span>
        <span className="text-sm text-muted tabular">{puntos} puntos</span>
        {veredicto && (
          <span className={`chip chip-dot ${TONO[veredicto].chip}`}>{TONO[veredicto].texto}</span>
        )}
      </div>

      {umbral && (
        <Umbralito
          etiqueta={etiquetaUmbral} umbral={umbral} veredicto={veredicto} rondas={total}
          nota={absoluto
            ? tr(lng, "x.705a39d8")
            : tr(lng, "x.241cbece")}
        />
      )}

      <p className="mt-3 text-sm">
        {quedan === 0
          ? <span className="text-muted">{tr(lng, "x.5435589f")}</span>
          : faltan === 0
            ? <b className="text-win">{tr(lng, "x.25146465")}</b>
            : !umbral
              ? <span className="text-muted">Quedan {quedan}.</span>
            : faltan != null
              ? <>Quedan {quedan}. <b className="text-ink">
                  {faltan === quedan
                    ? `Hay que ganar ${quedan === 1 ? "la que queda" : `las ${quedan} que quedan`}.`
                    : `Gana ${faltan} de ${quedan} y llegas.`}
                </b></>
              : <span className="text-loss">
                  Ni ganando {quedan === 1 ? "la que queda" : `las ${quedan} que quedan`} se
                  llega: el techo son {techo} puntos.
                </span>}
      </p>
    </div>
  );
}

/** El número grande, que es a lo que se viene. */
function Umbralito({
  etiqueta, umbral, veredicto, rondas, nota,
}: {
  etiqueta: string; umbral: Umbral | null; veredicto: Veredicto | null;
  rondas: number; nota: string;
}) {
  if (!umbral) {
    return (
      <div className="rounded-xl border border-line bg-ground p-3">
        <p className="label">{etiqueta}</p>
        <p className="mt-1 text-[11px] text-ink-2">{nota}</p>
      </div>
    );
  }
  const t = veredicto ? TONO[veredicto] : null;
  return (
    <div className={`rounded-xl border p-3 ${
      veredicto === "dentro" ? "border-win/40 bg-win-soft"
      : veredicto === "fuera" ? "border-loss/40 bg-loss-soft"
      : "border-info/40 bg-info-soft"}`}>
      <p className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] ${
        veredicto === "dentro" ? "text-win" : veredicto === "fuera" ? "text-loss" : "text-info"}`}>
        {t && <Icon name={t.icono} className="size-3.5" />} {etiqueta}
      </p>
      <p className="font-display text-2xl font-extrabold tabular leading-none">
        {umbral.record} <span className="text-base font-bold opacity-70">· {umbral.puntos} pts</span>
      </p>
      <p className="mt-1 text-[11px] text-ink-2">{nota} Son {rondas} rondas en total.</p>
    </div>
  );
}

/** Lo que hay que saber del corte asimétrico, una vez y en pequeño. */
function NotaCorte({ corte, asimetrico }: { corte: number; asimetrico: boolean }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  if (!corte) return null;
  return (
    <p className="mt-3 border-t border-line-soft pt-3 text-[11px] text-muted">
      {asimetrico && (
        <>
          El top {corte} es <b>{tr(lng, "x.a09994df")}</b>: entran todos los que empaten a puntos con el
          último, hasta un máximo de <b className="tabular">{TOP_CUT_MAXIMO_TCG}</b> en TCG.{" "}
        </>
      )}
      Quién pasa de los empatados lo decide el desempate, en este orden:{" "}
      {DESEMPATES.map((d) => d.nombre.toLowerCase()).join("; ")}.
    </p>
  );
}

/** La ficha de estructura, para poder contrastarla con el horario del organizador. */
function Ficha({
  e, total, fase1, corte, kind, playerCount,
}: {
  e: ReturnType<typeof estructuraDe>; total: number; fase1: number; corte: number;
  kind: string; playerCount: number | null;
}) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  if (!e) return null;
  const discrepa = e.total !== total;
  return (
    <div className="mt-4 border-t border-line-soft pt-3">
      <p className="label mb-1.5">{tr(lng, "x.de5df3ac")}</p>
      <p className="text-sm text-ink-2 tabular">
        {playerCount?.toLocaleString("es")} jugadores · {fase1}
        {e.fase2 > 0 ? `+${e.fase2}` : ""} rondas
        {corte > 0 ? ` · top ${corte}${e.asimetrico ? " asimétrico" : ""}` : " · sin corte"}
      </p>
      <p className="mt-1 text-[11px] text-muted">
        Tramo {e.min.toLocaleString("es")}–{Number.isFinite(e.max) ? e.max.toLocaleString("es") : "∞"} del
        reglamento de 2026 para {kind === "league_challenge" ? "League Challenge"
          : kind === "league_cup" ? "League Cup" : tr(lng, "x.3b62af14")}.
        Las rondas pueden repartirse entre días de otra forma: manda el horario del organizador.
      </p>
      {discrepa && (
        <p className="mt-1.5 text-[11px] font-semibold text-loss">
          Ojo: el torneo tiene {total} rondas apuntadas y la tabla dice {e.total}. Revisa la
          asistencia o las rondas, porque todo lo de arriba sale de ahí.
        </p>
      )}
    </div>
  );
}

/** El titular de la cabecera, que es lo que se lee con el panel cerrado. */
function resumenFase(
  puntos: number, jugadas: number, total: number, umbral: Umbral | null, meta: string,
): string {
  if (!umbral) return `${puntos} pts en ${jugadas} rondas`;
  const faltan = victoriasNecesarias(puntos, jugadas, total, umbral);
  if (faltan === 0) return `${puntos} pts · ya llegas a ${meta}`;
  if (faltan == null) return `${puntos} pts · ${meta} ya no sale`;
  return `${puntos} pts · gana ${faltan} más para ${meta}`;
}
