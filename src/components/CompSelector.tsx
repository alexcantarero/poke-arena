import Link from "next/link";
import { shortName } from "@/lib/format";
import type { Competition } from "@/lib/types";

/** Selector Global / competición, como pestañas segmentadas. */
export function CompSelector({
  competitions, current, basePath,
}: { competitions: Competition[]; current: string; basePath: string }) {
  return (
    <div className="seg" role="group" aria-label="Competición">
      <Link href={basePath} className={current === "all" ? "on" : ""}>Global</Link>
      {competitions.map((c) => (
        <Link key={c.id} href={`${basePath}?comp=${c.id}`} className={current === c.id ? "on" : ""}>
          {shortName(c.name, 18)}
        </Link>
      ))}
    </div>
  );
}
