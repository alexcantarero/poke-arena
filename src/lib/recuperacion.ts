/* =========================================================================
   v0.67 — Recuperar la contraseña sin correo.

   Sin imports, como el resto de módulos que se prueban.

   La app no manda correos (ni tiene proveedor), así que la recuperación va
   como las invitaciones: un organizador genera un ENLACE de un solo uso para
   esa persona y se lo pasa por WhatsApp. Con él pone una contraseña nueva.

   Reglas que aquí se fijan y se prueban:
     · El enlace caduca a las 24 horas y vale una sola vez.
     · En la base se guarda el HASH del token, nunca el token: quien lea la
       tabla no puede usar los enlaces pendientes.
     · Al usarlo, la cuenta sube su `session_version`: cualquier sesión abierta
       con la contraseña vieja (el móvil perdido, el PC de otro) deja de valer.
   ========================================================================= */

export const RECUPERACION_HORAS = 24;

export type EstadoRecuperacion =
  | { ok: true }
  | { ok: false; motivo: "noExiste" | "usado" | "caducado" };

export function estadoRecuperacion(
  fila: { expiresAt: Date; usedAt: Date | null } | null | undefined,
  ahora: Date = new Date(),
): EstadoRecuperacion {
  if (!fila) return { ok: false, motivo: "noExiste" };
  if (fila.usedAt) return { ok: false, motivo: "usado" };
  if (fila.expiresAt.getTime() <= ahora.getTime()) return { ok: false, motivo: "caducado" };
  return { ok: true };
}

/** Cuándo caduca un enlace creado ahora. */
export const caducidadRecuperacion = (ahora: Date = new Date()) =>
  new Date(ahora.getTime() + RECUPERACION_HORAS * 3600_000);

/**
 * ¿Sigue valiendo una sesión? La cookie lleva la versión de la cuenta del
 * momento en que se emitió; si la cuenta ya va por otra (se cambió o se
 * recuperó la contraseña), la sesión es de antes y se cierra. Las cookies
 * antiguas sin versión cuentan como la 1, que es con la que nacen las cuentas.
 */
export const sesionVigente = (versionCookie: number | null | undefined, versionCuenta: number) =>
  (versionCookie ?? 1) === versionCuenta;

/** Lo que se pega en el enlace se queda en el token aunque llegue la URL entera. */
export const limpiarToken = (texto: string) =>
  texto.trim().replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop() ?? "";

/** Lo que devuelve al organizador la acción que crea un enlace. */
export type EstadoEnlace = { error?: string; enlace?: string; nombre?: string } | null;
