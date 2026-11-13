"use client";

import { useMemo, useState } from "react";
import { guardarPuestosOficiales } from "@/actions";
import { casarJugadores, parseClasificacion, type JugadorACasar } from "@/lib/leaderboard";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* v0.124 — Pegar la clasificación oficial (España o Europa) y apuntar los
   puestos de la gente del grupo de una vez. Solo organizadores.

   Lo pegado se analiza AQUÍ, en el navegador (`lib/leaderboard.ts`). Al
   servidor viaja únicamente `[{ id, puesto }]` de quien es del grupo: el resto
   de nombres de la clasificación no sale de esta pantalla. No se consulta
   pokemon.com: sus condiciones prohíben la extracción automatizada. */
export function LeaderboardImport({ jugadores }: { jugadores: JugadorACasar[] }) {
  const lng = useLang();
  const [texto, setTexto] = useState("");
  const pegado = useMemo(() => parseClasificacion(texto), [texto]);
  const r = useMemo(() => casarJugadores(pegado.filas, jugadores), [pegado, jugadores]);
  const zona = pegado.zona;
  const hay = pegado.filas.length > 0;
  const mayor = hay ? Math.max(...pegado.filas.map((f) => f.puesto)) : 0;

  return (
    <form action={guardarPuestosOficiales} className="flex flex-col gap-3">
      <p className="text-sm text-muted">{tr(lng, "v124.lbAyuda")}</p>
      <textarea
        className="input min-h-32 font-mono text-xs" value={texto} onChange={(e) => setTexto(e.target.value)}
        aria-label={tr(lng, "v124.lbTitulo")} placeholder={"82\tIbai Montero (ESP)\t108\t10"}
      />
      <input type="hidden" name="zona" value={zona ?? ""} />
      <input type="hidden" name="puestos" value={JSON.stringify(r.casados.map((c) => ({ id: c.id, puesto: c.puesto })))} />

      {texto.trim() && !hay && <p role="status" className="text-sm font-semibold text-loss">{tr(lng, "v124.lbNoFilas")}</p>}

      {hay && (
        <div className="flex flex-col gap-2 rounded-lg border border-line-soft p-3" role="status">
          <p className="text-sm">
            <b>{tr(lng, zona === "es" ? "zone.spain" : "zone.europe")}</b>{" · "}
            {trf(lng, "v124.lbResumen", { n: pegado.filas.length, m: mayor, c: r.casados.length })}
            {pegado.actualizado && <span className="text-muted"> · {pegado.actualizado}</span>}
          </p>
          {r.casados.length > 0 && (
            <ul className="flex flex-col divide-y divide-line-soft text-sm">
              {r.casados.map((c) => (
                <li key={c.id} className="flex items-center gap-2 py-1.5">
                  <span className="w-12 flex-none text-right font-mono font-bold tabular">{c.puesto}.º</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{c.nombre}
                    {c.como !== c.nombre && <span className="ml-1.5 font-normal text-muted">{c.como}</span>}
                  </span>
                  <span className="flex-none font-mono text-xs text-muted tabular">{c.cp} CP</span>
                </li>
              ))}
            </ul>
          )}
          {r.ambiguos.length > 0 && (
            <p className="text-xs font-semibold text-loss">{tr(lng, "v124.lbAmbiguos")} {r.ambiguos.map((a) => a.nombre).join(", ")}.</p>
          )}
          {r.sinSalir.length > 0 && (
            <details className="text-xs text-muted">
              <summary className="cursor-pointer font-semibold">{trf(lng, "v124.lbSinSalir", { n: r.sinSalir.length })}</summary>
              <p className="mt-1">{r.sinSalir.map((s) => (s.conOficial ? s.nombre : `${s.nombre}*`)).join(", ")}.</p>
              <p className="mt-1">{tr(lng, "v124.lbSinSalirNota")}</p>
            </details>
          )}
        </div>
      )}

      <button className="btn btn-brand w-full sm:w-fit" type="submit" disabled={!zona || r.casados.length === 0}>
        {r.casados.length ? trf(lng, "v124.lbGuardar", { n: r.casados.length }) : tr(lng, "v124.lbGuardarVacio")}
      </button>
    </form>
  );
}
