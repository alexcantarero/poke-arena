import { togglePlayerFavorite } from "@/actions";
import { tr, type Lang } from "@/lib/i18n";

/**
 * v0.17 — Estrella de favorito. Formulario de servidor: sin JS también va.
 * `back` es a dónde volver tras pulsar (la Server Action lo sanea).
 */
export function FavStar({
  playerId, on, back, lang = "es", withLabel = false,
}: { playerId: string; on: boolean; back: string; lang?: Lang; withLabel?: boolean }) {
  return (
    <form action={togglePlayerFavorite} className="flex-none">
      <input type="hidden" name="playerId" value={playerId} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        className={`btn btn-ghost btn-sm ${withLabel ? "" : "px-2"} ${on ? "text-brand" : "text-muted"}`}
        title={tr(lang, on ? "fav.removeTitle" : "fav.addTitle")}
        aria-label={tr(lang, on ? "fav.removeTitle" : "fav.addTitle")}
        aria-pressed={on}
      >
        <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true"
          fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z" />
        </svg>
        {withLabel && <span>{tr(lang, on ? "fav.remove" : "fav.add")}</span>}
      </button>
    </form>
  );
}
