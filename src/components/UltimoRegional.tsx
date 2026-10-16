import Link from "next/link";
import { tr, trf, type Lang } from "@/lib/i18n";
import type { ReactNode } from "react";
import { spriteUrl } from "@/lib/pokemon";
import {
  arquetiposEnCorte, insigniasDe, type CampoMeta, type FilaMeta, type Insignia,
} from "@/lib/metaBadges";
import { OtherMark } from "./ui";
import { RegionalPicker } from "./RegionalPicker";
import { num, pct } from "@/lib/format";

/* =========================================================================
   «El último Regional» en el inicio — el panel a lo Ciphermaniac.

   TRES BLOQUES, UN SELECTOR
   -------------------------
   1. El último Regional: cabecera con cifras, las cuatro insignias y el top
      cut.
   2. Top arquetipos: los mazos más jugados de la temporada.
   3. Torneos recientes.

   El selector **Global / Vuestro grupo** manda sobre los tres a la vez y va
   por URL (`?vista=grupo`), como el resto de filtros de Arena: se puede
   compartir, funciona sin JavaScript y el «atrás» del navegador lo deshace.

   DE DÓNDE SALE CADA LADO
   -----------------------
   · Global: el metagame presencial que se importa en Ajustes → «Metagame
     presencial». Sin nombres de persona: la tabla no tiene esa columna. La
     conversión se mide al top cut **dentro de la muestra importada**, y la
     cabecera dice sobre qué muestra (ver `panelDeEvento` en `metaIrl.ts`).
   · Vuestro grupo: los resultados apuntados en Arena, vía `resumenGrupo`.
     Aquí sí salen nombres: sois vosotros.

   Es un Server Component: no hay estado, así que no hay nada que mandar al
   navegador.
   ========================================================================= */

export type Vista = "global" | "grupo";

export type CabeceraEvento = {
  id?: string;
  name: string;
  date: string;
  location?: string | null;
  playerCount?: number | null;
  /** Lo que dice la cabecera sobre la muestra: «top 64 importado», «5 del grupo». */
  muestra: string;
  href?: string | null;
};

export type PuestoCorte = {
  placement: number;
  /** Nombre del jugador (solo en la vista del grupo) o del mazo. */
  titulo: string;
  sub?: string;
  main?: string;
  secondary?: string;
  extra?: ReactNode;
};

export type TopArquetipo = {
  key: string; name: string; main?: string; secondary?: string;
  share: number; decks: number;
};

export type TorneoReciente = {
  key: string; date: string; name: string; tipo: string; href?: string | null; aside?: string;
};

type Props = {
  /** v0.48 — el idioma de la pantalla. Español si no llega. */
  lang?: Lang;
  vista: Vista;
  hrefs: Record<Vista, string>;
  evento: CabeceraEvento | null;
  filas: FilaMeta[];
  campo: CampoMeta | null;
  /** C.mo se llama la conversi.n en esta vista: cambia el denominador. */
  etiquetaConversion: string;
  regionales?: Array<{ id: string; name: string; date: string }>;
  corte: PuestoCorte[];
  /** «Top cut» en global; «Vuestros resultados» en el grupo. */
  corteTitulo: string;
  corteTamano: number;
  top: TopArquetipo[];
  topNota: string;
  recientes: TorneoReciente[];
  vacio: ReactNode;
};

export function UltimoRegional(p: Props) {
  const L: Lang = p.lang ?? "es";
  const ins = p.campo ? insigniasDe(p.filas, p.campo) : null;
  const enCorte = arquetiposEnCorte(p.filas);

  return (
    <section id="ultimo-regional" className="mb-4 scroll-mt-20">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
<h2 className="font-display text-xl font-extrabold">{tr(L, "ur.title")}</h2>
        <nav className="seg seg-brand" aria-label={tr(L, "ur.whichData")}>
          <Link href={p.hrefs.global} scroll={false} data-on={p.vista === "global"}
            aria-current={p.vista === "global" ? "page" : undefined}>{tr(L, "ur.global")}</Link>
          <Link href={p.hrefs.grupo} scroll={false} data-on={p.vista === "grupo"}
            aria-current={p.vista === "grupo" ? "page" : undefined}>{tr(L, "ur.group")}</Link>
        </nav>
      </div>

      {/* ----------------------------------------------------- 1. evento -- */}
      <div className="card mb-4">
        {!p.evento ? (
          <div className="p-5 text-sm text-muted">{p.vacio}</div>
        ) : (
          <>
            <div className="border-b border-line-soft p-4 sm:p-5">
              <h3 className="font-display text-2xl font-extrabold leading-tight">
                {p.vista === "global" && p.regionales ? (
                  <RegionalPicker regionales={p.regionales} currentId={p.evento?.id} />
                ) : p.evento.href ? (
                  <Link href={p.evento.href} className="hover:text-info">{p.evento.name}</Link>
                ) : (
                  p.evento.name
                )}
              </h3>
              <p className="mt-1 text-sm text-muted tabular">
                {[
                  p.evento.date,
                  p.evento.location,
                  p.evento.playerCount ? trf(L, "home.players", { n: num(p.evento.playerCount) }) : null,
                  p.evento.muestra,
                  enCorte.distintos > 0 && p.corteTamano > 0
                    ? trf(L, "ur.archetypesInCut", { a: enCorte.distintos, b: p.corteTamano })
                    : null,
                ].filter(Boolean).join(" · ")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
              <TarjetaInsignia
                titulo={tr(L, "ur.mirror")} tono="brand" ins={ins?.espejo ?? null}
                grande={(i) => trf(L, "ur.outOf", { a: i.valor, b: p.corteTamano })}
                pequeno={tr(L, "ur.mirrorSmall")}
                pie={() => null}
                vacia={tr(L, "ur.mirrorEmpty")}
              />
              <TarjetaInsignia
                titulo={tr(L, "ur.performed")} tono="win" ins={ins?.top ?? null}
                grande={(i) => pctTxt(i.valor)} pequeno={p.etiquetaConversion}
                pie={(i) => `${trf(L, "ur.listsOf", { a: i.fila.day2 ?? "—", b: i.fila.field ?? "—" })}${i.fila.bestFinish ? ` · ${trf(L, "ur.best", { n: i.fila.bestFinish })}` : ""}`}
                vacia={tr(L, "ur.performedEmpty")}
              />
              <TarjetaInsignia
                titulo={tr(L, "ur.disappointed")} tono="loss" ins={ins?.decepcion ?? null}
                grande={(i) => pctTxt(i.valor)} pequeno={p.etiquetaConversion}
                pie={(i) => `${trf(L, "ur.listsOf", { a: i.fila.day2 ?? "—", b: i.fila.field ?? "—" })} · ${trf(L, "ur.average", { pct: pctTxt(ins?.tasaCampo ?? null) })}`}
                vacia={tr(L, "ur.disappointedEmpty")}
              />
              <TarjetaInsignia
                titulo={tr(L, "ur.overplayed")} tono="info" ins={ins?.sobrejugado ?? null}
                grande={(i) => `+${num(i.valor, 1)} pp`}
                pequeno={tr(L, "ur.overplayedSmall")}
                pie={(i) => p.campo
                  ? trf(L, "ur.hereOnline", { here: pctTxt(i.fila.field / p.campo.decks), online: pctTxt(i.fila.onlineShare) })
                  : ""}
                vacia={tr(L, "ur.overplayedEmpty")}
              />
            </div>

            {p.corte.length > 0 && (
              <div className="border-t border-line-soft p-4 sm:p-5">
                <p className="label mb-2">{p.corteTitulo} · {p.corte.length}</p>
                <ol className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                  {p.corte.map((c) => {
                    const is1st = c.placement === 1;
                    const is2nd = c.placement === 2;
                    const isTop4 = c.placement === 3 || c.placement === 4;
                    const itemBg = is1st
                      ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--brand-soft)_60%,transparent),transparent_85%)] ring-1 ring-brand/35 border-l-[3px] border-l-brand"
                      : is2nd
                      ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--surface-3)_70%,transparent),transparent_85%)] ring-1 ring-line border-l-[3px] border-l-line"
                      : isTop4
                      ? "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--tier-bronce)_25%,transparent),transparent_85%)] ring-1 ring-tier-bronce/30 border-l-[3px] border-l-tier-bronce"
                      : "border-l-[3px] border-l-transparent hover:bg-surface-2/60";

                    return (
                      <li key={`${c.placement}-${c.titulo}`} className={`flex min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors ${itemBg}`}>
                        {is1st ? (
                          <span className="flex size-6 flex-none items-center justify-center rounded-full bg-brand/20 font-display text-xs font-black text-brand ring-1 ring-brand/40 shadow-xs">
                            #1
                          </span>
                        ) : is2nd ? (
                          <span className="flex size-6 flex-none items-center justify-center rounded-full bg-surface-3 font-display text-xs font-black text-ink-2 ring-1 ring-line shadow-xs">
                            #2
                          </span>
                        ) : isTop4 ? (
                          <span className="flex size-6 flex-none items-center justify-center rounded-full bg-tier-bronce/20 font-display text-xs font-black text-tier-bronce ring-1 ring-tier-bronce/40 shadow-xs">
                            #{c.placement}
                          </span>
                        ) : (
                          <span className="w-6 flex-none text-center font-display text-xs font-bold tabular text-muted">
                            #{c.placement}
                          </span>
                        )}
                        <Duo main={c.main} secondary={c.secondary} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display text-sm font-bold tracking-tight text-ink">{c.titulo}</span>
                          {c.sub && <span className="block truncate font-mono text-[11px] font-semibold text-brand">{c.sub}</span>}
                        </span>
                        {c.extra}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </>
        )}
      </div>

      {/* ------------------------------------------------ 2. top arquetipos -- */}
      <div className="card mb-4">
        <div className="card-head">
          <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">{tr(L, "ur.topArchetypes")}</h3>
          <span className="text-xs text-muted font-mono">{p.topNota}</span>
        </div>
        {p.top.length ? (
          <ul className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3 lg:grid-cols-5">
            {p.top.map((a) => (
              <li key={a.key} className="rounded-xl border border-line bg-surface p-3 transition-colors hover:border-brand/40">
                <div className="mb-2 grid h-16 place-items-center rounded-lg bg-surface-2">
                  <Duo main={a.main} secondary={a.secondary} size="lg" />
                </div>
                <p className="truncate font-display text-sm font-bold tracking-tight text-ink" title={a.name}>{a.name}</p>
                <p className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="font-display text-xl font-black tabular text-ink">{pctTxt(a.share, 1)}</span>
                  <span className="font-mono text-[11px] text-muted tabular">{a.decks} {a.decks === 1 ? "lista" : "listas"}</span>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-sm text-muted">{tr(L, "ur.noDecks")}</p>
        )}
      </div>

      {/* ------------------------------------------- 3. torneos recientes -- */}
      <div className="card">
        <div className="card-head">
          <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">{tr(L, "ur.pastTournaments")}</h3>
        </div>
        {p.recientes.length ? (
          <ul className="divide-y divide-line-soft">
            {p.recientes.map((t) => {
              const cuerpo = (
                <>
                  <span className="w-16 flex-none font-mono text-xs font-semibold uppercase text-muted tabular">{t.date}</span>
                  <span className="min-w-0 flex-1 truncate font-display text-sm font-bold tracking-tight text-ink">{t.name}</span>
                  {t.aside && <span className="hidden flex-none font-mono text-xs text-muted sm:inline">{t.aside}</span>}
                  <span className="flex-none text-xs text-muted font-semibold">{t.tipo}</span>
                </>
              );
              return (
                <li key={t.key}>
                  {t.href
                    ? <Link href={t.href} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors">{cuerpo}</Link>
                    : <div className="flex items-center gap-3 px-4 py-3">{cuerpo}</div>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-5 text-sm text-muted">{tr(L, "ur.nothingYet")}</p>
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- piezas -- */

const TONOS = {
  brand: "chip-brand", win: "chip-win", loss: "chip-loss", info: "chip-info",
} as const;

const TONE_STYLES = {
  brand: {
    border: "color-mix(in oklab, var(--brand-line) 45%, transparent)",
    bg: "linear-gradient(140deg, color-mix(in oklab, var(--brand-soft) 70%, var(--surface)), var(--surface) 70%)",
  },
  win: {
    border: "color-mix(in oklab, var(--win) 45%, transparent)",
    bg: "linear-gradient(140deg, color-mix(in oklab, var(--win-soft) 70%, var(--surface)), var(--surface) 70%)",
  },
  loss: {
    border: "color-mix(in oklab, var(--loss) 45%, transparent)",
    bg: "linear-gradient(140deg, color-mix(in oklab, var(--loss-soft) 70%, var(--surface)), var(--surface) 70%)",
  },
  info: {
    border: "color-mix(in oklab, var(--info) 45%, transparent)",
    bg: "linear-gradient(140deg, color-mix(in oklab, var(--info-soft) 70%, var(--surface)), var(--surface) 70%)",
  },
} as const;

function TarjetaInsignia({
  titulo, tono, ins, grande, pequeno, pie, vacia,
}: {
  titulo: string; tono: keyof typeof TONOS; ins: Insignia | null;
  grande: (i: Insignia) => string; pequeno: string; pie: (i: Insignia) => string | null;
  vacia: string;
}) {
  const st = TONE_STYLES[tono];
  return (
    <div
      className="flex flex-col rounded-xl border p-3.5"
      style={{
        borderColor: st.border,
        background: st.bg,
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div className="mb-2 grid h-20 place-items-center rounded-lg bg-surface-2/60">
        {ins ? <Duo main={ins.fila.main} secondary={ins.fila.secondary} size="lg" /> : <OtherMark size="lg" />}
      </div>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-display text-sm font-bold tracking-tight text-ink">{ins ? ins.fila.name : "—"}</span>
        <span className={`chip ${TONOS[tono]} flex-none text-[10px] font-bold`}>{titulo}</span>
      </div>
      {ins ? (
        <>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
            <span className="font-display text-2xl font-black tabular tracking-tight text-ink">{grande(ins)}</span>
            <span className="text-xs font-medium text-muted">{pequeno}</span>
          </p>
          {pie(ins) && <p className="mt-0.5 font-mono text-[11px] text-muted tabular">{pie(ins)}</p>}
        </>
      ) : (
        <p className="mt-1 text-[11px] text-muted">{vacia}</p>
      )}
    </div>
  );
}

const DUO = {
  sm: ["size-6", "size-5 -ml-2"],
  lg: ["size-14", "size-11 -ml-5"],
} as const;

/** Los dos sprites del mazo, o el marcador de «otros» si no hay. */
function Duo({ main, secondary, size }: { main?: string; secondary?: string; size: keyof typeof DUO }) {
  if (!main) return <OtherMark size={size === "sm" ? "sm" : "lg"} />;
  return (
    <span className="inline-flex flex-none items-center" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={spriteUrl(main)} alt="" loading="lazy" className={`${DUO[size][0]} object-contain`} />
      {secondary && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={spriteUrl(secondary)} alt="" loading="lazy" className={`${DUO[size][1]} object-contain`} />
      )}
    </span>
  );
}

/* v0.42 — antes repetía a mano lo que ya hace `pct`. Se queda el nombre para
   no tocar los usos de esta pantalla, pero el formato vive en un solo sitio:
   si algún día cambia, cambia en toda la app a la vez. Ojo: aquí el valor por
   defecto es SIN decimales, a diferencia de `pct`. */
const pctTxt = (v: number | null | undefined, digits = 0): string => pct(v, digits);
