import Link from "next/link";
import { loadSnapshot } from "@/lib/data";
import { canManageLeague, readSession } from "@/lib/auth";
import { toggleDeckFavorite } from "@/actions";
import { archetypeStats, isPlayed } from "@/lib/stats";
import { fmtDate, pct, wrColor } from "@/lib/format";
import { prettyPokemon, typeOf } from "@/lib/pokemon";
import type { Deck } from "@/lib/types";
import { Empty, PageHead, SectionTitle, Sprites } from "@/components/ui";
import { ScopeTabs } from "@/components/ScopeTabs";
import { Icon } from "@/components/icons";

export const metadata = { title: "Mazos" };

/* =========================================================================
   La biblioteca de mazos.

   Desde que `decks.playerId` puede ser nulo, esta pantalla ya no es «mis
   mazos» sino la estantería entera de la liga: los tuyos, los que no son de
   nadie y los de los demás. Eso son sesenta filas en cuanto el grupo lleva
   dos temporadas, así que la pantalla vive de dos cosas — la pestaña de
   procedencia y el buscador— y las dos van en la URL.

   Van en la URL y no en estado de cliente porque un enlace a
   `/mazos?ver=liga&q=dragapult` se puede pegar en el grupo, sobrevive al
   botón de atrás y funciona con JavaScript desactivado: el buscador es un
   `<form method="get">` de toda la vida. El coste es un viaje al servidor por
   búsqueda, que con el snapshot ya cargado en memoria no se nota.
   ========================================================================= */

/** Las tres procedencias que se pueden aislar. La cuarta, «todas», es no filtrar. */
const VIEWS = { fav: "Favoritos", mios: "Míos", liga: "De la liga" } as const;
type View = keyof typeof VIEWS | "all";

const isView = (v: string | undefined): v is View =>
  v === "all" || v === "fav" || v === "mios" || v === "liga";

export default async function DecksPage({
  searchParams,
}: { searchParams: Promise<{ ver?: string; q?: string }> }) {
  const [sp, snap, session] = await Promise.all([searchParams, loadSnapshot(), readSession()]);
  const me = session ? snap.playersById.get(session.playerId) : undefined;
  const manager = me ? canManageLeague(me.role) : false;

  const view: View = isView(sp.ver) ? sp.ver : "all";
  const query = (sp.q ?? "").trim();
  const needle = query.toLowerCase();

  const played = snap.matches.filter(isPlayed);
  const uses = new Map<string, number>();
  for (const m of played) {
    if (m.deckAId) uses.set(m.deckAId, (uses.get(m.deckAId) ?? 0) + 1);
    if (m.deckBId) uses.set(m.deckBId, (uses.get(m.deckBId) ?? 0) + 1);
  }

  const favs = me ? snap.favoriteDecks.get(me.id) ?? new Set<string>() : new Set<string>();

  /* La misma clasificación que hace `deckOptions()` para los selectores, pero
     aquí hace falta la fila entera del mazo —fecha, lista, retirado— y no la
     opción plana, así que se recorre `snap.decks` en lugar de reutilizarla. */
  const groupOf = (d: Deck): "fav" | "mine" | "shared" | "other" =>
    favs.has(d.id) ? "fav"
      : me && d.playerId === me.id ? "mine"
      : d.playerId == null ? "shared"
      : "other";

  const inView = (d: Deck) =>
    view === "all" ? true
      : view === "fav" ? favs.has(d.id)
      : view === "mios" ? Boolean(me) && d.playerId === me?.id
      : d.playerId == null;

  // El buscador mira el nombre del mazo, el del arquetipo y los slugs de los
  // Pokémon: en el móvil casi siempre se escribe el bicho, no el nombre que le
  // puso su dueño.
  const hit = (d: Deck) => {
    if (!needle) return true;
    const a = snap.archById.get(d.archetypeId);
    return d.name.toLowerCase().includes(needle)
      || (a?.name ?? "").toLowerCase().includes(needle)
      || (a?.main ?? "").includes(needle)
      || (a?.secondary ?? "").includes(needle);
  };

  const rank = { fav: 0, mine: 1, shared: 2, other: 3 } as const;
  const decks = snap.decks
    .filter((d) => inView(d) && hit(d))
    .sort((a, b) =>
      Number(a.retired) - Number(b.retired)
      || rank[groupOf(a)] - rank[groupOf(b)]
      || a.name.localeCompare(b.name, "es"));

  // Los contadores de las pestañas se cuentan sobre TODO, no sobre lo buscado:
  // un «Míos · 0» al filtrar por texto haría pensar que no tienes mazos.
  const count = {
    all: snap.decks.length,
    fav: snap.decks.filter((d) => favs.has(d.id)).length,
    mios: me ? snap.decks.filter((d) => d.playerId === me.id).length : 0,
    liga: snap.decks.filter((d) => d.playerId == null).length,
  };

  const archUse = new Map(
    archetypeStats(played, snap.archIndex, undefined, snap.archById).map((a) => [a.archetypeId, a]),
  );

  const clearHref = view === "all" ? "/mazos" : `/mazos?ver=${view}`;

  const filteredArchetypes = snap.archetypes.filter((a) => {
    if (!needle) return true;
    return a.name.toLowerCase().includes(needle) || (a.main ?? "").includes(needle) || (a.secondary ?? "").includes(needle);
  });

  return (
    <>
      <PageHead
        title="Mazos"
        sub="La biblioteca de la liga. Un mazo sin dueño lo puede usar cualquiera, para decir qué jugaste tú o qué llevaba tu rival."
        actions={<Link className="btn btn-brand" href="/mazos/nuevo"><Icon name="plus" className="size-4" /> Mazo</Link>}
      />

      {/* Las pestañas conservan el texto buscado (`keep`): cambiar de
          procedencia con una búsqueda a medias no debe borrarla. */}
      <ScopeTabs
        basePath="/mazos" param="ver" current={view}
        allLabel={`De todos · ${count.all}`}
        keep={{ q: query }}
        options={(Object.keys(VIEWS) as Array<keyof typeof VIEWS>).map((k) => ({
          value: k,
          label: `${VIEWS[k]} · ${count[k]}`,
        }))}
      />

      <form action="/mazos" method="get" className="mt-3 flex gap-2">
        {view !== "all" && <input type="hidden" name="ver" value={view} />}
        <input
          className="input min-w-0 flex-1" type="search" name="q" defaultValue={query}
          placeholder="Buscar mazo, arquetipo o Pokémon…" aria-label="Buscar mazo"
          autoComplete="off" autoCapitalize="none" spellCheck={false}
        />
        <button className="btn flex-none px-4" type="submit">Buscar</button>
      </form>

      {query && (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
          {decks.length} resultado{decks.length === 1 ? "" : "s"} para «{query}»
          <Link className="underline hover:text-ink" href={clearHref}>quitar la búsqueda</Link>
        </p>
      )}

      <ul className="mt-3 mb-6 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {decks.map((d) => {
          const group = groupOf(d);
          const arch = snap.archById.get(d.archetypeId);
          const owner = d.playerId ? snap.playersById.get(d.playerId) : undefined;
          const total = (d.listJson as { total?: number } | null)?.total ?? 0;
          const isFav = favs.has(d.id);
          // Editar es de quien lo tiene: el dueño si lo hay, y si no quien lo
          // metió en la biblioteca. Es la misma regla que aplica `saveDeck`.
          const canEdit = Boolean(me) && (
            manager
            || (d.playerId ? d.playerId === me?.id : d.createdBy === me?.id)
          );

          // El borde de la izquierda es lo que distingue de un vistazo un mazo
          // tuyo de uno de la estantería común, sin tener que leer nada.
          return (
            <li
              key={d.id}
              className={`card flex items-center gap-2 border-l-4 p-2.5 ${
                group === "mine" || group === "fav" ? "border-l-brand-line"
                  : d.playerId == null ? "border-l-info"
                  : "border-l-line"
              } ${d.retired ? "opacity-65" : ""}`}
            >
              <Link
                href={canEdit ? `/mazos/${d.id}` : `/estadisticas?arch=${d.archetypeId}`}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 hover:text-info"
              >
                <Sprites archetype={arch} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold leading-tight">{d.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {arch?.name ?? "sin arquetipo"} · creado {fmtDate(d.created)}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {d.playerId == null
                      ? <span className="chip chip-info text-[10px]">de la liga</span>
                      : (
                        <span className={`chip text-[10px] ${owner && owner.id === me?.id ? "chip-brand" : ""}`}>
                          {owner ? (owner.id === me?.id ? "tuyo" : owner.name) : "sin dueño"}
                        </span>
                      )}
                    {total > 0 && (
                      <span className={`chip text-[10px] ${total === 60 ? "chip-win" : "chip-loss"}`}>
                        lista {total}
                      </span>
                    )}
                    {d.retired && <span className="chip text-[10px]">retirado</span>}
                    <span className="chip text-[10px] tabular">{uses.get(d.id) ?? 0} usos</span>
                  </span>
                </span>
              </Link>

              {/* Un formulario y no un botón con JavaScript: marcar favorito es
                  una escritura, y así funciona igual con la pestaña recién
                  abierta. Fuera del <Link>, que no se pueden anidar. */}
              {me && (
                <form action={toggleDeckFavorite} className="flex-none">
                  <input type="hidden" name="deckId" value={d.id} />
                  <button
                    className={`btn btn-ghost px-2 ${isFav ? "text-brand" : ""}`}
                    type="submit"
                    aria-pressed={isFav}
                    title={isFav ? "Quitar de favoritos" : "Marcar como favorito"}
                    aria-label={isFav ? `Quitar ${d.name} de favoritos` : `Marcar ${d.name} como favorito`}
                  >
                    <Star on={isFav} />
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {decks.length === 0 && (
        <div className="card mb-6">
          <Empty
            title={query ? "Nada con esa búsqueda" : EMPTY_TITLE[view]}
            action={
              query
                ? <Link className="btn" href={clearHref}>Quitar la búsqueda</Link>
                : <Link className="btn btn-brand" href="/mazos/nuevo">Crear un mazo</Link>
            }
          >
            {query
              ? <>Prueba con el nombre del Pokémon principal, que es lo que casi siempre se recuerda.</>
              : EMPTY_HINT[view]}
          </Empty>
        </div>
      )}

      <SectionTitle aside={`${snap.archetypes.length}`}>Arquetipos del grupo</SectionTitle>
      <div className="card divide-y divide-line-soft">
        {filteredArchetypes
          .slice()
          .sort((a, b) => (archUse.get(b.id)?.played ?? 0) - (archUse.get(a.id)?.played ?? 0) || a.name.localeCompare(b.name))
          .map((a) => {
            const s = archUse.get(a.id);
            return (
              <Link key={a.id} href={`/estadisticas?arch=${a.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                <Sprites archetype={a} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{a.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {a.main ? prettyPokemon(a.main) : "—"}{a.secondary ? ` / ${prettyPokemon(a.secondary)}` : ""} · {typeOf(a.type).name}
                  </span>
                </span>
                {s ? (
                  <span className="flex-none text-right">
                    <span className="block font-mono text-sm font-semibold tabular" style={{ color: wrColor(s.winRate) }}>
                      {pct(s.winRate, 0)}
                    </span>
                    <span className="block text-[11px] text-muted">{s.played} usos</span>
                  </span>
                ) : <span className="text-xs text-muted">sin usar</span>}
              </Link>
            );
          })}
      </div>
    </>
  );
}

const EMPTY_TITLE: Record<View, string> = {
  all: "Sin mazos",
  fav: "Ningún favorito todavía",
  mios: "No tienes mazos tuyos",
  liga: "La estantería común está vacía",
};

const EMPTY_HINT: Record<View, string> = {
  all: "Registra un mazo para poder asignarlo a las partidas y ver estadísticas por arquetipo.",
  fav: "La estrella pone ese mazo el primero de la lista al registrar una partida, sea tuyo o de la liga.",
  mios: "Un mazo tuyo es el que juegas tú. Si lo que quieres es apuntar el de un rival, créalo como «de la liga».",
  liga: "Los mazos de la liga no son de nadie: sirven para apuntar lo que llevaba el rival sin inventarle una cuenta.",
};

/** La estrella de favorito. Rellena cuando lo es; el contorno, cuando no. */
function Star({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24" className="size-5" aria-hidden="true"
      fill={on ? "currentColor" : "none"} stroke="currentColor"
      strokeWidth="1.7" strokeLinejoin="round"
    >
      <path d="m12 3.7 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
    </svg>
  );
}
