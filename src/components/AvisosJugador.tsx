"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { tocaAvisarReset, tocaPedirNick, tocaRecordarLadder } from "@/lib/recordatorios";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* v0.120 — Dos recordatorios para cada jugador, arriba de la app:
   1. el nick de Limitless (importante: sin él no se traen sus torneos online);
   2. una vez por semana, actualizar el rango del ladder.
   3. v0.124 — tras un RESET del ladder, un aviso destacado a quien todavía no
      ha puesto su rango nuevo (tres semanas como mucho). Mientras sale, el
      recordatorio semanal se calla: dirían lo mismo dos veces.
   La decisión vive en `lib/recordatorios.ts`; aquí solo se recuerda en este
   navegador cuándo se pospuso (con try/catch: sin almacenamiento, se enseña). */
export function AvisosJugador({ playerId, nick, ladderActualizado, ladderReset = null, ladderRango = null }: {
  playerId: string; nick: string | null; ladderActualizado: string | null;
  /** v0.124 — cuándo fue el último reset del ladder y el rango que tiene ahora (null = sin poner). */
  ladderReset?: string | null; ladderRango?: number | null;
}) {
  const lng = useLang();
  const kNick = `arena-aviso-nick-${playerId}`, kLadder = `arena-aviso-ladder-${playerId}`, kReset = `arena-aviso-reset-${playerId}`;
  const [ver, setVer] = useState({ nick: false, ladder: false, reset: false });
  useEffect(() => {
    const leer = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
    const ahora = Date.now();
    const reset = tocaAvisarReset(ladderReset, ladderRango, leer(kReset), ahora);
    setVer({
      nick: tocaPedirNick(nick, leer(kNick), ahora),
      ladder: !reset && tocaRecordarLadder(ladderActualizado, leer(kLadder), ahora),
      reset,
    });
  }, [nick, ladderActualizado, ladderReset, ladderRango, kNick, kLadder, kReset]);
  const posponer = (k: string, cual: "nick" | "ladder" | "reset") => {
    try { localStorage.setItem(k, new Date().toISOString()); } catch { /* sin almacenamiento */ }
    setVer((v) => ({ ...v, [cual]: false }));
  };
  if (!ver.nick && !ver.ladder && !ver.reset) return null;
  return (
    <div className="mb-3 flex flex-col gap-2">
      {ver.reset && (
        <div className="aviso-jugador" data-tono="importante" role="alert">
          <span className="aviso-jugador-texto"><b>{tr(lng, "v124.resetTitulo")}</b> {tr(lng, "v124.resetTexto")}</span>
          <Link href={`/perfil/${playerId}#ladder`} className="btn btn-brand btn-sm">{tr(lng, "v124.resetBoton")}</Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => posponer(kReset, "reset")}>{tr(lng, "v120.masTarde")}</button>
        </div>
      )}
      {ver.nick && (
        <div className="aviso-jugador" data-tono="importante" role="alert">
          <span className="aviso-jugador-texto"><b>{tr(lng, "v120.nickTitulo")}</b> {tr(lng, "v120.nickTexto")}</span>
          <Link href="/perfil/editar#limitlessHandle" className="btn btn-brand btn-sm">{tr(lng, "v120.nickBoton")}</Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => posponer(kNick, "nick")}>{tr(lng, "v120.masTarde")}</button>
        </div>
      )}
      {ver.ladder && (
        <div className="aviso-jugador" role="status">
          <span className="aviso-jugador-texto"><b>{tr(lng, "v120.ladderTitulo")}</b> {tr(lng, "v120.ladderTexto")}</span>
          <Link href={`/perfil/${playerId}#ladder`} className="btn btn-sm">{tr(lng, "v120.ladderBoton")}</Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => posponer(kLadder, "ladder")}>{tr(lng, "v120.semanaQueViene")}</button>
        </div>
      )}
    </div>
  );
}
