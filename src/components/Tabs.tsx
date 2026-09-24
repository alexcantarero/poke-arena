"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/* =========================================================================
   Pestañas con transición.

   Resuelve el punto de Alex: «que haya animaciones al transicionar entre los
   tabs, haciendo todo menos tosco».

   Se mueven dos cosas y ninguna más:

     1. El subrayado, que se desliza a la pestaña nueva.
     2. El panel, que entra por el lado del que vienes: desde la derecha si
        avanzas, desde la izquierda si vuelves.

   Lo segundo es lo que de verdad quita la sensación de salto — un simple
   fundido sigue pareciendo que la página se ha recargado. El sentido lo da la
   dirección, así que hay que saber de dónde vienes, y de ahí el estado `dir`.

   Con `prefers-reduced-motion` no se mueve nada: la regla global de
   `globals.css` deja las animaciones en 0,01 ms.

   Ojo: `ScopeTabs` sigue siendo la pieza correcta cuando las pestañas son
   navegación (se pueden compartir por URL y funcionan sin JavaScript). Esta es
   para cambiar de vista dentro de una misma pantalla, donde no hay nada que
   compartir.
   ========================================================================= */

export type TabDef = { id: string; label: string; badge?: ReactNode; panel: ReactNode };

export function Tabs({ tabs, initial }: { tabs: TabDef[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id ?? "");
  const [dir, setDir] = useState<1 | -1>(1);
  const listRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);

  const index = Math.max(0, tabs.findIndex((t) => t.id === active));
  const current = tabs[index];

  const go = (id: string) => {
    const to = tabs.findIndex((t) => t.id === id);
    if (to === -1 || to === index) return;
    setDir(to > index ? 1 : -1);
    setActive(id);
  };

  // El subrayado se mide del botón real: así funciona con cualquier texto y
  // en cualquier idioma, sin cuadrar anchuras a mano.
  useLayoutEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${active}"]`);
    if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1
      : e.key === "Home" ? -tabs.length : e.key === "End" ? tabs.length : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[Math.min(tabs.length - 1, Math.max(0, index + step))];
    if (next) {
      go(next.id);
      listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
    }
  };

  if (!current) return null;

  return (
    <div>
      <div
        ref={listRef} role="tablist" onKeyDown={onKeyDown}
        /* Aquí NO va `.scroll-x`.
        
           `.scroll-x` lleva `-mx-4` para que el contenido ancho llegue de
           borde a borde de la PÁGINA. Estas pestañas viven dentro de una
           tarjeta, y esa tarjeta tiene `overflow-hidden` para redondear sus
           esquinas: el margen negativo las sacaba 16px por cada lado y el
           recorte se comía la primera y la última. Eso es lo que se veía
           como «las pestañas se salen y se cortan».
        
           Con desplazamiento normal y relleno por dentro, se quedan dentro de
           la tarjeta y siguen deslizándose con el dedo cuando no caben.
           `overscroll-x-contain` evita además que al llegar al final el gesto
           se lo quede el navegador y te saque de la página. */
        className="relative flex gap-0.5 overflow-x-auto overscroll-x-contain border-b border-line px-1"
      >
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button" role="tab" data-tab={t.id}
              id={`tab-${t.id}`} aria-controls={`panel-${t.id}`}
              aria-selected={on} tabIndex={on ? 0 : -1}
              onClick={() => go(t.id)}
              className={`tap flex-none px-3.5 text-sm transition-colors
                ${on ? "font-bold text-ink" : "font-semibold text-muted hover:text-ink"}`}
            >
              {t.label}
              {t.badge != null && (
                <span className="rounded-full bg-surface-3 px-1.5 text-[11px] font-semibold tabular">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
        {bar && (
          <span
            aria-hidden="true"
            className="absolute -bottom-px h-0.5 rounded-full bg-brand transition-[transform,width] duration-250 ease-out"
            style={{ transform: `translateX(${bar.left}px)`, width: bar.width }}
          />
        )}
      </div>

      {/* `key` fuerza el remontaje, y es lo que dispara la animación de
          entrada. Sin él React reutiliza el nodo y no hay nada que animar. */}
      <div
        key={current.id}
        role="tabpanel" id={`panel-${current.id}`} aria-labelledby={`tab-${current.id}`}
        tabIndex={0}
        className={dir === 1 ? "tab-panel-in" : "tab-panel-in-back"}
      >
        {current.panel}
      </div>
    </div>
  );
}
