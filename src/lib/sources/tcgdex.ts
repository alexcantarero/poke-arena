import "server-only";

const API_REST = "https://api.tcgdex.net/v2/en";
const API_GRAPHQL = "https://api.tcgdex.net/v2/graphql";
const DAY = 60 * 60 * 24;

export type CardInfo = {
  id: string;
  name: string;
  setCode: string;
  setName: string;
  number: string;
  rarity: string | null;
  images: { small: string | null; large: string | null };
  isBasic: boolean;
};

type TcgDexSet = {
  id: string;
  name: string;
  abbreviation?: { official?: string };
};

async function getSetsMap(): Promise<Map<string, string>> {
  try {
    const res = await fetch(`${API_REST}/sets`, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: DAY * 7 },
    });
    if (!res.ok) return new Map();
    const sets: TcgDexSet[] = await res.json();
    return new Map(sets.map((s) => [s.id, s.abbreviation?.official || s.id]));
  } catch {
    return new Map();
  }
}

export async function searchCards(query: string, limit = 12): Promise<CardInfo[]> {
  const q = query.trim();
  if (!q) return [];
  const safe = q.replace(/["\\]/g, " ").slice(0, 60);

  const setMap = await getSetsMap();

  const graphqlQuery = {
    query: `query { cards(filters: { name: "${safe}" }, pagination: { page: 1, itemsPerPage: ${limit} }) { id name localId rarity set { id name } image category stage } }`
  };

  try {
    const res = await fetch(API_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graphqlQuery),
      signal: AbortSignal.timeout(6000),
      next: { revalidate: DAY },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const cards = data?.data?.cards ?? [];

    return cards.map((c: any) => ({
      id: c.id,
      name: c.name,
      setCode: c.set?.id ? (setMap.get(c.set.id) || c.set.id) : "",
      setName: c.set?.name ?? "",
      number: c.localId ?? "",
      rarity: c.rarity !== "None" ? c.rarity : null,
      images: {
        small: c.image ? `${c.image}/low.png` : null,
        large: c.image ? `${c.image}/high.png` : null,
      },
      isBasic: c.category === "Pokemon" && c.stage === "Basic",
    }));
  } catch {
    return [];
  }
}

export function hasPokemonTcgKey() { return false; }
