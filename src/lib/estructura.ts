/* =========================================================================
   La estructura oficial de un torneo, y los dos números que se miran entre
   ronda y ronda.

   DE DÓNDE SALE — AHORA SÍ, DEL REGLAMENTO
   ----------------------------------------
   Todo lo de este fichero está sacado del **Play! Pokémon Tournament Rules
   Handbook, revisión del 1 de septiembre de 2026**, sección 5:

   · §5.3.2 — Match points: victoria 3, derrota 0, empate 1.
   · §5.3.3 — Porcentaje de victorias del rival, con su suelo y su techo.
   · §5.5.2.1 — El orden de los desempates.
   · §5.5.6.1 — Las tablas de estructura de un día (Variantes #2 y #3).
   · §5.5.6.2 — La tabla de dos fases (Variante #5).
   · §5.6.1 — Los byes.

   EL FALLO QUE ESTO CORRIGE
   -------------------------
   **El TCG no tiene una tabla de rondas, tiene tres**, y la que toca depende
   del tipo de torneo:

   · League Challenge → Variante #2, suizo y se acabó, **sin corte**.
   · League Cup       → Variante #3, suizo + eliminatoria del mismo día.
   · Regional, Special, Internacional, Mundial → Variante #5, dos fases.

   Y no dan lo mismo ni de lejos. Con 17–32 personas, la #2 son **5 rondas** y
   la #5 son **6**. Aplicar la tabla de Regionales a una League Cup enseña una
   ronda de más y un corte que no existe.

   LOS DOS UMBRALES QUE SE ENSEÑAN, Y NO CUATRO
   --------------------------------------------
   Entre ronda y ronda solo hacen falta dos números:

   1. **El mínimo para pasar de fase.** Lo publica el organizador, es absoluto
      y no depende de nadie: o llegas a los puntos o no.
   2. **El mínimo para pelear el corte.** X-2, que es el récord del que habla
      Pokémon al explicar la ronda extra de 2026.

   El resto —X-1, X-3, la lista de finales posibles— ocupa sitio y no cambia
   ninguna decisión. Si vas a X-2 ya sabes que tienes que ganar; que además
   exista un X-1 que entra más cómodo no te hace jugar distinto.

   Sin imports, como `cut.ts` y `badges.ts`, para que los tests lo carguen
   directamente con `node --experimental-strip-types` y para que funcione
   igual en el navegador el día que la app tire sin conexión.
   ========================================================================= */

/* ------------------------------------------------------------ puntos -- */

/** §5.3.2. Lo único que no cambia nunca. */
export const PTS_VICTORIA = 3;
export const PTS_EMPATE = 1;
export const PTS_DERROTA = 0;

/** §5.2. Un torneo sancionado necesita al menos esto para ser válido. */
export const MIN_COMPETIDORES = 4;
export const MIN_RONDAS = 3;

/**
 * §5.5.6.2. Cuánta gente cabe como mucho en un corte asimétrico.
 *
 * El reglamento lo dice con estas palabras: «The maximum number of
 * competitors in an asymmetrical top cut is **16 for Pokémon TCG** and 32 for
 * VGC and Pokémon GO». Importa para leer la burbuja: un grupo de veinte
 * personas a X-2 no entra entero.
 */
export const TOP_CUT_MAXIMO_TCG = 16;

/**
 * §5.5.2.1. El orden de los desempates, que es lo que decide la burbuja.
 *
 * Está aquí escrito para poder enseñarlo en pantalla sin que nadie se lo
 * invente. En cuanto uno de los criterios separa a dos personas, los de
 * abajo ya no se miran.
 */
export const DESEMPATES = [
  { orden: 1, nombre: "% de victorias de tus rivales", corto: "Op Win %" },
  { orden: 2, nombre: "% de victorias de los rivales de tus rivales", corto: "Op Op Win %" },
  { orden: 3, nombre: "Resultado directo, solo si empatan exactamente dos", corto: "Head-to-head" },
] as const;

/**
 * §5.3.3.1. El porcentaje de victorias de alguien, para la resistencia.
 *
 * Tiene tres trampas que se olvidan siempre, y por eso está aquí y no escrito
 * a mano en cada pantalla:
 *
 * · Hay un **suelo del 25%**. Alguien que perdió todas cuenta como 25, no
 *   como 0, y por eso la resistencia nunca baja de ahí.
 * · El techo es **100% si terminó el torneo** y **75% si se retiró**. Que un
 *   rival se vaya a casa te penaliza la resistencia, y mucha gente no lo sabe.
 * · Un bye **cuenta como victoria en el récord pero no como ronda jugada**
 *   aquí (§5.6.1), así que no se pasa a esta función.
 */
export function winPercentage(
  victorias: number, rondas: number, { dropped = false } = {},
): number {
  if (rondas <= 0) return 0.25;
  const bruto = victorias / rondas;
  const techo = dropped ? 0.75 : 1;
  return Math.min(techo, Math.max(0.25, bruto));
}

/* -------------------------------------------------------- variantes -- */

/**
 * Las tres estructuras de TCG del reglamento.
 *
 * `swiss` es la Variante #2, `singleDay` la #3 y `dosFases` la #5.
 */
export type Variante = "swiss" | "singleDay" | "dosFases";

/**
 * Qué variante le toca a un tipo de torneo de Arena.
 *
 * `special` no sale con nombre propio en la tabla del reglamento, pero un
 * Special Championship se organiza como un Regional, así que va a dos fases.
 * Los tipos que no son del circuito —tienda, online, otros— devuelven nulo a
 * propósito: no hay estructura oficial que imponerles, y lo correcto es
 * respetar las rondas que se hayan tecleado.
 */
export function varianteDe(kind: string): Variante | null {
  switch (kind) {
    case "league_challenge":
    case "pokemon_challenge":
      return "swiss";
    case "league_cup":
    case "pokemon_cup":
      return "singleDay";
    case "regional":
    case "special":
    case "international":
    case "worlds":
      return "dosFases";
    default:
      return null;
  }
}

export type Estructura = {
  /** Rango de asistentes de la división, ambos incluidos. */
  min: number;
  max: number;
  variante: Variante;
  /** Rondas suizas totales. */
  total: number;
  /** Rondas de la fase uno. En las variantes de un día es igual que `total`. */
  fase1: number;
  /** Match points para pasar a la fase dos. Nulo si no hay segunda fase. */
  umbral: number | null;
  /** Rondas de la fase dos. Cero si el torneo es de una sola fase. */
  fase2: number;
  /** Tamaño del corte. Cero si no hay. */
  topCut: number;
  /** Si el corte admite a todos los empatados con el último (solo Variante #5). */
  asimetrico: boolean;
};

const fila = (
  min: number, max: number, variante: Variante, total: number, fase1: number,
  umbral: number | null, fase2: number, topCut: number, asimetrico: boolean,
): Estructura => ({ min, max, variante, total, fase1, umbral, fase2, topCut, asimetrico });

/** §5.5.6.1, Variante #2: TCG Swiss Rounds Only. League Challenge. Sin corte. */
export const VARIANTE_2: Estructura[] = [
  fila(4, 8, "swiss", 3, 3, null, 0, 0, false),
  fila(9, 16, "swiss", 4, 4, null, 0, 0, false),
  fila(17, 32, "swiss", 5, 5, null, 0, 0, false),
  fila(33, 64, "swiss", 6, 6, null, 0, 0, false),
  fila(65, 128, "swiss", 7, 7, null, 0, 0, false),
  fila(129, 256, "swiss", 8, 8, null, 0, 0, false),
  fila(257, 512, "swiss", 9, 9, null, 0, 0, false),
  fila(513, Infinity, "swiss", 10, 10, null, 0, 0, false),
];

/**
 * §5.5.6.1, Variante #3: TCG Single Day. League Cup.
 *
 * El reglamento da rondas de eliminatoria, no tamaño de corte: dos rondas son
 * un top 4 y tres un top 8. Aquí se guarda ya convertido, que es lo que se
 * enseña. Y **no es asimétrico**: el corte asimétrico solo aparece en la
 * tabla de dos fases.
 */
export const VARIANTE_3: Estructura[] = [
  fila(4, 8, "singleDay", 3, 3, null, 0, 0, false),
  fila(9, 12, "singleDay", 4, 4, null, 0, 4, false),
  fila(13, 20, "singleDay", 5, 5, null, 0, 4, false),
  fila(21, 32, "singleDay", 5, 5, null, 0, 8, false),
  fila(33, 64, "singleDay", 6, 6, null, 0, 8, false),
  fila(65, 128, "singleDay", 7, 7, null, 0, 8, false),
  fila(129, 226, "singleDay", 8, 8, null, 0, 8, false),
  fila(227, 409, "singleDay", 9, 9, null, 0, 8, false),
  fila(410, Infinity, "singleDay", 10, 10, null, 0, 8, false),
];

/**
 * §5.5.6.2, Variante #5: Two Phase 2026 Championship Format.
 *
 * La línea roja del reglamento está entre 33–64 y 65–128: ahí es donde una
 * segunda fase de suizo pasa a ser obligatoria.
 */
export const VARIANTE_5: Estructura[] = [
  fila(4, 8, "dosFases", 3, 3, null, 0, 0, false),
  fila(9, 16, "dosFases", 4, 4, null, 0, 2, true),
  fila(17, 32, "dosFases", 6, 6, null, 0, 4, true),
  fila(33, 64, "dosFases", 7, 7, null, 0, 6, true),
  fila(65, 128, "dosFases", 9, 7, 13, 2, 8, true),
  fila(129, 256, "dosFases", 10, 8, 16, 2, 8, true),
  fila(257, 512, "dosFases", 11, 8, 16, 3, 8, true),
  fila(513, 1024, "dosFases", 12, 8, 16, 4, 8, true),
  fila(1025, 2048, "dosFases", 13, 8, 16, 5, 8, true),
  fila(2049, 4096, "dosFases", 14, 8, 16, 6, 8, true),
  fila(4097, 8192, "dosFases", 15, 9, 19, 6, 8, true),
];

const TABLAS: Record<Variante, Estructura[]> = {
  swiss: VARIANTE_2,
  singleDay: VARIANTE_3,
  dosFases: VARIANTE_5,
};

/**
 * La estructura que le toca a una asistencia y un tipo de torneo.
 *
 * `kind` es opcional y por defecto va a la tabla de dos fases, que es la de
 * Regionales: es lo que ya hacía la app antes de saber que había tres tablas,
 * y así nada cambia de comportamiento sin querer.
 *
 * Por encima del último tramo se devuelve ese último tramo, que es lo que
 * haría un organizador, en vez de no decir nada.
 */
export function estructuraDe(
  players: number | null | undefined, kind = "regional",
): Estructura | null {
  if (!players || players < MIN_COMPETIDORES) return null;
  const variante = varianteDe(kind);
  if (!variante) return null;
  const tabla = TABLAS[variante];
  return tabla.find((e) => players >= e.min && players <= e.max) ?? tabla[tabla.length - 1];
}

/* ---------------------------------------------------------- umbrales -- */

export type Umbral = {
  /** Match points a partir de los cuales aplica. */
  puntos: number;
  /** El récord equivalente más reconocible: "12-2", "5-2-1". */
  record: string;
};

export type Umbrales = {
  estructura: Estructura;
  /**
   * El mínimo para pasar a la fase dos. Nulo si el torneo es de una sola fase.
   *
   * Es el único de los dos que no depende de nadie más.
   */
  diaDos: Umbral | null;
  /**
   * El mínimo para pelear el corte: X-2.
   *
   * «Pelear», no «entrar». El reglamento fija el tope del corte asimétrico en
   * 16 y la resistencia decide quién de ese grupo pasa.
   */
  corte: Umbral | null;
};

/** El récord sin empates de N victorias en R rondas. */
const recordSeco = (v: number, r: number) => `${v}-${r - v}`;

/**
 * El récord más reconocible que da unos puntos en unas rondas.
 *
 * Con 16 puntos en 8 rondas valen 5-2-1 y 4-0-4. Se devuelve el de más
 * victorias, que es el que la gente tiene en la cabeza.
 */
export function recordLimpio(puntos: number, rondas: number): string {
  for (let v = Math.min(rondas, Math.floor(puntos / PTS_VICTORIA)); v >= 0; v--) {
    const resto = puntos - v * PTS_VICTORIA;
    const empates = resto / PTS_EMPATE;
    if (!Number.isInteger(empates)) continue;
    const derrotas = rondas - v - empates;
    if (derrotas < 0) continue;
    return empates > 0 ? `${v}-${derrotas}-${empates}` : `${v}-${derrotas}`;
  }
  return "";
}

/**
 * Los dos mínimos de un torneo.
 *
 * `corte` es nulo cuando el torneo no tiene corte —una League Challenge, por
 * ejemplo—, y entonces la pantalla solo tiene un número que enseñar, que es
 * lo correcto.
 */
export function umbralesDe(
  players: number | null | undefined, kind = "regional",
): Umbrales | null {
  const e = estructuraDe(players, kind);
  if (!e) return null;

  const peleaV = e.total - 2;

  return {
    estructura: e,
    diaDos: e.umbral != null
      ? { puntos: e.umbral, record: recordLimpio(e.umbral, e.fase1) }
      : null,
    corte: e.topCut > 0 && peleaV >= 0
      ? { puntos: peleaV * PTS_VICTORIA, record: recordSeco(peleaV, e.total) }
      : null,
  };
}

/* --------------------------------------------------------- veredicto -- */

/**
 * Los tres estados, que son los que pediste y no más.
 *
 * · `dentro` — llega al mínimo con holgura de sobra.
 * · `depende` — está justo en el mínimo: entra quien tenga mejor resistencia.
 * · `fuera` — no llega.
 *
 * No hay un «dentro» a secas para el corte porque, con el récord de la
 * burbuja, quién pasa lo decide el desempate y desde aquí no se sabe.
 */
export type Veredicto = "dentro" | "depende" | "fuera";

/**
 * Veredicto de unos puntos contra un umbral.
 *
 * Estar exactamente en el mínimo es `depende`: ahí es donde hay más gente que
 * plazas. Un punto por encima ya es `dentro`, porque con match points un solo
 * punto separa un empate de una victoria y basta para salir del grupo.
 */
export function veredictoDe(puntos: number, umbral: Umbral | null): Veredicto | null {
  if (!umbral) return null;
  if (puntos > umbral.puntos) return "dentro";
  if (puntos === umbral.puntos) return "depende";
  return "fuera";
}

/** ¿Pasa a la fase dos con estos puntos? Nulo si el torneo no tiene fase dos. */
export function pasaDiaDos(puntos: number, u: Umbrales): boolean | null {
  return u.diaDos ? puntos >= u.diaDos.puntos : null;
}

/** Los match points de un récord. */
export function puntosDe(victorias: number, empates: number): number {
  return victorias * PTS_VICTORIA + empates * PTS_EMPATE;
}

/**
 * Lo máximo que se puede llegar a tener si se gana todo lo que queda.
 *
 * Es lo que permite decir «ni ganándolo todo llegas» sin enseñar la lista
 * entera de finales posibles.
 */
export function techoDe(puntos: number, rondasJugadas: number, total: number): number {
  return puntos + Math.max(0, total - rondasJugadas) * PTS_VICTORIA;
}

/**
 * Cuántas victorias hacen falta, de las que quedan, para llegar a un umbral.
 *
 * Devuelve nulo si ya no se puede. Es la única cuenta que de verdad se hace
 * entre ronda y ronda: «gana dos de las tres que quedan».
 */
export function victoriasNecesarias(
  puntos: number, rondasJugadas: number, total: number, umbral: Umbral | null,
): number | null {
  if (!umbral) return null;
  const quedan = Math.max(0, total - rondasJugadas);
  const faltan = umbral.puntos - puntos;
  if (faltan <= 0) return 0;
  const necesarias = Math.ceil(faltan / PTS_VICTORIA);
  return necesarias <= quedan ? necesarias : null;
}

/* ------------------------------------------------ fases de cada ronda -- */

/**
 * La familia de un tipo de torneo, que es lo único que decide qué etiquetas
 * lleva cada ronda.
 *
 * · `challenge` — League Challenge / Pokémon Challenge. Suizo de un solo día
 *   y **sin top cut** (§5.5.6.1, Variante #2).
 * · `cup` — League Cup / Pokémon Cup. Suizo y después top cut, **el mismo
 *   día** (Variante #3). No hay Día 2.
 * · `dosFases` — Regional, Special, Internacional, Mundial (Variante #5). El
 *   único sitio donde existe el Día 2.
 * · `libre` — tienda, online, otros: sin estructura oficial que imponer.
 */
export type Familia = "challenge" | "cup" | "dosFases" | "libre";

export function familiaDe(kind: string | null | undefined): Familia {
  const v = varianteDe(kind ?? "");
  return v === "swiss" ? "challenge" : v === "singleDay" ? "cup" : v === "dosFases" ? "dosFases" : "libre";
}

/** Las rondas de eliminatoria que hacen falta para un corte: top 8 → 3. */
export function rondasDeCorte(topCut: number | null | undefined): number {
  if (!topCut || topCut < 2) return 0;
  return Math.ceil(Math.log2(topCut));
}

const NOMBRES_CORTE = ["Final", "Semifinal", "Cuartos", "Octavos"];

export type TorneoForma = {
  kind: string;
  playerCount?: number | null;
  /** Rondas suizas apuntadas en el torneo (el TOTAL). Mandan sobre la tabla. */
  rounds?: number | null;
  /** v0.45 — cuántas de esas rondas son de una segunda fase propia. */
  roundsPhase2?: number | null;
  topCut?: number | null;
  /** v0.47 — puntos para pasar a la fase 2 (o el top `phase2Top`, lo que dé más). */
  phase2Points?: number | null;
  phase2Top?: number | null;
  /** v0.47 — puntos para pasar al top cut (o el top `topCut`, lo que dé más). */
  cutPoints?: number | null;
};

/** Suizo, fase uno y corte efectivos: lo tecleado manda, la tabla rellena. */
export function formaDe(t: TorneoForma): {
  familia: Familia; suizo: number | null; fase1: number | null; corte: number; asimetrico: boolean;
  /** ¿Se parte el suizo en dos fases? Por la tabla oficial o por lo tecleado. */
  dosFases: boolean;
  /** `true` cuando la segunda fase la tecleó alguien (online, eventos propios). */
  faseManual: boolean;
  /** v0.47 — cómo se pasa a la fase 2 en una estructura propia; nulo si no se dijo. */
  paso2: PasoDeFase | null;
  /** v0.47 — cómo se pasa al top cut en una estructura propia; nulo si no se dijo. */
  pasoCorte: PasoDeFase | null;
} {
  const familia = familiaDe(t.kind);
  const e = estructuraDe(t.playerCount, t.kind);
  const suizo = (t.rounds && t.rounds > 0 ? t.rounds : null) ?? e?.total ?? null;

  /* v0.45 — una segunda fase TECLEADA manda sobre la tabla, igual que ya
     mandaban las rondas y el corte. Es lo que permite describir un online
     como el Moujii's Dojo (8 rondas, luego 3 más con los de 16 puntos o
     más, y top 8), que no sale de ninguna tabla oficial.

     Solo vale si deja al menos una ronda en la primera fase: con 5 rondas en
     total, «6 de fase 2» es un dato imposible y se ignora en vez de partir
     el torneo por un sitio que no existe. Pasa si alguien cambia las rondas
     totales desde el panel rápido de asistencia sin tocar la fase 2. */
  const f2 = t.roundsPhase2 && t.roundsPhase2 > 0 ? t.roundsPhase2 : null;
  const faseManual = f2 != null && suizo != null && f2 < suizo;

  // Sin fase propia, solo la Variante #5 parte el suizo en dos días.
  const fase1 = faseManual
    ? suizo! - f2!
    : familia === "dosFases" && e && e.fase2 > 0 ? e.fase1 : suizo;
  const dosFases = faseManual || (familia === "dosFases" && fase1 != null && suizo != null && suizo > fase1);

  // Un Challenge no tiene corte por reglamento; un torneo con estructura
  // propia sí puede tenerlo, aunque su tipo diga otra cosa.
  const corte = familia === "challenge" && !faseManual ? 0 : (t.topCut ?? e?.topCut ?? 0);
  /* v0.47 — los umbrales de paso, solo con estructura propia: en un torneo
     oficial los pone el reglamento y ya los sabe `umbralesDe`. */
  const paso2 = faseManual && t.phase2Points && t.phase2Points > 0
    ? { puntos: t.phase2Points, top: t.phase2Top && t.phase2Top > 0 ? t.phase2Top : 8 }
    : null;
  const pasoCorte = faseManual && t.cutPoints && t.cutPoints > 0 && corte > 0
    ? { puntos: t.cutPoints, top: corte }
    : null;

  return {
    familia, suizo, fase1, corte, dosFases, faseManual, paso2, pasoCorte,
    asimetrico: familia === "dosFases" && (e?.asimetrico ?? true),
  };
}
/* =========================================================================
   v0.47 — Pasar de fase por PUNTOS O POR PUESTO, lo que dé más gente.

   La regla de los online como Moujii's Dojo: «pasan los de 16 puntos o más,
   o el top 8, lo que sea mayor». Hay dos formas de pasar, y eso cambia el
   veredicto de una manera que no es evidente:

     · Con los puntos, se pasa SEGURO: todos los que lleguen, pasan.
     · Sin ellos NO es «fuera». Si menos de 8 personas llegan a 16, pasan los
       8 primeros, y con 13 puntos se puede entrar. Es «depende», y depende de
       cómo le vaya a los demás, que es algo que la app no sabe.

   Por eso aquí no existe «fuera»: decir «fuera» por debajo de los puntos
   sería decirle a alguien que se ha quedado fuera cuando quizá ha entrado.
   ========================================================================= */

export type PasoDeFase = {
  /** Con estos puntos o más, se pasa seguro. */
  puntos: number;
  /** O el top N, si con los puntos pasa menos gente. */
  top: number;
};

export function veredictoPaso(puntos: number, paso: PasoDeFase | null): Veredicto | null {
  if (!paso) return null;
  return puntos >= paso.puntos ? "dentro" : "depende";
}

/** La regla en una frase, para enseñarla tal cual en pantalla. */
export function reglaDePaso(paso: PasoDeFase, destino: string): string {
  return `Pasan a ${destino} los de ${paso.puntos} puntos o más, o el top ${paso.top} si así pasa más gente.`;
}

/**
 * Cómo se etiqueta una ronda en pantalla.
 *
 * `null` es «ronda de suizo normal, no hace falta chip». En un Challenge
 * **todas** son así, en una Cup solo las de eliminatoria llevan etiqueta, y
 * «Día 2» sale únicamente en la tabla de dos fases.
 */
export function etapaDeRonda(
  round: number, t: TorneoForma,
): { tipo: "suizo" | "dia2" | "corte"; etiqueta: string | null } {
  const f = formaDe(t);
  /* v0.45 — con estructura propia se etiqueta siempre, sea del tipo que sea:
     un online de 8 + 3 y top 8 tiene fase 2 y tiene eliminatoria, y antes
     sus rondas salían todas como suizo normal por ser de familia «libre». */
  if (!f.faseManual && (f.familia === "challenge" || f.familia === "libre" || !f.suizo)) {
    return { tipo: "suizo", etiqueta: null };
  }
  if (!f.suizo) return { tipo: "suizo", etiqueta: null };
  if (f.dosFases && f.fase1 != null && round > f.fase1 && round <= f.suizo) {
    // «Día 2» es el nombre oficial; un online lo llama «Fase 2».
    return { tipo: "dia2", etiqueta: f.faseManual ? "Fase 2" : "Día 2" };
  }
  if (round <= f.suizo) return { tipo: "suizo", etiqueta: null };

  const n = rondasDeCorte(f.corte) || 3;
  const desdeElFinal = f.suizo + n - round; // 0 = la final
  return {
    tipo: "corte",
    etiqueta: desdeElFinal >= 0 && desdeElFinal < NOMBRES_CORTE.length
      ? NOMBRES_CORTE[desdeElFinal]
      : "Top cut",
  };
}

/**
 * Cuál es la última ronda que se puede apuntar. Nulo = sin tope conocido.
 *
 * · Challenge: exactamente las rondas del suizo. Sin top cut no hay ronda 6
 *   en un Challenge de 5 (§5.5.6.1, Variante #2).
 * · Cup: el suizo más las rondas de eliminatoria de su corte.
 * · Dos fases: el suizo más el corte; si es asimétrico, lo que ocupe el tope
 *   de 16 del reglamento (§5.5.6.2), que son cuatro rondas.
 */
export function maxRondasDe(t: TorneoForma): number | null {
  const f = formaDe(t);
  if (!f.suizo || f.familia === "libre") return null;
  if (f.familia === "challenge") return f.suizo;
  if (f.familia === "cup") return f.suizo + rondasDeCorte(f.corte);
  const corte = f.asimetrico ? Math.max(f.corte, TOP_CUT_MAXIMO_TCG) : f.corte;
  return f.suizo + rondasDeCorte(corte);
}

/* =========================================================================
   v0.57 — El formato (Bo1 / Bo3 / Bo5) de cada ronda, según su fase.

   El suizo y el top cut pueden jugarse a distinto número de juegos (lo típico
   en online: suizo a Bo1, corte a Bo3). La frontera es la misma que usa todo
   lo demás: `formaDe(t).suizo` es el total del suizo —el oficial por asistencia
   o el tecleado—, y una ronda con número mayor es del top cut. Sin suizo
   conocido, todo es suizo.
   ========================================================================= */

export type FaseRonda = "suizo" | "corte";

export function faseDeRonda(t: TorneoForma, round: number): FaseRonda {
  const f = formaDe(t);
  return f.suizo && round > f.suizo ? "corte" : "suizo";
}

const formatoValido = (n?: number | null) => (n === 1 || n === 3 || n === 5 ? n : null);

/** Bo de una ronda: el del corte si es del corte y está puesto; si no, el del torneo. */
export function bestOfDeRonda(
  t: TorneoForma & { bestOf?: number | null; bestOfTop?: number | null },
  round: number,
): number {
  const suizo = formatoValido(t.bestOf) ?? 3;
  return faseDeRonda(t, round) === "corte" ? formatoValido(t.bestOfTop) ?? suizo : suizo;
}
