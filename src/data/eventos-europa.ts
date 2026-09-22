/* =========================================================================
   Los eventos oficiales de Europa de la temporada 2027, para el calendario.

   DE DÓNDE SALEN Y HASTA QUÉ PUNTO FIARSE
   ---------------------------------------
   Consultado el 21 de septiembre de 2026 en tres sitios, porque ninguno solo
   es suficiente:

   · Serebii — la lista completa de la temporada 2027:
     https://www.serebii.net/playpokemon/2027.shtml
   · PokéBeach — el anuncio del calendario de julio de 2026:
     https://www.pokebeach.com/2026/07/2027-pokemon-championship-series-event-schedule-and-changes-announced
   · championships.pokemon.com — las fichas de cada evento. La web oficial se
     pinta con JavaScript, así que de ella solo se ha podido confirmar **qué
     eventos existen**, no sus fechas.

   **No se raspa ninguna web.** Esto es una lista escrita a mano, una vez, que
   se actualiza editando este fichero. No hay ninguna llamada automática a
   nadie: ni hace falta ni sería correcto.

   DONDE LAS FUENTES NO COINCIDEN
   ------------------------------
   · **El Internacional de Europa.** Serebii dice 19–21 de febrero de 2027;
     PokéBeach dice 13–15. El 13–15 de febrero es exactamente la fecha del
     Internacional de **2026**, así que huele a arrastre del año anterior, y
     se ha puesto la de Serebii. Va marcado con `confirmar: true`.
   · **Noviembre de 2026.** PokéBeach lo lee como un Regional en Bolonia;
     Serebii, como Stuttgart, y deja Bolonia en junio de 2027 como Special
     Event. Que la web oficial tenga ficha de «2027 Stuttgart Regional
     Championships» inclina la balanza hacia Serebii.

   Los marcados con `confirmar` salen en el calendario con un aviso. Antes de
   coger un tren, mirad la web oficial.

   CÓMO SE ACTUALIZA
   -----------------
   Se edita esta lista y se vuelve a pulsar «Importar eventos de Europa» en
   Ajustes. La importación es idempotente: cada evento lleva un `id` fijo, así
   que los que ya están se actualizan y no se duplican. Borrar uno de aquí no
   lo borra del calendario — eso se hace desde el calendario, a mano, para no
   cargarse sin querer algo que alguien había anotado.
   ========================================================================= */

export type EventoOficial = {
  /** Fijo y estable: es lo que hace que importar dos veces no duplique. */
  id: string;
  title: string;
  /** ISO. Primer día. */
  date: string;
  /** ISO. Último día, si dura más de uno. */
  endDate?: string;
  /** Tipo de Play! Pokémon: decide el color en el calendario. */
  tournamentKind: "regional" | "international" | "special" | "worlds";
  location: string;
  url?: string;
  /** Las fuentes no coinciden en la fecha: se enseña un aviso. */
  confirmar?: boolean;
};

/** Temporada a la que pertenecen (Play! Pokémon 2027: julio 2026 – junio 2027). */
export const TEMPORADA_EVENTOS = 2027;

export const EVENTOS_EUROPA_2027: EventoOficial[] = [
  {
    id: "eu-2027-frankfurt",
    title: "Regional de Frankfurt",
    date: "2026-09-26",
    endDate: "2026-09-27",
    tournamentKind: "regional",
    location: "Frankfurt, Alemania",
    url: "https://championships.pokemon.com/en-us/events/regionals/2027/frankfurt",
  },
  {
    id: "eu-2027-nice",
    title: "Regional de Niza",
    date: "2026-10-17",
    endDate: "2026-10-18",
    tournamentKind: "regional",
    location: "Niza, Francia",
    url: "https://championships.pokemon.com/en-us/events/regionals/2027/nice",
  },
  {
    id: "eu-2027-gdansk",
    title: "Regional de Gdansk",
    date: "2026-10-31",
    endDate: "2026-11-01",
    tournamentKind: "regional",
    location: "Gdansk, Polonia",
    url: "https://championships.pokemon.com/en-us/events/regionals/2027/gdansk",
  },
  {
    id: "eu-2027-stuttgart",
    title: "Regional de Stuttgart",
    date: "2026-11-28",
    endDate: "2026-11-29",
    tournamentKind: "regional",
    location: "Stuttgart, Alemania",
    url: "https://championships.pokemon.com/en-us/events/regionals/2027/stuttgart",
  },
  {
    id: "eu-2027-birmingham",
    title: "Regional de Birmingham",
    date: "2027-01-30",
    endDate: "2027-01-31",
    tournamentKind: "regional",
    location: "Birmingham, Reino Unido",
    url: "https://championships.pokemon.com/en-us/events/regionals/2027/birmingham",
  },
  {
    id: "eu-2027-euic",
    title: "Internacional de Europa (EUIC)",
    date: "2027-02-19",
    endDate: "2027-02-21",
    tournamentKind: "international",
    location: "Londres, Reino Unido",
    url: "https://championships.pokemon.com/en-us/events/internationals/2027/london",
    // Serebii dice 19–21 de febrero; PokéBeach, 13–15 (que es la fecha del
    // Internacional de 2026). Comprobadlo antes de sacar vuelos.
    confirmar: true,
  },
  {
    id: "eu-2027-lisboa",
    title: "Special Event de Lisboa",
    date: "2027-04-10",
    endDate: "2027-04-11",
    tournamentKind: "special",
    location: "Lisboa, Portugal",
  },
  {
    id: "eu-2027-praga",
    title: "Regional de Praga",
    date: "2027-05-08",
    endDate: "2027-05-09",
    tournamentKind: "regional",
    location: "Praga, Chequia",
    url: "https://championships.pokemon.com/en-us/events/regionals/2027/prague",
  },
  {
    id: "eu-2027-utrecht",
    title: "Regional de Utrecht",
    date: "2027-05-22",
    endDate: "2027-05-23",
    tournamentKind: "regional",
    location: "Utrecht, Países Bajos",
    url: "https://championships.pokemon.com/en-us/events/regionals/2027/utrecht",
  },
  {
    id: "eu-2027-bolonia",
    title: "Special Event de Bolonia",
    date: "2027-06-05",
    endDate: "2027-06-06",
    tournamentKind: "special",
    location: "Bolonia, Italia",
  },
];
