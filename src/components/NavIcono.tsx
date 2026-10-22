import { Icon } from "./icons";

/* v0.63 — El icono de una sección del menú: su emoji temático si lo tiene (el
   Centro Pokémon, el mapa, las medallas…) y si no, el icono de línea de
   siempre. Sin estado ni hooks: sirve igual en la barra (cliente) que en
   «Más» (servidor).

   El emoji no cambia de color con el tema, así que la sección activa se
   distingue por la pastilla de fondo y, aquí, porque las demás van un poco
   apagadas (`data-on`). La forma sigue diciendo cuál es la activa. */
export function NavIcono({
  emoji, icon, activo = false, className = "size-5", tam = "text-[1.15rem]",
}: { emoji?: string; icon: string; activo?: boolean; className?: string; tam?: string }) {
  if (!emoji) return <Icon name={icon} className={className} />;
  return (
    <span aria-hidden="true" data-on={activo ? "true" : "false"}
      className={`nav-emoji inline-grid flex-none place-items-center leading-none ${tam} ${className}`}>
      {emoji}
    </span>
  );
}
