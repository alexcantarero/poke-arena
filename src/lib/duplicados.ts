/* =========================================================================
   v0.135 — ¿SON EL MISMO TORNEO? Para no crear duplicados y para encontrar
   los que ya hay.

   Sin imports, para probarlo.

   Había varias maneras de meter un torneo (crearlo a mano, pegar el
   localizador en el Calendario, apuntar un resultado de tienda, las series
   online…) y algunas acababan creando el mismo torneo dos veces. Esta es la
   regla única que usan todas:

     · misma fecha y misma familia de torneo (League Cup = Pokémon Cup, etc.);
     · y además el nombre o la sede comparten lo que de verdad los distingue
       (el nombre de la tienda), quitando las palabras que salen en todos
       («TCG League Cup Season 1», «Pokémon», «Games»…).

   Dos Cups el mismo día en tiendas distintas NO son el mismo torneo.
   Dos torneos importados de Limitless con ids distintos, tampoco.
   ========================================================================= */

export type TorneoComparable = {
  id: string; name: string; date: string; kind: string; venue?: string | null; organizer?: string | null;
};

/* Palabras que salen en todos los nombres y no distinguen nada. */
const VACIAS = new Set([
  "pokemon", "tcg", "league", "liga", "cup", "copa", "challenge", "desafio", "season", "temporada", "torneo", "tournament",
  "de", "del", "la", "el", "los", "las", "the", "and", "y", "en", "a", "at", "of",
  "games", "game", "juegos", "jocs", "store", "tienda", "shop", "club", "cards", "card", "cartas", "tcgs", "regional",
  "championship", "championships", "special", "event", "evento", "pre", "release", "prerelease",
]);

export function familiaDeTipo(kind: string): string {
  if (kind === "league_cup" || kind === "pokemon_cup") return "cup";
  if (kind === "league_challenge" || kind === "pokemon_challenge") return "challenge";
  return kind;
}

/** Las palabras que distinguen un torneo de otro: sin tildes, sin signos, sin las de relleno y sin números sueltos. */
export function palabrasClave(...textos: Array<string | null | undefined>): Set<string> {
  const out = new Set<string>();
  for (const t of textos) {
    const limpio = String(t ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9ñ]+/g, " ");
    for (const w of limpio.split(" ")) {
      if (w.length < 3 || VACIAS.has(w) || /^\d+$/.test(w)) continue;
      out.add(w);
    }
  }
  return out;
}

export function mismoTorneo(a: TorneoComparable, b: TorneoComparable): boolean {
  if (a.id === b.id) return true;
  if (a.date !== b.date || familiaDeTipo(a.kind) !== familiaDeTipo(b.kind)) return false;
  // Dos torneos de Limitless con ids distintos son dos torneos distintos.
  if (a.id.startsWith("ltl-") && b.id.startsWith("ltl-")) return false;
  const pa = palabrasClave(a.name, a.venue, a.organizer), pb = palabrasClave(b.name, b.venue, b.organizer);
  if (!pa.size || !pb.size) return false;
  let comunes = 0;
  for (const w of pa) if (pb.has(w)) comunes++;
  // La mitad de lo que distingue al más corto: «Mythic» y «Mythic Games Calella» sí; «Mythic» y «Lorcanos», no.
  return comunes >= 1 && comunes / Math.min(pa.size, pb.size) >= 0.5;
}

/** El primero de la lista que sea el mismo torneo que `t`, o null. */
export function buscarDuplicado<T extends TorneoComparable>(t: TorneoComparable, lista: readonly T[]): T | null {
  return lista.find((x) => x.id !== t.id && mismoTorneo(t, x)) ?? null;
}

/** Todos los pares de duplicados de una lista (cada par una vez). */
export function paresDuplicados<T extends TorneoComparable>(lista: readonly T[]): Array<[T, T]> {
  const porFecha = new Map<string, T[]>();
  for (const t of lista) {
    const l = porFecha.get(t.date);
    if (l) l.push(t); else porFecha.set(t.date, [t]);
  }
  const out: Array<[T, T]> = [];
  for (const l of porFecha.values()) {
    for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) if (mismoTorneo(l[i], l[j])) out.push([l[i], l[j]]);
  }
  return out.sort((x, y) => y[0].date.localeCompare(x[0].date));
}

/**
 * Al fusionar, con cuál quedarse: el que tiene más datos (resultados y rondas)
 * y, a igualdad, el más antiguo. Así lo que la gente ya apuntó no se mueve.
 */
export function cualConservar<T extends { id: string; resultados: number; rondas: number; creado: string }>(a: T, b: T): [conservar: T, quitar: T] {
  const pa = a.resultados * 10 + a.rondas, pb = b.resultados * 10 + b.rondas;
  if (pa !== pb) return pa > pb ? [a, b] : [b, a];
  return a.creado <= b.creado ? [a, b] : [b, a];
}
