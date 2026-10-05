/* =========================================================================
   v0.21 — Familias de arquetipos: un arquetipo principal y sus variantes.

   «Slowking» engloba a «Slowking / Drapion» y «Slowking / Kyurem»; «Festival
   Lead» engloba a «Grookey / Applin». Cada arquetipo puede tener un padre
   (`archetypes.parent_id`); la «raíz» es el de más arriba de la cadena.

   Sin imports: lo cargan los tests.
   ========================================================================= */

/** El arquetipo principal de una familia. Aguanta ciclos y cadenas largas. */
export function raizDe(id: string, parentOf: Map<string, string | null | undefined>): string {
  let actual = id;
  const vistos = new Set<string>([id]);
  for (let i = 0; i < 20; i++) {
    const p = parentOf.get(actual);
    if (!p || vistos.has(p)) return actual;
    vistos.add(p);
    actual = p;
  }
  return actual;
}

/** ¿Poner `padre` como padre de `id` crearía un ciclo? */
export function creaCiclo(id: string, padre: string, parentOf: Map<string, string | null | undefined>): boolean {
  if (id === padre) return true;
  return raizDe(padre, new Map([...parentOf, [id, null]])) === id
    || (() => {
      let a: string | null | undefined = padre;
      for (let i = 0; i < 20 && a; i++) { if (a === id) return true; a = parentOf.get(a); }
      return false;
    })();
}

type FilaArch<A> = {
  archetypeId: string; archetype: A | undefined;
  played: number; wins: number; ties: number; losses: number;
  gameWins: number; gameLosses: number; winRate: number | null;
};

/**
 * Suma las filas de estadísticas por familia: usos, victorias, empates,
 * derrotas y juegos; el %V se RECALCULA con los totales (no es la media de
 * los porcentajes, que daría el mismo peso a una variante jugada 1 vez que a
 * una jugada 20).
 */
export function agruparFilas<A>(
  filas: FilaArch<A>[],
  raiz: (id: string) => string,
  arquetipo: (id: string) => A | undefined,
): FilaArch<A>[] {
  const out = new Map<string, FilaArch<A>>();
  for (const f of filas) {
    const r = raiz(f.archetypeId);
    const acc = out.get(r) ?? {
      archetypeId: r, archetype: arquetipo(r),
      played: 0, wins: 0, ties: 0, losses: 0, gameWins: 0, gameLosses: 0, winRate: null,
    };
    acc.played += f.played; acc.wins += f.wins; acc.ties += f.ties; acc.losses += f.losses;
    acc.gameWins += f.gameWins; acc.gameLosses += f.gameLosses;
    out.set(r, acc);
  }
  const lista = [...out.values()];
  for (const r of lista) r.winRate = r.played ? (r.wins + r.ties * 0.5) / r.played : null;
  return lista.sort((x, y) => y.played - x.played || (y.winRate ?? 0) - (x.winRate ?? 0));
}
