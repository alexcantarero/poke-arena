import { readSession, canManageLeague } from "@/lib/auth";
import { loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { DeckForm } from "@/components/DeckForm";
import { CardSearch } from "@/components/CardSearch";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Nuevo mazo" };

/**
 * Solo se vuelve a una ruta de esta misma app. `back` llega por la URL, así
 * que sin esta comprobación cualquiera podría mandar un enlace a
 * `/mazos/nuevo?back=https://…` y llevarse a alguien fuera al guardar.
 */
const safeBack = (v: string | undefined) =>
  v && v.startsWith("/") && !v.startsWith("//") ? v : undefined;

export default async function NewDeckPage({
  searchParams,
}: { searchParams: Promise<{ player?: string; back?: string }> }) {
  const lng = await getLang(); // v0.49

  const [q, snap, session] = await Promise.all([searchParams, loadSnapshot(), readSession()]);
  const me = session ? snap.playersById.get(session.playerId) : undefined;
  return (
    <>
      <PageHead title={tr(lng, "x.58677581")} sub={tr(lng, "x.6902fdf8")} back={{ href: "/mazos", label: tr(lng, "x.78f2cee5") }} />
      <DeckForm
        players={snap.players}
        archetypes={snap.archetypes}
        defaultPlayerId={q.player ?? session?.playerId}
        canPickPlayer={me ? canManageLeague(me.role) : false}
        back={safeBack(q.back)}
      />

      {/* Aquí es donde de verdad se echa de menos: estás copiando una lista a
          mano y te falta el set de dos cartas. */}
      <details className="card mt-4">
        <summary className="tap cursor-pointer justify-between px-4 font-display text-lg font-bold">
          {tr(lng, "x.00f5042b")}
          <span className="text-xs font-normal text-muted">{tr(lng, "x.46c4a48c")}</span>
        </summary>
        <div className="border-t border-line-soft p-4">
          <CardSearch />
        </div>
      </details>
    </>
  );
}
