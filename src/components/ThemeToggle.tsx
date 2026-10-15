"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { spriteUrl } from "@/lib/pokemon";
import { pokemonDelTema, registrarClic } from "@/lib/rafaga";

/**
 * Interruptor de tema. El valor inicial lo pone el script del layout antes de
 * pintar; aquí solo se lee lo que ya hay, para no provocar un parpadeo.
 *
 * v0.40 — con dos easter eggs:
 *
 *   · Cada clic saca a **Solrock** si pasas a día o a **Lunatone** si pasas a
 *     noche, que asoma junto al botón y se va.
 *   · Si lo machacas (cinco clics en dos segundos y medio), **Tadbulb**
 *     revienta. La regla de qué cuenta como machacar está en `lib/rafaga.ts`,
 *     probada aparte.
 *
 * Los Pokémon NO se dibujan: son los mismos sprites del CDN que la app ya usa
 * para cada arquetipo (`spriteUrl`). Dibujarlos sería copiar un diseño de
 * Pokémon, que es la regla que se fijó en la v0.11 con el marcador de
 * «Other». Lo único propio es la animación, que es CSS genérico.
 *
 * Las animaciones obedecen al ajuste de Apariencia y a «reducir movimiento».
 * Ojo: la regla global de la v0.22 NO basta aquí, porque deja cada animación
 * en su último fotograma, y el último de estas es opacidad 0. `globals.css`
 * lleva una excepción para que, con el movimiento apagado, el sprite salga
 * quieto en vez de no salir. Lo retira un temporizador de JavaScript, no el
 * final de la animación, así que se va igual en los dos casos.
 *
 * v0.41 — los dos se pintan con un PORTAL en el `<body>`. El botón vive dentro
 * de la barra lateral (`sticky` con `overflow-y-auto`) y de la cabecera móvil
 * (`sticky z-30`). El `overflow` recortaba lo que sobresalía —por eso Solrock
 * «se iba de la pantalla»— y el `sticky` crea un contexto de apilamiento del
 * que ningún `z-index` puede escapar —por eso Tadbulb quedaba detrás de los
 * menús—. Fuera de ese contenedor, las dos cosas se arreglan solas.
 */

type Aparicion =
  | { tipo: "tema"; slug: "solrock" | "lunatone"; id: number; x: number; y: number; arriba: boolean }
  | { tipo: "boom"; id: number };

/** Lo que mide el sprite y lo que necesita de hueco para asomar sin salirse. */
const SPRITE = 48;
const HUECO = SPRITE + 24;

/** Lo que dura en pantalla cada aparición, en ms. */
const DURACION = { tema: 1300, boom: 1700 } as const;

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  const [aparicion, setAparicion] = useState<Aparicion | null>(null);
  const historial = useRef<number[]>([]);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contador = useRef(0);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
    return () => { if (temporizador.current) clearTimeout(temporizador.current); };
  }, []);

  function mostrar(a: Aparicion) {
    if (temporizador.current) clearTimeout(temporizador.current);
    setAparicion(a);
    temporizador.current = setTimeout(() => setAparicion(null), DURACION[a.tipo]);
  }

  function toggle() {
    const next = !(document.documentElement.dataset.theme === "dark");
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try { localStorage.setItem("arena-theme", next ? "dark" : "light"); } catch { /* modo privado */ }
    setDark(next);

    const r = registrarClic(historial.current, Date.now());
    historial.current = r.historial;
    contador.current += 1;

    // La ráfaga manda sobre el Pokémon del tema: si las dos cosas pasan en el
    // mismo clic, lo que se ha ganado es la explosión.
    if (r.rafaga) {
      mostrar({ tipo: "boom", id: contador.current });
      return;
    }

    /* Hacia ARRIBA del botón, que es donde se ve: en la barra lateral el
       botón está abajo del todo, y salir por debajo era salirse de la
       pantalla. Si arriba no hay sitio —en el móvil el botón está en la
       cabecera, pegado al borde superior— se asoma por debajo. */
    const rect = boton.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const arriba = rect ? rect.top > HUECO : false;
    const y = rect ? (arriba ? rect.top - SPRITE - 6 : rect.bottom + 6) : 80;
    mostrar({ tipo: "tema", slug: pokemonDelTema(next), id: contador.current, x, y, arriba });
  }

  return (
    <span className="relative inline-flex">
      <button
        ref={boton} type="button" onClick={toggle}
        className="btn btn-ghost btn-sm px-2"
        aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
        title={dark ? "Tema claro" : "Tema oscuro"}
      >
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          {dark ? (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
            </>
          ) : (
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
          )}
        </svg>
      </button>

      {aparicion?.tipo === "tema" && createPortal(
        // `key` con el id: un clic nuevo reinicia la animación en vez de
        // dejar la anterior a medias.
        <img
          key={aparicion.id}
          src={spriteUrl(aparicion.slug)}
          alt=""
          aria-hidden="true"
          className={`pointer-events-none fixed z-[100] -translate-x-1/2 object-contain
            ${aparicion.arriba ? "pkmn-asoma-arriba" : "pkmn-asoma-abajo"}`}
          style={{ left: aparicion.x, top: aparicion.y, width: SPRITE, height: SPRITE }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />,
        document.body,
      )}

      {aparicion?.tipo === "boom" && createPortal(
        <span key={aparicion.id} className="pointer-events-none fixed inset-0 z-[100] grid place-items-center" aria-hidden="true">
          {/* Un único destello, suave y radial: NO un fogonazo blanco a
              pantalla completa. Quien llega aquí acaba de cambiar el tema
              cinco veces seguidas, y la pantalla ya ha parpadeado bastante. */}
          <span className="pkmn-destello absolute inset-0" />
          <span className="relative grid place-items-center">
            <img
              src={spriteUrl("tadbulb")}
              alt=""
              className="pkmn-boom size-28 object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
            {/* Las chispas son puntos de color, no partes del Pokémon. */}
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className="pkmn-chispa absolute size-2.5 rounded-full"
                style={{ "--angulo": `${i * 30}deg` } as React.CSSProperties}
              />
            ))}
          </span>
        </span>,
        document.body,
      )}
    </span>
  );
}
