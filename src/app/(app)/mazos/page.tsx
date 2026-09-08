import Link from "next/link";
import { loadSnapshot } from "@/lib/data";
import { readSession } from "@/lib/auth";
import { archetypeStats, isPlayed } from "@/lib/stats";
import { fmtDate, pct, wrColor } from "@/lib/format";
import { prettyPokemon, typeOf } from "@/lib/pokemon";
import { Avatar, Empty, PageHead, SectionTitle, Sprites } from "@/components/ui";
import { ScopeTabs } from "@/components/ScopeTabs";
import { Icon } from "@/components/icons";

export const metadata = { title: "Mazos" };

export default async function DecksPage({
  searchParams,
}: { searchParams: Promise<{ player?: string }> }) {
  const [q, snap, session] = await Promise.all([searchParams, loadSnapshot(), readSession()]);
  const played = snap.matches.filter(isPlayed);

  const uses = new Map<string, number>();
  for (const m of played) {
    if (m.deckAId) uses.set(m.deckAId, (uses.get(m.deckAId) ?? 0) + 1);
    if (m.deckBId) uses.set(m.deckBId, (uses.get(m.deckBId) ?? 0) + 1);
  }

  const filter = q.player ?? "all";
  const decks = snap.decks
    .filter((d) => filter === "all" || d.playerId === filter)
    .slice()
    .sort((a, b) => (b.created || "").localeCompare(a.created || ""));

  const archUse = new Map(archetypeStats(played, snap.archIndex, undefined, snap.archById).map((a) => [a.archetypeId, a]));

  return (
    <>
      <PageHead
        title="Mazos"
        sub="Cada mazo tiene un arquetipo —Pokémon principal y secundario— y, si quieres, la lista completa de 60 cartas."
        actions={<Link className="btn btn-brand" href="/mazos/nuevo"><Icon name="plus" className="size-4" /> Mazo</Link>}
      />

      <ScopeTabs
        basePath="/mazos" param="player" current={filter} allLabel="Todos"
        options={snap.players.map((p) => ({ value: p.id, label: p.name }))}
      />

      <div className="card mt-4 mb-6 divide-y divide-line-soft">
        {decks.length ? decks.map((d) => {
          const total = (d.listJson as { total?: number } | null)?.total ?? 0;
          const owner = snap.playersById.get(d.playerId);
          const mine = session?.playerId === d.playerId;
          return (
            <Link key={d.id} href={mine ? `/mazos/${d.id}` : `/estadisticas?arch=${d.archetypeId}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
              <Sprites archetype={snap.archById.get(d.archetypeId)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {d.name}{d.retired && <span className="ml-1.5 chip">retirado</span>}
                </span>
                <span className="block truncate text-xs text-muted">
                  {owner?.name} · {snap.archById.get(d.archetypeId)?.name} · creado {fmtDate(d.created)}
                </span>
              </span>
              <span className="flex flex-none items-center gap-2">
                {total > 0 && <span className={`chip ${total === 60 ? "chip-win" : "chip-loss"}`}>{total}</span>}
                <span className="font-mono text-sm tabular text-muted">{uses.get(d.id) ?? 0}</span>
                <Avatar player={owner} size="sm" />
              </span>
            </Link>
          );
        }) : (
          <Empty title="Sin mazos" action={<Link className="btn btn-brand" href="/mazos/nuevo">Crear el primero</Link>}>
            Registra un mazo para poder asignarlo a las partidas y ver estadísticas por arquetipo.
          </Empty>
        )}
      </div>

      <SectionTitle aside={`${snap.archetypes.length}`}>Arquetipos del grupo</SectionTitle>
      <div className="card divide-y divide-line-soft">
        {snap.archetypes
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
