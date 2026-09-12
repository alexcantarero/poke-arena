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

export type CpTier = { from: number; to: number; cp: number; minPlayers: number };

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
 * Temporada 2027 (TCG, Masters). PROVISIONAL.
 *
 * Se anunció oficialmente que en 2027 suben los CP de los puestos bajos de
 * Regional e International y que cambian los Best Finish Limit, pero las
 * cifras concretas no están publicadas en ninguna fuente accesible: están en
 * championships.pokemon.com, que bloquea el acceso automatizado.
 *
 * Mientras tanto, estos son los valores de 2026 como marcador de posición, y
 * `confirmed: false` hace que la app lo advierta en pantalla.
 *
 * PARA ARREGLARLO: abre la página oficial en un navegador normal, copia las
 * tablas y sustituye los números de aquí. No hay que tocar nada más.
 */
export const CP_2027: CpSeason = {
  "season": 2027,
  "game": "TCG",
  "division": "masters",
  "confirmed": false,
  "source": "https://championships.pokemon.com/en-us/about/2027-season-changes",
  "invites": {
    "europe": null,
    "us-canada": null,
    "latam": null,
    "oceania": null,
    "mesa": null
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

/** Temporadas registradas. Añadir una es una línea aquí. */
const SEASONS: Record<number, CpSeason> = {
  2026: CP_2026,
  2027: CP_2027,
};
