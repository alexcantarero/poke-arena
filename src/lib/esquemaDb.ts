import "server-only";
import { getTableColumns, sql } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { COLUMNAS_NUEVAS_PLAYERS, esColumnaQueFalta, faltantes, sinClaves } from "@/lib/esquemaEsperado";

/* =========================================================================
   v0.96 — Que una migración sin aplicar no tumbe la app entera.

   El 4/11 faltaba `players.profile_title` en producción y TODA pantalla con
   sesión daba error 500 (la sesión lee la fila del jugador con todas sus
   columnas). Ahora las lecturas del jugador que pasan por aquí —sesión,
   entrar, `requireActor` y la lista de jugadores— reconocen el error 42703,
   repiten la consulta sin las columnas nuevas y rellenan su valor por
   defecto. La app sigue en pie; lo nuevo (el título del perfil) no se ve hasta
   migrar, y el log y el panel de uso dicen qué falta.

   Lo que ESCRIBE en una columna que falta sigue fallando, y está bien: no se
   puede guardar en una columna que no existe.
   ========================================================================= */

const NUEVAS = Object.keys(COLUMNAS_NUEVAS_PLAYERS) as Array<keyof typeof COLUMNAS_NUEVAS_PLAYERS>;
export type ModoColumnas = "todas" | "basicas";
let avisado = false;

/** Quita de un select las columnas de `players` que pueden faltar. Mismo tipo, para no tocar a quien llama. */
export function columnasSegun<C extends Record<string, unknown>>(cols: C, modo: ModoColumnas): C {
  return (modo === "todas" ? cols : sinClaves(cols, NUEVAS)) as C;
}

/** Todas las columnas de `players`, o las que existían antes de las migraciones recientes. */
export const columnasPlayers = (modo: ModoColumnas) => columnasSegun(getTableColumns(players), modo);

/**
 * Lanza la consulta con todas las columnas y, si Postgres dice que falta una
 * (42703), la repite con las básicas y rellena las nuevas con su valor por
 * defecto. Cualquier otro error sube tal cual.
 */
export async function conReservaDeColumnas<T>(consulta: (modo: ModoColumnas) => PromiseLike<T[]>): Promise<T[]> {
  try {
    return await consulta("todas");
  } catch (e) {
    if (!esColumnaQueFalta(e)) throw e;
    if (!avisado) {
      avisado = true;
      console.error("[esquema] Falta una columna en la base: la app sigue con las básicas. Aplica las migraciones pendientes (Ajustes → Uso y límites → Estado de la base).", e instanceof Error ? e.message : e);
    }
    const filas = await consulta("basicas");
    return filas.map((f) => ({ ...COLUMNAS_NUEVAS_PLAYERS, ...(f as object) }) as T);
  }
}

/**
 * Qué migraciones faltan en ESTA base (la del despliegue que responde). Una
 * consulta a information_schema; null si no se puede leer.
 */
export async function estadoEsquema(): Promise<ReturnType<typeof faltantes> | null> {
  try {
    const r = await db.execute(sql`select table_name, column_name from information_schema.columns where table_schema = current_schema()`);
    const filas = ((r as { rows?: Array<Record<string, unknown>> }).rows ?? (Array.isArray(r) ? r : [])) as Array<Record<string, unknown>>;
    return faltantes(filas.map((x) => `${String(x.table_name)}.${String(x.column_name)}`));
  } catch {
    return null;
  }
}
