/* v0.62 — La familia de un tipo de torneo, para vestir la cinta de la ronda.
   Sin imports. Challenge y Cup se agrupan con sus alias de Play! Pokémon; los
   grandes (Regional, Special, Internacional, Mundial) van juntos. */
export type FamiliaTorneo = "challenge" | "cup" | "major" | "online" | "otro";

export function familiaTorneo(kind: string | null | undefined): FamiliaTorneo {
  switch (kind) {
    case "league_challenge": case "pokemon_challenge": return "challenge";
    case "league_cup": case "pokemon_cup": return "cup";
    case "regional": case "special": case "international": case "worlds": return "major";
    case "online": return "online";
    default: return "otro";
  }
}
