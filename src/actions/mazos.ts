"use server";

/* Mazos, arquetipos, favoritos y el catálogo.
   v0.47 — partido de `src/actions/index.ts`. */

import { redirect } from "next/navigation";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { archetypes, deckFavorites, decks, matches, tournamentResults, tournaments } from "@/db/schema";
import { creaCiclo } from "@/lib/arquetipos";
import { canManageLeague } from "@/lib/auth";
import { parseDeckList, suggestArchetype } from "@/lib/decklist";
import { newId, todayISO } from "@/lib/format";
import { pokeSlug } from "@/lib/pokemon";
import { withFlash } from "@/lib/flash";
import { fetchArchetypeCatalog } from "@/lib/sources/limitless";
import { energyTypesOf } from "@/lib/sources/pokeapi";
import type { FormState } from "@/lib/types";
import {
  str, int, isoDate, bool, pick, refresh, safeBack, requireActor, requireManager, ensureArchetype, canEditDeck,
  msj,
} from "./_comun";

/**
 * Crear arquetipos lo puede hacer cualquiera (hace falta al registrar una
 * partida). Editar uno que ya existe, no: cambia las estadísticas de todos.
 */
export async function saveArchetype(fd: FormData) {
  const actor = await requireActor();
  const editing = str(fd, "id");
  if (editing && !canManageLeague(actor.role)) return;

  const id = editing || newId("a");
  const main = pokeSlug(str(fd, "main"));
  const secondary = pokeSlug(str(fd, "secondary"));
  const values = {
    name: (str(fd, "name") || [main, secondary].filter(Boolean).join(" / ")).slice(0, 80),
    main, secondary,
    type: str(fd, "type") || "colorless",
  };
  if (!values.name) return;
  if (editing) await db.update(archetypes).set(values).where(eq(archetypes.id, id));
  else await db.insert(archetypes).values({ id, ...values });
  refresh();
}

export async function saveDeck(fd: FormData) {
  const actor = await requireActor();
  const editing = str(fd, "id");
  const list = String(fd.get("list") ?? "");
  const parsed = list.trim() ? parseDeckList(list) : null;

  // `scope` decide de quién es: "shared" lo deja sin dueño, en la biblioteca
  // de la liga, que es lo que hace falta para apuntar el mazo de un rival sin
  // tener que inventarle una cuenta.
  const scope = pick(fd, "scope", ["mine", "shared"] as const, "mine");

  // Al editar, el dueño lo dice la fila que ya está guardada, no el formulario:
  // si no, mandando el id de un mazo ajeno te lo apropiabas.
  let owner: string | null = scope === "shared" ? null : actor.id;
  if (editing) {
    const current = (await db.select().from(decks).where(eq(decks.id, editing)))[0];
    if (!current || !canEditDeck(actor, current)) return;
    // Mover un mazo entre «mío» y «de la liga» sí se permite, porque es una
    // decisión legítima; lo que no se permite es quedárselo de otra persona.
    if (scope === "shared") {
      owner = null;
    } else if (canManageLeague(actor.role)) {
      // Un organizador sí puede decir de quién es: el selector de jugador que
      // le enseña el formulario tiene que hacer algo.
      owner = str(fd, "playerId") || current.playerId || actor.id;
    } else {
      owner = current.playerId ?? actor.id;
    }
  } else if (scope === "mine" && canManageLeague(actor.role)) {
    owner = str(fd, "playerId") || actor.id;
  }

  let main = str(fd, "main");
  let secondary = str(fd, "secondary");
  if (!main && parsed) {
    const s = suggestArchetype(parsed);
    main = s.main;
    secondary = s.secondary;
  }

  const picked = str(fd, "archetypeId");
  const archetypeId = picked || (await ensureArchetype(main, secondary, str(fd, "type"), str(fd, "archetypeName")));

  const values = {
    playerId: owner,
    archetypeId,
    name: (str(fd, "name") || [main, secondary].filter(Boolean).join(" / ") || "Mazo").slice(0, 80),
    list,
    listJson: parsed,
    format: str(fd, "format") || "standard",
    retired: bool(fd, "retired"),
    liveWins: int(fd, "liveWins", 0, 0, 99999),
    liveLosses: int(fd, "liveLosses", 0, 0, 99999),
    created: isoDate(fd, "created") ?? todayISO(),
  };

  if (editing) {
    await db.update(decks).set(values).where(eq(decks.id, editing));
  } else {
    await db.insert(decks).values({ id: newId("d"), ...values, createdBy: actor.id });
  }
  refresh();
  // Volver a donde estabas. Crear un mazo casi siempre es un desvío en mitad
  // de otra cosa —apuntando una ronda, rellenando un torneo—, y mandar a todo
  // el mundo a /mazos era perder el hilo.
  redirect(withFlash(safeBack(fd, "/mazos"), "ok", editing ? "Mazo guardado." : "Mazo creado."));
}

export async function deleteDeck(fd: FormData) {
  const actor = await requireActor();
  const id = str(fd, "id");
  const current = (await db.select().from(decks).where(eq(decks.id, id)))[0];
  if (!current || !canEditDeck(actor, current)) redirect("/mazos");

  /* Un mazo de la biblioteca lo puede estar usando gente que no eres tú, y las
     claves ajenas son ON DELETE SET NULL: borrarlo deja las rondas y los
     resultados de otros sin mazo, en silencio y sin deshacer. Si está en uso
     se retira en vez de borrarse — sigue en el historial de quien lo jugó y
     desaparece de los selectores, que es lo que se quería. */
  const [inResults] = await db.select({ n: sql<number>`count(*)::int` })
    .from(tournamentResults).where(eq(tournamentResults.deckId, id));
  const [inMatches] = await db.select({ n: sql<number>`count(*)::int` })
    .from(matches).where(or(eq(matches.deckAId, id), eq(matches.deckBId, id)));
  const uses = (inResults?.n ?? 0) + (inMatches?.n ?? 0);

  if (uses > 0) {
    await db.update(decks).set({ retired: true }).where(eq(decks.id, id));
  } else {
    await db.delete(decks).where(eq(decks.id, id));
  }
  refresh();
  // Retirar y borrar no son lo mismo, y el aviso lo dice: si el mazo estaba en
  // uso no ha desaparecido, y quien le dé a «borrar» tiene que enterarse.
  redirect(withFlash(
    "/mazos", "ok",
    uses > 0
      ? `«${current.name}» está en uso en ${uses} sitio(s): se ha retirado en vez de borrarse.`
      : `Mazo «${current.name}» borrado.`,
  ));
}

/**
 * Marcar o desmarcar un mazo como favorito.
 *
 * Un favorito no es propiedad: es solo lo que sale primero en los selectores.
 * Puedes marcar un mazo de la biblioteca compartida sin que deje de ser de
 * todos, que es justo para lo que sirve.
 */
export async function toggleDeckFavorite(fd: FormData) {
  const actor = await requireActor();
  const deckId = str(fd, "deckId");
  if (!deckId) return;

  const deck = (await db.select({ id: decks.id }).from(decks).where(eq(decks.id, deckId)))[0];
  if (!deck) return;

  const existing = (await db.select().from(deckFavorites).where(and(
    eq(deckFavorites.playerId, actor.id),
    eq(deckFavorites.deckId, deckId),
  )))[0];

  if (existing) {
    await db.delete(deckFavorites).where(and(
      eq(deckFavorites.playerId, actor.id),
      eq(deckFavorites.deckId, deckId),
    ));
  } else {
    await db.insert(deckFavorites)
      .values({ playerId: actor.id, deckId })
      // Dos toques seguidos en el móvil no deben reventar con un 23505.
      .onConflictDoNothing();
  }
  refresh();
}

/* ------------------------------------------------ catálogo de arquetipos -- */

/**
 * Traer del metagame los arquetipos que falten, sin salir de la web.
 *
 * Es lo mismo que `npm run archetypes:sync`, pero desde Ajustes: para usar el
 * script hace falta tener el proyecto abierto en un ordenador con Node, y eso
 * en la práctica significa que no se hace nunca. El catálogo se quedaba viejo
 * y faltaban mazos —Grimmsnarl, sin ir más lejos—.
 *
 * Solo añade y solo pinta lo que está en incoloro. Nunca renombra nada que ya
 * exista: si le habéis puesto vuestro nombre a un arquetipo, ese se queda.
 */
export async function syncArchetypes(_prev: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireManager();
  void actor;

  // Ojo con el nombre: `tournaments` a secas taparía la tabla importada arriba.
  const toScan = int(fd, "tournaments", 20, 5, 40);
  const minPlayers = int(fd, "minPlayers", 16, 0, 5000);

  let found;
  try {
    const res = await fetchArchetypeCatalog({
      tournaments: toScan,
      minPlayers,
      apiKey: process.env.LIMITLESS_API_KEY,
    });
    found = res.archetypes;
  } catch (e) {
    return {
      error: `No se ha podido hablar con Limitless: ${e instanceof Error ? e.message : "error de red"}.`,
    };
  }
  if (!found.length) return { error: await msj("x.f57b2245") };

  const existing = await db.select().from(archetypes);
  const byLimitlessId = new Set(existing.map((a) => a.limitlessId).filter(Boolean));
  const byPair = new Set(existing.map((a) => `${a.main}|${a.secondary}`));

  const nuevos = found.filter(
    (d) => !byLimitlessId.has(d.identifier) && !byPair.has(`${d.main}|${d.secondary}`),
  );
  /* Los que se quedaron en incoloro. Se acotan a 40 por pasada porque cada uno
     es una consulta a PokéAPI y esto corre dentro de una función serverless con
     límite de tiempo: más vale pintar cuarenta y volver a pulsar que quedarse
     a medias y no guardar nada. */
  const sinColor = existing.filter((a) => a.type === "colorless" && a.main).slice(0, 40);

  if (!nuevos.length && !sinColor.length) {
    return { ok: `El catálogo ya está al día: ${existing.length} arquetipos.` };
  }

  const types = await energyTypesOf([
    ...nuevos.map((d) => d.main),
    ...sinColor.map((a) => a.main),
  ]);

  if (nuevos.length) {
    // `onConflictDoNothing` porque el id se trunca a 60 caracteres y dos
    // identificadores largos podrían chocar: mejor saltarse uno que tirar el
    // insert entero con un 23505 y no añadir ninguno.
    await db.insert(archetypes).values(
      nuevos.map((d) => ({
        id: `lt-${d.identifier}`.slice(0, 60),
        name: d.name,
        main: d.main,
        secondary: d.secondary,
        type: types.get(d.main) ?? "colorless",
        limitlessId: d.identifier,
      })),
    ).onConflictDoNothing();
  }

  let pintados = 0;
  for (const a of sinColor) {
    const t = types.get(a.main);
    if (!t || t === "colorless") continue;
    await db.update(archetypes).set({ type: t }).where(eq(archetypes.id, a.id));
    pintados++;
  }

  refresh();
  const partes = [
    nuevos.length ? `${nuevos.length} arquetipo(s) nuevo(s)` : "",
    pintados ? `${pintados} con el color puesto` : "",
  ].filter(Boolean);
  return { ok: `Listo: ${partes.join(" y ")}.` };
}

/* ================================================================ v0.21 -- */

/**
 * Familias de arquetipos: guarda de una vez el padre de cada arquetipo
 * (campos `parent:<id>`). Solo organizadores. Rechaza ciclos en silencio
 * (deja ese arquetipo como estaba) y lo cuenta en el aviso.
 */
export async function saveArchetypeParents(fd: FormData) {
  await requireManager();
  const filas = await db.select({ id: archetypes.id, parentId: archetypes.parentId }).from(archetypes);
  const ids = new Set(filas.map((f) => f.id));
  const parentOf = new Map<string, string | null>(filas.map((f) => [f.id, f.parentId]));

  let cambios = 0, rechazados = 0;
  for (const [k, v] of fd.entries()) {
    if (typeof k !== "string" || !k.startsWith("parent:")) continue;
    const id = k.slice("parent:".length);
    if (!ids.has(id)) continue;
    const padre = typeof v === "string" && v && ids.has(v) ? v : null;
    if (padre === (parentOf.get(id) ?? null)) continue;
    if (padre && creaCiclo(id, padre, parentOf)) { rechazados++; continue; }
    parentOf.set(id, padre);
    await db.update(archetypes).set({ parentId: padre }).where(eq(archetypes.id, id));
    cambios++;
  }
  refresh();
  redirect(withFlash("/ajustes", rechazados ? "error" : "ok",
    `${cambios} arquetipo(s) actualizado(s)${rechazados ? `; ${rechazados} sin cambiar porque harían un círculo` : ""}.`));
}
