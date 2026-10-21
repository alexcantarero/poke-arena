"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/i18n";

/* =========================================================================
   v0.56 — Bienvenida para jugadores nuevos: tres pasos y ya.

   Sale solo a quien se dio de alta hace menos de 30 días (`nuevo`, lo decide
   el servidor) y UNA vez: al terminarla o saltarla se apunta en el navegador
   y no vuelve. Hasta montar no se pinta nada: el servidor no puede saber qué
   hay guardado en el navegador, y así no hay parpadeo ni desajuste.
   ========================================================================= */

const CLAVE = "arena-bienvenida-vista";

export function Bienvenida({ nuevo }: { nuevo: boolean }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const [visible, setVisible] = useState(false);
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    if (!nuevo) return;
    try { if (!localStorage.getItem(CLAVE)) setVisible(true); } catch { /* sin almacenamiento: no se enseña */ }
  }, [nuevo]);

  const cerrar = () => {
    try { localStorage.setItem(CLAVE, "1"); } catch { /* da igual */ }
    setVisible(false);
  };
  if (!visible) return null;

  const pasos = [
    { titulo: "bv.p1", texto: "bv.p1t", href: "/perfil/editar", boton: "bv.p1b" },
    { titulo: "bv.p2", texto: "bv.p2t", href: "/mazos/nuevo", boton: "bv.p2b" },
    { titulo: "bv.p3", texto: "bv.p3t", href: "/partidas/nueva", boton: "bv.p3b" },
  ];
  const p = pasos[paso];

  return (
    <section className="card mb-4 border-brand/50 p-4" aria-labelledby="bienvenida-titulo">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="bienvenida-titulo" className="font-display text-lg font-bold">{tr(lng, "bv.titulo")}</h2>
        <span className="text-xs text-muted tabular">{paso + 1} / {pasos.length}</span>
      </div>
      <div className="mb-3 flex gap-1" aria-hidden="true">
        {pasos.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= paso ? "bg-brand" : "bg-surface-2"}`} />)}
      </div>
      <h3 className="font-semibold">{tr(lng, p.titulo)}</h3>
      <p className="mt-1 text-sm text-ink-2">{tr(lng, p.texto)}</p>
      {paso === 2 && (
        // El modo rápido, en pequeño: así se reconoce al llegar al formulario.
        <div className="mt-3 grid grid-cols-4 gap-1.5" aria-hidden="true">
          {["2–0", "2–1", "1–2", "0–2"].map((m, i) => (
            <span key={m} className={`rounded-lg border-2 border-line-soft bg-surface-2 py-1.5 text-center font-display font-extrabold ${i < 2 ? "text-win" : "text-loss"}`}>{m}</span>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={p.href} className="btn btn-brand btn-sm">{tr(lng, p.boton)}</Link>
        {paso < pasos.length - 1
          ? <button type="button" className="btn btn-sm" onClick={() => setPaso(paso + 1)}>{tr(lng, "bv.siguiente")}</button>
          : <button type="button" className="btn btn-sm" onClick={cerrar}>{tr(lng, "bv.listo")}</button>}
        <button type="button" className="ml-auto text-xs text-muted underline underline-offset-2" onClick={cerrar}>{tr(lng, "bv.saltar")}</button>
      </div>
    </section>
  );
}
