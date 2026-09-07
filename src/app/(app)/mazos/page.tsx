import Link from "next/link";
import { Suspense } from "react";
import { loadSnapshot } from "@/lib/data";
import { archetypeStats, isPlayed } from "@/lib/stats";
import { fmtDate } from "@/lib/format";
import { typeOf, prettyPokemon } from "@/lib/pokemon";
import { ArchTag, Empty, PageHead, PlayerTag, Sprites } from "@/components/ui";
import { Filters } from "@/components/Filters";

export default async function DecksPage({
  searchParams,
}: { searchParams: Promise<{ player?: string }> }) {
  const q = await searchParams;
  const snap = await loadSnapshot();
  const played = snap.matches.filter(isPlayed);

  const uses = new Map<string, number>();
  for (const m of played) {
    if (m.deckAId) uses.set(m.deckAId, (uses.get(m.deckAId) ?? 0) + 1);
    if (m.deckBId) uses.set(m.deckBId, (uses.get(m.deckBId) ?? 0) + 1);
  }

  const decks = snap.decks
    .filter((d) => !q.player || d.playerId === q.player)
    .slice()
    .sort((a, b) => (b.created || "").localeCompare(a.created || ""));

  const archUse = new Map(archetypeStats(played, snap.archIndex).map((a) => [a.archetypeId, a.played]));

  return (
    <>
      <PageHead
        title="Mazos"
        sub={
          <>
            Cada mazo tiene un <b>arquetipo</b> (Pokémon principal y secundario) — eso es lo que
            agrupa las estadísticas — y opcionalmente la lista completa de 60 cartas pegada desde
            Pokémon TCG Live o Limitless.
          </>
        }
        actions={<Link className="btn btn-gold" href="/mazos/nuevo">+ Mazo</Link>}
      />

      <Suspense fallback={<div className="card card-pad" style={{ marginBottom: 16 }}><span className="hint">Cargando filtros…</span></div>}>
        <Filters
          basePath="/mazos"
          fields={[{
            name: "player", label: "Jugador", placeholder: "Todos",
            options: snap.players.map((p) => ({ value: p.id, label: p.name })),
          }]}
        />
      </Suspense>

      <div className="card" style={{ marginBottom: 16 }}>
        {decks.length ? (
          <div className="tw">
            <table>
              <thead>
                <tr><th>Mazo</th><th>Jugador</th><th>Arquetipo</th><th className="num">Usos</th><th className="num">Lista</th><th /></tr>
              </thead>
              <tbody>
                {decks.map((d) => {
                  const total = (d.listJson as { total?: number } | null)?.total ?? 0;
                  return (
                    <tr key={d.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{d.name}</div>
                        <div className="hint">creado {fmtDate(d.created)}</div>
                      </td>
                      <td><PlayerTag player={snap.playersById.get(d.playerId)} /></td>
                      <td><ArchTag archetype={snap.archById.get(d.archetypeId)} /></td>
                      <td className="num">{uses.get(d.id) ?? 0}</td>
                      <td className="num">
                        {total ? <span className={`chip ${total === 60 ? "w" : "l"}`}>{total} cartas</span> : <span className="hint">—</span>}
                      </td>
                      <td className="num"><Link className="btn btn-sm btn-ghost" href={`/mazos/${d.id}`}>Abrir</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Sin mazos" action={<Link className="btn btn-gold" href="/mazos/nuevo">+ Mazo</Link>}>
            Registra un mazo para poder asignarlo a las partidas y ver estadísticas por arquetipo.
          </Empty>
        )}
      </div>

      <div className="card">
        <div className="card-head"><h2>Arquetipos del grupo</h2><span className="hint">{snap.archetypes.length} en total</span></div>
        {snap.archetypes.length ? (
          <div className="tw">
            <table>
              <thead>
                <tr><th /><th>Nombre</th><th>Principal</th><th>Secundario</th><th>Tipo</th><th className="num">Partidas</th></tr>
              </thead>
              <tbody>
                {snap.archetypes
                  .slice()
                  .sort((a, b) => (archUse.get(b.id) ?? 0) - (archUse.get(a.id) ?? 0) || a.name.localeCompare(b.name))
                  .map((a) => (
                    <tr key={a.id}>
                      <td style={{ width: 54 }}><Sprites archetype={a} /></td>
                      <td style={{ fontWeight: 600 }}>{a.name}</td>
                      <td>{a.main ? prettyPokemon(a.main) : "—"}</td>
                      <td>{a.secondary ? prettyPokemon(a.secondary) : "—"}</td>
                      <td><span className="chip" style={{ borderColor: typeOf(a.type).color }}>{typeOf(a.type).name}</span></td>
                      <td className="num">{archUse.get(a.id) ?? 0}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty"><p>Los arquetipos se crean solos al registrar un mazo.</p></div>
        )}
      </div>
    </>
  );
}
