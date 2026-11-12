"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { tocaPedirNick, tocaRecordarLadder } from "@/lib/recordatorios";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* v0.120 — Dos recordatorios para cada jugador, arriba de la app:
   1. el nick de Limitless (importante: sin él no se traen sus torneos online);
   2. una vez por semana, actualizar el rango del ladder.
   La decisión vive en `lib/recordatorios.ts`; aquí solo se recuerda en este
   navegador cuándo se pospuso (con try/catch: sin almacenamiento, se enseña). */
export function AvisosJugador({ playerId, nick, ladderActualizado }: {
  playerId: string; nick: string | null; ladderActualizado: string | null;
}) {
  const lng = useLang();
  const kNick = `arena-aviso-nick-${playerId}`, kLadder = `arena-aviso-ladder-${playerId}`;
  const [ver, setVer] = useState({ nick: false, ladder: false });
  useEffect(() => {
    const leer = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
    const ahora = Date.now();
    setVer({
      nick: tocaPedirNick(nick, leer(kNick), ahora),
      ladder: tocaRecordarLadder(ladderActualizado, leer(kLadder), ahora),
    });
  }, [nick, ladderActualizado, kNick, kLadder]);
  const posponer = (k: string, cual: "nick" | "ladder") => {
    try { localStorage.setItem(k, new Date().toISOString()); } catch { /* sin almacenamiento */ }
    setVer((v) => ({ ...v, [cual]: false }));
  };
  if (!ver.nick && !ver.ladder) return null;
  return (
    <div className="mb-3 flex flex-col gap-2">
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
