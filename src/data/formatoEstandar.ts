/* =========================================================================
   v0.110 — El formato Estándar: en qué expansión estamos, qué cartas valen,
   cuándo sale la siguiente y cuándo acaba la temporada.

   Escrito A MANO, como `eventos-europa.ts`, y sin imports. No hay API
   oficial de fechas de expansiones ni de rotación, y championships.pokemon.com
   no se puede leer de forma automática (y no se raspa). Cuando salga una
   expansión o se anuncie la rotación, se edita este fichero y nada más: la
   pantalla (`components/FormatoActual.tsx`) y el cálculo (`lib/formato.ts`)
   se adaptan solos a la fecha de hoy.

   Revisado el 6 de noviembre de 2026. Fuentes:
     · Delta Reign: nota de prensa de The Pokémon Company (press.pokemon.com):
       a la venta el 6/11/2026, en TCG Live el 5/11. Legal en torneos el
       20/11/2026 aplicando la regla del reglamento (§4.1.2: el segundo
       viernes tras la salida). Esa fecha es un CÁLCULO, no un anuncio.
     · 30th Celebration (16/09/2026): las cartas del set principal llevan la
       marca J y son legales en Estándar; las reimpresiones de la «Classic
       Collection» NO lo son.
     · Flowing Fists (Mega Lucario Z): 5/02/2027, presentaciones del 23 al
       31 de enero, publicado por Wargamer y PokéBeach. Pokémon todavía no lo
       ha anunciado en su web: va marcada como `oficial: false`.
     · Rotación 2026 (anuncio de Play! Pokémon del 9/01/2026): desde el
       10/04/2026 salen las cartas con marca G; valen H, I y J. La rotación
       de 2027 NO está anunciada; por costumbre se anuncia en enero y entra
       en abril, y saldría la H.
     · Mundial 2027: 13–15 de agosto, Singapore EXPO.
   ========================================================================= */

export type Expansion = {
  /** Nombre oficial en inglés (el que sale en las listas y en Limitless). */
  nombre: string;
  /** Código de tres letras de las listas, si se conoce. */
  codigo?: string;
  /** Día de salida a la venta (aaaa-mm-dd). */
  salida: string;
  /** Día desde el que vale en torneos. Si falta, se toma la salida. */
  legal?: string;
  /** Si `legal` sale de aplicar la regla del reglamento y no de un anuncio. */
  legalCalculada?: boolean;
  /** `false` si la fecha solo la ha publicado la prensa, no Pokémon. */
  oficial: boolean;
  /** Pokémon de portada, como slug de sprite (solo si se conoce). */
  portada?: string;
  /** Clave del diccionario con un matiz que hay que decir al lado (p. ej.
      reimpresiones que no valen). */
  notaClave?: string;
};

export const EXPANSIONES: Expansion[] = [
  { nombre: "Ascended Heroes", salida: "2026-01-30", oficial: true },
  { nombre: "Perfect Order", salida: "2026-03-27", oficial: true, portada: "starmie" },
  { nombre: "Chaos Rising", salida: "2026-05-22", oficial: true },
  { nombre: "Pitch Black", codigo: "PBL", salida: "2026-07-17", oficial: true, portada: "darkrai" },
  {
    nombre: "30th Celebration", salida: "2026-09-16", oficial: true, portada: "pikachu",
    notaClave: "v110.fmt.notaClassic",
  },
  {
    nombre: "Delta Reign", codigo: "DLR", salida: "2026-11-06", legal: "2026-11-20",
    legalCalculada: true, oficial: true, portada: "rayquaza",
  },
  { nombre: "Flowing Fists", codigo: "FLO", salida: "2027-02-05", oficial: false, portada: "lucario" },
];

export type Rotacion = {
  /** Día en que entra en vigor (torneos presenciales), o null si no está anunciada. */
  fecha: string | null;
  /** Marca que sale del formato. */
  sale: string;
  /** Marcas que quedan. */
  quedan: string[];
  oficial: boolean;
  /** Cuando no hay fecha: el mes que se espera (aaaa-mm). */
  estimada?: string;
};

export const FORMATO_ESTANDAR = {
  /** Marcas de regulación legales hoy. */
  marcas: ["H", "I", "J"],
  /** La primera expansión con la marca más antigua que sigue valiendo. */
  desde: "Temporal Forces",
  /** La rotación que ya pasó y dejó el formato como está. */
  rotacionAnterior: { fecha: "2026-04-10", sale: "G", quedan: ["H", "I", "J"], oficial: true } as Rotacion,
  /** La siguiente rotación. */
  rotacionSiguiente: { fecha: null, sale: "H", quedan: ["I", "J"], oficial: false, estimada: "2027-04" } as Rotacion,
  /** El final de la temporada de juego organizado: el Mundial. */
  finTemporada: { nombre: "Mundial 2027", desde: "2027-08-13", hasta: "2027-08-15", lugar: "Singapore EXPO" },
  revisado: "2026-11-06",
};
