"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* v0.116 — «Abierta la inscripción a la liga»: arriba de todas las páginas,
   para quien aún no se ha apuntado. Lleva directo a apuntarse. Sale hasta que
   te apuntas o se cierra la inscripción; la ✕ lo esconde en ESTE navegador
   (se recuerda por temporada, con try/catch por si el almacenamiento falla). */
export function AvisoLiga({ id, nombre }: { id: string; nombre: string }) {
  const lng = useLang();
  const clave = `arena-aviso-liga-${id}`;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try { setVisible(localStorage.getItem(clave) !== "1"); } catch { setVisible(true); }
  }, [clave]);
  if (!visible) return null;
  return (
    <div className="aviso-liga mb-3" role="status">
      <span className="aviso-liga-texto">{trf(lng, "v116.aviso", { n: nombre })}</span>
      <Link href="/divisiones" className="btn btn-brand btn-sm">{tr(lng, "v116.apuntarme")}</Link>
      <button type="button" className="aviso-liga-cerrar" aria-label={tr(lng, "v116.avisoCerrar")}
        onClick={() => { try { localStorage.setItem(clave, "1"); } catch { /* sin almacenamiento */ } setVisible(false); }}>
        ✕
      </button>
    </div>
  );
}
