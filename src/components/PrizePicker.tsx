"use client";

import { avisosDePremios, objetivoDe, OBJETIVO_BASE, type PremiosDeJuego } from "@/lib/premios";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";
import { spriteUrl } from "@/lib/pokemon";
import { ObjetoSprite } from "@/components/ObjetoSprite";
import { ganarLogro } from "@/components/logroCliente";

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
  /** v0.63 — el color de perfil de cada uno: sus fundas van de ese color. */
  colorA?: string;
  colorB?: string;
  onChange: (parcial: Partial<Props["valor"]>) => void;
};

const NUMEROS = [0, 1, 2, 3, 4, 5, 6];

export function PrizePicker({ campo, nombreA, nombreB, valor, winner, disabled, colorA, colorB, onChange }: Props) {
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

        {/* v0.62 — LAS CARTAS DE PREMIO. Seis cartas boca abajo; tocar la tercera
            voltea las tres primeras, en cadena. Volver a tocar la misma la deja
            sin apuntar (como antes), y «0» es «no cogió ninguna».
            v0.63 — cada uno con SUS fundas, del color de su perfil, como en la
            mesa. Diseño propio (brillo de plástico y una estrella), no el dorso
            oficial de las cartas. Cogida, se ve boca arriba, dorada. */}
        <div className="premios-fila" data-lado={lado} role="group" aria-label={`Premios de ${nombre}`}>
          <button type="button" disabled={disabled} aria-pressed={actual === 0} data-on={actual === 0}
            onClick={() => onChange({ [esA ? "premiosA" : "premiosB"]: actual === 0 ? null : 0 })}
            className="premio-cero">0</button>
          {NUMEROS.filter((n) => n > 0).map((n) => {
            const tomada = actual != null && n <= actual;
            return (
              <button key={n} type="button" disabled={disabled} aria-pressed={actual === n}
                aria-label={`${n} premio${n === 1 ? "" : "s"}`}
                onClick={() => onChange({ [esA ? "premiosA" : "premiosB"]: actual === n ? null : n })}
                data-tomada={tomada} className="premio-carta" style={{ "--i": n } as React.CSSProperties}>
                <span className="premio-num">{tomada ? n : ""}</span>
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
            onChange={(e) => {
              onChange({ [esA ? "penalizadoA" : "penalizadoB"]: e.target.checked });
              if (e.target.checked) ganarLogro("psyduck"); // v0.65 — logro secreto
            }}
            className="size-4"
          />
          <span>
            Penalización de 2 premios a {nombre}
            <span className="text-muted"> · {esA ? nombreB : nombreA} gana con 4</span>
          </span>
        </label>

        {/* v0.62 — huevo de pascua: comerse una penalización de 2 premios duele. */}
        {penalizado && (
          <span className="penal-huevo" role="status">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={spriteUrl("psyduck")} alt="" className="penal-img" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <span>¡Dos premios fuera, {nombre}!</span>
          </span>
        )}

        <input type="hidden" name={`${campo}_prizes_${lado}`} value={actual ?? ""} />
      </div>
    );
  };

  return (
    <div className="premios-caja mt-2 rounded-xl border p-2.5"
      style={{ "--funda-a": colorA ?? "var(--info)", "--funda-b": colorB ?? "var(--loss)" } as React.CSSProperties}>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-2">
        <ObjetoSprite uso="premios" className="size-6" />
        {tr(lng, "x.8be41a82")}
      </p>
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
