import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { borrarTorneosAbandonados } from "@/lib/limpiezaDb";
import { sincronizarSeriesOnline } from "@/lib/seriesOnlineDb";

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

  /* v0.44 — y de paso, los torneos online semanales previstos. Va en el mismo
     cron para no gastar otro (el plan Hobby de Vercel los limita). Si falla,
     no se lleva por delante la limpieza, que ya está hecha arriba. */
  let series = null;
  try { series = await sincronizarSeriesOnline(); } catch { /* se reintenta mañana */ }

  if (borrados.length || series?.creados || series?.retirados) revalidatePath("/", "layout");
  return NextResponse.json({ borrados: borrados.length, torneos: borrados.map((t) => t.name), series });
}
