/* =========================================================================
   ¿Esto es una ráfaga de clics?

   Sin imports, como el resto de módulos que se prueban.

   Lo usa el easter egg del cambio de tema: un clic suelto saca a Solrock o
   a Lunatone; machacar el botón hace que Tadbulb reviente. La regla de qué
   cuenta como «machacar» está aquí y no dentro del componente para poder
   probarla sin un navegador, que es donde estas cosas suelen fallar en
   silencio (un umbral mal puesto y el egg no sale nunca, o sale siempre).
   ========================================================================= */

export type OpcionesRafaga = {
  /** Cuántos clics hacen falta. */
  clics: number;
  /** En cuántos milisegundos. */
  ventanaMs: number;
};

/**
 * Cinco clics en dos segundos y medio.
 *
 * Elegido para que no salga por accidente: alguien que cambia de tema, no
 * le convence y vuelve se queda en dos o tres. Cinco seguidos ya es querer.
 *
 * Y se completa a dos cambios por segundo, por debajo de los tres a pantalla
 * completa que marcan el riesgo para personas con fotosensibilidad. Ojo con
 * lo que esto garantiza: el ritmo real lo marca quien pulsa, y cada clic
 * cambia TODA la pantalla de claro a oscuro, haya egg o no. Lo que sí
 * depende de aquí es no exigir pulsar más rápido para conseguir el premio.
 */
export const RAFAGA_POR_DEFECTO: OpcionesRafaga = { clics: 5, ventanaMs: 2500 };

/**
 * Apunta un clic y dice si con él se completa una ráfaga.
 *
 * Devuelve el historial ya podado (solo los clics que siguen dentro de la
 * ventana), para que quien llama no acumule marcas de tiempo para siempre.
 *
 * Al completarse una ráfaga **el historial se vacía**: si no, el sexto clic
 * volvería a contar como ráfaga, y el séptimo, y Tadbulb reventaría en cada
 * pulsación en vez de una vez por ráfaga.
 */
export function registrarClic(
  historial: readonly number[],
  ahora: number,
  opciones: OpcionesRafaga = RAFAGA_POR_DEFECTO,
): { historial: number[]; rafaga: boolean } {
  const desde = ahora - opciones.ventanaMs;
  const recientes = [...historial.filter((t) => t > desde), ahora];

  if (recientes.length >= opciones.clics) {
    return { historial: [], rafaga: true };
  }
  return { historial: recientes, rafaga: false };
}

/** El Pokémon que acompaña a cada tema. Día = Solrock; noche = Lunatone. */
export function pokemonDelTema(oscuro: boolean): "solrock" | "lunatone" {
  return oscuro ? "lunatone" : "solrock";
}
