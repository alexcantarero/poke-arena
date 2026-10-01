/* =========================================================================
   v0.15 — Torneos de la zona para octubre y noviembre de 2026.

   La lista la pasó Ibai el 1/10/2026. Se importa desde Torneos con un botón
   (solo organizadores) y entra como **borrador**: «apuntado, todavía sin
   jugar». El día del torneo se le da a «Empezar el torneo» y se van metiendo
   rondas como siempre.

   Es idempotente: cada torneo lleva un id fijo, así que volver a importar no
   duplica. Y NO pisa nada: si el torneo ya existe (por id, o porque alguien
   ya lo creó a mano el mismo día, del mismo tipo y en la misma tienda), se
   salta. Lo que alguien haya corregido en la app manda sobre este fichero.

   DÍAS QUE NO CUADRAN
   -------------------
   En cuatro filas el día de la semana escrito no coincide con el número.
   Se ha usado el NÚMERO y la fila lleva `revisar`, que sale en las notas del
   torneo para que se compruebe en el buscador oficial:

   · Homoludicus «Domingo 17» de octubre → el 17 es sábado.
   · La órden del friki «Lunes 25» de octubre → el 25 es domingo.
   · Decksden «Sábado 15» de noviembre → el 15 es domingo.
   · Vanilla Games «Sábado 25» de noviembre → el 25 es miércoles (Vanilla ya
     tiene otro Challenge en miércoles, el 7 de octubre, así que el número
     parece el bueno).

   Gdansk: la lista decía 30 oct – 1 nov; la fecha oficial es **31 de octubre
   – 1 de noviembre** (AmberExpo y Serebii coinciden). Se ha puesto la oficial.
   ========================================================================= */

export type TorneoZona = {
  id: string;
  name: string;
  kind: "league_challenge" | "league_cup" | "regional";
  date: string;
  endDate?: string;
  startTime?: string;
  venue: string;
  city: string;
  country: string;
  /** Formato de serie por defecto: Challenge Bo1, Cup y Regional Bo3. */
  bestOf: 1 | 3;
  /** El día de la semana de la lista no cuadraba con la fecha. */
  revisar?: string;
  /** Id del evento del calendario que es este mismo torneo, para no pintarlo dos veces. */
  eventoId?: string;
  /** Otros nombres con los que alguien puede haberlo creado a mano («Nice»). */
  alias?: string[];
};

const ch = (
  id: string, date: string, startTime: string, venue: string, city: string, revisar?: string,
): TorneoZona => ({
  id: `zona-2026-${id}`, name: `League Challenge ${venue}`, kind: "league_challenge",
  date, startTime, venue, city, country: "España", bestOf: 1, revisar,
});
const cup = (id: string, date: string, startTime: string, venue: string, city: string): TorneoZona => ({
  id: `zona-2026-${id}`, name: `League Cup ${venue}`, kind: "league_cup",
  date, startTime, venue, city, country: "España", bestOf: 3,
});

export const TORNEOS_ZONA_2026: TorneoZona[] = [
  // ------------------------------------------------------------- octubre
  ch("1003-freakshow", "2026-10-03", "16:30", "Freakshow", "Girona"),
  cup("1004-mythic-cup", "2026-10-04", "10:30", "Mythic", "Calella"),
  ch("1004-mythic", "2026-10-04", "16:30", "Mythic", "Calella"),
  ch("1007-vanilla", "2026-10-07", "17:30", "Vanilla Games", "Reus"),
  ch("1010-decktcg", "2026-10-10", "10:00", "DeckTCG", "Sant Boi"),
  ch("1010-tcglegacy", "2026-10-10", "16:30", "TCG Legacy", "Pallejà"),
  ch("1011-decksden", "2026-10-11", "17:00", "Decksden", "Barcelona"),
  {
    id: "zona-2026-1017-niza", name: "Regional de Niza", kind: "regional",
    date: "2026-10-17", endDate: "2026-10-18", venue: "Regional Championships", city: "Niza",
    country: "Francia", bestOf: 3, eventoId: "eu-2027-nice", alias: ["Nice", "Nizza"],
  },
  cup("1017-decktcg-cup", "2026-10-17", "10:00", "DeckTCG", "Sant Boi"),
  ch("1017-homoludicus", "2026-10-17", "17:00", "Homoludicus", "Granollers",
    "La lista decía «domingo 17», pero el 17 de octubre es sábado."),
  ch("1025-ordenfriki", "2026-10-25", "17:00", "La Orden del Friki", "La Llagosta",
    "La lista decía «lunes 25», pero el 25 de octubre es domingo."),
  {
    id: "zona-2026-1031-gdansk", name: "Regional de Gdansk", kind: "regional",
    date: "2026-10-31", endDate: "2026-11-01", venue: "AMBEREXPO", city: "Gdansk",
    country: "Polonia", bestOf: 3, eventoId: "eu-2027-gdansk", alias: ["Gdańsk", "Danzig"],
  },
  // ----------------------------------------------------------- noviembre
  ch("1101-mythic", "2026-11-01", "10:30", "Mythic", "Calella"),
  ch("1106-dokidoki", "2026-11-06", "17:30", "Doki Doki Daus", "Mataró"),
  ch("1107-monkeyworld", "2026-11-07", "16:30", "MonkeyWorld13", "Reus"),
  ch("1114-freakshow", "2026-11-14", "16:30", "Freakshow", "Girona"),
  cup("1114-vanilla-cup", "2026-11-14", "17:00", "Vanilla Games", "Reus"),
  ch("1115-decksden", "2026-11-15", "17:00", "Decksden", "Barcelona",
    "La lista decía «sábado 15», pero el 15 de noviembre es domingo."),
  ch("1121-decktcg", "2026-11-21", "10:00", "DeckTCG", "Sant Boi"),
  ch("1121-homoludicus", "2026-11-21", "17:00", "Homoludicus", "Granollers"),
  ch("1125-vanilla", "2026-11-25", "17:30", "Vanilla Games", "Reus",
    "La lista decía «sábado 25», pero el 25 de noviembre es miércoles."),
];

/** Para comparar tiendas sin que importen tildes, mayúsculas ni espacios. */
export function normaTienda(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * ¿Este torneo de la lista ya está en la app, creado a mano? Mismo día, mismo
 * tipo, y el nombre o la sede del existente mencionan la tienda (o la ciudad,
 * para los Regionales).
 */
export function yaExiste(
  z: TorneoZona,
  existentes: Array<{ id: string; date: string; kind: string; name: string; venue: string; city: string }>,
): boolean {
  const familia = (k: string) =>
    k === "pokemon_challenge" ? "league_challenge" : k === "pokemon_cup" ? "league_cup" : k === "special" ? "regional" : k;
  const claves = [z.kind === "regional" ? z.city : z.venue, ...(z.alias ?? [])].map(normaTienda);
  return existentes.some((t) => {
    if (t.id === z.id) return true;
    if (familia(t.kind) !== z.kind) return false;
    // Un Regional puede haberse apuntado con el primer día o con el segundo.
    const mismoDia = t.date === z.date || (z.endDate != null && t.date === z.endDate);
    const texto = normaTienda(`${t.name} ${t.venue} ${t.city}`);
    return mismoDia && claves.some((c) => texto.includes(c));
  });
}
