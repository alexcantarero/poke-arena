"use client";

import { useMemo, useRef, useState } from "react";
import type { DeckOption } from "@/lib/types";
import { DECK_GROUP_LABEL } from "@/lib/types";
import { spriteUrl } from "@/lib/pokemon";
import { Icon } from "./icons";

/* =========================================================================
   Elegir mazo.

   Sustituye al `<select>` de toda la vida, y no por capricho: con sesenta
   arquetipos en la lista, el desplegable nativo del móvil es una columna de
   texto de sesenta filas que hay que leer entera. Aquí se ve el sprite —que
   es como de verdad reconoces un mazo— y se puede escribir para filtrar.

   Tres decisiones que conviene no deshacer:

   · **El valor viaja en un `<input type="hidden">`.** El componente es un
     adorno encima de un campo de formulario normal, así que sigue funcionando
     dentro de un `<form action={serverAction}>` sin más.
   · **El buscador solo aparece si hay de sobra.** Con ocho mazos, una caja de
     búsqueda es ruido; con sesenta, es lo único que salva la pantalla.
   · **Agrupado por procedencia, no alfabético.** Tus favoritos primero. El
     orden lo pone `deckOptions()` en el servidor y aquí se respeta.

   Cierra al elegir, al tocar fuera y con Escape. No hay más estado que el
   panel abierto y el texto del filtro.
   ========================================================================= */

type Props = {
  name: string;
  options: DeckOption[];
  defaultValue?: string | null;
  /** Texto de la opción vacía. Si es null, elegir es obligatorio. */
  emptyLabel?: string | null;
  placeholder?: string;
  id?: string;
  /** Bloqueado: se ve lo elegido pero no se puede cambiar. */
  locked?: boolean;
  lockedReason?: string;
  /** A partir de cuántas opciones aparece el buscador. */
  searchFrom?: number;
};

export function DeckPicker({
  name, options, defaultValue, emptyLabel = "— sin anotar —",
  placeholder = "Elegir mazo", id, locked = false, lockedReason, searchFrom = 8,
}: Props) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);
  const showSearch = options.length >= searchFrom;

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (o: DeckOption) =>
      !needle
      || o.name.toLowerCase().includes(needle)
      || o.archetypeName.toLowerCase().includes(needle)
      || o.main.includes(needle)
      || o.secondary.includes(needle);

    const out = new Map<DeckOption["group"], DeckOption[]>();
    for (const o of options) {
      if (!match(o)) continue;
      const list = out.get(o.group);
      if (list) list.push(o);
      else out.set(o.group, [o]);
    }
    return [...out.entries()];
  }, [options, q]);

  const total = groups.reduce((a, [, list]) => a + list.length, 0);

  const choose = (next: string) => {
    setValue(next);
    setOpen(false);
    setQ("");
  };

  // Cerrar al tocar fuera. Un listener suelto en `document` sería más caro de
  // limpiar; con onBlur del contenedor basta, porque el panel está dentro.
  const onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!boxRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
  };

  return (
    <div className="relative" ref={boxRef} onBlur={onBlur}>
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        id={id}
        className="input w-full justify-start gap-2.5 text-left disabled:opacity-70"
        disabled={locked}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
      >
        <DeckSprite option={selected} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold leading-tight">
            {selected ? selected.name : <span className="font-normal text-muted">{placeholder}</span>}
          </span>
          {selected?.archetypeName && selected.archetypeName !== selected.name && (
            <span className="block truncate text-[11px] text-muted">{selected.archetypeName}</span>
          )}
        </span>
        {!locked && <Icon name="more" className="size-4 flex-none text-muted" />}
      </button>

      {locked && lockedReason && (
        <p className="mt-1 text-xs text-muted">{lockedReason}</p>
      )}

      {open && !locked && (
        <div
          className="absolute left-0 right-0 z-40 mt-1 overflow-hidden rounded-xl border border-line
                     bg-surface shadow-lg"
          role="listbox"
        >
          {showSearch && (
            <div className="border-b border-line-soft p-2">
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                className="input h-10 min-h-10 w-full text-sm"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
                placeholder="Buscar por nombre o Pokémon…"
                autoFocus
                autoComplete="off"
                aria-label="Buscar mazo"
              />
            </div>
          )}

          <div className="max-h-72 overflow-y-auto overscroll-contain">
            {emptyLabel && !q && (
              <button
                type="button" role="option" aria-selected={value === ""}
                className="tap w-full justify-start px-3 text-sm text-muted hover:bg-surface-2"
                onClick={() => choose("")}
              >
                {emptyLabel}
              </button>
            )}

            {total === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted">
                Nada con «{q}». Puedes crearlo desde Mazos.
              </p>
            )}

            {groups.map(([group, list]) => (
              <div key={group}>
                <p className="sticky top-0 bg-surface-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted">
                  {DECK_GROUP_LABEL[group]}
                </p>
                {list.map((o) => (
                  <button
                    key={o.id}
                    type="button" role="option" aria-selected={o.id === value}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-2
                      ${o.id === value ? "bg-surface-2" : ""}`}
                    onClick={() => choose(o.id)}
                  >
                    <DeckSprite option={o} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold leading-tight">{o.name}</span>
                      <span className="block truncate text-[11px] text-muted">
                        {o.archetypeName !== o.name ? o.archetypeName : ""}
                        {o.ownerName ? `${o.archetypeName !== o.name ? " · " : ""}de ${o.ownerName}` : ""}
                      </span>
                    </span>
                    {o.hasList && (
                      <span className="chip flex-none text-[10px]">lista</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Los uno o dos Pokémon del mazo, en pequeño. */
function DeckSprite({ option }: { option?: DeckOption }) {
  if (!option?.main) {
    return <span className="size-8 flex-none rounded-md border border-dashed border-line" aria-hidden="true" />;
  }
  return (
    <span className="flex size-8 flex-none items-center justify-center" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={spriteUrl(option.main)} alt="" className="size-8 object-contain" loading="lazy" />
      {option.secondary && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={spriteUrl(option.secondary)} alt="" className="-ml-3.5 size-6 object-contain" loading="lazy" />
      )}
    </span>
  );
}
