import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPlayer, loadSnapshot } from "@/lib/data";
import { canManageLeague } from "@/lib/auth";
import { cualConservar, paresDuplicados } from "@/lib/duplicados";
import { fusionarTorneos } from "@/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { fmtDate } from "@/lib/format";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Torneos duplicados" };

/* =========================================================================
   v0.135 — TORNEOS DUPLICADOS (`/torneos/duplicados`, organizadores).

   Los pares que parecen el mismo torneo (misma fecha, misma familia y la
   misma tienda en el nombre o la sede: `lib/duplicados.ts`), con lo que
   tiene cada uno y un botón para fusionarlos. Se propone conservar el que
   tiene más datos; se puede elegir el otro.
   ========================================================================= */
export default async function DuplicadosPage() {
  const [snap, me, lng] = await Promise.all([loadSnapshot(), currentPlayer(), getLang()]);
  if (!me) redirect("/entrar");
  if (!canManageLeague(me.role)) redirect("/torneos");

  const rondasDe = new Map<string, number>();
  for (const m of snap.matches) if (m.tournamentId) rondasDe.set(m.tournamentId, (rondasDe.get(m.tournamentId) ?? 0) + 1);
  const info = (t: (typeof snap.tournaments)[number]) => ({
    id: t.id, resultados: t.results.length, rondas: rondasDe.get(t.id) ?? 0,
    creado: t.createdAt ? new Date(t.createdAt).toISOString() : t.date,
  });
  const pares = paresDuplicados<(typeof snap.tournaments)[number]>(snap.tournaments);

  return (
    <>
      <div className="mb-3"><Link href="/torneos" className="btn btn-ghost btn-sm">← {tr(lng, "v135.dup.torneos")}</Link></div>
      <h1 className="mb-1 font-display text-2xl font-black">{tr(lng, "v135.dup.titulo")}</h1>
      <p className="mb-4 text-sm text-muted">{tr(lng, "v135.dup.sub")}</p>
      {pares.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">{tr(lng, "v135.dup.ninguno")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {pares.map(([a, b]) => {
            const [keep, drop] = cualConservar(info(a), info(b));
            const porId = new Map([[a.id, a], [b.id, b]]);
            return (
              <li key={`${a.id}-${b.id}`} className="card p-4">
                <p className="label mb-2">{fmtDate(a.date)}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[keep, drop].map((x, i) => {
                    const t = porId.get(x.id)!;
                    const otro = i === 0 ? drop : keep;
                    return (
                      <div key={x.id} className={`rounded-lg border p-3 ${i === 0 ? "border-win/50" : "border-line-soft"}`}>
                        <Link href={`/torneos/${t.id}`} className="block font-semibold hover:underline">{t.name}</Link>
                        <p className="text-xs text-muted">{[t.venue, t.city].filter(Boolean).join(" · ") || "—"} · {t.id.startsWith("ltl-") ? "Limitless" : t.id.slice(0, 4)}</p>
                        <p className="mt-1 text-sm tabular">{trf(lng, "v135.dup.datos", { r: x.resultados, n: x.rondas, j: t.playerCount ?? "—" })}</p>
                        <form action={fusionarTorneos} className="mt-2">
                          <input type="hidden" name="conservar" value={x.id} />
                          <input type="hidden" name="quitar" value={otro.id} />
                          <ConfirmButton className={`btn btn-sm ${i === 0 ? "btn-brand" : ""}`} message={tr(lng, "v135.dup.confirmar")}>
                            {tr(lng, i === 0 ? "v135.dup.conservarEste" : "v135.dup.mejorEste")}
                          </ConfirmButton>
                        </form>
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">{tr(lng, "v135.dup.nota")}</p>
    </>
  );
}
