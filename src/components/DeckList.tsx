"use client";

import { useMemo, useState } from "react";
import type { Card, ParsedDeck } from "@/lib/decklist";
import { parseDeckList } from "@/lib/decklist";
import { cardImageUrl, cardLine } from "@/lib/cards";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   Ver una lista de mazo, como texto o con las imágenes de las cartas.

   El texto es lo que quieres para copiar y pegar en Live; las imágenes son lo
   que quieres para entender un mazo de un vistazo. Son dos usos distintos, así
   que hay un interruptor y no una decisión.

   Las imágenes salen del CDN de Limitless, construidas con la abreviatura del
   set y el número que ya vienen en la lista interpretada (ver `lib/cards.ts`).
   No hay ninguna llamada a una API ni nada que guardar en base de datos.

   Y como es un patrón de URL de un tercero, cada carta que no cargue cae a su
   línea de texto en lugar de dejar un hueco: si Limitless cambiara el nombre
   de los ficheros mañana, esto se degrada a lo que ya había, no se rompe.
   ========================================================================= */

const SECTIONS: Array<{ key: keyof Pick<ParsedDeck, "pokemon" | "trainer" | "energy">; label: string }> = [
  { key: "pokemon", label: "Pokémon" },
  { key: "trainer", label: "Entrenador" },
  { key: "energy", label: "Energía" },
];

export function DeckList({
  list, listJson, defaultView = "text",
}: {
  list: string;
  /** `decks.listJson`, si está ya interpretada. Si no, se interpreta aquí. */
  listJson?: unknown;
  defaultView?: "text" | "cards";
}) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const [view, setView] = useState<"text" | "cards">(defaultView);

  const parsed = useMemo<ParsedDeck>(() => {
    const j = listJson as ParsedDeck | null | undefined;
    if (j && Array.isArray(j.pokemon)) return j;
    return parseDeckList(list);
  }, [list, listJson]);

  const withImages = SECTIONS.flatMap((s) => parsed[s.key]).filter((c) => cardImageUrl(c)).length;
  const total = SECTIONS.reduce((a, s) => a + parsed[s.key].length, 0);

  if (!list.trim()) return <p className="text-sm text-muted">{tr(lng, "x.bc6da1fc")}</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {parsed.total} cartas
          {withImages < total && view === "cards" && (
            <> · {total - withImages} sin imagen, salen como texto</>
          )}
        </p>
        <div className="seg flex-none">
          <button type="button" data-on={view === "text"} onClick={() => setView("text")}>{tr(lng, "x.6eeba656")}</button>
          <button type="button" data-on={view === "cards"} onClick={() => setView("cards")}>{tr(lng, "x.7dc5800b")}</button>
        </div>
      </div>

      {view === "text" ? (
        <pre className="max-h-72 overflow-auto rounded-lg bg-ground p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {list}
        </pre>
      ) : (
        <div className="flex flex-col gap-4">
          {SECTIONS.map((s) =>
            parsed[s.key].length ? (
              <section key={s.key}>
                <h4 className="label mb-2">
                  {s.label} · {parsed[s.key].reduce((a, c) => a + c.n, 0)}
                </h4>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                  {parsed[s.key].map((c, i) => <CardTile key={`${c.name}-${c.set}-${c.number}-${i}`} card={c} />)}
                </ul>
              </section>
            ) : null,
          )}
          {parsed.errors.length > 0 && (
            <p className="text-xs text-muted">
              {parsed.errors.length} línea(s) no se han entendido. Están en la vista de texto.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CardTile({ card }: { card: Card }) {
  const [broken, setBroken] = useState(false);
  const url = cardImageUrl(card);

  if (!url || broken) {
    return (
      <li className="grid aspect-[63/88] place-items-center rounded-lg border border-line-soft bg-ground p-2 text-center">
        <span className="text-[11px] leading-tight text-ink-2">{cardLine(card)}</span>
      </li>
    );
  }
  return (
    <li className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={card.name}
        title={cardLine(card)}
        loading="lazy"
        className="w-full rounded-lg"
        onError={() => setBroken(true)}
      />
      <span
        className="absolute right-1 bottom-1 rounded-md bg-ink/85 px-1.5 font-mono text-[11px]
                   font-bold tabular text-ground"
      >
        ×{card.n}
      </span>
    </li>
  );
}
