"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "./icons";
import { spriteUrl } from "@/lib/pokemon";

/* =========================================================================
   Las rondas de todo el grupo en un torneo, una debajo de otra.

   EL PROBLEMA
   -----------
   Catorce rondas por persona, por cinco personas, son setenta filas. Puestas
   del tirón no se lee ninguna. Pero tampoco vale enseñar solo el récord:
   media gracia de apuntar las rondas es luego mirar contra qué perdió cada
   uno y contra qué mazo.

   LA FORMA
   --------
   Cada jugador es un bloque que se abre y se cierra. **El tuyo sale primero y
   abierto**; los demás, cerrados, con el récord y el mazo en la cabecera, que
   es lo que se mira de reojo. Abres el de quien te interese y ves sus catorce
   rondas.

   Cerrado, el bloque ya dice lo suficiente para no tener que abrirlo: quién,
   qué mazo llevó, qué récord hizo y cuántos puntos. Abrirlo es para el
   detalle, no para lo básico.

   EL FORMULARIO VA DENTRO, Y AL FINAL
   -----------------------------------
   Apuntar la ronda 9 y mirar la 8 son la misma tarea, y tenerlas en pantallas
   distintas obliga a ir y volver entre rondas, de pie, con el móvil. Por eso
   el formulario de añadir entra como `formulario` y se pinta al final de tu
   propio bloque, justo debajo de tu última ronda.

   Entra como prop y no se escribe aquí a propósito: el formulario habla con
   una Server Action y esto es un componente de cliente. Así este fichero no
   sabe nada de la base de datos y se puede mover de sitio sin arrastrar nada.
   ========================================================================= */

export type RondaDetalle = {
  round: number;
  /** Nombre del rival tal y como se apuntó. Puede ser un mote. */
  rival: string;
  /** Qué llevaba el rival. Vacío si no se apuntó. */
  mazoRival?: string;
  /** Sprites del mazo del rival, si se conocen. */
  main?: string;
  secondary?: string;
  /** Juegos ganados y perdidos dentro de la serie. */
  ganados: number;
  perdidos: number;
  /** "a" si saliste primero, "b" si salió el rival, vacío si no se apuntó. */
  primero?: "a" | "b" | "";
  nota?: string;
  /** Enlace o acción para corregir la ronda. */
  editar?: ReactNode;
};

export type JugadorRondas = {
  id: string;
  name: string;
  /** El mazo con el que jugó el torneo, si lo llevó el mismo todo el rato. */
  mazo?: string;
  main?: string;
  secondary?: string;
  wins: number;
  losses: number;
  ties: number;
  puntos: number;
  /** Puesto final, si el torneo ya cerró. */
  placement?: number | null;
  rondas: RondaDetalle[];
};

type Props = {
  jugadores: JugadorRondas[];
  /** Quién eres tú: tu bloque sale primero y abierto. */
  yoId: string;
  /** Rondas de la fase uno, para marcar cuáles son de Día 2. */
  fase1: number;
  /** Rondas totales del torneo, para decir «te faltan N por apuntar». */
  total: number;
  /** El formulario de añadir ronda. Se pinta al final de tu bloque. */
  formulario?: ReactNode;
};

export function RondasDelGrupo({
  jugadores,
  yoId,
  fase1,
  total,
  formulario,
}: Props) {
  // Tú primero; el resto por puntos, que es el orden en el que se mira.
  const orden = [...jugadores].sort(
    (a, b) =>
      (a.id === yoId ? -1 : b.id === yoId ? 1 : 0) ||
      b.puntos - a.puntos ||
      a.name.localeCompare(b.name, "es"),
  );

  const [abiertos, setAbiertos] = useState<Set<string>>(new Set([yoId]));
  const alternar = (id: string) =>
    setAbiertos((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });

  const todosAbiertos = abiertos.size === orden.length;

  if (!orden.length) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted">
        Nadie del grupo tiene rondas apuntadas en este torneo todavía.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="text-xs text-muted tabular">
          {orden.reduce((a, j) => a + j.rondas.length, 0)} rondas apuntadas
        </p>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() =>
            setAbiertos(
              todosAbiertos ? new Set([yoId]) : new Set(orden.map((j) => j.id)),
            )
          }
        >
          {todosAbiertos ? "Plegar todo" : "Abrir todo"}
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {orden.map((j) => {
          const abierto = abiertos.has(j.id);
          const yo = j.id === yoId;
          const faltan = total - j.rondas.length;
          return (
            <li
              key={j.id}
              className={`overflow-hidden rounded-xl border ${yo ? "border-brand-line" : "border-line"}`}
            >
              <button
                type="button"
                onClick={() => alternar(j.id)}
                aria-expanded={abierto}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors
                  ${yo ? "bg-brand-soft" : "bg-surface hover:bg-surface-2"}`}
              >
                <Icon
                  name={abierto ? "back" : "more"}
                  className={`size-4 flex-none text-muted transition-transform ${abierto ? "-rotate-90" : ""}`}
                />

                {j.main && (
                  <span
                    className="flex flex-none items-center"
                    aria-hidden="true"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={spriteUrl(j.main)}
                      alt=""
                      loading="lazy"
                      className="size-7 object-contain"
                    />
                    {j.secondary && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={spriteUrl(j.secondary)}
                        alt=""
                        loading="lazy"
                        className="-ml-2 size-5 object-contain"
                      />
                    )}
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold">{j.name}</span>
                    {yo && (
                      <span className="chip chip-brand flex-none text-[10px]">
                        tú
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {j.mazo || "Mazo sin anotar"}
                    {j.placement != null && ` · ${j.placement}.º`}
                  </span>
                </span>

                <span className="flex-none text-right">
                  <span className="block font-display text-base font-extrabold tabular">
                    {j.wins}–{j.losses}
                    {j.ties > 0 ? `–${j.ties}` : ""}
                  </span>
                  <span className="block text-[10px] text-muted tabular">
                    {j.puntos} pts
                  </span>
                </span>
              </button>

              {abierto && (
                <div className="border-t border-line-soft">
                  {j.rondas.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted">
                      Sin rondas apuntadas.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line-soft">
                      {[...j.rondas]
                        .sort((a, b) => a.round - b.round)
                        .map((r) => (
                          <Ronda key={r.round} r={r} fase1={fase1} />
                        ))}
                    </ul>
                  )}

                  {yo && (
                    <div className="border-t border-line-soft bg-surface-2 p-3">
                      {faltan > 0 && (
                        <p className="mb-2 text-xs text-muted">
                          Te faltan <b className="tabular">{faltan}</b> ronda
                          {faltan === 1 ? "" : "s"} por apuntar de las {total}.
                        </p>
                      )}
                      {formulario}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Una ronda. El resultado a la derecha y en grande, que es lo que se busca. */
function Ronda({ r, fase1 }: { r: RondaDetalle; fase1: number }) {
  const gano = r.ganados > r.perdidos;
  const empate = r.ganados === r.perdidos;
  const dia2 = r.round > fase1;

  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <span className="w-10 flex-none text-center">
        <span
          className={`block rounded px-1 py-0.5 font-mono text-[11px] font-bold
          ${gano ? "bg-win-soft text-win" : empate ? "bg-tie-soft text-tie" : "bg-loss-soft text-loss"}`}
        >
          R{r.round}
        </span>
        {dia2 && (
          <span className="mt-0.5 block text-[9px] font-bold uppercase text-brand">
            Día 2
          </span>
        )}
      </span>

      {r.main && (
        <span className="mt-0.5 flex flex-none items-center" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={spriteUrl(r.main)}
            alt=""
            loading="lazy"
            className="size-6 object-contain"
          />
          {r.secondary && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={spriteUrl(r.secondary)}
              alt=""
              loading="lazy"
              className="-ml-1.5 size-4 object-contain"
            />
          )}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{r.rival}</span>
        <span className="block truncate text-[11px] text-muted">
          {r.mazoRival || "Mazo sin anotar"}
        </span>
        {r.nota && (
          <span className="mt-0.5 block text-[11px] text-ink-2">{r.nota}</span>
        )}
      </span>

      <span className="flex-none text-right">
        <span
          className={`block font-display text-base font-extrabold tabular
          ${gano ? "text-win" : empate ? "text-tie" : "text-loss"}`}
        >
          {r.ganados}–{r.perdidos}
        </span>
        {r.primero && (
          <span className="block text-[10px] text-muted">
            salí {r.primero === "a" ? "1.º" : "2.º"}
          </span>
        )}
      </span>

      {r.editar && (
        <span className="ml-1 flex-none self-center">{r.editar}</span>
      )}
    </li>
  );
}
