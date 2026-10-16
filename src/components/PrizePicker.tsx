"use client";

import { avisosDePremios, objetivoDe, OBJETIVO_BASE, type PremiosDeJuego } from "@/lib/premios";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   Premios de un juego: dos filas de 0 a 6 y una casilla de penalización.

   Pensado para rellenarse de pie, con una mano, entre ronda y ronda. Por eso:

   · **Botones y no un desplegable.** Un número del 0 al 6 son siete opciones;
     un desplegable obliga a abrir, buscar y cerrar. Siete botones de 44 px
     caben en una fila hasta en un móvil de 360.
   · **El 0 existe.** Se puede perder sin coger un solo premio, y «0» no es lo
     mismo que «no lo apunté»: volver a pulsar el número elegido lo borra.
   · **Todo opcional.** Si no se apunta, no pasa nada: el resto de la app
     trata el hueco como «no hay dato», no como cero.

   El aviso de abajo NO bloquea: enseña lo que chirría y deja guardar. En la
   mesa pasan cosas raras de verdad (deck-out, concesión) y el formulario no
   está para discutirle a nadie lo que vio.
   ========================================================================= */

type Props = {
  /** Prefijo de los campos: `g0`, `g1`… */
  campo: string;
  nombreA: string;
  nombreB: string;
  valor: { premiosA: number | null; premiosB: number | null; penalizadoA: boolean; penalizadoB: boolean };
  winner: string;
  disabled?: boolean;
  onChange: (parcial: Partial<Props["valor"]>) => void;
};

const NUMEROS = [0, 1, 2, 3, 4, 5, 6];

export function PrizePicker({ campo, nombreA, nombreB, valor, winner, disabled, onChange }: Props) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  const juego: PremiosDeJuego = { ...valor, winner };
  const avisos = avisosDePremios(juego, nombreA, nombreB);

  const fila = (lado: "a" | "b") => {
    const esA = lado === "a";
    const nombre = esA ? nombreA : nombreB;
    const actual = esA ? valor.premiosA : valor.premiosB;
    const penalizado = esA ? valor.penalizadoA : valor.penalizadoB;
    // El objetivo de este lado depende de si fue el OTRO quien se llevó la
    // penalización. Enseñarlo evita tener que recordar la regla.
    const objetivo = objetivoDe(esA ? valor.penalizadoB : valor.penalizadoA);

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[11px] text-muted" title={nombre}>{nombre}</span>
          {objetivo !== OBJETIVO_BASE && (
            <span className="text-[11px] text-brand tabular">gana con {objetivo}</span>
          )}
        </div>

        <div className="flex gap-1" role="group" aria-label={`Premios de ${nombre}`}>
          {NUMEROS.map((n) => {
            const puesto = actual === n;
            return (
              <button
                key={n}
                type="button"
                disabled={disabled}
                aria-pressed={puesto}
                // Volver a pulsar el elegido lo borra: es la forma de pasar de
                // «0 premios» a «no lo apunté» sin un botón extra.
                onClick={() => onChange({ [esA ? "premiosA" : "premiosB"]: puesto ? null : n })}
                data-on={puesto}
                className="min-h-11 flex-1 rounded-md border border-line text-sm tabular
                           data-[on=true]:border-brand data-[on=true]:bg-brand/15
                           data-[on=true]:font-semibold disabled:opacity-50"
              >
                {n}
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-[11px] text-muted">
          <input
            type="checkbox"
            name={`${campo}_penalty_${lado}`}
            checked={penalizado}
            disabled={disabled}
            onChange={(e) => onChange({ [esA ? "penalizadoA" : "penalizadoB"]: e.target.checked })}
            className="size-4"
          />
          <span>
            Penalización de 2 premios a {nombre}
            <span className="text-muted"> · {esA ? nombreB : nombreA} gana con 4</span>
          </span>
        </label>

        <input type="hidden" name={`${campo}_prizes_${lado}`} value={actual ?? ""} />
      </div>
    );
  };

  return (
    <div className="mt-2 rounded-md border border-line p-2">
      <p className="mb-1.5 text-xs text-muted">{tr(lng, "x.8be41a82")}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fila("a")}
        {fila("b")}
      </div>

      {avisos.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {avisos.map((a, i) => (
            <li key={i} className="text-[11px] text-loss">· {a.texto}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
