/* =========================================================================
   v0.134 — LO LEGAL: política de privacidad, condiciones de uso y borrado de
   la cuenta.

   Sin imports, para probarlo.

   AVISO: los textos de `/privacidad` y `/condiciones` son un punto de partida
   razonable para una liga de aficionados, no asesoramiento jurídico. Antes de
   abrir la app al público, que los revise alguien que sepa.

   Quién responde de los datos y cómo contactarle NO va escrito en el código:
   sale de dos variables de entorno, para que sea verdad en cada despliegue.
     LEGAL_RESPONSABLE   nombre de quien lleva la liga (persona o asociación)
     LEGAL_CONTACTO      un correo para ejercer derechos
   ========================================================================= */

export const LEGAL_ACTUALIZADO = "2026-11-16";

export function datosLegales(env: Record<string, string | undefined>): { responsable: string; contacto: string; completo: boolean } {
  const responsable = (env.LEGAL_RESPONSABLE ?? "").trim();
  const contacto = (env.LEGAL_CONTACTO ?? "").trim();
  return {
    responsable: responsable || "la organización de la liga",
    contacto: contacto || "el organizador de la liga, dentro de la propia aplicación o por el canal de Discord",
    completo: Boolean(responsable && contacto),
  };
}

/**
 * BORRAR MI CUENTA = ANONIMIZAR. Lo que se le pone a la fila del jugador.
 *
 * No se borra la fila: sus partidas son también las de sus rivales, y sin ellas
 * el Elo y las clasificaciones de los demás dejarían de cuadrar. Lo que se
 * hace es quitarle todo lo que le identifica: nombre, correo, contraseña,
 * avatar, biografía, nicks, puestos oficiales y rango del ladder. Queda un
 * «Jugador eliminado» que no puede entrar. Es irreversible.
 */
export function cuentaAnonima(id: string, versionSesion: number) {
  const sufijo = id.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase() || "0000";
  return {
    name: `Jugador eliminado ${sufijo}`,
    email: null,
    passwordHash: null,
    role: "player",
    active: false,
    sessionVersion: versionSesion + 1, // echa cualquier sesión abierta en otro dispositivo
    avatarKind: "none",
    avatarValue: "",
    bio: "",
    favoriteArchetypeId: null,
    playerTag: null,
    limitlessHandle: null,
    ladderElo: null,
    ladderNote: "",
    rankSpain: null,
    rankEurope: null,
    profileTitle: "",
  } as const;
}
