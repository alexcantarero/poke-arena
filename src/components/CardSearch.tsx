"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   Buscar una carta mientras se escribe la lista.

   El problema real: para escribir una línea de decklist hacen falta tres
   datos —el nombre exacto, la abreviatura del set y el número— y de esos
   tres normalmente solo te acuerdas del primero. Esto te da los otros dos.

   Decisiones que no son obvias:

   · **Espera 400 ms a que dejes de teclear.** TCGdex no publica un límite
     duro, pero pide moderación, y una petición por cada tecla no lo es:
     escribir "charizard" serían nueve búsquedas para una sola intención.
   · **Cancela la petición anterior.** Si escribes rápido, la respuesta de
     "dra" puede llegar después de la de "dragapult" y pisarla. Con
     `AbortController` no hay carrera que perder.
   · **Copia la línea ya formateada**, no el nombre. Lo que hace falta pegar
     es "1 Dragapult ex TWM 130", y montarla a mano es justo el paso donde se
     cuelan las erratas que luego dejan la carta sin imagen.
   · **Si la API no está, esto desaparece.** No hay mensaje de error rojo:
     es una ayuda, y una ayuda que no está no es un fallo.
   ========================================================================= */

type Card = {
  id: string;
  name: string;
  setCode: string;
  setName: string;
  number: string;
  rarity: string | null;
  images: { small: string | null; large: string | null };
};

/** La línea tal y como va en una decklist. Sin set no hay cifra que poner. */
function lineFor(c: Card) {
  return c.setCode && c.number ? `1 ${c.name} ${c.setCode} ${c.number}` : `1 ${c.name}`;
}

export function CardSearch() {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const [q, setQ] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [estado, setEstado] = useState<"quieto" | "buscando" | "vacio" | "caida">("quieto");
  const [copiada, setCopiada] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 3) {
      setCards([]);
      setEstado("quieto");
      return;
    }

    const t = setTimeout(() => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setEstado("buscando");

      fetch(`/api/cards?q=${encodeURIComponent(texto)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((json: { cards?: Card[]; available?: boolean }) => {
          const lista = json.cards ?? [];
          setCards(lista);
          setEstado(lista.length ? "quieto" : json.available === false ? "caida" : "vacio");
        })
        .catch((e) => {
          // Abortar es lo normal aquí: pasa cada vez que se escribe otra
          // letra. Solo es un fallo de verdad si no es un abort.
          if ((e as Error)?.name !== "AbortError") setEstado("caida");
        });
    }, 400);

    // Al desmontar (o al teclear otra letra) se cancelan las dos cosas: el
    // temporizador que aún no ha disparado y la petición que ya va en camino.
    return () => {
      clearTimeout(t);
      abort.current?.abort();
    };
  }, [q]);

  const copiar = async (c: Card) => {
    try {
      await navigator.clipboard.writeText(lineFor(c));
      setCopiada(c.id);
      setTimeout(() => setCopiada(null), 1600);
    } catch {
      // Sin permiso de portapapeles —pasa en algún navegador en http— no se
      // puede copiar, pero la línea sigue estando a la vista para teclearla.
      setCopiada(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted">
          <Icon name="search" className="size-4" />
        </span>
        <input
          type="search"
          className="input pl-9"
          placeholder={tr(lng, "x.6056fb28")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={tr(lng, "x.20692cec")}
        />
        {estado === "buscando" && (
          <span className="absolute inset-y-0 right-3 grid place-items-center">
            <i className="spinner size-4" aria-hidden="true" />
          </span>
        )}
      </div>

      {estado === "vacio" && (
        <p className="text-sm text-muted">
          {tr(lng, "x.c9aa4e9e")}
        </p>
      )}

      {estado === "caida" && (
        <p className="text-sm text-muted">
          {tr(lng, "x.0fef27ec")}
        </p>
      )}

      {cards.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => copiar(c)}
                title={`Copiar «${lineFor(c)}»`}
                className="card-link card w-full overflow-hidden p-2 text-left"
              >
                {c.images.small ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.images.small} alt={c.name} loading="lazy"
                    className="mb-2 w-full rounded-md"
                  />
                ) : (
                  <span className="mb-2 grid aspect-[63/88] w-full place-items-center rounded-md bg-surface-2 text-xs text-muted">
                    {tr(lng, "x.be8e5ec6")}
                  </span>
                )}
                <span className="block truncate text-[13px] font-semibold">{c.name}</span>
                <span className="block truncate text-[11px] text-muted">
                  {c.setCode || c.setName} {c.number}
                  {c.rarity ? ` · ${c.rarity}` : ""}
                </span>
                <span
                  className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold ${
                    copiada === c.id ? "text-win" : "text-info"
                  }`}
                >
                  <Icon name={copiada === c.id ? "check" : "share"} className="size-3" />
                  {copiada === c.id ? "copiada" : tr(lng, "x.9d3175f8")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-muted">
        {tr(lng, "x.8e5b3d8a")}
      </p>
    </div>
  );
}
