/* =========================================================================
   v0.133 — VERSIONES DE UN MAZO: un arquetipo principal y, dentro, sus
   versiones, con lo que cambia de cartas entre ellas.

   Sin imports, para probarlo.

   En la app cada mazo guardado YA es una versión: tiene su lista, sus
   comentarios (`notes`), su marca en el PTCG Live y sus partidas. Lo que
   faltaba era juntarlas y compararlas. Aquí están las dos piezas puras:

     · `clavePrincipal`: a qué arquetipo principal pertenece un mazo. El
       arquetipo padre si lo tiene puesto (Ajustes → arquetipos); si no, su
       Pokémon líder. No hay que indicar nada al crear el mazo.
     · `diffListas`: qué entra y qué sale de una versión respecto a otra,
       por nombre de carta (la misma carta de otra expansión es la misma
       carta) y sumando copias entre secciones.
   ========================================================================= */

export type Principal = { clave: string; nombre: string };

export function clavePrincipal(
  arch: { id: string; name: string; main?: string | null; parentId?: string | null } | null | undefined,
  padre: { id: string; name: string } | null | undefined,
  nombreLider: (slug: string) => string,
  archetypeId = "",
): Principal {
  if (padre) return { clave: `p:${padre.id}`, nombre: padre.name };
  if (arch?.main) return { clave: `l:${arch.main}`, nombre: nombreLider(arch.main) };
  return { clave: `a:${arch?.id ?? archetypeId}`, nombre: arch?.name ?? "—" };
}

export type CartaLista = { n: number; name: string };
type ListaGuardada = { pokemon?: unknown; trainer?: unknown; energy?: unknown } | null | undefined;

/** Las cartas de una lista guardada, sumadas por nombre. Lo que no se entienda se ignora. */
export function cartasDe(lista: ListaGuardada): Map<string, number> {
  const out = new Map<string, number>();
  if (!lista || typeof lista !== "object") return out;
  for (const seccion of [lista.pokemon, lista.trainer, lista.energy]) {
    if (!Array.isArray(seccion)) continue;
    for (const c of seccion as Array<{ n?: unknown; name?: unknown }>) {
      const n = Number(c?.n), nombre = typeof c?.name === "string" ? c.name.trim() : "";
      if (!nombre || !Number.isFinite(n) || n <= 0) continue;
      out.set(nombre, (out.get(nombre) ?? 0) + n);
    }
  }
  return out;
}

export type DiffListas = {
  /** Lo que esta versión lleva de más respecto a la base (copias de diferencia). */
  entran: CartaLista[];
  /** Lo que lleva de menos. */
  salen: CartaLista[];
  /** Cuántas cartas (copias) cambian: lo que entra, que en dos listas de 60 es lo mismo que lo que sale. */
  cambios: number;
};

export function diffListas(base: Map<string, number>, otra: Map<string, number>): DiffListas {
  const entran: CartaLista[] = [], salen: CartaLista[] = [];
  for (const nombre of new Set([...base.keys(), ...otra.keys()])) {
    const d = (otra.get(nombre) ?? 0) - (base.get(nombre) ?? 0);
    if (d > 0) entran.push({ name: nombre, n: d });
    else if (d < 0) salen.push({ name: nombre, n: -d });
  }
  const orden = (a: CartaLista, b: CartaLista) => b.n - a.n || a.name.localeCompare(b.name, "es");
  entran.sort(orden); salen.sort(orden);
  return { entran, salen, cambios: Math.max(entran.reduce((a, c) => a + c.n, 0), salen.reduce((a, c) => a + c.n, 0)) };
}

export type MarcaVersion = { w: number; l: number; t: number };
/** (victorias + medio empate) / partidas; null sin partidas. */
export function pctDeMarca(m: MarcaVersion): number | null {
  const n = m.w + m.l + m.t;
  return n ? (m.w + m.t / 2) / n : null;
}

/** La versión de referencia: la más usada; a igual uso, la más antigua. */
export function versionBase<T extends { id: string; usos: number; creado: string }>(vs: readonly T[]): T | null {
  return [...vs].sort((a, b) => b.usos - a.usos || a.creado.localeCompare(b.creado) || a.id.localeCompare(b.id))[0] ?? null;
}
