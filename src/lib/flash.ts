/**
 * Mensaje de feedback pegado a una URL de redirect.
 *
 * Una Server Action que hace `redirect()` no tiene otro sitio donde dejar un
 * "guardado correctamente": ya no hay turno de React donde volver una
 * respuesta, es directamente una redirección. Así que el mensaje viaja en la
 * URL de destino, el snackbar lo lee al montar la página siguiente y lo
 * quita de la URL enseguida —para que recargar o volver atrás con el
 * navegador no lo vuelva a enseñar—.
 *
 * No es una cookie a propósito: con cookie hay que decidir cuándo se borra
 * (¿la siguiente petición? ¿un timeout?) y con la URL el ciclo de vida es
 * exactamente el de esa navegación, sin estado que limpiar después.
 */
const FLASH_PARAM = "flash";

export type FlashKind = "ok" | "error";

/** Añade `?flash=tipo:mensaje` (o `&flash=...` si la ruta ya llevaba query) a una ruta interna. */
export function withFlash(path: string, kind: FlashKind, message: string): string {
  const encoded = encodeURIComponent(`${kind}:${message.slice(0, 300)}`);
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${FLASH_PARAM}=${encoded}`;
}

export function parseFlash(raw: string | null): { kind: FlashKind; message: string } | null {
  if (!raw) return null;
  const i = raw.indexOf(":");
  if (i < 0) return null;
  const kind: FlashKind = raw.slice(0, i) === "error" ? "error" : "ok";
  return { kind, message: raw.slice(i + 1) };
}

export { FLASH_PARAM };
