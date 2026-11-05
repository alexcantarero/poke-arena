"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { NIVELES_BALL } from "@/lib/logros";
import { urlDeObjeto } from "@/lib/objetos";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   v0.106 — La Poké Ball del perfil, con su botón de información.

   Al pasar el ratón por la Ball (o al enfocarla con el teclado) aparece un
   botón «i»; en el móvil está siempre a la vista, y además MANTENER pulsada
   la Ball medio segundo abre lo mismo. Lo que abre es la escalera entera de
   Balls, de la peor a la mejor: las conseguidas en color, la tuya brillando
   y saltando, y las que faltan en silueta (sin destripar cuál es cada una,
   como en una Pokédex sin ver).

   <dialog> nativo: trae el foco atrapado, Escape y el fondo oscuro sin
   escribir nada de eso a mano. Al abrir se desplaza hasta tu Ball.
   ========================================================================= */
export function BallConInfo({ ball, puntos, alt, size = 56 }: { ball: string; puntos: number; alt: string; size?: number }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const dlg = useRef<HTMLDialogElement>(null);
  const lista = useRef<HTMLOListElement>(null);
  const [abierto, setAbierto] = useState(false);
  const pulsando = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actual = Math.max(0, NIVELES_BALL.findIndex((n) => n.ball === ball));

  const abrir = () => {
    const d = dlg.current;
    if (!d || d.open) return;
    d.showModal();
    setAbierto(true);
  };
  useEffect(() => {
    if (!abierto) return;
    const fila = lista.current?.querySelector<HTMLElement>("[data-estado=actual]");
    fila?.scrollIntoView({ block: "center" });
  }, [abierto]);

  const empieza = () => { pulsando.current = setTimeout(abrir, 550); };
  const suelta = () => { if (pulsando.current) clearTimeout(pulsando.current); pulsando.current = null; };
  const hasta = NIVELES_BALL.length > 1 ? (actual / (NIVELES_BALL.length - 1)) * 100 : 100;

  return (
    <span className="ball-info" data-abierto={abierto}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={urlDeObjeto(ball)} alt={alt} width={size} height={size} className="ball-uso-img"
        style={{ width: size, height: size }}
        onPointerDown={empieza} onPointerUp={suelta} onPointerLeave={suelta} onPointerCancel={suelta}
        onContextMenu={(e) => e.preventDefault()} draggable={false} />
      <button type="button" className="ball-info-boton" onClick={abrir}
        aria-label={tr(lng, "ballInfo.abrir")} title={tr(lng, "ballInfo.abrir")} aria-haspopup="dialog">i</button>

      <dialog ref={dlg} className="balls-dialogo" aria-labelledby="balls-titulo" onClose={() => setAbierto(false)}
        onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
        <div className="balls-cabecera">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{tr(lng, "ballInfo.pre")}</p>
          <h2 id="balls-titulo" className="font-display text-2xl font-black">{tr(lng, "ballInfo.titulo")}</h2>
          <p className="mt-1 text-xs text-ink-2">
            {trf(lng, "ballInfo.sub", { n: NIVELES_BALL.length, a: actual + 1, p: puntos })}
          </p>
          <form method="dialog" className="absolute right-3 top-3">
            <button className="btn btn-ghost btn-sm" aria-label={tr(lng, "ballInfo.cerrar")}>✕</button>
          </form>
        </div>
        {abierto && (
          <ol ref={lista} className="balls-lista" style={{ "--hasta": `${hasta.toFixed(1)}%` } as CSSProperties}>
            {NIVELES_BALL.map((n, i) => {
              const estado = i < actual ? "hecha" : i === actual ? "actual" : "bloqueada";
              const nombre = tr(lng, `logro.ball.${n.ball}`);
              return (
                <li key={n.ball} className="balls-fila" data-estado={estado} style={{ "--i": i } as CSSProperties}
                  aria-current={estado === "actual" ? "step" : undefined}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urlDeObjeto(n.ball)} alt="" className="balls-img" loading="lazy" />
                  <span className="min-w-0 flex-1">
                    <span className="balls-nombre block">{estado === "bloqueada" && i > actual + 1 ? "???" : nombre}</span>
                    <span className="block font-mono text-[11px] tabular text-muted">
                      {trf(lng, "ballInfo.desde", { n: n.desde })}
                      {estado === "actual" && ` · ${tr(lng, "ballInfo.tuya")}`}
                      {estado === "bloqueada" && i === actual + 1 && ` · ${trf(lng, "ballInfo.faltan", { n: Math.max(0, n.desde - puntos) })}`}
                    </span>
                  </span>
                  <span className="flex-none font-mono text-[10px] tabular text-muted">#{i + 1}</span>
                </li>
              );
            })}
          </ol>
        )}
      </dialog>
    </span>
  );
}
