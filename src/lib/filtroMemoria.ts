/* =========================================================================
   v0.25 — Qué hace la memoria de filtros en cada navegación.

   EL FALLO DE LA v0.21–v0.24: los enlaces que vuelven al estado por defecto
   («Vista detallada», la pestaña «Jugadores de la app») apuntan a la URL sin
   parámetros. La memoria lo tomaba por «acabas de entrar» y restauraba lo
   guardado (agrupar=1, fuente=regionales): te devolvía a donde estabas y
   parecía que el enlace no hacía nada.

   Regla nueva: solo se restaura al ENTRAR desde otra pantalla. Dentro de la
   misma pantalla, una URL sin filtros es una elección («quiero el estado por
   defecto») y se guarda como tal: se borra lo recordado.

   Sin imports: lo cargan los tests.
   ========================================================================= */

export type AccionMemoria = "guardar" | "restaurar" | "borrar" | "limpiar" | "nada";

export function decidirMemoria(e: {
  /** ¿Venimos de otra ruta (o es la primera carga)? */
  entrando: boolean;
  /** Los filtros de la URL actual, ya sin los parámetros que no se guardan. */
  qs: string;
  /** Lo guardado para esta pantalla, o null. */
  guardado: string | null;
  /** `?limpiar=1` en la URL. */
  limpiar: boolean;
}): AccionMemoria {
  if (e.limpiar) return "limpiar";
  if (e.qs) return "guardar";
  if (e.entrando) return e.guardado ? "restaurar" : "nada";
  return e.guardado ? "borrar" : "nada";
}
