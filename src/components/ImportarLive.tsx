"use client";

import { useEffect, useMemo, useState } from "react";
import { anotarSesionLive } from "@/actions";
import { adivinarArquetipo, leerRegistros, quienSoy, type ArqCatalogo } from "@/lib/registroLive";
import { pokeSlug } from "@/lib/pokemon";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* v0.140 — Pegar los registros de batalla del PTCG Live (botón de exportar al
   final de cada partida) y que salgan solas las victorias y derrotas, con el
   mazo del rival adivinado. Se guardan como una sesión del Live de hoy (con
   su rango del ladder), igual que apuntándolas a mano. Se analiza aquí, en el
   navegador: el registro no sale del dispositivo. */
export function ImportarLive({ deckId, catalogo, hoy }: { deckId: string; catalogo: ArqCatalogo[]; hoy: string }) {
  const lng = useLang();
  const [texto, setTexto] = useState("");
  const [yo, setYo] = useState<string | null>(null);
  useEffect(() => { try { setYo(localStorage.getItem("arena-ptcgl-nick")); } catch { /* sin almacenamiento */ } }, []);
  const partidas = useMemo(() => leerRegistros(texto), [texto]);
  const nombres = useMemo(() => [...new Set(partidas.flatMap((p) => p.jugadores))], [partidas]);
  const soy = quienSoy(partidas, yo);
  const filas = partidas.map((p) => {
    const rival = soy ? p.jugadores.find((j) => j !== soy) ?? null : null;
    return {
      gane: soy && p.ganador ? p.ganador === soy : null,
      empece: soy && p.primero ? p.primero === soy : null,
      mazo: rival ? adivinarArquetipo(p.pokemon[rival] ?? [], catalogo, pokeSlug)?.name ?? null : null,
    };
  });
  const w = filas.filter((f) => f.gane === true).length, l = filas.filter((f) => f.gane === false).length;
  const elegir = (n: string) => { setYo(n); try { localStorage.setItem("arena-ptcgl-nick", n); } catch { /* nada */ } };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{tr(lng, "v140.live.ayuda")}</p>
      <textarea className="input min-h-28 font-mono text-xs" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label={tr(lng, "v140.live.titulo")} placeholder="Setup&#10;… drew 7 cards for the opening hand.&#10;…&#10;… wins." />
      {texto.trim() && partidas.length === 0 && <p className="text-sm text-loss">{tr(lng, "v140.live.nada")}</p>}
      {partidas.length > 0 && !soy && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>{tr(lng, "v140.live.quienEres")}</span>
          {nombres.map((n) => <button key={n} type="button" className="btn btn-sm" onClick={() => elegir(n)}>{n}</button>)}
        </div>
      )}
      {soy && partidas.length > 0 && (
        <>
          <ul className="divide-y divide-line-soft rounded-lg border border-line-soft text-sm">
            {filas.map((f, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="mt-letra" data-r={f.gane === true ? "w" : f.gane === false ? "l" : "n"}>{f.gane === true ? "V" : f.gane === false ? "D" : "?"}</span>
                <span className="min-w-0 flex-1 truncate">{f.mazo ?? tr(lng, "v140.live.mazoDesconocido")}</span>
                {f.empece != null && <span className="text-xs text-muted">{tr(lng, f.empece ? "v140.live.empece" : "v140.live.empezo")}</span>}
              </li>
            ))}
          </ul>
          <form action={anotarSesionLive} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="deckId" value={deckId} />
            <input type="hidden" name="back" value={`/mazos/${deckId}`} />
            <input type="hidden" name="wins" value={w} />
            <input type="hidden" name="losses" value={l} />
            <input type="hidden" name="desde" value={hoy} />
            <input type="hidden" name="hasta" value={hoy} />
            <span className="text-sm">{trf(lng, "v140.live.resumen", { n: partidas.length, w, l, yo: soy })}</span>
            <button className="btn btn-brand btn-sm" type="submit" disabled={w + l === 0}>{tr(lng, "v140.live.guardar")}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setYo(null); try { localStorage.removeItem("arena-ptcgl-nick"); } catch { /* nada */ } }}>{tr(lng, "v140.live.noSoy")}</button>
          </form>
        </>
      )}
    </div>
  );
}
