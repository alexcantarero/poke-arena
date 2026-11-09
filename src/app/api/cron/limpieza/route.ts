import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { borrarTorneosAbandonados, cerrarTorneosTerminados, abrirTorneosDelDia } from "@/lib/limpiezaDb";
import { sincronizarSeriesOnline } from "@/lib/seriesOnlineDb";
import { crearHilosLiga, notificarAgendaSemana, notificarPendientesLiga, notificarResultadosTorneo } from "@/lib/discord";
import { esLunesEnMadrid } from "@/lib/discordMensajes";
import { guardarLecturaNeonDeHoy } from "@/lib/usoDb";
import { iniciarSuizoCinturon, procesarPlazosCinturon } from "@/lib/cinturonDb";
import { notificarCambioCinturon } from "@/lib/discord";
import { db } from "@/db";
import { players } from "@/db/schema";
import { inArray } from "drizzle-orm";

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
  const ahora = new Date();
  const fechaMadrid = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(ahora);
  const cinturon = fechaMadrid === "2026-11-20" ? await iniciarSuizoCinturon(ahora) : null;
  const plazoCinturon = await procesarPlazosCinturon(ahora);
  if (plazoCinturon) {
    const ids = [plazoCinturon.oldHolderId, plazoCinturon.newHolderId].filter((id): id is string => Boolean(id));
    const nombres = await db.select({ id: players.id, name: players.name }).from(players).where(inArray(players.id, ids));
    const nombre = new Map(nombres.map((row) => [row.id, row.name]));
    await notificarCambioCinturon({
      tipo: plazoCinturon.kind === "vacant" ? "vacante" : "forfeit",
      poseedor: plazoCinturon.newHolderId ? nombre.get(plazoCinturon.newHolderId) ?? null : null,
      anterior: nombre.get(plazoCinturon.oldHolderId) ?? null,
    });
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
  const discord = { resultados: 0, pendientes: false, agenda: false, hilos: 0 };
  for (const t of cerrados) if (await notificarResultadosTorneo(t.id)) discord.resultados++;
  if (esLunesEnMadrid(ahora)) {
    discord.pendientes = await notificarPendientesLiga();
    discord.agenda = await notificarAgendaSemana(ahora.toISOString().slice(0, 10));
  }
  // v0.117 — los posts del foro de Discord de los enfrentamientos de esta semana.
  discord.hilos = await crearHilosLiga(fechaMadrid, 6);
  if (cinturon === "started" || plazoCinturon || borrados.length || cerrados.length || series?.creados || series?.retirados) {
    revalidatePath("/", "layout");
  }
  // v0.89 — los borradores cuya fecha ha llegado, a «En curso».
  await abrirTorneosDelDia(ahora.toISOString().slice(0, 10));
  /* v0.95 — la foto diaria de Neon para el panel de uso (Ajustes → Uso). Neon
     no guarda historia en el plan gratuito; así se puede dibujar el mes. Es la
     API de control: no despierta la base. Sin las variables, no hace nada. */
  let usoNeon = false;
  try { usoNeon = await guardarLecturaNeonDeHoy(); } catch { /* sin la migración 0029 o Neon caído: mañana */ }
  // v0.85 — lo que ha escrito el cron, visible ya (sin esperar a que caduque la caché).
  revalidateTag("datos"); revalidateTag("meta");
  return NextResponse.json({
    borrados: borrados.length, torneos: borrados.map((t) => t.name),
    cerrados: cerrados.length, torneosCerrados: cerrados.map((t) => t.name),
    series,
    discord,
    usoNeon,
    cinturon,
    plazoCinturon: plazoCinturon?.kind ?? null,
  });
}
