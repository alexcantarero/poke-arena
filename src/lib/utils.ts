/**
 * `cn` — juntar clases sin que se peleen.
 *
 * Lo pide shadcn/ui: todos sus componentes lo importan de aquí. Desde la
 * versión de septiembre de 2026 el CLI ya no instala `clsx` + `tailwind-merge`
 * por separado, sino el paquete `cn`, que hace las dos cosas; esto es
 * literalmente lo que genera `shadcn init`, escrito a mano para que el
 * proyecto compile sin haber pasado por el asistente.
 *
 * `tailwind.config` está vacío en `components.json` a propósito: con Tailwind
 * v4 la configuración vive en el CSS, y el propio shadcn dice que ese campo se
 * deje en blanco.
 */
export { cn } from "cn";
