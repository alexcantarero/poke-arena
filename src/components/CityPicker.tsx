"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/i18n";

type Props = {
  name: string;
  options: string[];
  defaultValue: string;
};

const clave = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

export function CityPicker({ name, options, defaultValue }: Props) {
  const lang = useLang();
  const id = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const allLabel = tr(lang, "cal.todasCiudades");
  const noResults = tr(lang, "cal.sinCoincidencias");
  const visibles = useMemo(() => {
    const needle = clave(query.trim());
    const ciudades = options.filter((ciudad) => !needle || clave(ciudad).includes(needle));
    return !needle || clave(allLabel).includes(needle) ? ["", ...ciudades] : ciudades;
  }, [allLabel, options, query]);

  useEffect(() => {
    if (!open) return;
    const cerrarFuera = (event: PointerEvent) => {
      if (event.target instanceof Node && !boxRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", cerrarFuera);
    return () => document.removeEventListener("pointerdown", cerrarFuera);
  }, [open]);

  const elegir = (ciudad: string) => {
    setQuery(ciudad || "");
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "ArrowDown" && visibles.length) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, visibles.length - 1));
    } else if (event.key === "ArrowUp" && visibles.length) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && active >= 0 && active < visibles.length) {
      event.preventDefault();
      elegir(visibles[active]);
    }
  };

  return (
    <div className="relative min-w-48 flex-1" ref={boxRef}>
      <input
        type="search"
        name={name}
        className="input w-full"
        value={query}
        placeholder={allLabel}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && active >= 0 && active < visibles.length ? `${id}-option-${active}` : undefined}
        role="combobox"
        onFocus={() => {
          setOpen(true);
          setActive(-1);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div
          id={`${id}-list`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-60 overflow-y-auto rounded-xl border border-line bg-surface shadow-lg"
        >
          {visibles.map((ciudad, index) => (
            <button
              key={ciudad || "__todas__"}
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={query === ciudad}
              tabIndex={-1}
              className={`tap w-full justify-start px-3 text-left text-sm hover:bg-surface-2 ${
                index === active ? "bg-surface-2" : ""
              }`}
              onMouseEnter={() => setActive(index)}
              onClick={() => elegir(ciudad)}
            >
              {ciudad || allLabel}
            </button>
          ))}
          {!visibles.length && <p className="px-3 py-3 text-center text-sm text-muted">{noResults}</p>}
        </div>
      )}
    </div>
  );
}
