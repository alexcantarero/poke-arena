/* =========================================================================
   Championship Points.

   Las tablas de cada temporada están al FINAL de este fichero, en su propia
   sección de datos. Se editan a mano cuando Play! Pokémon publica cifras
   nuevas; la lógica de arriba no cambia nunca.

   Dos cosas que el sistema real hace y conviene no perder de vista:

   · El **Best Finish Limit**: de cada tipo de evento solo cuentan tus N
     mejores resultados. Y algunos tipos comparten contador — un Pokémon Cup
     cuenta contra el mismo límite que una League Cup.

     Los límites de esta liga son **de casa**, no los oficiales: 4 mejores
     Challenges, 4 mejores Cups y 5 mejores Regionales. Se cambian en el campo
     `bfl` de cada tipo, en las tablas del final. Para que Challenges y Cups
     compartieran un único cubo de 4, bastaría con poner
     `"sharesBflWith": "league_cup"` en `league_challenge`.
   · El **kicker**: el valor de CP de un puesto es fijo; lo que depende de la
     asistencia es si ese tramo reparte puntos o no. Un 9.º puesto en una
     League Challenge de 30 personas no cobra, porque ese tramo necesita 48.

   Lo que este módulo NO hace, a propósito: decir cuántos CP hacen falta para
   ir al Mundial. Desde 2025 la invitación es por Top N del ranking de la
   zona, no por umbral, y ese corte solo se conoce al acabar la temporada.
   ========================================================================= */

export type CpTier = {
  from: number;
  to: number;
  cp: number;
  minPlayers: number;
  /**
   * Este puesto da invitación directa al Mundial, al margen de los puntos.
   * El campeón de un Regional; el Top 4 completo de un Internacional.
   */
  invite?: boolean;
};

export type CpEventDef = {
  label: string;
  /** Si está, este tipo puntúa exactamente como aquel. */
  aliasOf?: string | null;
  /** Contra qué contador de Best Finish Limit cuenta. Null = el suyo propio. */
  sharesBflWith?: string | null;
  /** Cuántos resultados de este tipo cuentan. 0 = todos. */
  bfl?: number;
  tiers?: CpTier[];
};

export type CpSeason = {
  season: number;
  game: string;
  division: string;
  /** false cuando las cifras aún no son oficiales. La interfaz lo advierte. */
  confirmed: boolean;
  source: string;
  note?: string;
  invites: Record<string, number | null>;
  events: Record<string, CpEventDef>;
};

/**
 * Se calculan al llamarlas, no al cargar el módulo: las tablas están al final
 * del fichero y todavía no existen cuando este bloque se evalúa.
 */
export function availableSeasons(): number[] {
  return Object.keys(SEASONS).map(Number).sort((a, b) => b - a);
}

export function latestSeason(): number {
  return availableSeasons()[0];
}

export function getSeason(season: number): CpSeason {
  return SEASONS[season] ?? SEASONS[latestSeason()];
}

/**
 * A qué temporada de Play! Pokémon pertenece una fecha.
 *
 * La temporada va de julio a junio y se nombra por el año en que termina: un
 * torneo del 3 de agosto de 2026 es temporada 2027. Sirve para que un torneo
 * al que se le olvidó marcar la temporada acabe en la correcta, y no en todas.
 */
export function seasonOfDate(iso: string | null | undefined): number | null {
  if (!iso || !/^\d{4}-\d{2}/.test(iso)) return null;
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return month >= 7 ? year + 1 : year;
}

/** Resuelve los alias: `pokemon_cup` puntúa como `league_cup`. */
export function resolveEventDef(season: number, kind: string): CpEventDef | null {
  const table = getSeason(season);
  const def = table.events[kind];
  if (!def) return null;
  if (def.aliasOf) {
    const target = table.events[def.aliasOf];
    return target ? { ...target, label: def.label, sharesBflWith: def.sharesBflWith ?? def.aliasOf } : null;
  }
  return def;
}

/** La clave contra la que cuenta el Best Finish Limit de este tipo de evento. */
export function bflBucket(season: number, kind: string): string {
  const def = getSeason(season).events[kind];
  return def?.sharesBflWith || def?.aliasOf || kind;
}

/** ¿Este tipo de evento reparte Championship Points? */
export function awardsCp(season: number, kind: string): boolean {
  const def = resolveEventDef(season, kind);
  return Boolean(def?.tiers && def.tiers.length > 0);
}

/**
 * El tramo al que cae un puesto, con el kicker ya resuelto.
 *
 * Existe aparte de `cpForPlacement` porque la interfaz necesita explicar el
 * número, no solo enseñarlo: cuántos CP son, si el tramo está apagado por
 * falta de gente y cuánta haría falta, y si ese puesto además da invitación
 * directa al Mundial. Sacar eso de un `number | null` no se puede.
 */
export type TierMatch = {
  tier: CpTier;
  /** Los CP que se cobran de verdad: 0 si el kicker no llega. */
  cp: number;
  /** true cuando el tramo existe pero no hubo asistencia suficiente. */
  blockedByKicker: boolean;
  /** Gente que haría falta para que ese tramo pague. */
  needed: number;
  /** Ese puesto da plaza para el Mundial al margen de los puntos. */
  invite: boolean;
};

export function tierFor(
  season: number,
  kind: string,
  placement: number | null | undefined,
  playerCount: number | null | undefined,
): TierMatch | null {
  if (placement == null || placement < 1) return null;
  const def = resolveEventDef(season, kind);
  if (!def?.tiers?.length) return null;
  const attendance = playerCount ?? 0;
  for (const tier of def.tiers) {
    if (placement >= tier.from && placement <= tier.to) {
      const blocked = tier.minPlayers > 0 && attendance < tier.minPlayers;
      return {
        tier,
        cp: blocked ? 0 : tier.cp,
        blockedByKicker: blocked,
        needed: tier.minPlayers,
        // La invitación va con el puesto, no con el kicker: el campeón de un
        // Regional entra aunque el tramo de puntos no se hubiera activado.
        invite: Boolean(tier.invite),
      };
    }
  }
  return null;
}

/**
 * CP que corresponden a un puesto, aplicando el kicker de asistencia.
 * Devuelve null cuando no se puede calcular (tipo sin tabla, sin puesto).
 */
export function cpForPlacement(
  season: number,
  kind: string,
  placement: number | null | undefined,
  playerCount: number | null | undefined,
): number | null {
  if (placement == null || placement < 1) return null;
  const def = resolveEventDef(season, kind);
  if (!def?.tiers?.length) return null;
  const attendance = playerCount ?? 0;
  for (const tier of def.tiers) {
    if (placement >= tier.from && placement <= tier.to) {
      // El tramo existe pero no se activa si no hubo suficiente gente. Si no
      // sabemos cuánta hubo, tampoco lo damos por bueno: era la puerta de atrás
      // para cobrar los 8 CP de un tramo de 48 personas dejando el campo vacío.
      if (tier.minPlayers > 0 && attendance < tier.minPlayers) return 0;
      return tier.cp;
    }
  }
  return 0;
}

/**
 * Los CP que vale un resultado **ahora mismo**.
 *
 * Esto es el arreglo de fondo del problema de «puse la asistencia después y
 * me sigue saliendo 0».
 *
 * La columna `cp_earned` de la base es una **caché**, no la verdad. Se
 * rellena al guardar y se recalcula al editar el torneo, pero cualquier
 * camino que cambie el tipo o la asistencia sin pasar por ahí la deja vieja,
 * y entonces el perfil —que recalcula— y la ficha del torneo —que leía la
 * columna— decían cosas distintas. Eso es exactamente lo que se veía.
 *
 * Con esto, **ninguna pantalla vuelve a leer la columna directamente**: se
 * calcula del tipo, el puesto y la asistencia de ahora. La columna sigue
 * existiendo porque es lo que se exporta y lo que se corrige a mano, pero ya
 * no puede desincronizarse de lo que se ve.
 *
 * `cpManual` manda siempre: si alguien tecleó el número, lo tecleó por algo.
 */
export function effectiveCp(
  season: number,
  kind: string,
  result: { placement: number | null; cpEarned: number; cpManual: boolean },
  playerCount: number | null | undefined,
): number {
  if (result.cpManual) return result.cpEarned;
  return cpForPlacement(season, kind, result.placement, playerCount) ?? 0;
}

/**
 * Por qué un resultado da los CP que da. Para poder explicarlo en pantalla
 * en vez de enseñar un cero sin más.
 *
 * Los tres motivos de un cero son siempre los mismos, y el importante es el
 * del medio: el tramo existe, el puesto encaja, pero no hubo bastante gente
 * para activarlo. Eso no es un fallo de la app.
 */
export type CpReason =
  | { kind: "manual"; cp: number }
  | { kind: "ok"; cp: number }
  | { kind: "no-placement" }
  | { kind: "no-attendance"; wouldBe: number; needs: number }
  | { kind: "kicker"; cp: 0; needs: number; have: number; wouldBe: number }
  | { kind: "no-cp" };

export function explainCp(
  season: number,
  kind: string,
  result: { placement: number | null; cpEarned: number; cpManual: boolean },
  playerCount: number | null | undefined,
): CpReason {
  if (result.cpManual) return { kind: "manual", cp: result.cpEarned };

  const def = resolveEventDef(season, kind);
  if (!def?.tiers?.length) return { kind: "no-cp" };
  if (result.placement == null || result.placement < 1) return { kind: "no-placement" };

  const tier = def.tiers.find((t) => result.placement! >= t.from && result.placement! <= t.to);
  if (!tier) return { kind: "ok", cp: 0 };

  if (tier.minPlayers > 0 && playerCount == null) {
    return { kind: "no-attendance", wouldBe: tier.cp, needs: tier.minPlayers };
  }
  if (tier.minPlayers > 0 && (playerCount ?? 0) < tier.minPlayers) {
    return { kind: "kicker", cp: 0, needs: tier.minPlayers, have: playerCount ?? 0, wouldBe: tier.cp };
  }
  return { kind: "ok", cp: tier.cp };
}

export type CpResultInput = {
  id: string;
  kind: string;
  date: string;
  placement: number | null;
  playerCount: number | null;
  cpEarned: number;
  cpManual: boolean;
  tournamentName: string;
};

export type CpBreakdownRow = CpResultInput & {
  /**
   * Los CP que vale el resultado, antes del límite. Es lo que hace falta para
   * poder enseñar «esto te lo estás dejando fuera»: en un resultado excluido
   * `counted` es 0 y sin este campo el valor perdido no se puede recuperar.
   */
  value: number;
  /** Los CP que de verdad suman al total, ya aplicado el límite. */
  counted: number;
  /** true cuando el resultado se queda fuera por Best Finish Limit. */
  excluded: boolean;
  bucket: string;
};

export type CpTotals = {
  season: number;
  confirmed: boolean;
  total: number;
  rows: CpBreakdownRow[];
  /** Por contador de límite: cuántos cuentan, cuántos caben y cuánto suman. */
  buckets: Array<{ bucket: string; label: string; bfl: number; counting: number; total: number; spare: number | null }>;
};

/**
 * Total de CP de un jugador en una temporada, aplicando el Best Finish Limit
 * de cada contador y dejando ver qué resultados se han quedado fuera.
 */
export function computeCp(season: number, results: CpResultInput[]): CpTotals {
  const table = getSeason(season);

  const withValue = results.map((r) => {
    const auto = cpForPlacement(season, r.kind, r.placement, r.playerCount);
    const value = r.cpManual ? r.cpEarned : auto ?? r.cpEarned;
    return { ...r, value, bucket: bflBucket(season, r.kind) };
  });

  const byBucket = new Map<string, typeof withValue>();
  for (const r of withValue) {
    const list = byBucket.get(r.bucket);
    if (list) list.push(r);
    else byBucket.set(r.bucket, [r]);
  }

  const rows: CpBreakdownRow[] = [];
  const buckets: CpTotals["buckets"] = [];
  let total = 0;

  for (const [bucket, list] of byBucket) {
    const def = table.events[bucket];
    const bfl = def?.bfl ?? 0;
    // Los mejores primero; a igualdad, el más reciente.
    const sorted = [...list].sort((a, b) => b.value - a.value || b.date.localeCompare(a.date));
    let counting = 0;
    let bucketTotal = 0;

    sorted.forEach((r, i) => {
      const excluded = bfl > 0 && i >= bfl;
      const counted = excluded ? 0 : r.value;
      if (!excluded) {
        counting++;
        bucketTotal += counted;
      }
      rows.push({ ...r, counted, excluded, bucket });
    });

    total += bucketTotal;
    buckets.push({
      bucket,
      label: def?.label ?? bucket,
      bfl,
      counting,
      total: bucketTotal,
      spare: bfl > 0 ? Math.max(0, bfl - counting) : null,
    });
  }

  rows.sort((a, b) => b.date.localeCompare(a.date));
  buckets.sort((a, b) => b.total - a.total);

  return { season, confirmed: table.confirmed, total, rows, buckets };
}

/**
 * Simulación: cuánto sumaría de verdad un resultado hipotético, una vez
 * aplicado el límite. Muchas veces la respuesta es cero, y eso es justo lo
 * que interesa saber antes de coger un tren.
 */
export function simulate(
  season: number,
  current: CpResultInput[],
  hypothetical: { kind: string; placement: number; playerCount: number | null },
): { before: number; after: number; gain: number } {
  const before = computeCp(season, current).total;
  const fake: CpResultInput = {
    id: "__simulado__",
    kind: hypothetical.kind,
    date: "9999-12-31",
    placement: hypothetical.placement,
    playerCount: hypothetical.playerCount,
    cpEarned: 0,
    cpManual: false,
    tournamentName: "Simulación",
  };
  const after = computeCp(season, [...current, fake]).total;
  return { before, after, gain: after - before };
}

/** Etiquetas de los tipos de torneo, para los desplegables. */
export function eventKinds(season: number): Array<{ value: string; label: string; givesCp: boolean }> {
  const table = getSeason(season);
  return Object.entries(table.events).map(([value, def]) => ({
    value,
    label: def.label,
    givesCp: awardsCp(season, value),
  }));
}

/* =========================================================================
   DATOS — TABLAS POR TEMPORADA

   Todo lo de aquí abajo son cifras, no lógica. Es lo único que hay que tocar
   cuando cambian las reglas. Para añadir la temporada 2028: copia el bloque
   de 2027, pon los números nuevos y añádela a SEASONS.
   ========================================================================= */

/**
 * Temporada 2026 (TCG, Masters). Cifras contrastadas entre PokéBeach,
 * Bulbagarden y Cardsrealm.
 * https://www.pokebeach.com/2025/06/2026-regionals-and-internationals-announced-changes-to-worlds-tcg-invites
 */
export const CP_2026: CpSeason = {
  "season": 2026,
  "game": "TCG",
  "division": "masters",
  "confirmed": true,
  "source": "https://www.pokebeach.com/2025/06/2026-regionals-and-internationals-announced-changes-to-worlds-tcg-invites",
  "invites": {
    "europe": 135,
    "us-canada": 135,
    "latam": 125,
    "oceania": 20,
    "mesa": 10
  },
  "events": {
    "league_challenge": {
      "label": "League Challenge",
      "bfl": 4,
      "sharesBflWith": null,
      "tiers": [
        {
          "from": 1,
          "to": 1,
          "cp": 15,
          "minPlayers": 0
        },
        {
          "from": 2,
          "to": 2,
          "cp": 12,
          "minPlayers": 0
        },
        {
          "from": 3,
          "to": 4,
          "cp": 10,
          "minPlayers": 0
        },
        {
          "from": 5,
          "to": 8,
          "cp": 8,
          "minPlayers": 24
        },
        {
          "from": 9,
          "to": 16,
          "cp": 6,
          "minPlayers": 48
        },
        {
          "from": 17,
          "to": 32,
          "cp": 4,
          "minPlayers": 100
        }
      ]
    },
    "league_cup": {
      "label": "League Cup",
      "bfl": 4,
      "sharesBflWith": null,
      "tiers": [
        {
          "from": 1,
          "to": 1,
          "cp": 50,
          "minPlayers": 0
        },
        {
          "from": 2,
          "to": 2,
          "cp": 40,
          "minPlayers": 0
        },
        {
          "from": 3,
          "to": 4,
          "cp": 32,
          "minPlayers": 0
        },
        {
          "from": 5,
          "to": 8,
          "cp": 24,
          "minPlayers": 24
        },
        {
          "from": 9,
          "to": 16,
          "cp": 20,
          "minPlayers": 48
        },
        {
          "from": 17,
          "to": 32,
          "cp": 16,
          "minPlayers": 100
        },
        {
          "from": 33,
          "to": 64,
          "cp": 13,
          "minPlayers": 200
        }
      ]
    },
    "pokemon_challenge": {
      "label": "Pokemon Challenge",
      "aliasOf": "league_challenge",
      "sharesBflWith": "league_challenge"
    },
    "pokemon_cup": {
      "label": "Pokemon Cup",
      "aliasOf": "league_cup",
      "sharesBflWith": "league_cup"
    },
    "regional": {
      "label": "Regional Championship",
      "bfl": 5,
      "sharesBflWith": null,
      "tiers": [
        {
          "from": 1,
          "to": 1,
          "cp": 350,
          "minPlayers": 0
        },
        {
          "from": 2,
          "to": 2,
          "cp": 325,
          "minPlayers": 0
        },
        {
          "from": 3,
          "to": 4,
          "cp": 300,
          "minPlayers": 0
        },
        {
          "from": 5,
          "to": 8,
          "cp": 280,
          "minPlayers": 0
        },
        {
          "from": 9,
          "to": 16,
          "cp": 200,
          "minPlayers": 0
        },
        {
          "from": 17,
          "to": 32,
          "cp": 160,
          "minPlayers": 0
        },
        {
          "from": 33,
          "to": 64,
          "cp": 120,
          "minPlayers": 0
        },
        {
          "from": 65,
          "to": 128,
          "cp": 80,
          "minPlayers": 0
        },
        {
          "from": 129,
          "to": 256,
          "cp": 60,
          "minPlayers": 0
        },
        {
          "from": 257,
          "to": 512,
          "cp": 40,
          "minPlayers": 0
        },
        {
          "from": 513,
          "to": 1024,
          "cp": 20,
          "minPlayers": 0
        }
      ]
    },
    "special": {
      "label": "Special Championship",
      "aliasOf": "regional",
      "sharesBflWith": "regional"
    },
    "international": {
      "label": "International Championship",
      "bfl": 0,
      "sharesBflWith": null,
      "tiers": [
        {
          "from": 1,
          "to": 1,
          "cp": 500,
          "minPlayers": 0
        },
        {
          "from": 2,
          "to": 2,
          "cp": 480,
          "minPlayers": 0
        },
        {
          "from": 3,
          "to": 4,
          "cp": 420,
          "minPlayers": 0
        },
        {
          "from": 5,
          "to": 8,
          "cp": 380,
          "minPlayers": 0
        },
        {
          "from": 9,
          "to": 16,
          "cp": 300,
          "minPlayers": 0
        },
        {
          "from": 17,
          "to": 32,
          "cp": 240,
          "minPlayers": 0
        },
        {
          "from": 33,
          "to": 64,
          "cp": 180,
          "minPlayers": 0
        },
        {
          "from": 65,
          "to": 128,
          "cp": 140,
          "minPlayers": 0
        }
      ]
    },
    "worlds": {
      "label": "World Championships",
      "bfl": 0,
      "sharesBflWith": null,
      "tiers": []
    },
    "store": {
      "label": "Torneo de tienda",
      "bfl": 0,
      "sharesBflWith": null,
      "tiers": []
    },
    "online": {
      "label": "Torneo online",
      "bfl": 0,
      "sharesBflWith": null,
      "tiers": []
    },
    "other": {
      "label": "Otro",
      "bfl": 0,
      "sharesBflWith": null,
      "tiers": []
    }
  }
};

/**
 * Temporada 2027 (TCG, Masters). CONFIRMADA.
 *
 * Cifras oficiales de Play! Pokémon para 2027, transcritas de las tablas que
 * circulan del anuncio de temporada. Dos cosas cambian de verdad respecto a
 * 2026 y conviene no perderlas de vista:
 *
 *   · **Los kickers bajan mucho en los tramos altos.** Un 2.º puesto ahora
 *     cobra con 4 personas y un 3.º-4.º con 8. Antes hacía falta bastante
 *     más gente para que esos tramos se activaran, y eso cambia lo que vale
 *     un Challenge pequeño de tienda.
 *   · **Regionales e Internacionales comparten Best Finish Limit**: cinco
 *     resultados entre los dos, no cinco de cada. Un Top 8 de Internacional
 *     te ocupa un hueco que podría ser de un Regional.
 *
 * Y hay tramos que además dan **invitación directa al Mundial**, al margen
 * de los puntos: el campeón de un Regional, y el Top 4 completo de un
 * Internacional. Eso es `invite: true` en el tramo, y la app lo enseña.
 *
 * Si Play! Pokémon publica una corrección, se cambian los números de aquí y
 * ya está: no hay lógica que tocar.
 */
export const CP_2027: CpSeason = {
  season: 2027,
  game: "TCG",
  division: "masters",
  confirmed: true,
  source: "Play! Pokémon — estructura de puntos de la temporada 2027",
  note:
    "Regionales e Internacionales comparten un único límite de 5 mejores resultados. " +
    "El campeón de un Regional y el Top 4 de un Internacional tienen invitación directa al Mundial.",
  invites: {
    // Top N por zona, no un corte de puntos: solo se sabe al acabar la temporada.
    europe: null,
    "us-canada": null,
    latam: null,
    oceania: null,
    mesa: null,
  },
  events: {
    league_challenge: {
      label: "League Challenge",
      bfl: 4,
      tiers: [
        { from: 1, to: 1, cp: 15, minPlayers: 0 },
        { from: 2, to: 2, cp: 12, minPlayers: 4 },
        { from: 3, to: 4, cp: 10, minPlayers: 8 },
        { from: 5, to: 8, cp: 8, minPlayers: 14 },
        { from: 9, to: 16, cp: 6, minPlayers: 25 },
        { from: 17, to: 32, cp: 4, minPlayers: 48 },
      ],
    },

    league_cup: {
      label: "League Cup",
      bfl: 4,
      tiers: [
        { from: 1, to: 1, cp: 50, minPlayers: 0 },
        { from: 2, to: 2, cp: 40, minPlayers: 4 },
        { from: 3, to: 4, cp: 32, minPlayers: 8 },
        { from: 5, to: 8, cp: 25, minPlayers: 17 },
        { from: 9, to: 16, cp: 20, minPlayers: 48 },
        { from: 17, to: 32, cp: 16, minPlayers: 80 },
        { from: 33, to: 64, cp: 13, minPlayers: 128 },
      ],
    },

    // Los nombres nuevos de los mismos eventos: puntúan igual y, sobre todo,
    // gastan del mismo contador de mejores resultados.
    pokemon_challenge: {
      label: "Pokémon Challenge",
      aliasOf: "league_challenge",
      sharesBflWith: "league_challenge",
    },
    pokemon_cup: {
      label: "Pokémon Cup",
      aliasOf: "league_cup",
      sharesBflWith: "league_cup",
    },

    regional: {
      label: "Campeonato Regional",
      bfl: 5,
      tiers: [
        { from: 1, to: 1, cp: 350, minPlayers: 0, invite: true },
        { from: 2, to: 2, cp: 325, minPlayers: 4 },
        { from: 3, to: 4, cp: 300, minPlayers: 8 },
        { from: 5, to: 8, cp: 280, minPlayers: 17 },
        { from: 9, to: 16, cp: 200, minPlayers: 33 },
        { from: 17, to: 32, cp: 160, minPlayers: 65 },
        { from: 33, to: 64, cp: 120, minPlayers: 129 },
        { from: 65, to: 128, cp: 80, minPlayers: 257 },
        { from: 129, to: 256, cp: 60, minPlayers: 513 },
        { from: 257, to: 512, cp: 45, minPlayers: 1025 },
        { from: 513, to: 1024, cp: 22, minPlayers: 2049 },
      ],
    },

    // Un Special Championship reparte como un Regional y cuenta contra el
    // mismo límite.
    special: {
      label: "Special Championship",
      aliasOf: "regional",
      sharesBflWith: "regional",
    },

    international: {
      label: "Campeonato Internacional",
      // Comparte los 5 huecos con los Regionales: es el cambio gordo de 2027.
      sharesBflWith: "regional",
      bfl: 5,
      tiers: [
        { from: 1, to: 1, cp: 500, minPlayers: 0, invite: true },
        { from: 2, to: 2, cp: 480, minPlayers: 4, invite: true },
        { from: 3, to: 4, cp: 420, minPlayers: 8, invite: true },
        { from: 5, to: 8, cp: 380, minPlayers: 17 },
        { from: 9, to: 16, cp: 300, minPlayers: 33 },
        { from: 17, to: 32, cp: 240, minPlayers: 65 },
        { from: 33, to: 64, cp: 180, minPlayers: 129 },
        { from: 65, to: 128, cp: 140, minPlayers: 257 },
        { from: 129, to: 256, cp: 100, minPlayers: 513 },
        { from: 257, to: 512, cp: 85, minPlayers: 1025 },
        { from: 513, to: 1024, cp: 42, minPlayers: 2049 },
      ],
    },

    // El Mundial no reparte CP de temporada: se va a él, no se puntúa para él.
    worlds: { label: "Campeonato Mundial", bfl: 0, tiers: [] },

    // Los que no son del circuito. Cuentan para vuestras estadísticas, no para CP.
    store: { label: "Torneo de tienda", bfl: 0, tiers: [] },
    online: { label: "Torneo online", bfl: 0, tiers: [] },
    other: { label: "Otro", bfl: 0, tiers: [] },
  },
};

/** Temporadas registradas. Añadir una es una línea aquí. */
const SEASONS: Record<number, CpSeason> = {
  2026: CP_2026,
  2027: CP_2027,
};
