/* =========================================================================
   v0.17 — Español / inglés.

   Un diccionario plano y una función. Sin librería: next-intl o i18next
   piden reorganizar las rutas (`/[locale]/…`) y aquí no compensa. El idioma
   viaja en una cookie (`arena-lang`) y lo lee el servidor, así que la página
   sale ya traducida, sin parpadeo y sin JavaScript.

   CÓMO TRADUCIR UNA PANTALLA MÁS
   ------------------------------
   1. Añade las claves aquí, en `ES` y en `EN` (el tipo obliga a que estén en
      los dos: si falta una en inglés, no compila).
   2. En la página (Server Component): `const lang = await getLang()` de
      `@/lib/lang` y `tr(lang, "clave")`.
   3. En un componente de cliente: que reciba `lang` como prop.

   Sin imports a propósito, para que sirva en cliente y en servidor.
   ========================================================================= */

export type Lang = "es" | "en";
export const LANGS: readonly Lang[] = ["es", "en"];
export const LANG_COOKIE = "arena-lang";

export const asLang = (v: string | null | undefined): Lang => (v === "en" ? "en" : "es");

const ES = {
  "app.name": "PokeArena TCG",

  // Menú: grupos
  "nav.group.main": "Principal",
  "nav.group.compete": "Competir",
  "nav.group.analysis": "Análisis",
  "nav.group.account": "Cuenta",
  // Menú: secciones (la clave es la ruta)
  "nav./": "Inicio",
  "nav./calendario": "Calendario",
  "nav./torneos": "Torneos",
  "nav./competiciones": "Liga",
  "nav./resultados": "Resultados",
  "nav./mesa": "Mi Mesa",
  "nav./ranking": "Ranking",
  "nav./estadisticas": "Estadísticas",
  "nav./topdecks": "Top Decks",
  "nav./mazos": "Mazos",
  "nav./ajustes": "Ajustes",
  "nav.profile": "Perfil",
  "nav.myProfile": "Mi perfil",
  "nav.more": "Más",
  "nav.moreSections": "Más secciones",
  "nav.sections": "Secciones",

  // Cabecera y cuenta
  "shell.newMatch": "Registrar partida",
  "shell.logout": "Salir",
  "shell.logoutLong": "Salir de la cuenta",
  "role.owner": "Organizador",
  "role.admin": "Administrador",
  "role.player": "Jugador",
  "lang.switch": "Idioma",
  "lang.toOther": "English",
  "lang.toOtherShort": "EN",

  // Favoritos
  "fav.add": "Seguir",
  "fav.remove": "Dejar de seguir",
  "fav.addTitle": "Añadir a favoritos",
  "fav.removeTitle": "Quitar de favoritos",
  "fav.who": "¿A quién?",
  "fav.everyone": "Todos",
  "fav.mine": "Favoritos",
  "fav.hint": "Marca la estrella de alguien (aquí abajo o en su perfil) para verlo en esta lista. Tú siempre sales.",
  "fav.empty": "Todavía no sigues a nadie. Marca la estrella en la lista «Camino al Mundial» o en un perfil.",

  // Clasificación oficial / Mundial
  "zone.title": "Camino al Mundial",
  "zone.sub": "Puesto en el leaderboard oficial de CP, apuntado a mano.",
  "zone.spain": "España",
  "zone.europe": "Europa",
  "zone.updated": "actualizado el",
  "zone.none": "Sin puesto apuntado",
  "zone.in": "Dentro",
  "zone.out": "Fuera",
  "zone.margin": "margen",
  "zone.toGo": "a",
  "zone.places": "puestos",
  "zone.line": "Línea de invitación",
  "zone.slots": "plazas por leaderboard en Masters",
  "zone.caveat": "Es una foto de hoy: el leaderboard se mueve con cada torneo y el corte en puntos solo se conoce al cerrar la temporada. Ganar un Regional o un Special, o hacer Top 4 en un Internacional, da invitación directa al margen del puesto.",
  "zone.edit": "Actualizar puestos",
  "zone.save": "Guardar puestos",
  "zone.clear": "Borrar",
  "zone.howto": "Míralo en la clasificación oficial de Play! Pokémon (pokemon.com, «Championship Points») y apúntalo aquí. Déjalo vacío si no lo sabes.",

  // Torneo: añadir participante
  "tour.addPlayer": "Añadir participante",
  "tour.addPlayerHint": "Para alguien del grupo que todavía no tiene ninguna ronda ni resultado en este torneo. Elige quién y se abre su bloque con el formulario de la ronda 1 y el de su resultado final.",
  "tour.addPlayerPick": "Elige a alguien",
  "tour.addPlayerGo": "Abrir su bloque",
  "tour.addPlayerNone": "Todo el grupo activo tiene ya un bloque en este torneo.",
  "tour.addPlayerPending": "Todavía no está guardado: aparecerá en el torneo en cuanto le apuntes una ronda o un resultado.",
  "tour.viewProfile": "Ver perfil",

  // v0.25 — tarjetas de Inicio y Perfil
  "home.yourMatches": "Tus partidas",
  "home.ofLeague": "de todas las de la liga",
  "home.league": "Liga",
  "home.of": "de",
  "home.eloRank": "Puesto en el ranking global de Elo",
  "home.eloRankShort": "Elo",
  "home.wins": "de victorias",
  "home.bestTournamentResults": "Mejores resultados de torneos",
  "home.viewTournaments": "Ver torneos",
  "home.noFinalPlacements": "Todavía no hay puestos finales",
  "home.noFinalPlacementsHint": "Cuando apuntéis resultados finales de vuestros torneos, aquí aparecerán los cinco mejores puestos.",
} as const;

export type I18nKey = keyof typeof ES;

const EN: Record<I18nKey, string> = {
  "app.name": "PokeArena TCG",

  "nav.group.main": "Main",
  "nav.group.compete": "Compete",
  "nav.group.analysis": "Analysis",
  "nav.group.account": "Account",
  "nav./": "Home",
  "nav./calendario": "Calendar",
  "nav./torneos": "Tournaments",
  "nav./competiciones": "League",
  "nav./resultados": "Results",
  "nav./mesa": "My Table",
  "nav./ranking": "Ranking",
  "nav./estadisticas": "Stats",
  "nav./topdecks": "Top Decks",
  "nav./mazos": "Decks",
  "nav./ajustes": "Settings",
  "nav.profile": "Profile",
  "nav.myProfile": "My profile",
  "nav.more": "More",
  "nav.moreSections": "More sections",
  "nav.sections": "Sections",

  "shell.newMatch": "Log a match",
  "shell.logout": "Log out",
  "shell.logoutLong": "Log out",
  "role.owner": "Organizer",
  "role.admin": "Admin",
  "role.player": "Player",
  "lang.switch": "Language",
  "lang.toOther": "Español",
  "lang.toOtherShort": "ES",

  "fav.add": "Follow",
  "fav.remove": "Unfollow",
  "fav.addTitle": "Add to favourites",
  "fav.removeTitle": "Remove from favourites",
  "fav.who": "Who?",
  "fav.everyone": "Everyone",
  "fav.mine": "Favourites",
  "fav.hint": "Star someone (below or on their profile) to see them in this list. You are always included.",
  "fav.empty": "You don't follow anyone yet. Star someone in the “Road to Worlds” list or on a profile.",

  "zone.title": "Road to Worlds",
  "zone.sub": "Position on the official CP leaderboard, entered by hand.",
  "zone.spain": "Spain",
  "zone.europe": "Europe",
  "zone.updated": "updated on",
  "zone.none": "No position entered",
  "zone.in": "In",
  "zone.out": "Out",
  "zone.margin": "margin",
  "zone.toGo": "",
  "zone.places": "places away",
  "zone.line": "Invitation line",
  "zone.slots": "leaderboard invites in Masters",
  "zone.caveat": "This is today's snapshot: the leaderboard moves after every event and the points cut-off is only known when the season ends. Winning a Regional or Special, or a Top 4 at an International, is a direct invite regardless of position.",
  "zone.edit": "Update positions",
  "zone.save": "Save positions",
  "zone.clear": "Clear",
  "zone.howto": "Check the official Play! Pokémon leaderboard (pokemon.com, “Championship Points”) and enter it here. Leave it empty if you don't know.",

  "tour.addPlayer": "Add participant",
  "tour.addPlayerHint": "For someone in the group who has no round or result in this tournament yet. Pick who and their block opens with the round 1 form and their final result form.",
  "tour.addPlayerPick": "Pick someone",
  "tour.addPlayerGo": "Open their block",
  "tour.addPlayerNone": "Everyone active in the group already has a block in this tournament.",
  "tour.addPlayerPending": "Not saved yet: they will appear in the tournament as soon as you log a round or a result for them.",
  "tour.viewProfile": "View profile",

  "home.yourMatches": "Your matches",
  "home.ofLeague": "of all league matches",
  "home.league": "League",
  "home.of": "of",
  "home.eloRank": "Position in the global Elo ranking",
  "home.eloRankShort": "Elo",
  "home.wins": "win rate",
  "home.bestTournamentResults": "Best tournament results",
  "home.viewTournaments": "View tournaments",
  "home.noFinalPlacements": "No final placements yet",
  "home.noFinalPlacementsHint": "Once you record final tournament results, the five best placements will appear here.",
};

const DICT: Record<Lang, Record<I18nKey, string>> = { es: ES, en: EN };

/** El texto de una clave. Si una clave dinámica no existe, devuelve la clave. */
export function tr(lang: Lang, key: I18nKey | string): string {
  return (DICT[lang] as Record<string, string>)[key] ?? (ES as Record<string, string>)[key] ?? key;
}
