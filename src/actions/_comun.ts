import "server-only";

/* =========================================================================
   Lo compartido por todas las Server Actions: lectura del formulario,
   permisos, avisos y utilidades.

   v0.47 — antes vivía todo en `src/actions/index.ts`, 3.088 líneas con 60
   acciones. Ahora cada tema tiene su fichero y esto es lo que comparten.

   SIN "use server" a propósito: un fichero con esa directiva solo puede
   exportar funciones `async`, y aquí hay constantes, tipos y funciones
   normales. `server-only` hace que el build falle si un componente de
   cliente lo importara por error.
   ========================================================================= */

import { sesionVigente } from "@/lib/recuperacion";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { archetypes, games, matches, players, settings, tournamentResults, tournaments } from "@/db/schema";
import { canManageLeague, clearSession, readSession } from "@/lib/auth";
import { isIsoDate, newId, todayISO } from "@/lib/format";
import { pokeSlug } from "@/lib/pokemon";
import { awardsCp, cpForPlacement, seasonOfDate } from "@/lib/cp";
import { withFlash } from "@/lib/flash";
import { ARCHETYPE_PREFIX } from "@/lib/types";
import type { MetaPreview, MetaPreviewRow } from "@/lib/types";
import { coverageOf, type ParseResult, type PasteMode } from "@/lib/standings";
import { getLang } from "@/lib/lang";
import { tr, trf, type I18nKey } from "@/lib/i18n";

/* =========================================================================
   Server Actions.

   Todo lo que escribe en la base de datos pasa por aquí. Dos reglas que no
   se saltan nunca:

   · Una Server Action es un endpoint público. Que la pantalla esconda un
     botón no protege nada: la comprobación de permisos va SIEMPRE dentro de
     la acción, comparando con quién está firmado en la cookie.
   · Lo que llega en el FormData es texto de fuera. Se valida antes de tocar
     una columna — fechas, números y enumerados incluidos.
   ========================================================================= */

/* ---------------------------------------------------------- utilidades -- */

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/**
 * Número de un campo, con valor por defecto de verdad.
 *
 * Ojo con la trampa: `fd.get(k)` es null cuando el campo no viene, y
 * `Number(null)` es 0, que es finito. Con la versión ingenua, un formulario
 * incompleto ponía maxUses a 0 (= invitación ilimitada) en vez de a 1.
 */
export const num = (fd: FormData, k: string, dflt = 0) => {
  const raw = str(fd, k);
  if (raw === "") return dflt;
  const n = Number(raw);
  return Number.isFinite(n) ? n : dflt;
};

export const maybeNum = (fd: FormData, k: string) => {
  const raw = str(fd, k);
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/** Entero acotado. Para todo lo que acaba en una columna `integer`. */
export const int = (fd: FormData, k: string, dflt: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(num(fd, k, dflt))));

/** Entero acotado que puede faltar. */
export const maybeInt = (fd: FormData, k: string, min: number, max: number) => {
  const n = maybeNum(fd, k);
  if (n == null) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
};

/** Fecha ISO validada. Una cadena rara reventaba la consulta con un 500. */
export const isoDate = (fd: FormData, k: string, dflt: string | null = todayISO()) => {
  const raw = str(fd, k);
  return isIsoDate(raw) ? raw : dflt;
};

export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

/** "HH:MM" en 24h, o null. Igual de estricto que `isoDate`: una hora rara no debe llegar a la columna. */
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const timeOfDay = (fd: FormData, k: string): string | null => {
  const raw = str(fd, k);
  return HHMM.test(raw) ? raw : null;
};

/** Precio de entrada, en céntimos. Lo que se teclea es en euros ("5", "5,50" o "5.50"). */
export const priceCents = (fd: FormData, k: string): number | null => {
  const raw = str(fd, k).replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
};

/**
 * El id que manda un selector de mazo, separado en sus dos formas.
 *
 * `DeckPicker` ofrece en la misma lista mazos registrados y arquetipos
 * sueltos, y los distingue con el prefijo `arch:` (ver `ARCHETYPE_PREFIX` en
 * lib/data). Aquí hay que deshacer eso antes de tocar la base, porque cada uno
 * va a una columna distinta y las dos son claves ajenas: guardar `arch:a12` en
 * `deck_id` es una violación de clave ajena y un error 500.
 */
export function deckOrArchetype(fd: FormData, k: string): { deckId: string | null; archetypeId: string | null } {
  const raw = str(fd, k);
  if (!raw) return { deckId: null, archetypeId: null };
  if (raw.startsWith(ARCHETYPE_PREFIX)) {
    return { deckId: null, archetypeId: raw.slice(ARCHETYPE_PREFIX.length) || null };
  }
  return { deckId: raw, archetypeId: null };
}

/** Valor de una lista cerrada, o el primero de la lista. */
export const pick = <T extends string>(fd: FormData, k: string, allowed: readonly T[], dflt: T): T => {
  const v = str(fd, k) as T;
  return allowed.includes(v) ? v : dflt;
};

export function refresh() {
  revalidatePath("/", "layout");
}

/**
 * Ruta a la que volver después de guardar, saneada.
 *
 * Varios formularios llevan un campo `back` para devolverte a donde estabas
 * en vez de a la pantalla de siempre. Ese campo llega del navegador, así que
 * sin filtrar convierte cualquiera de estas acciones en un redirector abierto:
 * un enlace con `back=https://otra-cosa.example` y alguien acaba fuera de la
 * app creyendo que sigue dentro. Solo se aceptan rutas internas, y `//` queda
 * fuera porque el navegador lo lee como otro dominio.
 */
export function safeBack(fd: FormData, dflt: string): string {
  const raw = str(fd, "back");
  if (!raw.startsWith("/") || raw.startsWith("//")) return dflt;
  return raw.slice(0, 300);
}

/* ------------------------------------------------------------ permisos -- */

/** Quién está actuando. Si no hay sesión válida, a la puerta. */
export async function requireActor() {
  const session = await readSession();
  if (!session) redirect("/entrar");
  const rows = await db.select().from(players).where(eq(players.id, session.playerId));
  const actor = rows[0];
  // v0.67 — y que la sesión no sea de antes de un cambio de contraseña.
  if (!actor || !actor.active || !sesionVigente(session.version, actor.sessionVersion)) {
    await clearSession();
    redirect("/entrar");
  }
  return actor;
}

/** Solo organizadores. Los demás se van a la portada en vez de ver un error feo. */
export async function requireManager() {
  const actor = await requireActor();
  if (!canManageLeague(actor.role)) redirect("/");
  return actor;
}

export type Actor = Awaited<ReturnType<typeof requireActor>>;

/** ¿Puede este actor tocar algo que pertenece a `ownerId`? */
export const owns = (actor: Actor, ownerId: string | null | undefined) =>
  ownerId === actor.id || canManageLeague(actor.role);

/** Cuántos propietarios activos quedan. La liga nunca puede quedarse sin ninguno. */
export async function ownerCount() {
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(players)
    .where(and(eq(players.role, "owner"), eq(players.active, true)));
  return rows[0]?.n ?? 0;
}

/* -------------------------------------------------------------- acceso -- */

export const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "Falta la contraseña"),
});

export const PALETTE = ["#f0b429", "#4aa8e8", "#63bd5a", "#e987b8", "#b271c9", "#f0803c", "#9aa6b4", "#c8a94a", "#5c9ea8", "#d4675f"];

/* ---------------------------------------------------------- arquetipos -- */

export async function ensureArchetype(main: string, secondary: string, type: string, name: string) {
  const m = pokeSlug(main), s = pokeSlug(secondary);
  if (m) {
    const found = await db.select().from(archetypes)
      .where(and(eq(archetypes.main, m), eq(archetypes.secondary, s)));
    if (found[0]) return found[0].id;
  }
  const id = newId("a");
  await db.insert(archetypes).values({
    id,
    name: name || [m, s].filter(Boolean).join(" / ") || "Arquetipo sin nombre",
    main: m, secondary: s, type: type || "colorless",
  });
  return id;
}

/* --------------------------------------------------------------- mazos -- */

/**
 * ¿Puede este actor tocar este mazo?
 *
 * Un mazo de la biblioteca compartida (sin dueño) lo edita quien lo creó y
 * los organizadores. Que sea de todos significa que todos lo pueden **usar**,
 * no que todos lo puedan reescribir: si no, el primero que pase te cambia la
 * lista de debajo de los pies.
 */
export function canEditDeck(actor: Actor, deck: { playerId: string | null; createdBy: string | null }) {
  if (canManageLeague(actor.role)) return true;
  if (deck.playerId) return deck.playerId === actor.id;
  return deck.createdBy === actor.id;
}

/* ------------------------------------------------------------ partidas -- */

export const BEST_OF = [1, 3, 5];

/* ------------------------------------------------------------- torneos -- */

// "pokemon_challenge"/"pokemon_cup" ya no se pueden elegir al crear o editar:
// puntúan exactamente igual que "league_challenge"/"league_cup" (son alias en
// cp.ts) y tenerlos como opción aparte era la confusión que señalaba Alex.
// `pick()` cae a "store" si llega cualquier otra cosa, así que un formulario
// viejo en caché que aún los mandara simplemente no los aceptaría.
export const TOURNAMENT_KINDS = [
  "league_challenge", "league_cup", "regional",
  "special", "international", "worlds", "store", "online", "other",
] as const;

/**
 * Volver a calcular los CP guardados de un torneo.
 *
 * Se llama desde dos sitios: al guardar el torneo editado y al poner la
 * asistencia desde su ficha. Vive aparte porque el caso más normal del mundo
 * —«se me olvidó apuntar cuánta gente hubo»— tiene que arreglarse desde
 * cualquiera de los dos caminos, y tener la cuenta escrita dos veces es
 * garantía de que un día solo se arregle uno.
 *
 * Los resultados con el CP puesto a mano no se tocan nunca: alguien escribió
 * ese número por algo, y machacarlo con la tabla sería perder información.
 *
 * Devuelve cuántas filas ha cambiado, para poder decirlo en el aviso.
 */
export async function recalcTournamentCp(
  tournamentId: string,
  t: { kind: string; playerCount: number | null; season?: number },
): Promise<number> {
  const rows = await db.select().from(tournamentResults)
    .where(eq(tournamentResults.tournamentId, tournamentId));
  if (!rows.length) return 0;

  // Sin temporada explícita se deduce de la fecha del torneo, nunca del año
  // natural: en septiembre el año natural es 2026 y la temporada es 2027, y
  // las dos tablas tienen kickers distintos.
  let season = t.season;
  if (season == null) {
    const [row] = await db.select({ date: tournaments.date, season: tournaments.season })
      .from(tournaments).where(eq(tournaments.id, tournamentId));
    season = row?.season ?? seasonOfDate(row?.date) ?? new Date().getFullYear();
  }

  const temporada: number = season ?? new Date().getFullYear();
  let cambiadas = 0;
  for (const r of rows) {
    const auto = cpForPlacement(temporada, t.kind, r.placement, t.playerCount);
    // Un CP a mano se respeta… salvo que el torneo ya no reparta CP (p. ej.
    // porque se ha marcado como online): entonces no hay nada que respetar.
    if (r.cpManual && awardsCp(temporada, t.kind)) continue;
    const cp = auto ?? 0;
    if (cp !== r.cpEarned) {
      await db.update(tournamentResults).set({ cpEarned: cp })
        .where(eq(tournamentResults.id, r.id));
      cambiadas++;
    }
  }
  return cambiadas;
}

/**
 * Mover el torneo por su ciclo: borrador → abierto → cerrado.
 *
 * Cerrar es lo único que tiene consecuencia: a partir de ahí no se apuntan
 * rondas. Se puede reabrir, y por eso no pide confirmación — lo que pide
 * confirmación es borrar, que sí es irreversible.
 *
 * Lo hace quien creó el torneo y los organizadores. Un participante cualquiera
 * no cierra el torneo de otro: perdería las rondas que a ese otro le faltan
 * por meter.
 */
/**
 * Del estado en que está, a los que tiene sentido ir.
 *
 * No es burocracia: volver a borrador un torneo con quince rondas apuntadas
 * las esconde de la ficha entera, y los datos se quedan vivos pero sin ninguna
 * pantalla desde la que verlos. Un camino que solo puede acabar mal es mejor
 * no tenerlo.
 */
export const STATUS_FLOW: Record<string, string[]> = {
  draft: ["open"],
  open: ["draft", "closed"],
  closed: ["open"],
};

export async function upsertResult(
  tournamentId: string,
  playerId: string,
  fd: FormData,
  kind: string,
  playerCount: number | null,
  season: number | null,
) {
  const placement = maybeInt(fd, "placement", 1, 100000);
  const cpManual = bool(fd, "cpManual");
  const cfg = (await db.select().from(settings).where(eq(settings.id, "default")))[0];
  const useSeason = season ?? cfg?.cpSeason ?? new Date().getFullYear();
  const auto = cpForPlacement(useSeason, kind, placement, playerCount);
  // `auto` es null cuando el tipo no reparte CP (online incluido, v0.15): ahí
  // no se guarda ningún número, tampoco uno tecleado a mano.
  const cpEarned = !awardsCp(useSeason, kind) ? 0
    : cpManual ? int(fd, "cpEarned", 0, 0, 5000) : (auto ?? 0);

  /* Dos maneras de decir qué récord hiciste, y las dos son legítimas:
     · "rounds": sale de las rondas apuntadas. Es la buena cuando las hay,
       porque además trae el mazo del rival y alimenta la matriz.
     · "manual": lo tecleas. Es la única posible cuando vuelves de un torneo
       viejo y no vas a reconstruir siete rondas de memoria.
     Con "rounds" ni se tocan las columnas: las lleva `syncTournamentRecord`. */
  const recordMode = pick(fd, "recordMode", ["manual", "rounds"] as const, "manual");
  const record = recordMode === "manual"
    ? {
      wins: int(fd, "wins", 0, 0, 50),
      losses: int(fd, "losses", 0, 0, 50),
      ties: int(fd, "ties", 0, 0, 50),
    }
    : null;

  const values = {
    tournamentId,
    playerId,
    placement,
    // Los dos selectores mandan ids que pueden venir prefijados.
    deckId: deckOrArchetype(fd, "deckId").deckId,
    // Simétrico al de arriba: los dos campos aceptan las dos formas, porque
    // esto es un endpoint público y lo que llega no lo decide el formulario.
    archetypeId: deckOrArchetype(fd, "archetypeId").archetypeId
      ?? deckOrArchetype(fd, "archetypeId").deckId,
    cpEarned,
    cpManual,
    prizes: str(fd, "prizes").slice(0, 300),
    notes: str(fd, "resultNotes").slice(0, 1000),
    dropped: bool(fd, "dropped"),
  };

  // Upsert de verdad, contra el índice único (torneo, jugador): con select +
  // insert, un doble toque en el móvil provocaba un 23505 sin capturar.
  const full = record ? { ...values, ...record } : values;
  await db.insert(tournamentResults)
    .values({ id: newId("tr"), ...full })
    .onConflictDoUpdate({
      target: [tournamentResults.tournamentId, tournamentResults.playerId],
      set: full,
    });

  /* El mazo del torneo es de todo el torneo, así que baja a las rondas ya
     apuntadas. Si no, la ficha decía «jugando Dragapult todo el torneo» y las
     rondas seguían guardadas sin mazo: las estadísticas por arquetipo y la
     matriz de emparejamientos no las veían, y no había forma de darse cuenta. */
  if (values.deckId) {
    await db.update(matches)
      .set({ deckAId: values.deckId })
      .where(and(
        eq(matches.tournamentId, tournamentId),
        eq(matches.playerAId, playerId),
        isNull(matches.playerBId),
      ));
  }
}

/** Los tipos de torneo que el calendario sabe colorear. */
export const CALENDAR_EVENT_KINDS: string[] = [
  "league_challenge", "league_cup", "regional",
  "special", "international", "worlds", "store", "online", "other",
];

export async function setDropped(fd: FormData, dropped: boolean) {
  const actor = await requireActor();
  const tournamentId = str(fd, "tournamentId");
  if (!tournamentId) return;
  const playerId = str(fd, "playerId") || actor.id;
  if (!owns(actor, playerId)) return;
  const tour = (await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)))[0];
  if (!tour) return;

  await db.insert(tournamentResults)
    .values({ id: newId("tr"), tournamentId, playerId, dropped })
    .onConflictDoUpdate({
      target: [tournamentResults.tournamentId, tournamentResults.playerId],
      set: { dropped },
    });
  await syncTournamentRecord(tournamentId, playerId);
  refresh();
  redirect(withFlash(`/torneos/${tournamentId}`, "ok",
    dropped ? "Drop apuntado: ya no se piden más rondas." : "Drop deshecho: puedes seguir apuntando rondas."));
}

/**
 * Escribe en `tournament_results` el récord que sale de las rondas.
 *
 * El puesto, los CP y los premios NO se tocan: de tus propias rondas no se
 * puede deducir en qué posición has quedado, así que eso lo sigue metiendo
 * una persona cuando salga la clasificación final.
 *
 * Si todavía no había fila de resultado, se crea: apuntar la primera ronda es
 * lo que te inscribe en el torneo, sin un paso previo.
 */
export async function syncTournamentRecord(
  tournamentId: string,
  playerId: string,
  /** Mazo a fijar, solo cuando el resultado todavía no tenía ninguno. */
  deckId: string | null = null,
  /** Arquetipo a fijar, cuando lo que se fija es solo el arquetipo y no un mazo. */
  archetypeId: string | null = null,
) {
  const rounds = await db.select().from(matches).where(and(
    eq(matches.tournamentId, tournamentId),
    eq(matches.playerAId, playerId),
    isNull(matches.playerBId),
  )).orderBy(asc(matches.round));

  /* Sin rondas, el récord es 0-0-0 y no lo que hubiera antes. Salir sin
     escribir dejaba el récord viejo para siempre al borrar la última. */
  if (!rounds.length) {
    await db.update(tournamentResults)
      .set({ wins: 0, losses: 0, ties: 0 })
      .where(and(
        eq(tournamentResults.tournamentId, tournamentId),
        eq(tournamentResults.playerId, playerId),
      ));
    return;
  }

  const ids = rounds.map((r) => r.id);
  const gameRows = ids.length
    ? await db.select().from(games).where(inArray(games.matchId, ids))
    : [];

  let wins = 0, losses = 0, ties = 0;
  for (const m of rounds) {
    const mine = gameRows.filter((g) => g.matchId === m.id);
    const need = Math.floor(m.bestOf / 2) + 1;
    const ga = mine.filter((g) => g.winner === "a").length;
    const gb = mine.filter((g) => g.winner === "b").length;

    let r: "w" | "l" | "d" | null = null;
    if (mine.length === 0) {
      r = m.seriesResult === "a" ? "w" : m.seriesResult === "b" ? "l" : m.seriesResult === "tie" ? "d" : null;
    } else if (ga >= need) r = "w";
    else if (gb >= need) r = "l";
    else if (m.seriesResult === "a") r = "w";
    else if (m.seriesResult === "b") r = "l";
    else if (m.seriesResult === "tie") r = "d";
    else if (mine.length >= m.bestOf) r = ga > gb ? "w" : gb > ga ? "l" : "d";

    if (r === "w") wins++;
    else if (r === "l") losses++;
    else if (r === "d") ties++;
  }

  const set = deckId
    ? { wins, losses, ties, deckId }
    : archetypeId
      ? { wins, losses, ties, archetypeId }
      : { wins, losses, ties };
  await db.insert(tournamentResults)
    .values({ id: newId("tr"), tournamentId, playerId, wins, losses, ties, deckId, archetypeId })
    .onConflictDoUpdate({
      target: [tournamentResults.tournamentId, tournamentResults.playerId],
      set,
    });
}

/* ------------------------------------------------------ zona de riesgo -- */

/**
 * Compara lo que ha escrito la persona con lo que se espera, sin ser
 * quisquilloso con mayúsculas ni espacios de más.
 *
 * Todos los borrados gordos piden escribir a mano el nombre de lo que se
 * borra. Es el patrón de GitHub al borrar un repositorio, y está por una
 * razón concreta: un botón de «borrar torneo» sin fricción se pulsa sin mirar,
 * y esto no tiene deshacer.
 */
export function confirmed(fd: FormData, expected: string) {
  const norm = (x: string) => x.trim().replace(/\s+/g, " ").toLowerCase();
  return Boolean(expected) && norm(str(fd, "confirm")) === norm(expected);
}

/**
 * Una firma corta y estable de una cadena (FNV-1a, 32 bits en hexadecimal).
 *
 * No es criptografía y no pretende serlo: solo hace falta que la misma
 * entrada dé siempre la misma salida y que dos entradas distintas casi nunca
 * coincidan. Se usa para desempatar ids de eventos, no para proteger nada.
 */
export function firma(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** El recuento por mazo que ve la pantalla antes de guardar. */
export function resumenImportacion(mode: PasteMode, parsed: ParseResult): MetaPreview {
  const acc = new Map<string, MetaPreviewRow>();
  for (const e of parsed.entries) {
    const row = acc.get(e.deck) ?? { name: e.deck, entries: 0, conocido: e.archetypeId != null, top8: 0 };
    row.entries += Math.max(1, e.copies);
    if (e.placement != null && e.placement <= 8) row.top8 += 1;
    acc.set(e.deck, row);
  }
  const rows = [...acc.values()].sort((a, b) => b.entries - a.entries || a.name.localeCompare(b.name, "es"));
  return {
    mode,
    rows,
    total: rows.reduce((a, r) => a + r.entries, 0),
    coverage: coverageOf(parsed.entries),
    skipped: parsed.skipped,
    descartadas: parsed.descartadas,
    nuevos: parsed.nuevos,
  };
}

/**
 * Los slugs de Pokémon que el catálogo ya conoce.
 *
 * Es la forma de ponerle sprite a un mazo que no está dado de alta: si en su
 * nombre aparece un Pokémon que sí sale en algún arquetipo del catálogo, ese
 * es el icono. No se inventa ningún slug — un slug inventado es una imagen
 * rota, y una fila con el dibujo equivocado se lee peor que una sin dibujo.
 */
export function indiceDeSprites(catalogo: Array<{ main: string; secondary: string }>): Set<string> {
  const set = new Set<string>();
  for (const a of catalogo) {
    if (a.main) set.add(a.main);
    if (a.secondary) set.add(a.secondary);
  }
  return set;
}

export function spritesDe(nombre: string, conocidos: Set<string>): { main: string; secondary: string } {
  const palabras = nombre.split(/\s+/).filter(Boolean);
  const hits: string[] = [];
  // Primero las parejas ("Raging Bolt"), que son más específicas que la
  // palabra suelta ("Raging" no es nadie, "Bolt" tampoco).
  for (let n = 2; n >= 1; n--) {
    for (let i = 0; i + n <= palabras.length; i++) {
      const slug = pokeSlug(palabras.slice(i, i + n).join(" "));
      if (slug && conocidos.has(slug) && !hits.includes(slug)) hits.push(slug);
      if (hits.length >= 2) break;
    }
    if (hits.length >= 2) break;
  }
  return { main: hits[0] ?? "", secondary: hits[1] ?? "" };
}

/** Un puesto de leaderboard: entero entre 1 y 100.000, o nulo si viene vacío. */
export const puestoDe = (fd: FormData, k: string): number | null => {
  const n = maybeNum(fd, k);
  if (n == null) return null;
  const r = Math.round(n);
  return r >= 1 && r <= 100_000 ? r : null;
};

/**
 * v0.49 — un aviso en el idioma de quien está guardando.
 *
 * Los avisos los escribe el servidor (en la URL, y los pinta el snackbar), así
 * que se traducen aquí, al crearlos, leyendo la misma cookie que las pantallas.
 */
export async function msj(key: string, vars?: Record<string, string | number>): Promise<string> {
  const l = await getLang();
  return vars ? trf(l, key as I18nKey, vars) : tr(l, key);
}
