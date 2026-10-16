"use client";

import { useEffect, useState } from "react";
import { ballAlAzar, urlDeBall, type Ball } from "@/lib/balls";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   La pantalla de carga: una Ball en el centro y un círculo blanco girando.

   v0.46. Sale en cualquier pantalla mientras el servidor contesta (lo pinta
   Next solo, desde los `loading.tsx`), incluido al cambiar de pestaña.

   Cuatro decisiones:

   · **Sobre una ficha oscura.** El círculo es blanco, y blanco sobre el fondo
     claro de la app no se vería. La ficha oscura hace que se lea igual en el
     tema de día y en el de noche.
   · **La Ball se elige después de montar**, no al pintar. Si se eligiera al
     pintar, el servidor y el navegador sacarían una distinta y React se
     quejaría de que no coinciden. Mientras tanto se ve el círculo, que es lo
     importante.
   · **Aparece con un pequeño retraso** (150 ms). Cuando el servidor contesta
     rápido, sin esto la pantalla parpadearía: un fogonazo de Ball y fuera.
   · **Con las animaciones apagadas se sigue viendo.** La regla global de la
     v0.22 deja cada animación en su ÚLTIMO fotograma, y el de todas estas es
     visible (opacidad 1, giro completo). Es justo el fallo que hubo con el
     easter egg de la v0.40, y aquí está evitado desde el diseño.
   ========================================================================= */

export function CargandoBall({ texto = "Cargando…" }: { texto?: string }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const [ball, setBall] = useState<Ball | null>(null);
  const [rota, setRota] = useState(false);

  useEffect(() => { setBall(ballAlAzar()); }, []);

  return (
    <div
      className="cargando-ball flex min-h-[55dvh] flex-col items-center justify-center gap-3"
      role="status" aria-live="polite"
    >
      <div className="shell-dark relative grid size-28 place-items-center rounded-full shadow-[var(--shadow-2)]">
        {/* El círculo: pista tenue y un arco blanco que gira. */}
        <span className="absolute inset-2 rounded-full border-[3px] border-white/15" aria-hidden="true" />
        <span className="cargando-arco absolute inset-2 rounded-full border-[3px] border-transparent border-t-white" aria-hidden="true" />
        {ball && !rota && (
          <img
            src={urlDeBall(ball)} alt="" aria-hidden="true"
            width={56} height={56}
            // Son sprites de 30 px: ampliados sin suavizar se ven nítidos.
            className="cargando-sprite relative size-14 object-contain [image-rendering:pixelated]"
            onError={() => setRota(true)}
          />
        )}
      </div>
      <span className="text-xs font-semibold text-muted">{texto}</span>
    </div>
  );
}
