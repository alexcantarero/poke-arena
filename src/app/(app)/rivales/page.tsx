import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPlayer, loadSnapshot } from "@/lib/data";
import { archetypesOfMatch, outcome, roundResult } from "@/lib/stats";
import { claveRonda } from "@/lib/h2h";
import { fichasDeRivales, mazosRecientes, type EncuentroPropio } from "@/lib/scouting";
import { pct } from "@/lib/format";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Tus rivales" };

/* =========================================================================
   v0.130 — SCOUTING DEL GRUPO (`/rivales`): cómo te va contra cada rival
   habitual, con qué mazos, y qué juega últimamente.

   Cada uno ve SOLO SUS PROPIOS cruces: la página no recibe ningún id, sale
   siempre de la sesión. Lo que juega cada rival últimamente (sus mazos en los
   torneos de los últimos 120 días) ya es visible para todos en la app.
   ========================================================================= */
export default async function RivalesPage() {
  const [snap, me, lng] = await Promise.all([loadSnapshot(), currentPlayer(), getLang()]);
  if (!me) redirect("/entrar");

  const mazos = (m: (typeof snap.matches)[number]) => {
    const { a, b } = archetypesOfMatch(m, snap.archIndex, snap.archById);
    return { a: a?.name ?? "", b: b?.name ?? "" };
  };
  const mias: EncuentroPropio[] = [], suyas: EncuentroPropio[] = [];
  for (const m of snap.matches) {
    if (m.playerBId) {
      // Liga o amistoso entre dos del grupo.
      const soyA = m.playerAId === me.id, soyB = m.playerBId === me.id;
      if (!soyA && !soyB) continue;
      const g = outcome(m).winner;
      if (!g) continue;
      const d = mazos(m);
      mias.push({
        clave: `m:${m.id}`, rivalId: soyA ? m.playerBId : m.playerAId, fecha: m.date,
        r: g === "tie" ? "t" : (g === "a") === soyA ? "w" : "l", miMazo: soyA ? d.a : d.b, suMazo: soyA ? d.b : d.a,
      });
    } else if (m.tournamentId && m.opponentPlayerId) {
      // Ronda de torneo contra alguien del grupo: la mía, o la suya contra mí.
      const mia = m.playerAId === me.id, suya = m.opponentPlayerId === me.id;
      if (!mia && !suya) continue;
      const res = roundResult(m);
      if (!res) continue;
      const d = mazos(m);
      const clave = claveRonda(m.tournamentId, m.round, m.playerAId, m.opponentPlayerId);
      if (mia) mias.push({ clave, rivalId: m.opponentPlayerId, fecha: m.date, r: res === "d" ? "t" : res, miMazo: d.a, suMazo: d.b });
      else suyas.push({ clave, rivalId: m.playerAId, fecha: m.date, r: res === "d" ? "t" : res === "w" ? "l" : "w", miMazo: d.b, suMazo: d.a });
    }
  }
  // Las mías delante: si una ronda está apuntada desde los dos lados, vale la mía.
  const fichas = fichasDeRivales([...mias, ...suyas]).filter((f) => snap.playersById.has(f.rivalId));

  const desde = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0, 10);
  const usos: Array<{ playerId: string; mazo: string; fecha: string }> = [];
  for (const t of snap.tournaments) {
    for (const r of t.results) {
      const a = (r.deckId ? snap.archIndex.get(r.deckId) : undefined) ?? (r.archetypeId ? snap.archById.get(r.archetypeId) : undefined);
      if (a?.name) usos.push({ playerId: r.playerId, mazo: a.name, fecha: t.date });
    }
  }
  const recientes = mazosRecientes(usos, desde);

  const LETRA = { w: "V", l: "D", t: "E" } as const;
  const marca = (x: { w: number; l: number; t: number }) => `${x.w}-${x.l}${x.t ? `-${x.t}` : ""}`;

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-black leading-tight">{tr(lng, "v130.rivales")}</h1>
      <p className="mb-4 text-sm text-muted">{tr(lng, "v130.rivalesSub")}</p>

      {fichas.length === 0 ? (
        <p className="card p-4 text-sm text-muted">{tr(lng, "v130.sinRivales")}</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {fichas.map((f) => {
            const rival = snap.playersById.get(f.rivalId)!;
            const juega = recientes[f.rivalId] ?? [];
            return (
              <li key={f.rivalId} id={f.rivalId} className="card scroll-mt-20 overflow-hidden">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/perfil/${rival.id}`} className="block truncate font-display text-xl font-extrabold hover:underline">{rival.name}</Link>
                    <p className="text-xs text-muted">{trf(lng, "v130.partidas", { n: f.partidas })} · {tr(lng, "v130.ultima")} {f.ultima}</p>
                  </div>
                  <div className="flex-none text-right">
                    <p className="font-display text-3xl font-black tabular">
                      <span className="text-win">{f.w}</span>-<span className="text-loss">{f.l}</span>{f.t ? <>-<span className="text-tie">{f.t}</span></> : null}
                    </p>
                    <p className={`text-sm font-bold tabular ${f.pct >= 0.5 ? "text-win" : "text-loss"}`}>{pct(f.pct, 0)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-soft px-4 py-3 text-sm">
                  <span className="flex items-center gap-1" aria-label={tr(lng, "v130.ultimos")}>
                    {f.ultimos.map((r, i) => <span key={i} className="mt-letra" data-r={r}>{LETRA[r]}</span>)}
                  </span>
                  {f.racha.n >= 2 && (
                    <span className={`chip text-[11px] ${f.racha.r === "w" ? "chip-win" : f.racha.r === "l" ? "chip-loss" : ""}`}>
                      {trf(lng, `v130.racha.${f.racha.r}`, { n: f.racha.n })}
                    </span>
                  )}
                </div>
                {juega.length > 0 && (
                  <p className="border-t border-line-soft px-4 py-3 text-sm">
                    <span className="label mr-2">{tr(lng, "v130.juega")}</span>
                    {juega.map((j) => `${j.mazo} (${j.n})`).join(" · ")}
                  </p>
                )}
                {(f.porSuMazo.length > 0 || f.porMiMazo.length > 0) && (
                  <details className="border-t border-line-soft">
                    <summary className="tap cursor-pointer justify-start px-4 text-sm font-semibold text-muted">{tr(lng, "v130.desglose")}</summary>
                    <div className="grid gap-4 border-t border-line-soft p-4 sm:grid-cols-2">
                      {([["v130.contraSuMazo", f.porSuMazo], ["v130.conMiMazo", f.porMiMazo]] as const).map(([k, filas]) => (
                        <div key={k}>
                          <p className="label mb-1.5">{tr(lng, k)}</p>
                          <ul className="flex flex-col gap-1 text-sm">
                            {filas.map((x) => (
                              <li key={x.mazo} className="flex items-center justify-between gap-2">
                                <span className="min-w-0 truncate">{x.mazo}</span>
                                <span className="flex-none font-mono font-bold tabular">{marca(x)}</span>
                              </li>
                            ))}
                            {filas.length === 0 && <li className="text-muted">—</li>}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">{tr(lng, "v130.rivalesNota")}</p>
    </>
  );
}
