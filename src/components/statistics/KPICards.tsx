"use client";

// v0.49 — de cliente: solo lo usa GlobalMeta, que ya lo es, y así puede pedir el idioma.
import { Kpi } from "@/components/primitives";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";
import type { StatsPayload } from "@/lib/types";
import type { ChartRow } from "./Charts";
import { pct } from "@/lib/format";

/* =========================================================================
   Las cifras de cabecera del metagame online.

   Por qué están aparte de los KPIs que ya hay arriba en la pantalla: los de
   arriba describen **vuestra liga** y salen del snapshot, que está en
   memoria. Estos describen **el mundo** y salen de Limitless, que tarda
   segundos. Si estuvieran en la misma fila, la fila entera tendría que
   esperar a lo lento.

   No lleva "use client" a propósito. No tiene estado ni efectos, así que
   sirve igual dentro del árbol de cliente de `GlobalMeta` que en un
   componente de servidor — si algún día se calcula el trozo mundial en el
   servidor, esto no hay que tocarlo.

   Los colores no son decorativos: naranja es el dato mundial, morado es la
   diferencia entre las dos fuentes. Es la misma leyenda que las gráficas de
   abajo, para no tener que aprender dos.
   ========================================================================= */

type Props = {
  mode: "global" | "both";
  data: NonNullable<StatsPayload["global"]>;
  /** Las filas ya cruzadas con la liga, para poder medir los desvíos. */
  rows: ChartRow[];
};

export function KPICards({ mode, data, rows }: Props) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const top = data.archetypes[0];

  /* La media de victorias del mundo, ponderada por cuántas listas hay de cada
     mazo. Sin ponderar, un mazo con tres apariciones y un 100% pesaría lo
     mismo que uno con cuatrocientas, y la media saldría disparatada. */
  const jugadas = data.archetypes.reduce((a, r) => a + r.played, 0);
  const medio = jugadas
    ? data.archetypes.reduce((a, r) => a + (r.winRate ?? 0) * r.played, 0) / jugadas
    : null;

  /* Los arquetipos que existen en los dos sitios. Es el número que dice si la
     comparación de abajo tiene algo que decir o está casi vacía. */
  const comunes = rows.filter((r) => r.local != null && r.global != null);
  const mayor = comunes
    .map((r) => ({ ...r, diff: (r.local as number) - (r.global as number) }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];

  return (
    <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <Kpi
        tone="global"
        icon="globe"
        label={tr(lng, "x.c98b3c29")}
        value={data.tournaments}
        note={`${data.entries.toLocaleString("es")} listas · ${data.days} días`}
      />

      <Kpi
        tone="global"
        icon="trophy"
        label={tr(lng, "x.ab2a0aaa")}
        value={top ? `${Math.round(top.share * 100)}%` : "—"}
        note={top?.name ?? "sin datos"}
      />

      <Kpi
        tone="global"
        icon="stats"
        label={tr(lng, "x.3b999b2f")}
        value={pct(medio)}
        note="ponderada por nº de listas"
      />

      {mode === "both" ? (
        <Kpi
          tone="diff"
          icon="compare"
          label={tr(lng, "x.da22bddb")}
          value={mayor ? mayor.name : "—"}
          delta={mayor ? mayor.diff * 100 : null}
          note={mayor
            ? `${comunes.length} arquetipo${comunes.length === 1 ? "" : "s"} en común`
            : "todavía sin nada que comparar"}
        />
      ) : (
        <Kpi
          tone="global"
          icon="clock"
          label={tr(lng, "x.4fbb38d5")}
          value={new Date(data.fetchedAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
          note={data.failed > 0 ? `${data.failed} torneo(s) sin respuesta` : "al día"}
        />
      )}
    </div>
  );
}
