import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSnapshot } from "@/lib/data";
import { outcome } from "@/lib/stats";
import { prettyPokemon } from "@/lib/pokemon";
import { cartasDe, clavePrincipal, diffListas, pctDeMarca, versionBase, type MarcaVersion } from "@/lib/versiones";
import { fmtDate, pct } from "@/lib/format";
import { Sprites } from "@/components/ui";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Versiones del mazo" };

/* =========================================================================
   v0.133 — LAS VERSIONES DE UN ARQUETIPO PRINCIPAL (`/mazos/versiones?de=…`).

   Todas las versiones de un mismo arquetipo principal (los mazos guardados
   que comparten padre o Pokémon líder), una al lado de otra: sus partidas en
   la app, su marca en el PTCG Live, sus comentarios y qué cartas cambian
   respecto a la versión de referencia (la más usada). Arriba, el total del
   arquetipo: las estadísticas agrupadas.

   No hay tabla nueva: cada mazo guardado ya era una versión.
   ========================================================================= */
export default async function VersionesPage({ searchParams }: { searchParams: Promise<{ de?: string }> }) {
  const [q, snap, lng] = await Promise.all([searchParams, loadSnapshot(), getLang()]);
  const clave = (q.de ?? "").trim();
  const principalDe = (archetypeId: string) => {
    const a = snap.archById.get(archetypeId);
    return clavePrincipal(a, a?.parentId ? snap.archById.get(a.parentId) : undefined, prettyPokemon, archetypeId);
  };
  const mazos = snap.decks.filter((d) => principalDe(d.archetypeId).clave === clave);
  if (!clave || mazos.length === 0) notFound();
  const principal = principalDe(mazos[0].archetypeId);

  // La marca de cada versión con las partidas de la app (en cualquiera de los dos lados).
  const marcas = new Map<string, MarcaVersion>(mazos.map((d) => [d.id, { w: 0, l: 0, t: 0 }]));
  for (const m of snap.matches) {
    const a = m.deckAId ? marcas.get(m.deckAId) : undefined;
    const b = m.deckBId && m.playerBId ? marcas.get(m.deckBId) : undefined;
    if (!a && !b) continue;
    const g = outcome(m).winner;
    if (!g) continue;
    if (a) a[g === "tie" ? "t" : g === "a" ? "w" : "l"]++;
    if (b) b[g === "tie" ? "t" : g === "b" ? "w" : "l"]++;
  }
  const versiones = mazos.map((d) => {
    const m = marcas.get(d.id)!;
    return { d, id: d.id, m, usos: m.w + m.l + m.t, creado: d.created, cartas: cartasDe(d.listJson as Parameters<typeof cartasDe>[0]) };
  });
  const baseId = versionBase(versiones.map((v) => ({ id: v.id, usos: v.usos, creado: v.creado })))!.id;
  const base = versiones.find((v) => v.id === baseId)!;
  const orden = [...versiones].sort((a, b) => Number(a.d.retired) - Number(b.d.retired) || b.usos - a.usos || a.d.name.localeCompare(b.d.name, "es"));
  const total = versiones.reduce((t, v) => ({ w: t.w + v.m.w, l: t.l + v.m.l, t: t.t + v.m.t }), { w: 0, l: 0, t: 0 });
  const live = versiones.reduce((t, v) => ({ w: t.w + (v.d.liveWins ?? 0), l: t.l + (v.d.liveLosses ?? 0) }), { w: 0, l: 0 });
  const marca = (x: MarcaVersion) => `${x.w}-${x.l}${x.t ? `-${x.t}` : ""}`;
  const pctTxt = (x: MarcaVersion) => { const p = pctDeMarca(x); return p == null ? "—" : pct(p, 0); };

  return (
    <>
      <div className="mb-3"><Link href="/mazos" className="btn btn-ghost btn-sm">← {tr(lng, "v133.mazos")}</Link></div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-strong">{tr(lng, "v133.arquetipoPrincipal")}</p>
      <h1 className="mb-3 font-display text-3xl font-black leading-tight">{principal.nombre}</h1>

      <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4"><p className="label">{tr(lng, "v133.versiones")}</p><p className="font-display text-3xl font-black tabular">{versiones.length}</p></div>
        <div className="card p-4"><p className="label">{tr(lng, "v133.partidas")}</p><p className="font-display text-3xl font-black tabular">{total.w + total.l + total.t}</p><p className="text-xs text-muted tabular">{marca(total)}</p></div>
        <div className="card p-4"><p className="label">{tr(lng, "v133.victorias")}</p><p className="font-display text-3xl font-black tabular">{pctTxt(total)}</p></div>
        <div className="card p-4"><p className="label">PTCG Live</p><p className="font-display text-3xl font-black tabular">{live.w}-{live.l}</p></div>
      </section>

      <ul className="flex flex-col gap-3">
        {orden.map((v) => {
          const arch = snap.archById.get(v.d.archetypeId);
          const owner = v.d.playerId ? snap.playersById.get(v.d.playerId) : undefined;
          const esBase = v.id === base.id;
          const diff = esBase ? null : diffListas(base.cartas, v.cartas);
          const sinLista = v.cartas.size === 0;
          return (
            <li key={v.id} className={`card p-4 ${v.d.retired ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Sprites archetype={arch} size="md" />
                <div className="min-w-0 flex-1">
                  <Link href={`/mazos/${v.id}`} className="block truncate font-display text-lg font-extrabold hover:underline">{v.d.name}</Link>
                  <p className="truncate text-xs text-muted">
                    {arch?.name ?? "—"} · {owner?.name ?? tr(lng, "v133.deLaLiga")} · {fmtDate(v.d.created)}
                  </p>
                </div>
                <div className="flex flex-none flex-wrap items-center gap-1.5 text-[11px]">
                  {esBase && <span className="chip chip-brand">{tr(lng, "v133.referencia")}</span>}
                  {v.d.retired && <span className="chip">{tr(lng, "v133.retirado")}</span>}
                  <span className="chip tabular">{trf(lng, "v133.usos", { n: v.usos })}</span>
                  <span className="chip tabular">{marca(v.m)} · {pctTxt(v.m)}</span>
                  {(v.d.liveWins ?? 0) + (v.d.liveLosses ?? 0) > 0 && <span className="chip tabular">Live {v.d.liveWins}-{v.d.liveLosses}</span>}
                </div>
              </div>
              {v.d.notes.trim() && <p className="mt-3 whitespace-pre-line border-l-2 border-line pl-3 text-sm text-ink-2">{v.d.notes.trim()}</p>}
              {!esBase && (
                <div className="mt-3 text-sm">
                  {sinLista || base.cartas.size === 0 ? (
                    <p className="text-xs text-muted">{tr(lng, "v133.sinLista")}</p>
                  ) : diff!.cambios === 0 ? (
                    <p className="text-xs text-muted">{trf(lng, "v133.igual", { n: base.d.name })}</p>
                  ) : (
                    <>
                      <p className="label mb-1">{trf(lng, "v133.cambios", { n: diff!.cambios, b: base.d.name })}</p>
                      <p className="flex flex-wrap gap-1.5">
                        {diff!.entran.map((c) => <span key={`e-${c.name}`} className="chip chip-win text-[11px]">+{c.n} {c.name}</span>)}
                        {diff!.salen.map((c) => <span key={`s-${c.name}`} className="chip chip-loss text-[11px]">−{c.n} {c.name}</span>)}
                      </p>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted">{tr(lng, "v133.nota")}</p>
    </>
  );
}
