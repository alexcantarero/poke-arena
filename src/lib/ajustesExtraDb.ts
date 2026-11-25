import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ajustesExtra } from "@/db/schema";

/* =========================================================================
   v0.135 — Ajustes sueltos (tabla `ajustes_extra`, migración 0037). Con
   try/catch: sin la migración, se leen los valores por defecto y guardar
   avisa en el registro del servidor.
   ========================================================================= */

export const REGISTRO_LIBRE = "registro_libre";

export async function leerAjuste(clave: string): Promise<string | null> {
  try {
    const [f] = await db.select({ v: ajustesExtra.valor }).from(ajustesExtra).where(eq(ajustesExtra.clave, clave)).limit(1);
    return f?.v ?? null;
  } catch {
    return null;
  }
}

export async function guardarAjuste(clave: string, valor: string): Promise<boolean> {
  try {
    await db.insert(ajustesExtra).values({ clave, valor }).onConflictDoUpdate({ target: ajustesExtra.clave, set: { valor } });
    return true;
  } catch (e) {
    console.warn("[ajustes] no se ha podido guardar (¿falta la migración 0037?)", e instanceof Error ? e.message : e);
    return false;
  }
}

/** ¿Se puede crear cuenta SIN invitación? Por defecto, no. */
export async function registroLibre(): Promise<boolean> {
  return (await leerAjuste(REGISTRO_LIBRE)) === "1";
}
