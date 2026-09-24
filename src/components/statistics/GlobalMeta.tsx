"use client";

import { useEffect, useMemo, useState } from "react";
import type { StatsPayload, ArchetypeRow } from "@/lib/types";
import { spriteUrl } from "@/lib/pokemon";
import { Skeleton } from "@/components/primitives";
import { ArchetypeChart, ShareChart, type ChartRow } from "./Charts";
import { KPICards } from "./KPICards";

/* =========================================================================
   El metagame online, y la comparación con el vuestro.

   Esto va en el cliente y no en el servidor por una razón de tiempos: pedirle
   el metagame a Limitless son varias llamadas encadenadas y tarda segundos.
   Si se hiciera en el Server Component, la pantalla entera —incluida la parte
   local, que ya está en memoria y sale al instante— se quedaría esperando.
   Así, lo vuestro se ve enseguida y esto entra cuando llega.

   Lo que NO se puede hacer, y conviene que quede dicho en el propio código:
   **la API de Limitless no filtra por país.** Está comprobado que el
   parámetro se ignora y devuelve el listado mundial igual. Así que esto es
   meta online, la pantalla lo dice con esas palabras, y no hay ningún
   selector de región que prometa un filtro que no existe.
   ========================================================================= */

type Props = {
  /** `both` pinta las dos series; `global`, solo la mundial. */
  mode: "global" | "both";
  /** Los arquetipos de la liga, para poder comparar. */
  local: ArchetypeRow[];
  days: number;
  /** Los filtros de la pantalla, para que el global mire la misma ventana. */
  query: string;
};

export function GlobalMeta({ mode, local, days, query }: Props) {
  const [data, setData] = useState<StatsPayload["global"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);

    const params = new URLSearchParams(query);
    params.set("source", "global");
    params.set("days", String(days));

    fetch(`/api/stats?${params.toString()}`)
      .then((r) => r.json())
      .then((json: StatsPayload) => {
        if (!vivo) return;
        if (json.error) setError(json.error);
        setData(json.global ?? null);
      })
      .catch(() => { if (vivo) setError("No se ha podido conectar con Limitless."); })
      .finally(() => { if (vivo) setCargando(false); });

    return () => { vivo = false; };
  }, [query, days]);

  /* Cruce por nombre de arquetipo. No hay un id común entre vuestra base y la
     de Limitless —los arquetipos importados sí lo tienen, los creados a mano
     no—, así que se casa por nombre normalizado. Lo que no case sale igual,
     solo que sin la otra mitad de la comparación. */
  const filas: ChartRow[] = useMemo(() => {
    if (!data) return [];
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const locales = new Map(local.map((r) => [norm(r.name), r]));

    return data.archetypes.slice(0, 14).map((g) => {
      const l = locales.get(norm(g.name));
      return {
        id: g.id,
        name: g.name,
        // Limitless devuelve los iconos del arquetipo; si el cruce con la liga
        // ha encontrado pareja, se prefieren los de ella, que son los que se
        // ven en el resto de la app.
        main: l?.main || g.main,
        secondary: l?.secondary || g.secondary,
        global: g.winRate,
        local: l?.winRate ?? null,
        share: g.share,
        played: g.played,
      };
    });
  }, [data, local]);

  if (cargando) {
    /* El hueco tiene la forma de lo que va a llegar —cuatro cifras y una
       gráfica— y no un "cargando" centrado. Cuando llegue el dato no salta
       nada de sitio, que es todo el objetivo. */
    return (
      <div role="status" aria-live="polite">
        <span className="sr-only">Cargando el metagame online…</span>
        <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card p-3 sm:p-4">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="mt-2 h-7 w-20" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="card mb-6 p-4">
          <Skeleton className="mb-3 h-4 w-48" />
          <Skeleton className="h-64 w-full" />
          <p className="mt-3 text-xs text-muted">
            Pidiéndole a Limitless los torneos de los últimos {days} días. Tarda unos segundos.
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card mb-6 p-4">
        <p className="text-sm font-semibold text-loss">
          {error ?? "Limitless no ha devuelto datos."}
        </p>
        <p className="mt-1 text-xs text-muted">
          El metagame online es un extra: todo lo de tu liga sigue funcionando sin él.
        </p>
      </div>
    );
  }

  return (
    <>
      <KPICards mode={mode} data={data} rows={filas} />

      <section className="card mb-4 border-source-global/40 bg-source-global-soft p-4">
        <h2 className="font-display text-lg font-bold">Metagame online</h2>
        <p className="mt-1 text-sm text-ink-2">
          De <b className="tabular">{data.tournaments}</b> torneos y{" "}
          <b className="tabular">{data.entries}</b> listas de los últimos{" "}
          <b className="tabular">{data.days}</b> días, según Limitless.
        </p>
        <p className="mt-1 text-xs text-muted">
          Son los <b>torneos online</b> de Limitless: su API cubre su plataforma por internet,
          no los Regionales presenciales. Y no se puede filtrar por país — el parámetro existe
          pero lo ignora—, así que tampoco hay forma de recortarlo a España.
          {data.failed > 0 && (
            <> · {data.failed} torneo(s) no respondieron, así que la foto está algo coja.</>
          )}
        </p>
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h3 className="mb-1 font-bold">
            {mode === "both" ? "Victorias: tu liga contra el mundo" : "Victorias por arquetipo"}
          </h3>
          <p className="mb-3 text-xs text-muted">
            {mode === "both"
              ? "Azul, lo vuestro. Naranja, el mundial. Donde se separan mucho, hay algo que mirar."
              : "Porcentaje de victorias en torneos de todo el mundo."}
          </p>
          <ArchetypeChart rows={filas} mode={mode} />
        </section>

        <section className="card p-4">
          <h3 className="mb-1 font-bold">Cuánto se juega cada uno</h3>
          <p className="mb-3 text-xs text-muted">Qué parte de todas las listas es cada mazo.</p>
          <ShareChart rows={filas} />
        </section>
      </div>

      {mode === "both" && <Desvios rows={filas} />}
    </>
  );
}

/**
 * Dónde vuestra liga se separa del mundo.
 *
 * Es la lectura que de verdad sirve para preparar un torneo: un mazo que en
 * el mundo gana el 55% y en vuestra liga el 30% no es que sea malo, es que
 * alguien no sabe jugarlo o alguien sabe jugar contra él muy bien.
 */
function Desvios({ rows }: { rows: ChartRow[] }) {
  const con = rows
    .filter((r) => r.local != null && r.global != null && (r.played ?? 0) > 0)
    .map((r) => ({ ...r, diff: (r.local as number) - (r.global as number) }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 6);

  if (!con.length) {
    return (
      <section className="card mb-6 p-4">
        <h3 className="font-bold">Dónde os separáis del mundo</h3>
        <p className="mt-1 text-sm text-muted">
          Todavía no hay ningún arquetipo con partidas en los dos sitios. Registra más partidas
          con mazos que se jueguen fuera y aparecerá la comparación.
        </p>
      </section>
    );
  }

  return (
    <section className="card mb-6">
      <div className="card-head">
        <h3 className="text-lg font-bold">Dónde os separáis del mundo</h3>
        <span className="text-xs text-muted">diferencia de %V</span>
      </div>
      <ul className="divide-y divide-line-soft">
        {con.map((r) => {
          const arriba = r.diff > 0;
          return (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex size-8 flex-none items-center justify-center" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={spriteUrl(r.name)} alt="" className="size-8 object-contain" loading="lazy" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{r.name}</span>
                <span className="block text-[11px] text-muted tabular">
                  vosotros {Math.round((r.local as number) * 100)}% · mundo{" "}
                  {Math.round((r.global as number) * 100)}%
                </span>
              </span>
              <span
                className="chip tabular flex-none"
                style={{
                  background: "var(--source-diff-soft)",
                  color: "var(--source-diff)",
                  borderColor: "transparent",
                }}
              >
                {arriba ? "+" : ""}{Math.round(r.diff * 100)} pts
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
