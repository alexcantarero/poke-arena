import Link from "next/link";
import type { ReactNode } from "react";
import { spriteUrl } from "@/lib/pokemon";
import {
  arquetiposEnCorte, insigniasDe, type CampoMeta, type FilaMeta, type Insignia,
} from "@/lib/metaBadges";
import { OtherMark } from "./ui";
import { setPersonalRegional } from "@/actions";

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
  const ins = p.campo ? insigniasDe(p.filas, p.campo) : null;
  const enCorte = arquetiposEnCorte(p.filas);

  return (
    <section id="ultimo-regional" className="mb-4 scroll-mt-20">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
<h2 className="font-display text-xl font-extrabold">El último Regional</h2>
        <nav className="seg seg-brand" aria-label="Qué datos enseñar">
          <Link href={p.hrefs.global} scroll={false} data-on={p.vista === "global"}
            aria-current={p.vista === "global" ? "page" : undefined}>Global</Link>
          <Link href={p.hrefs.grupo} scroll={false} data-on={p.vista === "grupo"}
            aria-current={p.vista === "grupo" ? "page" : undefined}>Vuestro grupo</Link>
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
                  <form action={setPersonalRegional} className="inline-block relative">
                    <select name="regionalId" className="appearance-none bg-transparent hover:bg-surface-2 cursor-pointer outline-none rounded pr-6 truncate max-w-full" defaultValue={p.evento?.id ?? ""} onChange={(e) => e.target.form?.requestSubmit()}>
                      {p.regionales.map(r => (
                        <option key={r.id} value={r.id} className="text-base font-sans">{r.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center px-1">
                      <svg className="size-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </form>
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
                  p.evento.playerCount ? `${p.evento.playerCount.toLocaleString("es")} jugadores` : null,
                  p.evento.muestra,
                  enCorte.distintos > 0 && p.corteTamano > 0
                    ? `${enCorte.distintos} de ${p.corteTamano} arquetipos en el corte`
                    : null,
                ].filter(Boolean).join(" · ")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
              <TarjetaInsignia
                titulo="Espejo del corte" tono="brand" ins={ins?.espejo ?? null}
                grande={(i) => `${i.valor} de ${p.corteTamano}`}
                pequeno="plazas del top cut"
                pie={() => null}
                vacia="Ningún mazo repite en el corte."
              />
              <TarjetaInsignia
                titulo="Rindió" tono="win" ins={ins?.top ?? null}
                grande={(i) => pctTxt(i.valor)} pequeno={p.etiquetaConversion}
                pie={(i) => `${i.fila.day2} de ${i.fila.field} listas${i.fila.bestFinish ? ` · mejor #${i.fila.bestFinish}` : ""}`}
                vacia="Hace falta un mazo con 5+ listas por encima de la media."
              />
              <TarjetaInsignia
                titulo="Decepcionó" tono="loss" ins={ins?.decepcion ?? null}
                grande={(i) => pctTxt(i.valor)} pequeno={p.etiquetaConversion}
                pie={(i) => `${i.fila.day2} de ${i.fila.field} listas · media ${pctTxt(ins?.tasaCampo ?? null)}`}
                vacia="Para llamar «decepción» a algo hacen falta 15+ listas."
              />
              <TarjetaInsignia
                titulo="Sobrejugado" tono="info" ins={ins?.sobrejugado ?? null}
                grande={(i) => `+${i.valor.toFixed(1).replace(".", ",")} pp`}
                pequeno="frente al meta online"
                pie={(i) => p.campo
                  ? `${pctTxt(i.fila.field / p.campo.decks)} aquí · ${pctTxt(i.fila.onlineShare)} online`
                  : ""}
                vacia="Sin datos del meta online para comparar."
              />
            </div>

            {p.corte.length > 0 && (
              <div className="border-t border-line-soft p-4 sm:p-5">
                <p className="label mb-2">{p.corteTitulo} · {p.corte.length}</p>
                <ol className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {p.corte.map((c) => (
                    <li key={`${c.placement}-${c.titulo}`} className="flex min-w-0 items-center gap-2.5 py-1">
                      <span className="w-8 flex-none font-display font-extrabold tabular text-muted">#{c.placement}</span>
                      <Duo main={c.main} secondary={c.secondary} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{c.titulo}</span>
                        {c.sub && <span className="block truncate text-[11px] text-brand">{c.sub}</span>}
                      </span>
                      {c.extra}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>

      {/* ------------------------------------------------ 2. top arquetipos -- */}
      <div className="card mb-4">
        <div className="card-head">
          <h3 className="text-lg font-bold">Top arquetipos</h3>
          <span className="text-xs text-muted">{p.topNota}</span>
        </div>
        {p.top.length ? (
          <ul className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3 lg:grid-cols-5">
            {p.top.map((a) => (
              <li key={a.key} className="rounded-xl border border-line bg-ground p-3">
                <div className="mb-2 grid h-16 place-items-center rounded-lg bg-surface-2">
                  <Duo main={a.main} secondary={a.secondary} size="lg" />
                </div>
                <p className="truncate text-sm font-bold" title={a.name}>{a.name}</p>
                <p className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="font-display text-xl font-extrabold tabular">{pctTxt(a.share, 1)}</span>
                  <span className="text-[11px] text-muted tabular">{a.decks} {a.decks === 1 ? "lista" : "listas"}</span>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-sm text-muted">Todavía no hay mazos que contar en esta vista.</p>
        )}
      </div>

      {/* ------------------------------------------- 3. torneos recientes -- */}
      <div className="card">
        <div className="card-head">
          <h3 className="text-lg font-bold">Torneos recientes</h3>
        </div>
        {p.recientes.length ? (
          <ul className="divide-y divide-line-soft">
            {p.recientes.map((t) => {
              const cuerpo = (
                <>
                  <span className="w-16 flex-none text-xs font-semibold uppercase text-muted tabular">{t.date}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.name}</span>
                  {t.aside && <span className="hidden flex-none text-xs text-muted sm:inline">{t.aside}</span>}
                  <span className="flex-none text-xs text-muted">{t.tipo}</span>
                </>
              );
              return (
                <li key={t.key}>
                  {t.href
                    ? <Link href={t.href} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">{cuerpo}</Link>
                    : <div className="flex items-center gap-3 px-4 py-3">{cuerpo}</div>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-5 text-sm text-muted">Nada todavía.</p>
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- piezas -- */

const TONOS = {
  brand: "chip-brand", win: "chip-win", loss: "chip-loss", info: "chip-info",
} as const;

function TarjetaInsignia({
  titulo, tono, ins, grande, pequeno, pie, vacia,
}: {
  titulo: string; tono: keyof typeof TONOS; ins: Insignia | null;
  grande: (i: Insignia) => string; pequeno: string; pie: (i: Insignia) => string | null;
  vacia: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-line bg-ground p-3">
      <div className="mb-2 grid h-20 place-items-center rounded-lg bg-surface-2">
        {ins ? <Duo main={ins.fila.main} secondary={ins.fila.secondary} size="lg" /> : <OtherMark size="lg" />}
      </div>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-bold">{ins ? ins.fila.name : "—"}</span>
        <span className={`chip ${TONOS[tono]} flex-none text-[10px]`}>{titulo}</span>
      </div>
      {ins ? (
        <>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
            <span className="font-display text-2xl font-extrabold tabular">{grande(ins)}</span>
            <span className="text-xs text-muted">{pequeno}</span>
          </p>
          {pie(ins) && <p className="mt-0.5 text-[11px] text-muted tabular">{pie(ins)}</p>}
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

function pctTxt(v: number | null | undefined, digits = 0): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(digits).replace(".", ",")}%`;
}
