/* =========================================================================
   Cartas: lo que se puede calcular sin red.

   Sin imports, a propósito: lo cargan los tests directamente y así se puede
   comprobar el trozo que de verdad se equivoca (deducir el set a partir del
   id, montar la línea de lista) sin montar un servidor ni llamar a nadie.

   El cliente HTTP vive en `src/lib/sources/tcgdex.ts` y usa esto.
   ========================================================================= */

export type Carta = {
  /** Id completo de TCGdex: `sv08-26`, `base4-1`, `xyp-XY99`. */
  id: string;
  name: string;
  /** Abreviatura oficial del set (`TWM`), o el id del set si no hay. */
  setCode: string;
  setName: string;
  /** Número dentro del set, tal cual lo imprime la carta: `26`, `XY99`. */
  number: string;
  rarity: string | null;
  images: { small: string | null; large: string | null };
};

/**
 * El id del set a partir del id de la carta.
 *
 * TCGdex forma el id de una carta como `<set>-<localId>`, y el truco está en
 * que **ninguno de los dos trozos es de fiar por separado**: hay sets con
 * guion en el id (`sv03.5`, pero también casos con guion) y hay localId con
 * letras y guiones (`XY99`, `SWSH284`). Partir por el primer guion o por el
 * último se equivoca en los dos sentidos.
 *
 * Lo que sí es cierto siempre es que el id acaba exactamente en
 * `-<localId>`, así que se recorta por la cola, que es información que la
 * propia respuesta trae.
 */
export function setIdDeCarta(id: string, localId: string): string {
  const sufijo = `-${localId}`;
  return id.endsWith(sufijo) ? id.slice(0, -sufijo.length) : id;
}

/**
 * La URL de la imagen.
 *
 * TCGdex devuelve la imagen **sin extensión** a propósito: eliges tú la
 * calidad y el formato pegándolos al final. Si la carta no tiene imagen
 * subida todavía, el campo no viene, y eso hay que respetarlo en vez de
 * inventar una URL que daría 404.
 */
export function urlDeImagen(
  base: string | null | undefined,
  calidad: "low" | "high" = "low",
  formato: "png" | "webp" = "png",
): string | null {
  const b = (base ?? "").trim();
  return b ? `${b}/${calidad}.${formato}` : null;
}

/**
 * La línea de decklist lista para pegar: `1 Dragapult ex TWM 130`.
 *
 * Sin set o sin número se queda en el nombre: una línea con el set a medias
 * no la acepta Pokémon TCG Live, y es mejor que el usuario vea que falta
 * algo a que pegue algo roto.
 */
export function lineaDeLista(c: Pick<Carta, "name" | "setCode" | "number">, cantidad = 1): string {
  const n = Math.max(1, Math.floor(cantidad));
  return c.setCode && c.number ? `${n} ${c.name} ${c.setCode} ${c.number}` : `${n} ${c.name}`;
}

/**
 * Normaliza lo que se teclea antes de mandarlo como filtro.
 *
 * No es saneado contra inyección —eso lo resuelve ir por querystring con
 * `URLSearchParams`, que escapa solo—, es quitar ruido: espacios de más y
 * largos absurdos. Los dos puntos sí se quitan porque TCGdex los usa como
 * prefijo de operador (`name=eq:x`, `name=not:x`) y escribirlos cambiaría el
 * significado del filtro.
 */
export function consultaLimpia(texto: string, maximo = 60): string {
  return texto.replace(/:/g, " ").replace(/\s+/g, " ").trim().slice(0, maximo);
}
