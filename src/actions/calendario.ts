"use server";

/* Calendario: eventos, importaciones y torneos online previstos.
   v0.47 — partido de `src/actions/index.ts`. */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, tournaments } from "@/db/schema";
import { EVENTOS_EUROPA_2027, TEMPORADA_EVENTOS } from "@/data/eventos-europa";
import { newId, todayISO } from "@/lib/format";
import { withFlash } from "@/lib/flash";
import { parseEventosPegados } from "@/lib/eventosPegados";
import { sincronizarSeriesOnline } from "@/lib/seriesOnlineDb";
import {
  str, isoDate, refresh, requireManager, CALENDAR_EVENT_KINDS,
  msj,
} from "./_comun";

/* ------------------------------------------------------------- eventos -- */

export async function saveEvent(fd: FormData) {
  // El calendario lo ve todo el mundo, así que lo escribe el organizador.
  await requireManager();
  const editing = str(fd, "id");
  const id = editing || newId("e");
  const values = {
    title: str(fd, "title").slice(0, 120),
    date: isoDate(fd, "date") ?? todayISO(),
    endDate: isoDate(fd, "endDate", null),
    kind: str(fd, "kind") || "round",
    // Vacío es válido: una jornada de la liga no es ningún tipo de torneo
    // del circuito. El color del calendario cae entonces al de `kind`.
    tournamentKind: CALENDAR_EVENT_KINDS.includes(str(fd, "tournamentKind"))
      ? str(fd, "tournamentKind")
      : "",
    location: str(fd, "location").slice(0, 120),
    url: /^https?:\/\//i.test(str(fd, "url")) ? str(fd, "url").slice(0, 400) : "",
    competitionId: str(fd, "competitionId") || null,
    tournamentId: str(fd, "tournamentId") || null,
    note: str(fd, "note").slice(0, 500),
  };
  if (!values.title) return;
  if (editing) await db.update(events).set(values).where(eq(events.id, id));
  else await db.insert(events).values({ id, ...values });
  refresh();
  redirect(withFlash("/calendario", "ok", editing ? "Evento guardado." : "Evento añadido."));
}

/**
 * Meter en el calendario los eventos oficiales de Europa.
 *
 * La lista está escrita a mano en `src/data/eventos-europa.ts`, con sus
 * fuentes y con marca en los que no coinciden entre ellas. **No hay ninguna
 * llamada automática a ninguna web**: ni hace falta para diez eventos al año
 * ni sería correcto con las webs de las que salen.
 *
 * Es idempotente: cada evento lleva un id fijo, así que volver a pulsarlo
 * actualiza los que ya están en vez de duplicarlos. Eso permite corregir la
 * lista del fichero y volver a importar sin limpiar nada antes.
 *
 * Lo que NO hace: borrar. Si alguien quitó del calendario un evento que no le
 * interesaba, volver a importar no se lo devuelve a la cara... bueno, sí se
 * lo devuelve, porque el id vuelve a no existir y se inserta. Es el precio de
 * que sea idempotente sin llevar una tabla de «borrados a propósito», y para
 * diez eventos al año compensa.
 */
export async function importEuropeanEvents() {
  await requireManager();

  const existentes = new Set(
    (await db.select({ id: events.id }).from(events)
      .where(inArray(events.id, EVENTOS_EUROPA_2027.map((e) => e.id))))
      .map((r) => r.id),
  );

  let nuevos = 0;
  let actualizados = 0;

  for (const e of EVENTOS_EUROPA_2027) {
    const values = {
      title: e.title,
      date: e.date,
      endDate: e.endDate ?? null,
      kind: "tourney",
      tournamentKind: e.tournamentKind,
      location: e.location,
      url: e.url ?? "",
      competitionId: null,
      tournamentId: null,
      note: e.confirmar ? "Fecha por confirmar: las fuentes no coinciden." : "",
    };
    if (existentes.has(e.id)) {
      await db.update(events).set(values).where(eq(events.id, e.id));
      actualizados++;
    } else {
      await db.insert(events).values({ id: e.id, ...values });
      nuevos++;
    }
  }

  refresh();
  redirect(withFlash(
    "/calendario",
    "ok",
    `Eventos de Europa ${TEMPORADA_EVENTOS}: ${nuevos} nuevo(s) y ${actualizados} actualizado(s).`,
  ));
}

export async function deleteEvent(fd: FormData) {
  await requireManager();
  await db.delete(events).where(eq(events.id, str(fd, "id")));
  refresh();
}

/* ============================================ v0.14 — buscador de eventos ====

   Challenges y Cups pegados desde el Event Locator oficial (ver
   `lib/eventosPegados.ts`: pokemon.com prohíbe la extracción automatizada,
   así que se copia a mano y se pega). Idempotente por id: pegar la misma
   lista otra vez actualiza y no duplica.
   ========================================================================= */

export async function importPastedEvents(fd: FormData) {
  await requireManager();
  const texto = String(fd.get("texto") ?? "").slice(0, 200_000);
  const { eventos, ignorados } = parseEventosPegados(texto);
  if (!eventos.length) {
    redirect(withFlash("/calendario", "error",
      "No he reconocido ningún torneo en lo pegado. Puedes pegar la lista del buscador oficial o un listado por meses (CHALLENGE / CUP / REGIONAL)."));
  }
  const [yaRegistrados, toursExistentes, evOficiales] = await Promise.all([
    db.select({ id: events.id }).from(events).where(inArray(events.id, eventos.map((e) => e.id))),
    db.select({ id: tournaments.id, date: tournaments.date, kind: tournaments.kind, venue: tournaments.venue }).from(tournaments),
    db.select({ id: events.id, date: events.date, tournamentKind: events.tournamentKind, title: events.title }).from(events),
  ]);
  const ya = new Set(yaRegistrados.map((r) => r.id));

  let nuevos = 0;
  for (const e of eventos) {
    // Si ya existe un evento oficial en esa fecha para ese Regional (ej: eu-2027-nice), reutilizamos su id
    const evCoincidente = evOficiales.find((x) =>
      x.id === e.id ||
      (e.kind === "regional" && x.tournamentKind === "regional" && x.date === e.date)
    );
    const idAGuardar = evCoincidente ? evCoincidente.id : e.id;

    // Si ya existe un torneo en la app para este día y tienda, lo enlazamos para evitar duplicados en calendario
    const tourCoincidente = toursExistentes.find((t) =>
      t.date === e.date && t.kind === e.kind && (
        t.venue.toLowerCase().includes(e.store.toLowerCase()) ||
        e.store.toLowerCase().includes(t.venue.toLowerCase())
      )
    );

    const values = {
      title: e.title.slice(0, 120),
      date: e.date,
      endDate: e.endDate ?? null,
      kind: "tourney",
      tournamentKind: e.kind,
      location: e.location,
      url: "",
      competitionId: null,
      tournamentId: tourCoincidente?.id ?? null,
      note: [e.time ? `Empieza a las ${e.time}` : "", e.note ?? "Del listado pegado"].filter(Boolean).join(" · "),
    };
    if (ya.has(idAGuardar) || evCoincidente) {
      await db.update(events).set(values).where(eq(events.id, idAGuardar));
    } else {
      await db.insert(events).values({ id: idAGuardar, ...values });
      nuevos++;
    }
  }
  refresh();
  redirect(withFlash("/calendario", "ok",
    `${nuevos} evento(s) nuevo(s), ${eventos.length - nuevos} actualizado(s)${ignorados ? `, ${ignorados} ignorado(s) (otros juegos o tipos)` : ""}.`));
}


/* v0.44 — torneos online semanales previstos, a mano (el cron lo hace a diario). */
export async function sincronizarSeriesAhora() {
  await requireManager();
  const r = await sincronizarSeriesOnline();
  revalidatePath("/", "layout");
  if (r.sinRespuesta) {
    redirect(withFlash("/ajustes", "error", await msj("x.d3898ba7")));
  }
  redirect(withFlash("/ajustes", "ok",
    r.series
      ? `${r.series} serie(s): ${r.creados} evento(s) nuevo(s), ${r.actualizados} actualizado(s), ${r.retirados} pasado(s) retirado(s).`
      : `Ninguna serie que encaje en las últimas 8 semanas: ni semanal con +100 de media, ni de las que seguís.`));
}
