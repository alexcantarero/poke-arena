/**
 * Sincroniza el catálogo de arquetipos con el metagame de Limitless.
 *
 *   npm run archetypes:sync
 *
 * La API pública de Limitless (https://play.limitlesstcg.com/api) no
 * necesita clave para la mayoría de endpoints. De cada mazo nos quedamos con
 * el nombre y los iconos: el primero es el Pokémon principal y el segundo,
 * si existe, el secundario. Es exactamente el modelo que usamos aquí.
 *
 * Solo añade los que falten: nunca sobreescribe un arquetipo que ya tengas,
 * porque puede que le hayáis puesto vuestro propio nombre.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();
import { db } from "../src/db";
import { archetypes } from "../src/db/schema";

const ENDPOINT = "https://play.limitlesstcg.com/api/games/PTCG/decks";

type LimitlessDeck = {
  identifier: string;
  name: string;
  icons?: string[];
  generation?: number;
  variants?: Array<{ identifier: string; name: string; icon?: string }>;
};

async function main() {
  const key = process.env.LIMITLESS_API_KEY;
  const url = key ? `${ENDPOINT}?key=${encodeURIComponent(key)}` : ENDPOINT;

  const res = await fetch(url, { headers: key ? { "X-Access-Key": key } : {} });
  if (!res.ok) {
    console.error(`Limitless respondió ${res.status}. Si el endpoint pide clave, pide una en`);
    console.error("https://play.limitlesstcg.com/account/settings/api y ponla en LIMITLESS_API_KEY.");
    process.exit(1);
  }
  const list = (await res.json()) as LimitlessDeck[];
  const modern = list.filter((d) => (d.generation ?? 9) >= 9);

  const existing = await db.select().from(archetypes);
  const known = new Set(existing.map((a) => a.limitlessId).filter(Boolean));
  const knownPair = new Set(existing.map((a) => `${a.main}|${a.secondary}`));

  const rows = modern
    .filter((d) => !known.has(d.identifier))
    .map((d) => {
      const icons = d.icons ?? [];
      return {
        id: `lt-${d.identifier}`.slice(0, 60),
        name: d.name,
        main: icons[0] ?? "",
        secondary: icons[1] ?? "",
        type: "colorless",
        limitlessId: d.identifier,
      };
    })
    .filter((r) => r.main && !knownPair.has(`${r.main}|${r.secondary}`));

  if (!rows.length) {
    console.log("Nada nuevo: el catálogo ya está al día.");
    return;
  }
  await db.insert(archetypes).values(rows);
  console.log(`Añadidos ${rows.length} arquetipos. Revisa el tipo (color) de cada uno en Mazos.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
