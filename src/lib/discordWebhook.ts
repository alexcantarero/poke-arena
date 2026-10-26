/* =========================================================================
   v0.68 — Por qué no llegaba nada a Discord.

   Sin imports, para probarlo. Antes, `enviar` devolvía true/false y el botón
   de prueba decía «no se ha mandado» por CUATRO motivos que no se podían
   distinguir: no había nada que contar (ninguna pendiente), la variable no
   estaba, la URL no pasaba el filtro o Discord respondía con error. Y el
   filtro era demasiado estricto: rechazaba en silencio las URL copiadas desde
   Discord PTB o Canary, las de `/api/v10/webhooks/…` y cualquier variable
   pegada con comillas, espacios o un salto de línea al final.
   ========================================================================= */

export type MotivoDiscord =
  | "ok" | "sinVariable" | "urlRara" | "nadaQueContar" | "red"
  | "noAutorizado" | "noExiste" | "limite" | "rechazado";

/** La URL limpia (sin comillas ni espacios) si es un webhook de Discord; null si no. */
export function normalizarWebhook(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const limpia = raw.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  const ok = /^https:\/\/(?:(?:ptb|canary)\.)?(?:discord|discordapp)\.com\/api\/(?:v\d+\/)?webhooks\/\d+\/[\w-]+(?:\?.*)?$/.test(limpia);
  return ok ? limpia : null;
}

/** Qué significa la respuesta HTTP de Discord. */
export function motivoDeEstado(status: number): MotivoDiscord {
  if (status >= 200 && status < 300) return "ok";
  if (status === 401 || status === 403) return "noAutorizado";
  if (status === 404) return "noExiste";
  if (status === 429) return "limite";
  return "rechazado";
}
