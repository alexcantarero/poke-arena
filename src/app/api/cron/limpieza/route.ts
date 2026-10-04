import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { borrarTorneosAbandonados } from "@/lib/limpiezaDb";

/* =========================================================================
   GET /api/cron/limpieza — v0.19.

   Lo llama Vercel Cron una vez al día (ver `vercel.json`). Vercel manda la
   cabecera `Authorization: Bearer <CRON_SECRET>` si la variable de entorno
   CRON_SECRET está definida en el proyecto. Sin ese secreto, el endpoint NO
   hace nada: cualquiera podría llamarlo, y borra datos.
   ========================================================================= */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const borrados = await borrarTorneosAbandonados();
  if (borrados.length) revalidatePath("/", "layout");
  return NextResponse.json({ borrados: borrados.length, torneos: borrados.map((t) => t.name) });
}
