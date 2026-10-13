/* =========================================================================
   Premios de cada juego: objetivo, validación y margen.

   Sin imports, como el resto de módulos que se prueban.

   LA REGLA, QUE NO ES LA QUE PARECE
   ---------------------------------
   Una penalización de premios **no le da premios a nadie**. Las Penalty
   Guidelines de Play! Pokémon dicen que, tras una Double Prize Card, al
   rival del infractor se le informa de que para ganar esa partida tiene que
   tomar dos premios MENOS de los que normalmente necesitaría. Las Floor
   Rules lo recalcan: el número de premios restantes no baja, lo que baja es
   el número de premios que hay que tomar para ganar.

   O sea: el penalizado no regala dos premios; su rival pasa de necesitar 6
   a necesitar 4. El ganador sale el mismo, pero el MARGEN no: apuntar
   «+2 a los ya cogidos» guardaría un marcador que nunca ocurrió.

   Por eso aquí se guardan hechos en crudo —cuántos premios cogió cada uno y
   quién recibió penalización— y el objetivo se deriva. Si la regla cambia
   otra vez, se cambia `objetivoDe()` y todo lo demás se recalcula solo; los
   datos ya guardados siguen siendo válidos porque no llevan la regla dentro.
   ========================================================================= */

/** Premios que hay que tomar para ganar, sin penalizaciones de por medio. */
export const OBJETIVO_BASE = 6;

/** Lo que resta una penalización al objetivo del rival del infractor. */
export const DESCUENTO_PENALIZACION = 2;

export type PremiosDeJuego = {
  /** Premios que cogió A. `null` = no se apuntó. */
  premiosA: number | null;
  premiosB: number | null;
  /** ¿Recibió A una penalización de premios? (la sufre A, beneficia a B) */
  penalizadoA: boolean;
  penalizadoB: boolean;
  /** Quién ganó el juego: "a" · "b" · "" (sin decidir). */
  winner: string;
};

/**
 * Cuántos premios necesita este lado para ganar.
 *
 * Depende de si **el otro** fue penalizado, no de si lo fue él.
 */
export function objetivoDe(penalizadoElRival: boolean): number {
  return penalizadoElRival ? OBJETIVO_BASE - DESCUENTO_PENALIZACION : OBJETIVO_BASE;
}

export type Aviso = { campo: "a" | "b" | "juego"; texto: string };

/**
 * Qué no cuadra en lo apuntado.
 *
 * Devuelve avisos, no errores: el formulario los enseña y deja guardar. Un
 * marcador raro suele ser un dedazo, pero a veces es una partida rara de
 * verdad (deck-out, concesión), y el servidor no está para discutirle al
 * usuario lo que vio en la mesa. Lo único que se rechaza de plano son los
 * números imposibles, y eso lo hace `premiosValidos()`.
 */
export function avisosDePremios(g: PremiosDeJuego, nombreA = "A", nombreB = "B"): Aviso[] {
  const out: Aviso[] = [];
  const { premiosA: pa, premiosB: pb } = g;

  if (pa == null && pb == null) return out; // Nada apuntado: no hay nada que decir.

  if (pa == null || pb == null) {
    out.push({ campo: pa == null ? "a" : "b", texto: "Falta el marcador de un lado." });
    return out;
  }

  const objA = objetivoDe(g.penalizadoB);
  const objB = objetivoDe(g.penalizadoA);

  const llegoA = pa >= objA;
  const llegoB = pb >= objB;

  if (llegoA && llegoB) {
    out.push({ campo: "juego", texto: "Los dos llegan a su objetivo: solo puede llegar uno." });
  }

  // El que perdió no puede haber llegado a su objetivo.
  if (g.winner === "a" && llegoB) {
    out.push({ campo: "b", texto: `${nombreB} llega a ${objB} premios pero figura como perdedor.` });
  }
  if (g.winner === "b" && llegoA) {
    out.push({ campo: "a", texto: `${nombreA} llega a ${objA} premios pero figura como perdedor.` });
  }

  /* Que el ganador NO llegue a su objetivo es legítimo: se gana también por
     deck-out o por concesión. Se avisa para que se note el dato raro, pero
     sin dar a entender que esté mal. */
  if (g.winner === "a" && !llegoA) {
    out.push({ campo: "juego", texto: `${nombreA} ganó sin llegar a ${objA} premios (deck-out o concesión).` });
  }
  if (g.winner === "b" && !llegoB) {
    out.push({ campo: "juego", texto: `${nombreB} ganó sin llegar a ${objB} premios (deck-out o concesión).` });
  }

  return out;
}

/** Lo que el servidor sí rechaza: números fuera de rango. */
export function premiosValidos(n: number | null): boolean {
  return n == null || (Number.isInteger(n) && n >= 0 && n <= OBJETIVO_BASE);
}

export type Margen = {
  /** Premios que le faltaban al perdedor para su objetivo. 1 = agonía, 6 = paliza. */
  faltaban: number;
  /** Marcador tal cual, del lado del ganador: "6-3". */
  marcador: string;
  /** ¿Hubo penalización en este juego? Entonces el margen no mide el emparejamiento. */
  conPenalizacion: boolean;
};

/**
 * El margen de victoria de un juego.
 *
 * `null` cuando no se puede decir: sin marcador apuntado, sin ganador, o con
 * los números incoherentes. Nulo y cero no son lo mismo y la pantalla los
 * pinta distinto — la misma regla que `cutRate` desde la v0.10.
 */
export function margenDe(g: PremiosDeJuego): Margen | null {
  const { premiosA: pa, premiosB: pb } = g;
  if (pa == null || pb == null) return null;
  if (g.winner !== "a" && g.winner !== "b") return null;

  const ganadorA = g.winner === "a";
  const delGanador = ganadorA ? pa : pb;
  const delPerdedor = ganadorA ? pb : pa;
  const objetivoPerdedor = objetivoDe(ganadorA ? g.penalizadoA : g.penalizadoB);

  const faltaban = objetivoPerdedor - delPerdedor;
  if (faltaban <= 0) return null; // El perdedor llegó a su objetivo: el dato no cuadra.

  return {
    faltaban,
    marcador: `${delGanador}-${delPerdedor}`,
    conPenalizacion: g.penalizadoA || g.penalizadoB,
  };
}

export type ResumenMargen = {
  /** Juegos con marcador utilizable. */
  juegos: number;
  /** Media de premios que le faltaban al perdedor. */
  margenMedio: number | null;
  /** Juegos decididos por un solo premio. */
  ajustados: number;
  /** Juegos donde el perdedor no pasó de 1 premio. */
  palizas: number;
  /** Juegos descartados por llevar penalización. */
  descartadosPorPenalizacion: number;
};

/**
 * Agrega el margen de varios juegos.
 *
 * **Los juegos con penalización se descartan**, y se dice cuántos. Un 6-0
 * que viene de una penalización no mide el emparejamiento, mide que alguien
 * barajó mal; meterlo en la media ensuciaría justo el número que se quiere
 * mirar. Se cuentan aparte para que no parezca que se han perdido.
 */
export function resumenDeMargen(juegos: PremiosDeJuego[]): ResumenMargen {
  let suma = 0, n = 0, ajustados = 0, palizas = 0, descartados = 0;

  for (const j of juegos) {
    const m = margenDe(j);
    if (!m) continue;
    if (m.conPenalizacion) { descartados++; continue; }
    n++;
    suma += m.faltaban;
    if (m.faltaban === 1) ajustados++;
    if (m.faltaban >= 5) palizas++;
  }

  return {
    juegos: n,
    margenMedio: n ? suma / n : null,
    ajustados,
    palizas,
    descartadosPorPenalizacion: descartados,
  };
}
