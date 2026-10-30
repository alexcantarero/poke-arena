import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { borrarTorneosAbandonados, cerrarTorneosTerminados } from "@/lib/limpiezaDb";
import { sincronizarSeriesOnline } from "@/lib/seriesOnlineDb";
import { notificarAgendaSemana, notificarPendientesLiga, notificarResultadosTorneo } from "@/lib/discord";
import { esLunesEnMadrid } from "@/lib/discordMensajes";

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
  // v0.45 — y los que se quedaron abiertos más de una semana con datos dentro.
  const cerrados = await cerrarTorneosTerminados();

  /* v0.44 — y de paso, los torneos online semanales previstos. Va en el mismo
     cron para no gastar otro (el plan Hobby de Vercel los limita). Si falla,
     no se lleva por delante la limpieza, que ya está hecha arriba. */
  let series = null;
  try { series = await sincronizarSeriesOnline(); } catch { /* se reintenta mañana */ }

  /* v0.59 — Discord: los resultados de cada torneo que se acaba de cerrar solo, y
     los lunes (hora de Madrid), las partidas de liga pendientes y la agenda de
     la semana. Cada aviso es opcional y nunca rompe el cron. */
  const discord = { resultados: 0, pendientes: false, agenda: false };
  for (const t of cerrados) if (await notificarResultadosTorneo(t.id)) discord.resultados++;
  const ahora = new Date();
  if (esLunesEnMadrid(ahora)) {
    discord.pendientes = await notificarPendientesLiga();
    discord.agenda = await notificarAgendaSemana(ahora.toISOString().slice(0, 10));
  }
  if (borrados.length || cerrados.length || series?.creados || series?.retirados) revalidatePath("/", "layout");
  // v0.85 — lo que ha escrito el cron, visible ya (sin esperar a que caduque la caché).
  revalidateTag("datos"); revalidateTag("meta");
  return NextResponse.json({
    borrados: borrados.length, torneos: borrados.map((t) => t.name),
    cerrados: cerrados.length, torneosCerrados: cerrados.map((t) => t.name),
    series,
    discord,
  });
}
