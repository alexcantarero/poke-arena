/* =========================================================================
   Qué parte del filtro puede resolver la base, y qué parte no.

   Sin imports, como el resto de módulos que se prueban. Aquí no se escribe
   SQL: se decide. Quien construye la consulta de Drizzle (`src/lib/data.ts`)
   lee este plan; quien filtra en memoria (`src/lib/filters.ts`) sigue
   igual que siempre. Así la regla vive en un sitio y se puede probar sin
   base de datos.

   El problema que resuelve
   -----------------------
   Resultados cargaba TODAS las partidas y TODOS los juegos en cada visita y
   luego cortaba de 40 en 40 en memoria. Con cinco partidas da igual; con dos
   temporadas, el coste de abrir la pantalla crece con el historial, que es
   la propiedad que hay que romper (ver `docs/13-plan-rendimiento.md`).

   La línea divisoria, y por qué está ahí
   --------------------------------------
   Casi todo el filtro son columnas: fechas, ids, ronda, y el tipo o el
   formato del torneo, que salen de un `LEFT JOIN`. Todo eso baja a SQL.

   **El arquetipo no baja.** Saber con qué se jugó una partida es resolver
   primero el mazo de cada lado y después el arquetipo de ese mazo, pasando
   por el índice de mazos y por las familias de arquetipos (`parent_id`).
   Reproducir esa cadena en SQL sería tener dos definiciones de «con qué se
   jugó», y el día que una de las dos cambie, Resultados y Estadísticas
   dirían cosas distintas. Eso ya pasó una vez y por eso existe
   `filters.ts`.

   Así que cuando hay filtro de arquetipo, **no se pagina en la base**: se
   trae el conjunto ya recortado por lo demás y se termina en memoria. Es el
   caso menos frecuente y sigue siendo mucho menos que traerlo todo.
   ========================================================================= */

/** La forma mínima del filtro que necesita este módulo. */
export type FiltroConsultable = {
  scope: string;
  from: string;
  to: string;
  tournamentKind: string;
  competitionKind: string;
  tournamentId: string;
  competitionId: string;
  archetypeId: string;
  playerId: string;
  format: string;
  round: number | null;
};

export type PlanDeConsulta = {
  /** Condiciones que la base resuelve sola. */
  sql: {
    /** `league` · `tournament` · `casual` · `onsite` · `online` · "" (todo). */
    ambito: "" | "league" | "tournament" | "casual" | "onsite" | "online";
    desde: string;
    hasta: string;
    torneoId: string;
    competicionId: string;
    jugadorId: string;
    ronda: number | null;
    tipoTorneo: string;
    tipoCompeticion: string;
    formato: string;
    /** ¿Hace falta el `LEFT JOIN tournaments`? */
    uneTorneos: boolean;
    /** ¿Hace falta el `LEFT JOIN competitions`? */
    uneCompeticiones: boolean;
  };
  /** Lo que sigue filtrándose en memoria, con `applyMatchFilter`. */
  enMemoria: { archetypeId: string };
  /**
   * `true` cuando la base puede resolver el filtro ENTERO y por tanto puede
   * aplicar también `LIMIT`/`OFFSET`. `false` obliga a traer el conjunto
   * filtrado y paginar después, en memoria.
   */
  paginable: boolean;
};

const AMBITOS_SQL = ["league", "tournament", "casual", "onsite", "online"] as const;

/**
 * Parte el filtro en sus dos mitades.
 *
 * No valida: eso ya lo hizo `parseMatchFilter()` al leer la URL. Aquí solo
 * se reparte el trabajo.
 */
export function planDeConsulta(f: FiltroConsultable): PlanDeConsulta {
  const ambito = (AMBITOS_SQL as readonly string[]).includes(f.scope)
    ? (f.scope as PlanDeConsulta["sql"]["ambito"])
    : "";

  // `onsite` y `online` miran `tournaments.scope`; el tipo y el formato,
  // otras dos columnas de la misma tabla. Con cualquiera de las cuatro hay
  // que unir, y con ninguna no se une (un JOIN que no filtra solo cuesta).
  const uneTorneos = Boolean(
    f.tournamentKind || f.format || ambito === "onsite" || ambito === "online",
  );
  const uneCompeticiones = Boolean(f.competitionKind);

  return {
    sql: {
      ambito,
      desde: f.from,
      hasta: f.to,
      torneoId: f.tournamentId,
      competicionId: f.competitionId,
      jugadorId: f.playerId,
      ronda: f.round,
      tipoTorneo: f.tournamentKind,
      tipoCompeticion: f.competitionKind,
      formato: f.format,
      uneTorneos,
      uneCompeticiones,
    },
    enMemoria: { archetypeId: f.archetypeId },
    paginable: !f.archetypeId,
  };
}

/**
 * Cuántas filas pedir a la base.
 *
 * Paginable: justo las de la página, más una para saber si hay siguiente
 * sin tener que contar aparte.
 *
 * No paginable: hay que traer todo lo que pase el filtro de SQL, porque
 * cualquiera de esas filas puede caer luego por el arquetipo. Se pone un
 * tope de seguridad para que una liga enorme no tumbe la pantalla; cuando se
 * alcanza, la pantalla avisa de que la cuenta está recortada en vez de
 * mentir con un número redondo.
 */
export const TOPE_SIN_PAGINAR = 2000;

export function filasAPedir(plan: PlanDeConsulta, porPagina: number, pagina: number): {
  limit: number;
  offset: number;
  recortaDespues: boolean;
} {
  if (plan.paginable) {
    return { limit: porPagina + 1, offset: Math.max(0, pagina - 1) * porPagina, recortaDespues: false };
  }
  return { limit: TOPE_SIN_PAGINAR, offset: 0, recortaDespues: true };
}
