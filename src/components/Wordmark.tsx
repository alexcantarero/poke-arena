/** La marca: una Poké Ball dibujada con CSS y el nombre de la liga. */
export function Wordmark({ name, season, compact }: { name: string; season?: string; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className={`relative flex-none rounded-full border-2 border-ink bg-surface
          ${compact ? "size-7" : "size-11"}`}
        style={{
          backgroundImage:
            "linear-gradient(to bottom, var(--loss) 0 46%, var(--ink) 46% 54%, var(--surface) 54% 100%)",
        }}
      >
        <span className={`absolute inset-0 m-auto rounded-full border-2 border-ink bg-surface
          ${compact ? "size-2.5" : "size-4"}`} />
      </span>
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
