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

   v0.13 — ABSORBE «RESULTADOS DEL GRUPO»
   --------------------------------------
   La lista de resultados de debajo repetía a las mismas personas con otros
   datos. Ahora la cabecera plegada de cada uno lleva todo lo que tenía:
   **puesto (de N), récord V–D–E, mazo con sprites, nombre con avatar, CP y
   el comentario del resultado final**. Premios, retirada, invitación y el
   botón de borrar el resultado van dentro, al abrir el bloque.

   Las etiquetas de fase de cada ronda (Día 2, Cuartos…) llegan ya calculadas
   en `etapa`: las decide `etapaDeRonda()` en el servidor con el tipo de
   torneo, porque el Día 2 solo existe en Regionales y aquí no se sabe el tipo.
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
  /** v0.15.1 — avatar del rival cuando es alguien del grupo. */
  rivalAvatar?: ReactNode;
  /**
   * Etiqueta de fase ya calculada: «Día 2» (solo Regionales), «Cuartos»,
   * «Semifinal», «Final»… Vacía en las rondas de suizo normales.
   */
  etapa?: string | null;
  /** true si la etapa es de eliminatoria, para pintarla con otro color. */
  corte?: boolean;
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
  /** Rondas apuntadas en total, antes de filtrar por fase. */
  apuntadas?: number;
  /** Puesto final, si el torneo ya cerró. */
  placement?: number | null;
  rondas: RondaDetalle[];
  /** Avatar ya pintado en el servidor, para no traer `ui.tsx` al cliente. */
  avatar?: ReactNode;
  /** CP efectivos del puesto. 0 o ausente = no se pinta el chip. */
  cp?: number;
  /** El CP se puso a mano: lleva asterisco. */
  cpManual?: boolean;
  /** Comentario del resultado final («Sensación rareta…»). */
  comentario?: string;
  /** Chips del resultado: premios, se retiró, invitación al Mundial. */
  premios?: string;
  retirado?: boolean;
  invitacion?: boolean;
  /** Acciones sobre el resultado final (borrar). Se pintan al abrir. */
  acciones?: ReactNode;
};

type Props = {
  jugadores: JugadorRondas[];
  /** Quién eres tú: tu bloque sale primero y abierto. */
  yoId: string;
  /** Rondas totales del suizo, para decir «te faltan N por apuntar». */
  total: number;
  /** Asistencia, para el «de 3.342» debajo del puesto. */
  asistencia?: number | null;
  /** Si las rondas vienen filtradas por fase, qué se está enseñando. */
  filtro?: string | null;
  /** El formulario de añadir ronda. Se pinta al final de tu bloque. */
  formulario?: ReactNode;
};

export function RondasDelGrupo({
  jugadores,
  yoId,
  total,
  asistencia,
  filtro,
  formulario,
}: Props) {
  /* Tú primero; el resto por puesto final si lo hay —es lo que ordenaba la
     lista de resultados que esto sustituye— y, sin puesto, por puntos. */
  const orden = [...jugadores].sort(
    (a, b) =>
      (a.id === yoId ? -1 : b.id === yoId ? 1 : 0) ||
      (a.placement ?? 9e9) - (b.placement ?? 9e9) ||
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
        {/* v0.14: el bloque se llama como la lista que sustituye. Cada
            desplegable es el resultado de una persona, con sus rondas dentro. */}
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold">Resultados del grupo</h2>
          <p className="text-xs text-muted tabular">
            {orden.length} {orden.length === 1 ? "jugador" : "jugadores"} ·{" "}
            {orden.reduce((a, j) => a + (j.apuntadas ?? j.rondas.length), 0)} rondas apuntadas
            {filtro ? ` · ${filtro}` : ""}
          </p>
        </div>
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
          const faltan = total - (j.apuntadas ?? j.rondas.length);
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

                {/* Puesto final, con la asistencia debajo: «410 de 3342». En una fase concreta no se muestra puesto. */}
                {!filtro && (
                  <span className="w-10 flex-none text-center">
                    <span className="block font-display text-lg font-extrabold tabular leading-none">
                      {j.placement ?? "—"}
                    </span>
                    {j.placement != null && asistencia ? (
                      <span className="block text-[10px] text-muted tabular">
                        de {asistencia}
                      </span>
                    ) : null}
                  </span>
                )}

                <span className="flex w-12 flex-none items-center justify-center" aria-hidden="true">
                  {j.main ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={spriteUrl(j.main)} alt="" loading="lazy" className="size-8 object-contain" />
                      {j.secondary && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={spriteUrl(j.secondary)} alt="" loading="lazy" className="-ml-3 size-7 object-contain" />
                      )}
                    </>
                  ) : (
                    <span className="size-7 rounded-md border border-dashed border-line" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    {j.avatar}
                    <span className="truncate text-sm font-bold">{j.name}</span>
                    {yo && (
                      <span className="chip chip-brand flex-none text-[10px]">
                        tú
                      </span>
                    )}
                    {/* v0.15: el drop se ve sin abrir el bloque. */}
                    {j.retirado && (
                      <span className="chip chip-drop flex-none text-[10px]" title="No acabó el torneo">
                        DROP
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {j.mazo || "Mazo sin anotar"}
                  </span>
                  {j.comentario && (
                    <span className="mt-0.5 block truncate text-[11px] italic text-ink-2">
                      «{j.comentario}»
                    </span>
                  )}
                </span>

                <span className="flex flex-none flex-col items-end gap-1">
                  {/* V–D–E, en ese orden y con sus colores, como en toda la app. */}
                  <span className="font-display text-base font-extrabold tabular leading-none">
                    <span className="text-win">{j.wins}</span>–<span className="text-loss">{j.losses}</span>–<span className="text-tie">{j.ties}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted tabular">{j.puntos} pts</span>
                    {j.cp ? (
                      <span className="chip chip-brand text-[10px] tabular">
                        {j.cp} CP{j.cpManual ? "*" : ""}
                      </span>
                    ) : null}
                  </span>
                  {j.premios && (
                    <span className="chip max-w-[9rem] truncate text-[10px]" title={j.premios}>
                      {j.premios}
                    </span>
                  )}
                </span>
              </button>

              {abierto && (
                <div className="border-t border-line-soft">
                  {(j.comentario || j.retirado || j.invitacion || j.acciones) && (
                    <div className="flex flex-col gap-2 border-b border-line-soft bg-surface px-3 py-2.5">
                      {j.comentario && (
                        <p className="text-sm text-ink-2">{j.comentario}</p>
                      )}
                      {(j.retirado || j.invitacion) && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {j.invitacion && <span className="chip chip-brand">Invitación al Mundial</span>}
                          {j.retirado && <span className="chip chip-drop">DROP · no acabó el torneo</span>}
                        </div>
                      )}
                      {j.acciones}
                    </div>
                  )}
                  {j.rondas.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted">
                      {filtro && (j.apuntadas ?? 0) > 0
                        ? "Ninguna ronda en esta fase."
                        : "Sin rondas apuntadas."}
                    </p>
                  ) : (
                    <ul className="divide-y divide-line-soft">
                      {[...j.rondas]
                        .sort((a, b) => a.round - b.round)
                        .map((r) => (
                          <Ronda key={r.round} r={r} />
                        ))}
                    </ul>
                  )}

                  {yo && formulario && (
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
function Ronda({ r }: { r: RondaDetalle }) {
  const gano = r.ganados > r.perdidos;
  const empate = r.ganados === r.perdidos;

  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <span className="w-10 flex-none text-center">
        <span
          className={`block rounded px-1 py-0.5 font-mono text-[11px] font-bold
          ${gano ? "bg-win-soft text-win" : empate ? "bg-tie-soft text-tie" : "bg-loss-soft text-loss"}`}
        >
          R{r.round}
        </span>
        {r.etapa && (
          <span className={`mt-0.5 block text-[9px] font-bold uppercase ${r.corte ? "text-info" : "text-brand"}`}>
            {r.etapa}
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
        <span className="flex min-w-0 items-center gap-1.5">
          {r.rivalAvatar}
          <span className="truncate text-sm font-semibold">{r.rival}</span>
        </span>
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
