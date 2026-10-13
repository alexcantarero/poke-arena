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
  firstPlayed: number; firstWins: number; secondPlayed: number; secondWins: number;
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
        firstPlayed: 0, firstWins: 0, secondPlayed: 0, secondWins: 0,
    };
    acc.played += f.played; acc.wins += f.wins; acc.ties += f.ties; acc.losses += f.losses;
    acc.gameWins += f.gameWins; acc.gameLosses += f.gameLosses;
      acc.firstPlayed += (f.firstPlayed || 0); acc.firstWins += (f.firstWins || 0);
      acc.secondPlayed += (f.secondPlayed || 0); acc.secondWins += (f.secondWins || 0);
    out.set(r, acc);
  }
  const lista = [...out.values()];
  for (const r of lista) r.winRate = r.played ? (r.wins + r.ties * 0.5) / r.played : null;
  return lista.sort((x, y) => y.played - x.played || (y.winRate ?? 0) - (x.winRate ?? 0));
}

/* -------------------------------------------------------------------------
   v0.22 — Agrupación AUTOMÁTICA por el primer Pokémon.

   «Dragapult / Dudunsparce», «Dragapult / Blaziken» y «Dragapult / Martillos»
   son todos Dragapult: el primer Pokémon (`main`) es el que define el mazo.
   Reglas, en este orden:
     1. Si un organizador puso un padre a mano, manda ese (Grookey / Applin →
        Festival Lead no se puede deducir del primer Pokémon).
     2. Si no, la familia es el `main`. Si existe un arquetipo con ese `main`
        y SIN secundario («Dragapult» a secas), es él quien da nombre y
        sprite a la familia; si no, se crea uno virtual (`fam:dragapult`).
     3. Sin `main` (el cajón «Other»), cada uno va solo.
   ------------------------------------------------------------------------- */

export type ArqMin = { id: string; name: string; main: string; secondary: string; parentId?: string | null };

/** «raging-bolt» → «Raging Bolt»; «excadrill-mega» → «Mega Excadrill». */
export function nombreFamilia(slug: string): string {
  const partes = slug.split("-").filter(Boolean);
  const mega = partes[partes.length - 1] === "mega";
  const base = (mega ? partes.slice(0, -1) : partes).map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");
  return mega ? `Mega ${base}` : base;
}

export function crearAgrupador<A extends ArqMin>(arquetipos: A[]) {
  const byId = new Map(arquetipos.map((a) => [a.id, a]));
  const parentOf = new Map(arquetipos.map((a) => [a.id, a.parentId ?? null]));
  const basePorMain = new Map<string, string>();
  for (const a of arquetipos) if (a.main && !a.secondary && !a.parentId) basePorMain.set(a.main, a.id);
  const virtuales = new Map<string, A>();

  const raiz = (id: string): string => {
    const explicito = raizDe(id, parentOf);
    if (explicito !== id) return explicito; // regla 1
    const a = byId.get(id);
    if (!a?.main) return id; // regla 3
    const base = basePorMain.get(a.main);
    if (base) return base; // regla 2, con arquetipo real
    const v = `fam:${a.main}`;
    if (!virtuales.has(v)) {
      virtuales.set(v, { ...a, id: v, name: nombreFamilia(a.main), secondary: "", parentId: null });
    }
    return v;
  };
  const arquetipo = (id: string): A | undefined => byId.get(id) ?? virtuales.get(id);
  return { raiz, arquetipo };
}
