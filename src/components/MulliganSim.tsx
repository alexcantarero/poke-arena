"use client";

import { useMemo, useState } from "react";
import { parseDeckList, type Card, type ParsedDeck } from "@/lib/decklist";
import {
  cardKey, deckSizeOf, estimateBasics, expectedMulligans, looksBasic,
  mulliganChance, probAtLeastOne, simulateHands, type SimResult,
} from "@/lib/mulligan";
import { cardImageUrl, cardLine } from "@/lib/cards";

/* =========================================================================
   Probar el mazo sin sacarlo de la funda.

   Contesta las dos preguntas que se hace cualquiera antes de un torneo:
   «¿cuántas veces me quedo sin básico?» y «¿cuántas veces abro con esta
   carta?».

   Las dos tienen respuesta **exacta**, con una fórmula, y así se dan: simular
   para contestar algo que se puede calcular sería cambiar una respuesta
   buena por una aproximada. La simulación está para otra cosa — ver manos de
   verdad, una detrás de otra, que es como se le coge el pulso a un mazo.

   Lo que la lista NO dice
   ----------------------
   Una decklist pegada no marca qué Pokémon son Básicos. Se estima con una
   heurística y **se deja corregir a mano**, porque quien juega el mazo lo
   sabe y este código no. El número de básicos es lo único de lo que depende
   el porcentaje de mulligan, así que decirlo mal sería dar una cifra con
   pinta de exacta y equivocada.
   ========================================================================= */

const TIRADAS = [100, 1000, 10000];

export function MulliganSim({ list, listJson }: { list: string; listJson?: unknown }) {
  const deck = useMemo<ParsedDeck>(() => {
    const j = listJson as ParsedDeck | null | undefined;
    if (j && Array.isArray(j.pokemon)) return j;
    return parseDeckList(list);
  }, [list, listJson]);

  const size = deckSizeOf(deck) || 60;
  const estimado = useMemo(() => estimateBasics(deck), [deck]);

  const [basics, setBasics] = useState(estimado);
  const [sim, setSim] = useState<SimResult | null>(null);
  const [historial, setHistorial] = useState<Array<{ hands: number; rate: number }>>([]);
  const [carta, setCarta] = useState("");
  const [corriendo, setCorriendo] = useState(false);

  const todas = useMemo(
    () => [...deck.pokemon, ...deck.trainer, ...deck.energy],
    [deck],
  );

  const exacto = mulliganChance(basics, size);
  const seguidos = expectedMulligans(exacto);

  const elegida = todas.find((c) => cardKey(c) === carta);
  const pApertura = elegida ? probAtLeastOne(elegida.n, size) : null;

  /* Qué carta cuenta como básica en la simulación.

     El porcentaje exacto de arriba solo necesita el NÚMERO de básicos, pero
     para robar manos de verdad hay que decidir cuáles son. Se cogen primero
     las que la heurística da por básicas y, si la persona ha subido el número
     por encima de lo estimado, se siguen cogiendo líneas de Pokémon hasta
     llegar. Al revés —si lo ha bajado— se cogen menos.

     Es una aproximación, y no pasa nada: lo que se mira en las manos robadas
     es la pinta que tienen, y el número fino ya lo da la fórmula. */
  const esBasico = useMemo(() => {
    const orden = [...deck.pokemon].sort(
      (a, b) => Number(looksBasic(b, "pokemon")) - Number(looksBasic(a, "pokemon")),
    );
    const marcadas = new Set<string>();
    let quedan = basics;
    for (const c of orden) {
      if (quedan <= 0) break;
      marcadas.add(cardKey(c));
      quedan -= c.n;
    }
    return (c: Card) => marcadas.has(cardKey(c));
  }, [deck, basics]);

  const tirar = (n: number) => {
    setCorriendo(true);
    // Un respiro para que el navegador pinte el «calculando»: 10.000 manos de
    // 60 cartas son unos cuantos millones de operaciones y bloquean el hilo.
    setTimeout(() => {
      const r = simulateHands(deck, n, esBasico);
      setSim(r);
      setHistorial((h) => [{ hands: r.hands, rate: r.mulliganRate }, ...h].slice(0, 8));
      setCorriendo(false);
    }, 20);
  };

  if (!list.trim()) {
    return (
      <p className="text-sm text-muted">
        Este mazo no tiene la lista guardada, así que no hay nada que simular. Pega las 60
        cartas al editarlo y vuelve.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ---------------------------- el número ---------------------------- */}
      <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <div className="rounded-xl border border-line-soft bg-ground p-4 text-center">
          <p className="label">Mulligan</p>
          <p className="font-display text-4xl font-extrabold tabular leading-none">
            {(exacto * 100).toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-muted">
            {exacto > 0 && Number.isFinite(seguidos)
              ? `uno de cada ${Math.round(1 / exacto)} manos`
              : "nunca"}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="basics">Pokémon Básicos del mazo</label>
          <div className="flex items-center gap-2">
            <input
              id="basics" type="range" min={0} max={Math.min(30, size)} step={1}
              value={basics} onChange={(e) => setBasics(Number(e.target.value))}
              className="min-w-0 flex-1 accent-brand"
            />
            <input
              type="number" min={0} max={size} inputMode="numeric"
              className="input w-20 flex-none px-2 text-center tabular"
              value={basics} onChange={(e) => setBasics(Math.max(0, Math.min(size, Number(e.target.value) || 0)))}
              aria-label="Número de básicos"
            />
          </div>
          <p className="text-xs text-muted">
            Estimados {estimado} de {size} cartas. La lista no dice qué Pokémon son básicos,
            así que es una suposición: <b>ajústala</b>, que el porcentaje depende solo de esto.
          </p>
        </div>
      </div>

      {/* ------------------------ abrir con una carta ---------------------- */}
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="carta">¿Cuántas veces abro con…?</label>
        <select
          id="carta" className="input" value={carta} onChange={(e) => setCarta(e.target.value)}
        >
          <option value="">— elige una carta —</option>
          {todas.map((c) => (
            <option key={cardKey(c)} value={cardKey(c)}>{c.n}× {c.name}</option>
          ))}
        </select>
        {elegida && pApertura != null && (
          <p className="text-sm text-ink-2">
            Con {elegida.n} copia{elegida.n === 1 ? "" : "s"} en {size} cartas, la abres en el{" "}
            <b className="font-display text-lg tabular">{(pApertura * 100).toFixed(1)}%</b> de
            las manos.
          </p>
        )}
      </div>

      {/* ------------------------------ tiradas ---------------------------- */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="label flex-none">Robar manos</span>
          {TIRADAS.map((n) => (
            <button
              key={n} type="button" className="btn btn-sm" disabled={corriendo}
              onClick={() => tirar(n)}
            >
              {n.toLocaleString("es")}
            </button>
          ))}
          {corriendo && <span className="text-xs text-muted">calculando…</span>}
        </div>

        {sim && (
          <div className="mt-3 rounded-xl border border-line-soft bg-ground p-3">
            <p className="text-sm">
              De <b className="tabular">{sim.hands.toLocaleString("es")}</b> manos,{" "}
              <b className="tabular">{sim.mulligans.toLocaleString("es")}</b> mulligans —{" "}
              <b className="tabular">{(sim.mulliganRate * 100).toFixed(1)}%</b>.
              <span className="text-muted"> La fórmula dice {(sim.exactRate * 100).toFixed(1)}%.</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              Media de {sim.avgBasics.toFixed(2)} básicos por mano. Cuantas más manos tires,
              más se acerca lo observado a la fórmula: si con diez mil no se parecen, es que el
              número de básicos de arriba no cuadra con lo que has marcado.
            </p>

            <p className="label mt-3 mb-1.5">La última mano</p>
            <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
              {sim.lastHand.map((c, i) => <Mini key={`${cardKey(c)}-${i}`} card={c} />)}
            </ul>
          </div>
        )}

        {historial.length > 1 && (
          <p className="mt-2 text-xs text-muted">
            Tiradas de esta sesión:{" "}
            {historial.map((h, i) => (
              <span key={i} className="tabular">
                {i > 0 ? " · " : ""}{(h.rate * 100).toFixed(1)}% ({h.hands.toLocaleString("es")})
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}

/** Una carta de la mano, pequeña, con su imagen si la hay. */
function Mini({ card }: { card: Card }) {
  const [roto, setRoto] = useState(false);
  const url = cardImageUrl(card);

  if (!url || roto) {
    return (
      <li className="grid aspect-[63/88] place-items-center rounded-md border border-line-soft bg-surface p-1 text-center">
        <span className="text-[9px] leading-tight text-ink-2">{cardLine(card)}</span>
      </li>
    );
  }
  return (
    <li>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url} alt={card.name} title={cardLine(card)} loading="lazy"
        className="w-full rounded-md" onError={() => setRoto(true)}
      />
    </li>
  );
}
