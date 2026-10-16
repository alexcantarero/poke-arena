"use client";

import Link from "next/link";
import { useState } from "react";
import { clearLadderElo, setLadderElo } from "@/actions";
import {
  ARCEUS_JUMP, ARCEUS_MIN, LADDER_MAX, LADDER_MIN, NOVATO_MAX, TIERS, normalizeLadderInput, rankOf, type Rank,
} from "@/lib/rank";
import type { PublicPlayer } from "@/lib/types";
import { Avatar } from "./ui";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   El ladder manual: el rango que cada uno se pone a mano para picarse.

   Los colores de tier viven en `globals.css` como `--tier-*` y se aplican por
   `data-tier`. El chip los usa en el texto y el borde sobre un fondo tintado,
   no como relleno: así el contraste depende del par color/página, que es el
   que está medido, y no de qué texto se ponga encima.
   ========================================================================= */

export function RankBadge({
  elo, size = "md", showElo = true,
}: { elo: number | null; size?: "sm" | "md" | "lg"; showElo?: boolean }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  if (elo == null) {
    return (
      <span className="chip border-dashed text-muted" data-size={size}>{tr(lng, "x.2aefa185")}</span>
    );
  }
  const rank = rankOf(elo);
  const pad = size === "sm" ? "px-2 py-0 text-[11px]" : size === "lg" ? "px-3 py-1 text-base" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      data-tier={rank.tier.id}
      className={`tier inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-full border font-semibold ${pad}`}
      title={rank.toNext !== null ? `${rank.label} · ${rank.toNext} para ${rank.nextLabel}` : rank.label}
    >
      {rank.label}
      {showElo && <span className="font-mono text-[0.85em] font-medium tabular opacity-80">{rank.elo}</span>}
    </span>
  );
}

/** Barrita de progreso dentro del tier. Va en el perfil. */
export function RankProgress({ elo }: { elo: number | null }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  if (elo == null) return null;
  const rank = rankOf(elo);
  return (
    <div data-tier={rank.tier.id} className="tier-bar flex flex-col gap-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.round(rank.progress * 100)}%` }} />
      </div>
      <p className="text-[11px] text-muted">
        {rank.toNext !== null
          ? rank.tier.id === "novato"
            ? `${rank.toNext} para el salto a la Liga Arceus (${ARCEUS_JUMP})`
            : `${rank.toNext} puntos para ${rank.nextLabel}`
          : tr(lng, "x.d5362f0a")}
      </p>
    </div>
  );
}

/**
 * Editor. El propio siempre; el de otra persona, solo un organizador. La
 * comprobación de verdad está dentro de la Server Action: esto solo decide si
 * se dibuja el formulario.
 */
export function LadderEditor({
  playerId, currentElo, currentNote,
}: { playerId: string; currentElo: number | null; currentNote: string }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  /* v0.18 — lo que se escribe y lo que se guardaría. Sin deslizador: con el
     hueco del salto Arceus (551–1349) un deslizador continuo mentía. */
  const [raw, setRaw] = useState<string>(currentElo != null ? String(currentElo) : String(ARCEUS_JUMP));
  const guardado = normalizeLadderInput(raw);
  const elo = guardado ?? ARCEUS_JUMP;
  const rank = rankOf(elo);
  const salto = guardado === ARCEUS_JUMP && Number(raw) > NOVATO_MAX && Number(raw) < ARCEUS_MIN;

  return (
    <form action={setLadderElo} className="flex flex-col gap-4">
      <input type="hidden" name="playerId" value={playerId} />

      <div className="flex items-center justify-between gap-3">
        <RankBadge elo={elo} size="lg" />
        <span className="text-xs text-muted">
          {rank.toNext !== null ? `${rank.toNext} para ${rank.nextLabel}` : tr(lng, "x.d5362f0a")}
        </span>
      </div>

      <RankProgress elo={elo} />

      {/* Atajos a cada tier: un toque y queda en su suelo. */}
      <div className="flex flex-wrap gap-1.5" aria-label={tr(lng, "x.d43029d6")}>
        {TIERS.map((t) => (
          <button key={t.id} type="button" data-tier={t.id}
            className="tier rounded-full border px-2 py-0.5 text-[11px] font-semibold"
            onClick={() => setRaw(String(t.floor))}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[7rem_1fr] gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ladderElo">{tr(lng, "x.4836dcef")}</label>
          <input
            className="input px-2 text-center" id="ladderElo" name="ladderElo"
            type="number" min={LADDER_MIN} max={LADDER_MAX} inputMode="numeric" required
            value={raw} onChange={(e) => setRaw(e.target.value)} aria-describedby="ladder-help"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="ladderNote">{tr(lng, "x.1a6b7be7")}</label>
          <input
            className="input" id="ladderNote" name="ladderNote" maxLength={200}
            defaultValue={currentNote} placeholder={tr(lng, "x.c80b4989")}
          />
        </div>
      </div>

      {salto && (
        <p className="rounded-lg border border-brand-line bg-brand-soft px-3 py-2 text-xs font-semibold text-brand">
          Salto Arceus: pasar de {NOVATO_MAX} te sube directamente a {ARCEUS_JUMP} (Liga Arceus).
        </p>
      )}
      {guardado == null && raw.trim() !== "" && (
        <p className="text-xs font-semibold text-loss">
          Fuera de rango: de {LADDER_MIN} a {NOVATO_MAX} o de {ARCEUS_MIN} a {LADDER_MAX}.
        </p>
      )}

      <p id="ladder-help" className="text-xs text-muted">
        {LADDER_MIN}–{NOVATO_MAX} es Novato. Al pasar de {NOVATO_MAX} se salta a {ARCEUS_JUMP}{" "}
        (Liga Arceus), y desde ahí se puede volver a bajar hasta {ARCEUS_MIN} (Hierro).{" "}
        {LADDER_MAX} es Challenger. Este número lo pones tú y no afecta a nada: el Elo de la liga
        se calcula solo con vuestras partidas.
      </p>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-brand min-w-40 flex-1" type="submit" disabled={guardado == null}>
          {tr(lng, "x.699c9efa")}
        </button>
      </div>
    </form>
  );
}

/** Se saca del formulario de arriba: un <form> no puede anidarse en otro. */
export function LadderClear({ playerId }: { playerId: string }) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  return (
    <form action={clearLadderElo}>
      <input type="hidden" name="playerId" value={playerId} />
      <button className="btn btn-ghost btn-sm btn-danger" type="submit">{tr(lng, "x.1c3dc14b")}</button>
    </form>
  );
}

/** Clasificación del ladder. Server-friendly: no tiene estado. */
export function LadderTable({
  rows, meId,
}: {
  rows: Array<{ player: PublicPlayer; rank: Rank; position: number }>;
  meId?: string;
}) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  if (!rows.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        {tr(lng, "x.5281d545")}
      </p>
    );
  }
  return (
    <ol className="divide-y divide-line-soft">
      {rows.map(({ player, rank, position }) => (
        <li
          key={player.id}
          data-tier={rank.tier.id}
          className={`tier-row flex items-center gap-3 border-l-[3px] px-4 py-2.5
            ${player.id === meId ? "bg-surface-2" : ""}`}
        >
          <span className="w-5 flex-none text-center font-display text-lg font-extrabold tabular text-muted">
            {position}
          </span>
          <Link href={`/perfil/${player.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-info">
          <Avatar player={player} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{player.name}</span>
            {player.ladderNote && (
              <span className="block truncate text-[11px] text-muted">{player.ladderNote}</span>
            )}
          </span>
          </Link>
          <RankBadge elo={rank.elo} size="sm" />
        </li>
      ))}
    </ol>
  );
}
