"use client";

import { useMemo, useState } from "react";
import { parseLiveHistory } from "@/lib/ptcglive";
import { importLiveMatches } from "@/actions";
import { Icon } from "./icons";

/* =========================================================================
   Pegar el historial de TCG Live y ver qué se ha entendido antes de guardar.

   La previsualización se calcula **en el navegador**, con el mismo parser que
   usa el servidor. Eso permite ver el resultado mientras se escribe, sin ida
   y vuelta. Lo que se guarda, en cambio, sale de volver a interpretar el
   texto en la Server Action: esto es comodidad, no la fuente de la verdad.

   El `playerId` que se le pasa al parser aquí es de mentira —solo entra en la
   clave de deduplicación, que en la previsualización no se usa para nada—. El
   bueno lo pone el servidor desde la cookie, que es el único sitio donde no
   se puede falsear.
   ========================================================================= */

const EJEMPLO = `fecha, mi mazo, mazo rival, resultado, rival, marcador
2026-09-14, Dragapult ex, Gardevoir ex, V, Marta, 2-1
2026-09-14, Dragapult ex, Charizard ex, D, Luis, 1-2
15/09/2026, Grimmsnarl ex, Raging Bolt ex, V, , 2-0`;

export function LiveImport() {
  const [texto, setTexto] = useState("");

  const vista = useMemo(
    () => (texto.trim() ? parseLiveHistory(texto, "preview") : null),
    [texto],
  );

  return (
    <form action={importLiveMatches} className="card p-4">
      <label className="label mb-1.5 block" htmlFor="texto">
        Pega aquí tus partidas
      </label>
      <textarea
        id="texto"
        name="texto"
        className="input"
        rows={8}
        placeholder={EJEMPLO}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        spellCheck={false}
      />

      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-semibold text-info">
          ¿En qué formato?
        </summary>
        <div className="mt-2 text-xs text-muted">
          <p>
            Una línea por partida. Separa con comas, punto y coma o tabuladores —si copias
            desde una hoja de cálculo y pegas, ya vienen con tabulador y no hay que tocar nada—.
          </p>
          <p className="mt-1.5">
            Con cabecera se reconocen las columnas por el nombre; sin ella se leen en este
            orden: <b>fecha, mi mazo, mazo rival, resultado, rival, marcador, formato</b>. Solo
            los cuatro primeros hacen falta, y del cuarto vale <b>V/D/E</b> o el marcador.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-line-soft bg-ground p-2 font-mono text-[11px] leading-relaxed">
{EJEMPLO}
          </pre>
          <button
            type="button"
            className="btn btn-sm mt-2"
            onClick={() => setTexto(EJEMPLO)}
          >
            Probar con el ejemplo
          </button>
        </div>
      </details>

      {vista && (
        <div className="mt-3 rounded-xl border border-line-soft bg-ground p-3">
          <p className="text-sm">
            Se han entendido <b className="tabular">{vista.rows.length}</b> partida
            {vista.rows.length === 1 ? "" : "s"}
            {vista.duplicatesInPaste > 0 && (
              <span className="text-muted">
                {" "}· {vista.duplicatesInPaste} repetida
                {vista.duplicatesInPaste === 1 ? "" : "s"} dentro del propio texto
              </span>
            )}
            .
          </p>

          {vista.rows.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {vista.rows.slice(0, 6).map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-[13px]">
                  <span className={`chip flex-none ${
                    r.result === "w" ? "chip-win" : r.result === "l" ? "chip-loss" : "chip-tie"
                  }`}>
                    {r.result === "w" ? "V" : r.result === "l" ? "D" : "E"}
                  </span>
                  <span className="font-mono text-[11px] text-muted">{r.date}</span>
                  <span className="min-w-0 truncate">
                    <b>{r.myDeck}</b>
                    {r.opponentDeck && <span className="text-muted"> vs {r.opponentDeck}</span>}
                    {r.gamesWon != null && (
                      <span className="tabular text-muted"> ({r.gamesWon}–{r.gamesLost})</span>
                    )}
                  </span>
                </li>
              ))}
              {vista.rows.length > 6 && (
                <li className="text-xs text-muted">y {vista.rows.length - 6} más…</li>
              )}
            </ul>
          )}

          {vista.problems.length > 0 && (
            <div className="mt-3 border-t border-line-soft pt-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-loss">
                <Icon name="alert" className="size-3.5" />
                {vista.problems.length} línea{vista.problems.length === 1 ? "" : "s"} sin entender
              </p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {vista.problems.slice(0, 4).map((p, i) => (
                  <li key={i} className="truncate text-[11px] text-muted">
                    línea {p.line}: {p.why} — <span className="font-mono">{p.text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[11px] text-muted">
                Las demás se importan igual; estas se quedan fuera y puedes arreglarlas y volver
                a pegarlas.
              </p>
            </div>
          )}
        </div>
      )}

      <button
        className="btn btn-brand mt-3 w-full sm:w-auto"
        type="submit"
        disabled={!vista?.rows.length}
      >
        <Icon name="plus" className="size-4" />
        Importar{vista?.rows.length ? ` ${vista.rows.length}` : ""}
      </button>

      <p className="mt-2 text-[11px] text-muted">
        Volver a pegar la hoja entera no duplica nada: lo que ya estaba se descarta solo. Estas
        partidas <b>no cuentan</b> para el ranking, el Elo ni los CP de la liga.
      </p>
    </form>
  );
}
