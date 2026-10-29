"use server";

/* Metagame presencial: importar y borrar eventos, y Limitless IRL.
   v0.47 — partido de `src/actions/index.ts`. */

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { archetypes, matchupImports, metaEntries, metaEvents, players } from "@/db/schema";
import { parseTrainerHill } from "@/lib/trainerHill";
import { todayISO } from "@/lib/format";
import { seasonOfDate } from "@/lib/cp";
import { withFlash } from "@/lib/flash";
import { recogerCityLeagues, recogerRegionales } from "@/lib/sources/limitlessWeb";
import { filasParaGuardar } from "@/lib/limitlessHtml";
import { DIVISIONS, TOURNAMENT_FORMATS } from "@/lib/types";
import type { MetaImportState } from "@/lib/types";
import { CALENDAR_KINDS } from "@/lib/calendar";
import { coverageOf, parseStandings, parseSummary, type PasteMode } from "@/lib/standings";
import {
  str, maybeInt, isoDate, refresh, requireManager, firma, resumenImportacion, indiceDeSprites, spritesDe,
  msj,
} from "./_comun";

/* ------------------------------------------- metagame presencial --- */

/**
 * Importar lo que se jugó en un Regional, pegando la clasificación.
 *
 * POR QUÉ ES UN PEGADO Y NO UN BOTÓN QUE VA A BUSCARLO
 * ----------------------------------------------------
 * Porque no hay de dónde traerlo con permiso. La API de Limitless sirve su
 * plataforma online y deja los presenciales fuera; RK9 y pokemon.com
 * prohíben expresamente la extracción automatizada, «con o sin fines
 * comerciales», y que el botón se pulse una vez al mes no cambia lo que dicen
 * sus condiciones: lo que está prohibido es el método, no la frecuencia.
 * pokedata.ovh republica lo de RK9, así que pasar por ahí no arregla el
 * origen, solo añade un intermediario.
 *
 * Así que la persona copia lo que ya está viendo y lo pega. A partir de ahí
 * es todo automático: trocear, casar arquetipos, poner sprites y guardar.
 *
 * DOS PASADAS, Y LA PRIMERA NO ESCRIBE
 * ------------------------------------
 * Sin `confirmar` devuelve el recuento y no toca la base. Es lo que deja ver
 * cuántas filas han entrado, cuántas se han descartado y qué mazos no
 * conocía el catálogo, **antes** de guardar nada. El segundo envío es el que
 * escribe.
 *
 * Lo que vuelve al navegador en esa primera pasada es el recuento por mazo,
 * no el texto pegado ni ninguna línea suelta.
 */
export async function importMetaEvent(
  _prev: MetaImportState, fd: FormData,
): Promise<MetaImportState> {
  const actor = await requireManager();

  const texto = String(fd.get("texto") ?? "");
  if (!texto.trim()) return { error: await msj("x.85da1674") };

  const modo: PasteMode = str(fd, "modo") === "summary" ? "summary" : "standings";
  const catalogo = await db.select().from(archetypes);
  const known = catalogo.map((a) => ({
    id: a.id, name: a.name, main: a.main, secondary: a.secondary,
  }));

  const parsed = modo === "summary" ? parseSummary(texto, known) : parseStandings(texto, known);

  if (!parsed.entries.length) {
    return {
      error: parsed.descartadas > 0
        ? `No se ha reconocido ningún mazo: ${parsed.descartadas} fila(s) descartadas. Prueba a pulsar «Actualizar catálogo» aquí arriba y vuelve a pegarlo.`
        : "No se ha entendido nada de lo pegado. Revisa que sean filas de clasificación o líneas «mazo — número».",
    };
  }

  const preview = resumenImportacion(modo, parsed);

  if (str(fd, "confirmar") !== "si") return { preview };

  /* ------------------------------------------------ a partir de aquí, escribe */

  const name = str(fd, "name").slice(0, 120);
  const date = isoDate(fd, "date", null);
  if (!name) return { error: await msj("x.c2934dae"), preview };
  if (!date) return { error: await msj("x.569b8fe8"), preview };

  const kind = CALENDAR_KINDS[str(fd, "kind")] ? str(fd, "kind") : "regional";
  const division = DIVISIONS[str(fd, "division") as keyof typeof DIVISIONS]
    ? str(fd, "division") : "masters";

  /* El id de un evento importado: legible, y sobre todo determinista.
     Determinista es lo que hace que volver a pegar el mismo Regional lo
     actualice en vez de duplicarlo.

     Lleva la división porque el mismo Regional tiene tres, con el mismo
     nombre y la misma fecha y clasificaciones distintas; sin ella, importar
     Seniors machacaba Masters en silencio.

     Y lleva una firma corta del nombre completo porque el trozo legible va
     recortado a 40 caracteres: dos eventos que solo se diferencien a partir
     del carácter 41 tendrían el mismo id y el segundo pisaría al primero sin
     decir nada. Con la firma, identidades distintas dan ids distintos y el
     índice único de (nombre, fecha, división) nunca salta. */
  const id = [
    "mev",
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40),
    date,
    division,
    firma(`${name}|${date}|${division}`),
  ].join("-");

  const fila = {
    id,
    name,
    date,
    kind,
    location: str(fd, "location").slice(0, 120),
    format: TOURNAMENT_FORMATS[str(fd, "format") as keyof typeof TOURNAMENT_FORMATS]
      ? str(fd, "format") : "standard",
    division,
    season: maybeInt(fd, "season", 2000, 2100) ?? seasonOfDate(date),
    playerCount: maybeInt(fd, "playerCount", 0, 100000),
    topCut: maybeInt(fd, "topCut", 0, 1024),
    coverage: coverageOf(parsed.entries),
    sourceUrl: str(fd, "sourceUrl").slice(0, 300),
    sourceName: str(fd, "sourceName").slice(0, 80),
    notes: str(fd, "notes").slice(0, 500),
    createdBy: actor.id,
    updatedAt: new Date(),
  };

  // Volver a importar el mismo evento —porque la primera vez aún no estaba el
  // top cut— actualiza la cabecera y reemplaza las filas. Basta con mirar el
  // id porque es determinista: la misma identidad da siempre el mismo id, y
  // dos identidades distintas nunca dan el mismo.
  await db.insert(metaEvents).values(fila).onConflictDoUpdate({
    target: metaEvents.id,
    set: {
      name: fila.name, date: fila.date, kind: fila.kind, location: fila.location,
      format: fila.format, division: fila.division, season: fila.season,
      playerCount: fila.playerCount, topCut: fila.topCut, coverage: fila.coverage,
      sourceUrl: fila.sourceUrl, sourceName: fila.sourceName, notes: fila.notes,
      updatedAt: fila.updatedAt,
    },
  });

  /* Reemplazo, no mezcla: borrar y volver a insertar. Sin transacción porque
     el driver `neon-http` no las tiene; la ventana en la que el evento se
     queda sin filas dura milisegundos y, si el insert fallara, lo que queda es
     un evento vacío que se arregla volviendo a pegar —no datos mezclados de
     dos pegados distintos, que sería mucho peor de detectar—. */
  await db.delete(metaEntries).where(eq(metaEntries.eventId, id));

  const sprites = indiceDeSprites(catalogo);
  const archById = new Map(catalogo.map((a) => [a.id, a]));

  const filas = parsed.entries.map((e) => {
    const arch = e.archetypeId ? archById.get(e.archetypeId) : undefined;
    const iconos = arch
      ? { main: arch.main, secondary: arch.secondary }
      : spritesDe(e.deck, sprites);
    return {
      eventId: id,
      placement: e.placement,
      copies: Math.max(1, e.copies),
      archetypeId: arch?.id ?? null,
      archetypeName: e.deck.slice(0, 120),
      main: iconos.main,
      secondary: iconos.secondary,
      wins: e.wins, losses: e.losses, ties: e.ties,
    };
  });

  // A trozos: una clasificación de top 256 en un solo insert es una sentencia
  // con miles de parámetros, y el driver HTTP la corta.
  for (let i = 0; i < filas.length; i += 200) {
    await db.insert(metaEntries).values(filas.slice(i, i + 200));
  }

  refresh();
  const avisos = [
    `${filas.length} fila(s) guardadas`,
    parsed.descartadas ? `${parsed.descartadas} descartada(s) por no repetirse` : "",
    parsed.nuevos.length ? `${parsed.nuevos.length} mazo(s) fuera del catálogo` : "",
  ].filter(Boolean);
  return { ok: `${name}: ${avisos.join(", ")}.`, preview };
}

/**
 * Quitar un evento importado, con sus filas.
 *
 * Sin pedir que se escriba el nombre, al revés que borrar un torneo: aquí no
 * se pierde nada que no se pueda recuperar volviendo a pegar la clasificación
 * de una web pública.
 */
export async function deleteMetaEvent(fd: FormData) {
  await requireManager();
  const id = str(fd, "id");
  if (!id) return;
  await db.delete(metaEvents).where(eq(metaEvents.id, id));
  refresh();
  redirect(withFlash("/ajustes", "ok", await msj("x.5e322386")));
}

/* ================================================ v0.14 — Limitless web ====

   Un botón de organizador en Ajustes: trae los Regionales y las City Leagues
   que falten desde limitlesstcg.com y los guarda en el metagame presencial
   (`meta_events` + `meta_entries`), la misma tabla que la importación a mano.

   · Solo mazos. Los parsers no leen nombres de persona (ver
     `lib/limitlessHtml.ts`) y la tabla no tiene dónde guardarlos.
   · Idempotente: los ids son `lt-<id>` y `ltjp-<id>`, y lo que ya está no se
     vuelve a pedir. Pulsarlo dos veces seguidas no hace ninguna petición de
     torneo la segunda vez.
   · Con tope: 6 Regionales y 15 City Leagues por pulsación, con pausa entre
     peticiones. Si falta algo, se vuelve a pulsar.
   ========================================================================= */

export async function syncLimitlessIrl(fd: FormData) {
  const actor = await requireManager();
  const que = str(fd, "que") === "city" ? "city" : str(fd, "que") === "regionales" ? "regionales" : "todo";

  const existentes = await db.select({ id: metaEvents.id, name: metaEvents.name, date: metaEvents.date, division: metaEvents.division })
    .from(metaEvents);
  const ids = new Set<string>(existentes.map((e) => e.id));
  const identidades = new Set<string>(existentes.map((e) => `${e.name}|${e.date}|${e.division}`));

  const catalogo = await db.select().from(archetypes);
  const normA = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
  const porNombre = new Map(catalogo.map((a) => [normA(a.name), a]));
  const porSprites = new Map(catalogo.map((a) => [`${a.main}|${a.secondary}`, a]));
  const casar = (name: string, main: string, secondary: string) =>
    porNombre.get(normA(name)) ?? porSprites.get(`${main}|${secondary}`) ?? porSprites.get(`${main}|`) ?? null;

  const guardar = async (
    ev: typeof metaEvents.$inferInsert,
    filas: Array<{ placement: number | null; copies: number; name: string; main: string; secondary: string }>,
  ) => {
    // Si alguien ya lo pegó a mano con el mismo nombre y fecha, manda lo suyo.
    const ident = `${ev.name}|${ev.date}|${ev.division}`;
    if (identidades.has(ident)) return false;
    /* v0.76 — si el evento NO se ha insertado (choca con otro de mismo nombre,
       fecha y división, p. ej. dos City Leagues de la misma prefectura el
       mismo día), no se guardan sus puestos: antes se intentaba igual y la
       clave ajena reventaba toda la importación (error 23503). */
    const insertado = await db.insert(metaEvents).values(ev).onConflictDoNothing().returning({ id: metaEvents.id });
    if (!insertado.length && !ids.has(ev.id as string)) return false;
    identidades.add(ident);
    ids.add(ev.id as string);
    await db.delete(metaEntries).where(eq(metaEntries.eventId, ev.id as string));
    const rows = filas.map((f) => {
      const a = casar(f.name, f.main, f.secondary);
      return {
        eventId: ev.id, placement: f.placement, copies: Math.max(1, f.copies),
        archetypeId: a?.id ?? null,
        archetypeName: (a?.name ?? f.name).slice(0, 120),
        main: a?.main ?? f.main, secondary: a?.secondary ?? f.secondary,
        wins: null, losses: null, ties: null,
      };
    });
    for (let i = 0; i < rows.length; i += 200) await db.insert(metaEntries).values(rows.slice(i, i + 200));
    return true;
  };

  const desde = `${(seasonOfDate(todayISO()) ?? 2027) - 1}-07-01`; // la temporada en curso
  const avisos: string[] = [];
  const fallos: string[] = [];

  if (que !== "city") {
    const r = await recogerRegionales({
      yaTenemos: new Set([...ids].filter((i) => i.startsWith("lt-")).map((i) => i.slice(3))),
      desde,
    });
    let n = 0;
    for (const x of r.leidos) {
      const ok = await guardar({
        id: `lt-${x.torneo.id}`, name: x.torneo.name, date: x.torneo.date, kind: x.kind,
        location: x.torneo.country, format: "standard", division: "masters",
        season: seasonOfDate(x.torneo.date), playerCount: x.torneo.players,
        topCut: x.cabeza.length || 8, coverage: null,
        sourceUrl: x.url, sourceName: "Limitless TCG",
        notes: "Recuento de mazos del Día 2 (fase 2) publicado por Limitless TCG; el top cut va puesto a puesto. Sin nombres.",
        createdBy: actor.id,
      }, filasParaGuardar(x.stats, x.cabeza));
      if (ok) n++;
    }
    avisos.push(`${n} Regional(es) nuevo(s)`);
    fallos.push(...r.fallos);
  }

  if (que !== "regionales") {
    const r = await recogerCityLeagues({
      yaTenemos: new Set([...ids].filter((i) => i.startsWith("ltjp-")).map((i) => i.slice(5))),
    });
    let n = 0;
    for (const x of r.leidas) {
      const ok = await guardar({
        // v0.76 — con el número de Limitless: dos City Leagues de la misma prefectura el mismo día existen.
        id: `ltjp-${x.liga.id}`, name: `City League ${x.liga.prefecture} ${x.liga.date.slice(5).replace("-", "/")} #${x.liga.id}`,
        date: x.liga.date, kind: "city_league",
        location: `${x.liga.prefecture}, Japón`, format: "standard", division: "masters",
        season: seasonOfDate(x.liga.date), playerCount: null, topCut: 8, coverage: x.puestos.length,
        sourceUrl: x.url, sourceName: "Limitless TCG",
        notes: "City League de Japón: top del evento, solo puesto y mazo. Formato japonés, que va por delante del internacional.",
        createdBy: actor.id,
      }, x.puestos.map((p) => ({ ...p, copies: 1 })));
      if (ok) n++;
    }
    avisos.push(`${n} City League(s) nueva(s)`);
    fallos.push(...r.fallos);
  }

  refresh();
  const msg = `Limitless: ${avisos.join(", ")}.${fallos.length ? ` ${fallos.length} con problemas: ${fallos.slice(0, 2).join("; ")}` : ""}`;
  redirect(withFlash("/ajustes", fallos.length && !avisos.some((a) => !a.startsWith("0")) ? "error" : "ok", msg));
}

/* =========================================================================
   v0.79 — Importar emparejamientos de Trainer Hill (CSV).

   El fichero lo descarga el organizador desde trainerhill.com (Meta →
   Matchups → «Export data (csv)») y lo sube aquí: la app no visita su web.
   Se elige de qué eventos es (Majors, online o mezclado), porque cada uno pesa
   distinto según el tipo de torneo en el recomendador. Uno por nivel: subir
   otro del mismo nivel sustituye al anterior.
   ========================================================================= */
const NIVELES_TH = new Set(["majors", "online", "mixto"]);

export async function importarTrainerHill(fd: FormData) {
  const actor = await requireManager();
  const nivel = str(fd, "nivel");
  const entrada = fd.get("csv");
  const fichero = entrada instanceof File ? entrada : null;
  if (!NIVELES_TH.has(nivel)) return redirect(withFlash("/ajustes#importar", "error", "Elige de qué eventos es el fichero."));
  if (!fichero || fichero.size === 0) return redirect(withFlash("/ajustes#importar", "error", "Sube el CSV exportado de Trainer Hill."));
  if (fichero.size > 2_000_000) return redirect(withFlash("/ajustes#importar", "error", "El fichero es demasiado grande (más de 2 MB)."));
  const r = parseTrainerHill(await fichero.text());
  if (!r.filas.length) redirect(withFlash("/ajustes#importar", "error", r.errores[0] ?? "El fichero no tiene emparejamientos."));
  await db.delete(matchupImports).where(eq(matchupImports.nivel, nivel));
  await db.insert(matchupImports).values({
    id: `th-${nivel}`, fuente: "trainerhill", nivel, nombre: fichero.name.slice(0, 120),
    filas: r.filas, partidas: r.partidas, createdBy: actor.id,
  });
  refresh();
  redirect(withFlash("/ajustes#importar", "ok",
    `Trainer Hill (${nivel}): ${r.filas.length} emparejamientos de ${r.mazos.length} mazos, ${r.partidas.toLocaleString("es-ES")} partidas.`
    + (r.errores.length ? ` ${r.errores.length} línea(s) no se entendieron.` : "")));
}

export async function borrarImportacionCruces(fd: FormData) {
  await requireManager();
  const id = str(fd, "id");
  if (id) await db.delete(matchupImports).where(eq(matchupImports.id, id));
  refresh();
  redirect(withFlash("/ajustes#importar", "ok", "Importación borrada."));
}
