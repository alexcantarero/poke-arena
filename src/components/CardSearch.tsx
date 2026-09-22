"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

/* =========================================================================
   Buscar una carta mientras se escribe la lista.

   El problema real: para escribir una línea de decklist hacen falta tres
   datos —el nombre exacto, la abreviatura del set y el número— y de esos
   tres normalmente solo te acuerdas del primero. Esto te da los otros dos.

   Decisiones que no son obvias:

   · **Espera 400 ms a que dejes de teclear.** Sin clave, pokemontcg.io deja
     30 peticiones por minuto: una por tecla se las gasta escribiendo
     "charizard".
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
          placeholder="Nombre de la carta: dragapult, iono, gardevoir…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar una carta por nombre"
        />
        {estado === "buscando" && (
          <span className="absolute inset-y-0 right-3 grid place-items-center">
            <i className="spinner size-4" aria-hidden="true" />
          </span>
        )}
      </div>

      {estado === "vacio" && (
        <p className="text-sm text-muted">
          Ninguna carta se llama así. Prueba con menos letras: la búsqueda es por nombre exacto
          y en inglés.
        </p>
      )}

      {estado === "caida" && (
        <p className="text-sm text-muted">
          El catálogo de cartas no responde ahora mismo. Puedes seguir escribiendo la lista a
          mano: esto solo es una ayuda para no tener que buscar el set y el número fuera.
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
                    sin imagen
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
                  {copiada === c.id ? "copiada" : "copiar línea"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-muted">
        Los datos salen de pokemontcg.io. Es gratis y sin clave, con un límite de peticiones al
        día, así que la búsqueda espera a que dejes de escribir. Copia la línea y pégala en la
        lista de arriba.
      </p>
    </div>
  );
}
