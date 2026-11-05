"use client";

import { useEffect, useState } from "react";
import { marcarAsistencia } from "@/actions";
import { useLang } from "@/components/LangProvider";
import type { EstadoAsistencia } from "@/lib/asistencia";
import { tr } from "@/lib/i18n";

const TONO_ASIS: Record<EstadoAsistencia, { color: string; simbolo: string }> = {
  si: { color: "var(--color-win)", simbolo: "✓" },
  quiza: { color: "var(--color-brand)", simbolo: "?" },
  no: { color: "var(--color-loss)", simbolo: "✕" },
};

export function AsistenciaBotones({ elemento, estado }: {
  elemento: string;
  estado: EstadoAsistencia | null;
}) {
  const lng = useLang();
  const [actual, setActual] = useState(estado);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => setActual(estado), [estado]);

  const guardar = async (pulsado: EstadoAsistencia) => {
    if (pendiente) return;
    const anterior = actual;
    const nuevo = anterior === pulsado ? null : pulsado;
    setActual(nuevo);
    setError(false);
    setPendiente(true);

    try {
      const resultado = await marcarAsistencia(elemento, nuevo);
      if (!resultado.ok) {
        setActual(anterior);
        setError(true);
      }
    } catch {
      setActual(anterior);
      setError(true);
    } finally {
      setPendiente(false);
    }
  };

  return (
    <div className="px-4 pb-3 sm:pl-28" aria-busy={pendiente}>
      <div className="flex flex-wrap items-center gap-1.5">
        {(Object.keys(TONO_ASIS) as EstadoAsistencia[]).map((estadoBoton) => {
          const tono = TONO_ASIS[estadoBoton];
          const activo = actual === estadoBoton;
          return (
            <button
              key={estadoBoton}
              type="button"
              aria-pressed={activo}
              disabled={pendiente}
              onClick={() => void guardar(estadoBoton)}
              className="chip min-h-9 px-3 text-xs font-semibold disabled:cursor-wait disabled:opacity-70"
              style={activo
                ? { background: tono.color, color: "var(--ground)", borderColor: "transparent" }
                : { borderColor: `color-mix(in oklab, ${tono.color} 45%, transparent)`, color: tono.color }}
            >
              <span aria-hidden="true">{tono.simbolo}</span> {tr(lng, `asis.b.${estadoBoton}`)}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-loss" role="alert">{tr(lng, "asis.error")}</p>}
    </div>
  );
}
