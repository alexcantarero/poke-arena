"use client";

import { useEffect, useMemo, useState } from "react";
import type { StatsPayload, ArchetypeRow } from "@/lib/types";
import { spriteUrl } from "@/lib/pokemon";
import { Skeleton } from "@/components/primitives";
import { ArchetypeChart, ShareChart, type ChartRow } from "./Charts";
import { KPICards } from "./KPICards";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

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
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

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
      .catch(() => { if (vivo) setError(tr(lng, "x.0fffe53e")); })
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
        <span className="sr-only">{tr(lng, "x.680c1ce6")}</span>
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
          {error ?? tr(lng, "x.a4e08da6")}
        </p>
        <p className="mt-1 text-xs text-muted">
          {tr(lng, "x.049bdc15")}
        </p>
      </div>
    );
  }

  return (
    <>
      <KPICards mode={mode} data={data} rows={filas} />

      <section className="card mb-4 border-source-global/40 bg-source-global-soft p-4">
        <h2 className="font-display text-lg font-bold">{tr(lng, "x.efdbda76")}</h2>
        <p className="mt-1 text-sm text-ink-2">
          {tr(lng, "x.6b98c9b5")} <b className="tabular">{data.tournaments}</b> torneos y{" "}
          <b className="tabular">{data.entries}</b> listas de los últimos{" "}
          <b className="tabular">{data.days}</b> {tr(lng, "x.48713745")}
        </p>
        <p className="mt-1 text-xs text-muted">
          {tr(lng, "x.8434c0ce")} <b>{tr(lng, "x.d50be887")}</b> de Limitless: su API cubre su plataforma por internet,
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
            {mode === "both" ? "Victorias: tu liga contra el mundo" : tr(lng, "x.418ad24e")}
          </h3>
          <p className="mb-3 text-xs text-muted">
            {mode === "both"
              ? tr(lng, "x.c2d871f7")
              : tr(lng, "x.f93167c8")}
          </p>
          <ArchetypeChart rows={filas} mode={mode} />
        </section>

        <section className="card p-4">
          <h3 className="mb-1 font-bold">{tr(lng, "x.179558b2")}</h3>
          <p className="mb-3 text-xs text-muted">{tr(lng, "x.0ea61944")}</p>
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
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const con = rows
    .filter((r) => r.local != null && r.global != null && (r.played ?? 0) > 0)
    .map((r) => ({ ...r, diff: (r.local as number) - (r.global as number) }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 6);

  if (!con.length) {
    return (
      <section className="card mb-6 p-4">
        <h3 className="font-bold">{tr(lng, "x.7072d77d")}</h3>
        <p className="mt-1 text-sm text-muted">
          {tr(lng, "x.03c6e19f")}
        </p>
      </section>
    );
  }

  return (
    <section className="card mb-6">
      <div className="card-head">
        <h3 className="text-lg font-bold">{tr(lng, "x.7072d77d")}</h3>
        <span className="text-xs text-muted">{tr(lng, "x.dfb01197")}</span>
      </div>
      <ul className="divide-y divide-line-soft">
        {con.map((r) => {
          const arriba = r.diff > 0;
          return (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              {/* v0.18 — el sprite sale de `main`/`secondary`, no del NOMBRE del
                  arquetipo: «Dragapult Dusknoir» no es un Pokémon y la imagen
                  daba 404 (era el icono roto que salía al pulsar Comparar). */}
              <span className="flex w-10 flex-none items-center justify-center" aria-hidden="true">
                {r.main ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={spriteUrl(r.main)} alt="" className="size-8 object-contain" loading="lazy" />
                    {r.secondary && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={spriteUrl(r.secondary)} alt="" className="-ml-3 size-6 object-contain" loading="lazy" />
                    )}
                  </>
                ) : (
                  // Sin Pokémon («Other»): hueco discreto. No se importa
                  // `OtherMark` de ui.tsx porque arrastraría lib/stats al cliente.
                  <span className="size-7 rounded-full border border-dashed border-line" />
                )}
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
