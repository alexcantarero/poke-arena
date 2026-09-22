import { redirect } from "next/navigation";
import { currentPlayer, loadLiveMatches } from "@/lib/data";
import { matchupsOf, statsByDeck, winRateOf } from "@/lib/ptcglive";
import { pct, wrColor } from "@/lib/format";
import { Bars, Empty, Kpi, PageHead } from "@/components/ui";
import { LiveImport } from "@/components/LiveImport";
import { Icon } from "@/components/icons";
import { clearLiveMatches, deleteLiveMatch } from "@/actions";

export const metadata = { title: "TCG Live" };

/**
 * Tu historial de Pokémon TCG Live.
 *
 * Por qué esta pantalla existe y por qué está separada del resto: TCG Live no
 * tiene API —ni la va a tener—, así que lo único posible es importar lo que
 * cada uno apunta. Y como eso no lo ha visto nadie más, no entra en el
 * ranking de la liga. Sirve para lo que se pidió: saber cómo te va con cada
 * mazo y contra qué te está ganando.
 *
 * Es privada por persona. No hay vista de «el TCG Live de los demás» porque
 * no tendría sentido comparar historiales que cada uno apunta a su manera.
 */
export default async function LivePage({
  searchParams,
}: { searchParams: Promise<{ mazo?: string }> }) {
  const [q, me] = await Promise.all([searchParams, currentPlayer()]);
  if (!me) redirect("/entrar");

  const rows = await loadLiveMatches(me.id);
  const porMazo = statsByDeck(rows);
  const foco = q.mazo && porMazo.some((d) => d.deck === q.mazo) ? q.mazo : porMazo[0]?.deck;
  const cruces = foco ? matchupsOf(rows, foco) : [];

  const wins = rows.filter((r) => r.result === "w").length;
  const losses = rows.filter((r) => r.result === "l").length;
  const ties = rows.filter((r) => r.result === "d").length;
  const global = winRateOf(wins, losses, ties);

  return (
    <>
      <PageHead
        title="Pokémon TCG Live"
        sub="Tus partidas del cliente, importadas a mano. No cuentan para el ranking de la liga: nadie más las ha visto."
        back={{ href: "/mas", label: "Más" }}
      />

      {rows.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Kpi icon="card" tone="local" label="Partidas" value={rows.length}
            note={`${wins}V ${losses}D${ties ? ` ${ties}E` : ""}`} />
          <Kpi
            icon="stats"
            tone={global != null && global >= 0.5 ? "win" : "neutral"}
            label="Victorias" value={pct(global, 1)} note="contando el empate como media"
          />
          <Kpi icon="deck" label="Mazos" value={porMazo.length} note="distintos" />
          <Kpi icon="clock" label="Desde" value={rows[rows.length - 1]?.date ?? "—"}
            note={`hasta ${rows[0]?.date ?? "—"}`} />
        </div>
      )}

      <LiveImport />

      {rows.length === 0 ? (
        <section className="card mt-4">
          <Empty icon="card" title="Todavía no hay nada importado">
            Pega arriba lo que tengas apuntado —una hoja de cálculo, una nota del móvil— y
            aparecerá aquí. TCG Live no deja exportar el historial, así que esto es lo que hay:
            si alguna vez sacan una forma de descargarlo, se conecta y ya está.
          </Empty>
        </section>
      ) : (
        <>
          {/* ------------------------------ por mazo ------------------------------ */}
          <section className="card mt-4">
            <div className="card-head">
              <h2 className="text-lg font-bold">Cómo va cada mazo</h2>
              <span className="text-xs text-muted">{porMazo.length}</span>
            </div>
            <div className="p-4">
              <Bars
                max={100}
                rows={porMazo.map((d) => ({
                  label: <span className="truncate text-[13px]">{d.deck}</span>,
                  value: (d.winRate ?? 0) * 100,
                  right: `${pct(d.winRate, 0)} (${d.played})`,
                  color: wrColor(d.winRate),
                }))}
              />
            </div>
          </section>

          {/* --------------------------- emparejamientos --------------------------- */}
          {foco && (
            <section className="card mt-4">
              <div className="card-head">
                <h2 className="text-lg font-bold">Contra qué pierdes</h2>
                <span className="text-xs text-muted">con {foco}</span>
              </div>

              {porMazo.length > 1 && (
                <div className="scroll-x flex gap-2 px-4 pt-3">
                  {porMazo.slice(0, 8).map((d) => (
                    <a
                      key={d.deck}
                      href={`/live?mazo=${encodeURIComponent(d.deck)}`}
                      aria-current={d.deck === foco ? "page" : undefined}
                      className={`chip flex-none ${d.deck === foco ? "chip-brand" : ""}`}
                    >
                      {d.deck}
                    </a>
                  ))}
                </div>
              )}

              <ul className="mt-2 divide-y divide-line-soft">
                {cruces.map((c) => (
                  <li key={c.against} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{c.against}</span>
                      <span className="block text-[11px] text-muted tabular">
                        {c.wins}V {c.losses}D{c.ties ? ` ${c.ties}E` : ""} · {c.played} partida
                        {c.played === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span
                      className="font-display text-xl font-extrabold tabular"
                      style={{ color: wrColor(c.winRate) }}
                    >
                      {pct(c.winRate, 0)}
                    </span>
                  </li>
                ))}
                {!cruces.length && (
                  <li className="px-4 py-6 text-center text-sm text-muted">
                    No has apuntado el mazo del rival en ninguna de estas partidas.
                  </li>
                )}
              </ul>
              <p className="px-4 pb-3 pt-2 text-[11px] text-muted">
                Un 100% de una sola partida no dice nada. Mira la columna de la izquierda antes
                de sacar conclusiones.
              </p>
            </section>
          )}

          {/* -------------------------------- listado ------------------------------- */}
          <section className="card mt-4">
            <div className="card-head">
              <h2 className="text-lg font-bold">Todas</h2>
              <span className="text-xs text-muted">{rows.length}</span>
            </div>
            <ul className="divide-y divide-line-soft">
              {rows.slice(0, 100).map((r) => (
                <li key={r.id} className="flex items-center gap-2.5 px-4 py-2">
                  <span className={`chip flex-none ${
                    r.result === "w" ? "chip-win" : r.result === "l" ? "chip-loss" : "chip-tie"
                  }`}>
                    {r.result === "w" ? "V" : r.result === "l" ? "D" : "E"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {r.myDeck}
                      {r.opponentDeck && <span className="text-muted"> vs {r.opponentDeck}</span>}
                    </span>
                    <span className="block font-mono text-[11px] text-muted">
                      {r.date}
                      {r.gamesWon != null && ` · ${r.gamesWon}–${r.gamesLost}`}
                      {r.opponentName && ` · ${r.opponentName}`}
                    </span>
                  </span>
                  <form action={deleteLiveMatch} className="flex-none">
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn btn-ghost btn-sm px-2" type="submit"
                      aria-label="Borrar esta partida" title="Borrar">
                      <Icon name="close" className="size-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            {rows.length > 100 && (
              <p className="px-4 py-3 text-xs text-muted">
                Se enseñan las 100 más recientes. Las estadísticas de arriba cuentan las {rows.length}.
              </p>
            )}
          </section>

          {/* Vaciar va al final y no arriba, que es donde se pone lo que no se
              quiere tocar sin querer. */}
          <form action={clearLiveMatches} className="mt-4">
            <button className="btn btn-danger w-full sm:w-auto" type="submit">
              <Icon name="alert" className="size-4" /> Vaciar mi historial de TCG Live
            </button>
          </form>
        </>
      )}
    </>
  );
}
