import type { Estacion } from "@/lib/estacion";

/* =========================================================================
   v0.22 — Partículas de temporada al fondo (hojas en otoño, nieve en
   invierno, pétalos en primavera, destellos en verano; calabazas en
   Halloween, nieve y estrellas en Navidad).

   Capa fija DETRÁS del contenido (`z-index: 0`, las tarjetas son opacas), sin
   eventos de puntero y sin JavaScript: posiciones y tiempos salen del índice,
   así el servidor y el cliente pintan lo mismo. Se apaga con el ajuste
   «Animaciones: no» y con «reducir movimiento» del sistema (ver globals.css).
   ========================================================================= */

const N = 12;

export function SeasonFx({ estacion }: { estacion: Estacion }) {
  return (
    <div className="season-fx" aria-hidden="true">
      {Array.from({ length: N }, (_, i) => {
        const p = estacion.particulas[i % estacion.particulas.length];
        // Reparto «a mano» por el ancho, tamaños y tiempos distintos.
        const left = (i * 37 + 7) % 100;
        const dur = 14 + ((i * 5) % 11);       // 14–24 s
        const delay = -((i * 3.7) % dur);       // empiezan ya repartidas
        const size = 12 + ((i * 7) % 12);       // 12–23 px
        const drift = ((i % 2 ? 1 : -1) * (20 + ((i * 13) % 50)));
        return (
          <span key={i} className="season-p"
            style={{
              left: `${left}%`, fontSize: `${size}px`,
              animationDuration: `${dur}s`, animationDelay: `${delay}s`,
              ["--drift" as string]: `${drift}px`,
            }}>
            {p}
          </span>
        );
      })}
    </div>
  );
}
