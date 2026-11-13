import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { mediana, regionDeHostNeon } from "@/lib/regiones";

/* =========================================================================
   v0.125 — Cuánto tarda UNA consulta mínima desde donde corre el servidor
   hasta la base, y en qué región está cada uno. Para Ajustes → Uso.

   De la cadena de conexión solo se lee el NOMBRE del servidor para sacar la
   región («eu-central-1»); ni se enseña ni se registra nada más.
   ========================================================================= */

export type Latencia = {
  /** Las medidas, en ms (la primera suele incluir abrir la conexión). */
  ms: number[];
  mediana: number;
  /** La región donde corre esta función (Vercel la pone en VERCEL_REGION); null en local. */
  regionFuncion: string | null;
  regionBase: string | null;
};

export async function medirLatencia(veces = 4): Promise<Latencia | null> {
  try {
    const ms: number[] = [];
    for (let i = 0; i < veces; i++) {
      const t = performance.now();
      await db.execute(sql`select 1`);
      ms.push(Math.round(performance.now() - t));
    }
    let regionBase: string | null = null;
    try { regionBase = regionDeHostNeon(new URL(process.env.DATABASE_URL ?? "").hostname); } catch { regionBase = null; }
    // La primera no cuenta para la mediana: lleva el saludo de la conexión.
    return { ms, mediana: mediana(ms.slice(1)), regionFuncion: process.env.VERCEL_REGION || null, regionBase };
  } catch {
    return null;
  }
}
