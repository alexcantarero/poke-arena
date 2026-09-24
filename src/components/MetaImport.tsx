"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteMetaEvent, importMetaEvent } from "@/actions";
import { CALENDAR_KINDS } from "@/lib/calendar";
import { detectMode } from "@/lib/standings";
import { fmtDate } from "@/lib/format";
import type { EventoOficial } from "@/data/eventos-europa";
import type { MetaEvent, MetaImportState } from "@/lib/types";
import { Icon } from "./icons";

/* =========================================================================
   Meter en la app lo que se jugó en un Regional.

   POR QUÉ SE PEGA Y NO SE DESCARGA
   --------------------------------
   Porque no hay de dónde descargarlo con permiso, y el formulario lo dice en
   voz alta en vez de dejarlo en un comentario del código. La API de Limitless
   es de su plataforma online; los presenciales están en su web y en RK9, y
   RK9 prohíbe expresamente la extracción automatizada. Un botón que raspara
   una vez al mes seguiría siendo raspar.

   Lo que sí se automatiza es todo lo demás: trocear, casar los mazos con
   vuestro catálogo, poner los sprites y no duplicar nada al repetir la
   importación. Copiar y pegar son diez segundos; el resto lo hace la app.

   QUÉ SE VE ANTES DE GUARDAR
   --------------------------
   El primer botón analiza y no escribe. Lo que vuelve es el recuento por
   mazo —cuántas listas de cada uno, cuántas llegaron al top 8— y el número
   de filas descartadas. Ese número es, casi punto por punto, la gente cuyo
   nombre ha entrado por el textarea y no ha salido de él.
   ========================================================================= */

type Props = {
  eventos: EventoOficial[];
  importados: Array<MetaEvent & { entries: number }>;
};

/** Los tipos de evento que tiene sentido importar. Una jornada de liga, no. */
const TIPOS = ["regional", "international", "special", "worlds", "league_cup"] as const;

export function MetaImport({ eventos, importados }: Props) {
  const [state, action] = useActionState<MetaImportState, FormData>(importMetaEvent, null);

  const [texto, setTexto] = useState("");
  const [modo, setModo] = useState<"standings" | "summary">("standings");
  const [tocado, setTocado] = useState(false);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [kind, setKind] = useState<string>("regional");

  /* Los eventos oficiales de la temporada, del más reciente hacia atrás: al
     importar, lo que se busca es casi siempre el del fin de semana pasado. */
  const opciones = useMemo(
    () => [...eventos].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [eventos],
  );

  const alPegar = (v: string) => {
    setTexto(v);
    // Solo se adivina mientras nadie haya elegido a mano. Corregir al usuario
    // después de que haya decidido es de las cosas que más molestan.
    if (!tocado) setModo(detectMode(v));
  };

  const elegirEvento = (id: string) => {
    const e = opciones.find((x) => x.id === id);
    if (!e) return;
    setName(e.title);
    setDate(e.date);
    setLocation(e.location);
    setKind(e.tournamentKind);
  };

  const preview = state?.preview;

  return (
    <>
      <form action={action} className="card mb-4 flex flex-col gap-4 p-4">
        <div>
          <h3 className="font-bold">Importar un Regional</h3>
          <p className="mt-0.5 text-sm text-ink-2">
            Copia la clasificación de la web donde la estés viendo y pégala aquí. La app se queda
            con el puesto y el mazo de cada fila; los nombres de las personas se descartan al
            leerlos y no hay ninguna columna donde guardarlos.
          </p>
        </div>

        {/* El evento: o se elige de la lista oficial, o se escribe. */}
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="mi-oficial">Evento del circuito</label>
          <select
            className="input" id="mi-oficial" defaultValue=""
            onChange={(e) => elegirEvento(e.target.value)}
          >
            <option value="">— escribirlo a mano —</option>
            {opciones.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} · {fmtDate(e.date)}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">
            Rellena el nombre, la fecha y el sitio de los eventos europeos que ya están en el
            calendario. Si el tuyo no sale, escríbelo debajo.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="mi-name">Nombre</label>
            {/* Sin `required`: «Analizar» tiene que funcionar con solo el
                pegote, para poder ver qué ha entendido antes de rellenar la
                ficha. Al guardar sí se comprueban, en el servidor. */}
            <input className="input" id="mi-name" name="name"
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Regional de Lille" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="mi-date">Fecha</label>
            <input className="input" id="mi-date" name="date" type="date"
              value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="mi-kind">Tipo</label>
            <select className="input" id="mi-kind" name="kind"
              value={kind} onChange={(e) => setKind(e.target.value)}>
              {TIPOS.map((k) => (
                <option key={k} value={k}>{CALENDAR_KINDS[k]?.label ?? k}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="mi-location">Dónde</label>
            <input className="input" id="mi-location" name="location"
              value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="Lille, Francia" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="mi-players">Asistencia</label>
            <input className="input tabular" id="mi-players" name="playerCount"
              type="number" inputMode="numeric" min={0} placeholder="1240" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="mi-cut">Top cut</label>
            <input className="input tabular" id="mi-cut" name="topCut"
              type="number" inputMode="numeric" min={0} placeholder="8" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="mi-div">División</label>
            <select className="input" id="mi-div" name="division" defaultValue="masters">
              <option value="masters">Masters</option>
              <option value="seniors">Seniors</option>
              <option value="juniors">Juniors</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="mi-format">Formato</label>
            <select className="input" id="mi-format" name="format" defaultValue="standard">
              <option value="standard">Estándar</option>
              <option value="expanded">Expandido</option>
            </select>
          </div>
        </div>

        {/* Qué se ha pegado. */}
        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-1.5">Qué estás pegando</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <ModoOpcion
              value="standings" actual={modo}
              onPick={() => { setModo("standings"); setTocado(true); }}
              titulo="Una clasificación"
              ejemplo="1 · Nombre · Gardevoir ex · 14-2-2"
              nota="Da puestos, así que sale la conversión a top 8."
            />
            <ModoOpcion
              value="summary" actual={modo}
              onPick={() => { setModo("summary"); setTocado(true); }}
              titulo="Un desglose por mazos"
              ejemplo="Gardevoir ex — 6"
              nota="Sin puestos. Es la vía sin un solo nombre de por medio."
            />
          </div>
          <input type="hidden" name="modo" value={modo} />
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="mi-texto">Pegar aquí</label>
          <textarea
            className="input min-h-44 font-mono text-xs" id="mi-texto" name="texto"
            value={texto} onChange={(e) => alPegar(e.target.value)}
            placeholder={modo === "standings"
              ? "1\tNombre\tNO\tGardevoir ex\t14-2-2\n2\tNombre\tIT\tRaging Bolt Ogerpon\t13-2-3"
              : "Gardevoir ex 6\nRaging Bolt Ogerpon 5\nDragapult Dusknoir 4"}
          />
          <p className="text-xs text-muted">
            Con el top 32 basta para tener la foto del metagame. Cuanto más pegues, mejor sale la
            cuota; los nombres dan igual porque no se guardan.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="mi-src">De dónde lo has sacado</label>
            <input className="input" id="mi-src" name="sourceName" placeholder="limitlesstcg.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="mi-url">Enlace</label>
            <input className="input" id="mi-url" name="sourceUrl" type="url"
              placeholder="https://…" />
          </div>
        </div>
        <p className="text-xs text-muted">
          La fuente se guarda como cita para que dentro de seis meses se sepa de dónde salió el
          dato. No se llama nunca desde la app.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <Boton tipo="analizar" />
          <Boton tipo="guardar" listo={Boolean(preview)} />
        </div>

        {state?.error && <p className="text-sm font-semibold text-loss">{state.error}</p>}
        {state?.ok && <p className="text-sm font-semibold text-win">{state.ok}</p>}

        {preview && <Previa preview={preview} />}
      </form>

      {importados.length > 0 && <Importados filas={importados} />}
    </>
  );
}

/* --------------------------------------------------------------- piezas -- */

function ModoOpcion({
  value, actual, onPick, titulo, ejemplo, nota,
}: {
  value: "standings" | "summary"; actual: string; onPick: () => void;
  titulo: string; ejemplo: string; nota: string;
}) {
  const on = actual === value;
  return (
    <button
      type="button" onClick={onPick} aria-pressed={on}
      className={`tap rounded-lg border p-3 text-left transition-colors
        ${on ? "border-brand-line bg-brand-soft" : "border-line bg-surface hover:border-brand-line"}`}
    >
      <span className="block text-sm font-bold">{titulo}</span>
      <span className="mt-0.5 block font-mono text-[11px] text-muted">{ejemplo}</span>
      <span className="mt-1 block text-xs text-ink-2">{nota}</span>
    </button>
  );
}

function Boton({ tipo, listo = false }: { tipo: "analizar" | "guardar"; listo?: boolean }) {
  const { pending } = useFormStatus();
  if (tipo === "analizar") {
    return (
      <button className="btn w-full" type="submit" disabled={pending}>
        <Icon name="search" className="size-4" />
        {pending ? "Leyendo…" : "Analizar sin guardar"}
      </button>
    );
  }
  return (
    <button
      className="btn btn-brand w-full" type="submit" name="confirmar" value="si"
      disabled={pending || !listo}
    >
      <Icon name="check" className="size-4" />
      {pending ? "Guardando…" : "Guardar el metagame"}
    </button>
  );
}

function Previa({ preview }: { preview: NonNullable<MetaImportState>["preview"] }) {
  if (!preview) return null;
  const { rows, total, coverage, skipped, descartadas, nuevos } = preview;

  return (
    <section className="rounded-lg border border-line bg-surface-2 p-3">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="text-sm font-bold">Esto es lo que va a entrar</h4>
        <span className="text-xs text-muted tabular">
          {total} lista(s) · {rows.length} mazo(s)
          {coverage != null && ` · hasta el puesto ${coverage}`}
        </span>
      </div>

      <ul className="mb-2 divide-y divide-line-soft">
        {rows.slice(0, 16).map((r) => (
          <li key={r.name} className="flex items-center gap-2 py-1.5">
            <span className="min-w-0 flex-1 truncate text-sm">
              {r.name}
              {!r.conocido && (
                <span className="chip chip-info ml-1.5 text-[10px]">nuevo</span>
              )}
            </span>
            {r.top8 > 0 && (
              <span className="flex-none text-[11px] text-muted tabular">{r.top8} en top 8</span>
            )}
            <span className="w-10 flex-none text-right font-display text-sm font-extrabold tabular">
              {r.entries}
            </span>
          </li>
        ))}
      </ul>
      {rows.length > 16 && (
        <p className="mb-2 text-xs text-muted">y {rows.length - 16} mazo(s) más.</p>
      )}

      <div className="space-y-1 border-t border-line-soft pt-2 text-xs text-ink-2">
        {descartadas > 0 && (
          <p>
            <b className="tabular">{descartadas}</b> fila(s) descartadas porque lo que había en la
            columna del mazo no se repetía. Eso es, casi siempre, exactamente los nombres de las
            personas: un nombre sale una vez y un mazo sale muchas.
          </p>
        )}
        {skipped > descartadas && (
          <p>{skipped - descartadas} línea(s) más no se han entendido y se han saltado.</p>
        )}
        {nuevos.length > 0 && (
          <p>
            No están en vuestro catálogo: {nuevos.slice(0, 6).join(", ")}
            {nuevos.length > 6 && ` y ${nuevos.length - 6} más`}. Se guardan igual, por su nombre.
            Si pulsas «Actualizar catálogo» aquí arriba y vuelves a pegar, quedan enlazados y
            salen con sus sprites.
          </p>
        )}
        <p>
          Si ya habías importado este evento, se reemplaza: la fecha y el nombre son su identidad,
          así que volver a pegarlo con el top cut ya cerrado lo actualiza en vez de duplicarlo.
        </p>
      </div>
    </section>
  );
}

function Importados({ filas }: { filas: Array<MetaEvent & { entries: number }> }) {
  return (
    <section className="card mb-6">
      <div className="card-head">
        <h3 className="text-base font-bold">Eventos importados</h3>
        <span className="text-xs text-muted tabular">{filas.length}</span>
      </div>
      <ul className="divide-y divide-line-soft">
        {filas.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{e.name}</span>
              <span className="block text-[11px] text-muted tabular">
                {fmtDate(e.date)}
                {e.location && ` · ${e.location}`}
                {` · ${e.entries} lista(s)`}
                {e.coverage != null && ` · top ${e.coverage}`}
                {e.sourceName && ` · ${e.sourceName}`}
              </span>
            </span>
            <form action={deleteMetaEvent}>
              <input type="hidden" name="id" value={e.id} />
              <button className="btn btn-ghost btn-sm text-loss" type="submit"
                aria-label={`Quitar ${e.name}`}>
                <Icon name="trash" className="size-4" />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
