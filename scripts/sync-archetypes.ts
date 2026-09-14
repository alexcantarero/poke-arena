/**
 * Trae los arquetipos del metagame y los mete en la base de datos.
 *
 *   npm run archetypes:sync
 *   npm run archetypes:sync -- --tournaments 40 --min-players 32
 *   npm run archetypes:sync -- --dry
 *
 * De dónde salen los datos y por qué, está explicado en
 * `src/lib/sources/limitless.ts`. Resumen: sin clave, agregando las
 * clasificaciones de los torneos recientes, porque el endpoint del catálogo
 * oficial pide una clave que solo dan a proyectos públicos.
 *
 * Qué hace y qué no:
 *
 *   · **Añade** los arquetipos que falten.
 *   · **Rellena el tipo** (el color) de los que estén en incoloro, preguntando
 *     a PokéAPI. Antes había que repasarlos a mano uno a uno.
 *   · **Nunca renombra** un arquetipo que ya existe. Si le habéis puesto
 *     vuestro propio nombre —«Festival Lead» en vez de «Dipplin Thwackey»—,
 *     ese nombre se queda.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { archetypes } from "../src/db/schema";
import { fetchArchetypeCatalog } from "../src/lib/sources/limitless";
import { energyTypesOf } from "../src/lib/sources/pokeapi";

function flag(name: string, dflt: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) ? n : dflt;
}

async function main() {
  const dry = process.argv.includes("--dry");
  const tournaments = flag("tournaments", 25);
  const minPlayers = flag("min-players", 16);

  console.log(`Mirando los ${tournaments} torneos Standard más recientes con ${minPlayers}+ jugadores…`);

  const { source, archetypes: found } = await fetchArchetypeCatalog({
    tournaments,
    minPlayers,
    apiKey: process.env.LIMITLESS_API_KEY,
    onProgress: (done, total) => {
      process.stdout.write(`\r  torneo ${done}/${total}   `);
    },
  });
  process.stdout.write("\r".padEnd(30) + "\r");

  console.log(
    source === "catalog"
      ? `Catálogo oficial de Limitless: ${found.length} arquetipos.`
      : `Deducidos del metagame: ${found.length} arquetipos distintos.`,
  );
  if (!found.length) {
    console.log("Nada que hacer. ¿Seguro que hay torneos recientes en ese formato?");
    return;
  }

  const existing = await db.select().from(archetypes);
  const byLimitlessId = new Set(existing.map((a) => a.limitlessId).filter(Boolean));
  const byPair = new Set(existing.map((a) => `${a.main}|${a.secondary}`));

  const nuevos = found.filter(
    (d) => !byLimitlessId.has(d.identifier) && !byPair.has(`${d.main}|${d.secondary}`),
  );

  // Los que ya están pero se quedaron en incoloro: les ponemos color.
  const sinColor = existing.filter((a) => a.type === "colorless" && a.main);

  console.log(`  ${nuevos.length} por añadir · ${sinColor.length} sin color por rellenar`);

  if (dry) {
    for (const d of nuevos.slice(0, 40)) {
      console.log(`  + ${d.name}  (${d.main}${d.secondary ? ` / ${d.secondary}` : ""})  ×${d.count}`);
    }
    if (nuevos.length > 40) console.log(`  … y ${nuevos.length - 40} más`);
    console.log("\nEn seco: no se ha escrito nada. Quita --dry para aplicarlo.");
    return;
  }

  // Un solo viaje a PokéAPI para todo lo que necesita color.
  const slugs = [...nuevos.map((d) => d.main), ...sinColor.map((a) => a.main)];
  console.log(`Preguntando el tipo de ${new Set(slugs).size} Pokémon…`);
  const types = await energyTypesOf(slugs);

  if (nuevos.length) {
    await db.insert(archetypes).values(
      nuevos.map((d) => ({
        id: `lt-${d.identifier}`.slice(0, 60),
        name: d.name,
        main: d.main,
        secondary: d.secondary,
        type: types.get(d.main) ?? "colorless",
        limitlessId: d.identifier,
      })),
    );
    console.log(`Añadidos ${nuevos.length} arquetipos.`);
  }

  let pintados = 0;
  for (const a of sinColor) {
    const t = types.get(a.main);
    if (!t || t === "colorless") continue;
    await db.update(archetypes).set({ type: t }).where(eq(archetypes.id, a.id));
    pintados++;
  }
  if (pintados) console.log(`Puesto el color a ${pintados} arquetipos que estaban en incoloro.`);

  if (!nuevos.length && !pintados) console.log("El catálogo ya estaba al día.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
