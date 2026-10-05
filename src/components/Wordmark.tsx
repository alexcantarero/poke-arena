import { LogoMark } from "./LogoMark";

/** La marca: el emblema de PokeArena (v0.24) y el nombre. */
export function Wordmark({ name, season, compact }: { name: string; season?: string; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <LogoMark className={compact ? "size-9" : "size-12"} title={name} />
      <span className="min-w-0">
        <span className={`block truncate font-display font-extrabold uppercase leading-none tracking-wide
          ${compact ? "text-lg" : "text-3xl"}`}>
          {name}
        </span>
        {season && (
          <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {season}
          </span>
        )}
      </span>
    </div>
  );
}
