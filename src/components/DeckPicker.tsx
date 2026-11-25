"use client";

import { useMemo, useRef, useState } from "react";
import type { DeckOption } from "@/lib/types";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   Elegir mazo.

   v0.135 — REHECHO: SE ESCRIBE Y FILTRA, Y SIN ICONOS. La versión anterior
   abría un panel (en el móvil, una hoja arriba de la pantalla) con sprites y,
   dentro, un buscador. Con cien mazos y el teclado del móvil abierto era
   imposible de usar (dicho por Ibai el 24/11). Ahora:

   · El control ES una caja de texto. Al escribir, debajo sale una lista de
     nombres que se va filtrando (primero los que empiezan así). Un toque elige.
   · Sin escribir, salen los primeros de la lista tal y como los ordena el
     servidor (`deckOptions()`): tus favoritos y tus mazos primero.
   · Lo elegido se ve como una línea con «Cambiar». Enter elige el primero.
   · El valor sigue viajando en un `<input type="hidden">`, así que funciona
     igual dentro de cualquier `<form action={serverAction}>`. Mismas props que
     antes: nadie que lo use tiene que cambiar.
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
  /** Ya no se usa (el buscador está siempre): se acepta para no romper a quien lo pase. */
  searchFrom?: number;
  onChange?: (value: string) => void;
};

const plano = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function DeckPicker({
  name, options, defaultValue, emptyLabel = "— sin anotar —",
  placeholder = "Elegir mazo", id, locked = false, lockedReason, onChange,
}: Props) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const [value, setValue] = useState(defaultValue ?? "");
  const [q, setQ] = useState("");
  const [abierta, setAbierta] = useState(false);
  const caja = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.id === value);

  const filas = useMemo(() => {
    const n = plano(q);
    if (!n) return options.slice(0, 12);
    const texto = (o: DeckOption) => plano(`${o.name} ${o.archetypeName} ${o.main} ${o.secondary}`);
    const empiezan = options.filter((o) => plano(o.name).startsWith(n) || plano(o.archetypeName).startsWith(n));
    const resto = options.filter((o) => !empiezan.includes(o) && texto(o).includes(n));
    return [...empiezan, ...resto].slice(0, 40);
  }, [options, q]);

  const choose = (next: string) => {
    setValue(next);
    onChange?.(next);
    setQ("");
    setAbierta(false);
    caja.current?.blur();
  };

  if (locked) {
    return (
      <div>
        <input type="hidden" name={name} value={value} />
        <div id={id} className="input w-full justify-start text-left opacity-70">
          <span className="truncate text-[15px] font-semibold">{selected ? selected.name : <span className="font-normal text-muted">{placeholder}</span>}</span>
        </div>
        {lockedReason && <p className="mt-1 text-xs text-muted">{lockedReason}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      {selected && !abierta ? (
        <div className="input w-full justify-between gap-2 text-left">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold leading-tight">{selected.name}</span>
            {selected.archetypeName && selected.archetypeName !== selected.name && (
              <span className="block truncate text-[11px] text-muted">{selected.archetypeName}</span>
            )}
          </span>
          <button type="button" id={id} className="flex-none text-sm font-semibold text-info"
            onClick={() => { setAbierta(true); setTimeout(() => caja.current?.focus(), 0); }}>
            {tr(lng, "v135.cambiar")}
          </button>
        </div>
      ) : (
        <>
          {/* `type="search"` y sin nada que suene a «nombre»: así Safari no saca «Autorrellenar contacto». */}
          <input
            ref={caja} id={selected ? undefined : id}
            type="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            data-1p-ignore data-lpignore="true"
            className="input w-full"
            value={q}
            onChange={(e) => { setQ(e.target.value); setAbierta(true); }}
            onFocus={(e) => { setAbierta(true); const el = e.currentTarget; setTimeout(() => el.scrollIntoView({ block: "start", behavior: "smooth" }), 250); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filas[0]) { e.preventDefault(); choose(filas[0].id); }
              if (e.key === "Escape") { setAbierta(false); setQ(""); }
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            aria-expanded={abierta}
            role="combobox"
            aria-controls={`${name}-lista`}
          />
          {abierta && (
            <ul id={`${name}-lista`} role="listbox" className="deck-lista-texto mt-1">
              {emptyLabel && !q && (
                <li><button type="button" role="option" aria-selected={value === ""} className="text-muted" onClick={() => choose("")}>{emptyLabel}</button></li>
              )}
              {filas.map((o) => (
                <li key={o.id}>
                  <button type="button" role="option" aria-selected={o.id === value} onClick={() => choose(o.id)}>
                    <span className="block truncate font-semibold">{o.name}</span>
                    {(o.archetypeName !== o.name || o.ownerName) && (
                      <span className="block truncate text-[11px] font-normal text-muted">
                        {o.archetypeName !== o.name ? o.archetypeName : ""}
                        {o.ownerName ? `${o.archetypeName !== o.name ? " · " : ""}de ${o.ownerName}` : ""}
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {filas.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted">{tr(lng, "v135.nadaCon")} «{q}»</li>}
            </ul>
          )}
          {abierta && selected && (
            <button type="button" className="mt-1 text-sm text-muted underline" onClick={() => { setAbierta(false); setQ(""); }}>{tr(lng, "v125.cancelar")}</button>
          )}
        </>
      )}
    </div>
  );
}
