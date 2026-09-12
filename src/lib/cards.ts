/* =========================================================================
   Imágenes de carta.

   Las listas ya se guardan interpretadas (`decks.listJson`), y cada carta
   lleva la abreviatura del set y el número: "Dragapult ex TWM 130". Con eso se
   puede construir la URL de la imagen directamente, sin llamar a ninguna API
   ni guardar nada: el CDN de Limitless las sirve con un nombre predecible.

     https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/TWM/TWM_130_R_EN.png

   El número va con tres cifras. Un sufijo de letra ("13a") se conserva detrás
   del relleno. Si una carta no tiene set o número —una lista escrita a mano,
   por ejemplo— no hay imagen y la fila se enseña como texto.

   Esto es un patrón de URL de un tercero, no un contrato: puede cambiar. Por
   eso el componente que las pinta cae al texto cuando la imagen no carga, y
   por eso el patrón está en una sola constante aquí.
   ========================================================================= */

import type { Card } from "./decklist";

const CDN = "https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci";

/** "13a" → "013a" · "7" → "007" · "130" → "130" */
function padNumber(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,3})([a-zA-Z]?)$/);
  if (!m) return null;
  return m[1].padStart(3, "0") + m[2];
}

/**
 * URL de la imagen de una carta, o null si no hay datos suficientes.
 * `size` "xs" pide la miniatura, que es lo que se usa en una cuadrícula de 60.
 */
export function cardImageUrl(card: Pick<Card, "set" | "number">, size: "full" | "xs" = "full"): string | null {
  const set = (card.set || "").trim().toUpperCase();
  const num = padNumber(card.number || "");
  if (!set || !num) return null;
  if (!/^[A-Z]{2,5}$|^PR-[A-Z]{2,4}$/.test(set)) return null;
  const suffix = size === "xs" ? "_XS" : "";
  return `${CDN}/${set}/${set}_${num}_R_EN${suffix}.png`;
}

/** Texto de una línea de lista: "3 Dragapult ex TWM 130". */
export function cardLine(card: Card): string {
  const tail = card.set && card.number ? ` ${card.set} ${card.number}` : "";
  return `${card.n} ${card.name}${tail}`;
}
