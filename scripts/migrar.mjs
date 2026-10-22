/* =========================================================================
   Lanza las migraciones de la v0.45, la v0.47, la v0.54, la v0.57 y la v0.59 contra la base de .env.local.

       npm run db:migrar

   v0.51. Son las dos únicas migraciones desde la v0.44 (columnas de la
   segunda fase y de los umbrales de paso). Las dos son IDEMPOTENTES: si ya se
   lanzaron, no hacen nada. Por eso este script se puede ejecutar siempre sin
   miedo, y es más cómodo que pegarlas a mano en el SQL Editor de Neon.

   Va contra la base de `DATABASE_URL` de `.env.local`. Enseña a qué servidor
   se conecta (sin la contraseña) antes de tocar nada.

   Necesita Node 22 (trae WebSocket de serie, que usa el driver de Neon).
   ========================================================================= */

import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";

config({ path: ".env.local" });
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ Falta DATABASE_URL en .env.local.");
  process.exit(1);
}
if (!globalThis.WebSocket) {
  console.error("✗ Este Node no trae WebSocket. Hace falta Node 22 o más nuevo (node -v).");
  process.exit(1);
}
neonConfig.webSocketConstructor = globalThis.WebSocket;

const host = new URL(url).host;
console.log(`→ Base de datos: ${host}`);

const MIGRACIONES = ["drizzle/0018_v0_45_0.sql", "drizzle/0019_v0_47_0.sql", "drizzle/0020_v0_54_0.sql", "drizzle/0021_v0_57_0.sql", "drizzle/0022_v0_59_0.sql", "drizzle/0023_v0_60_0.sql"];
const pool = new Pool({ connectionString: url });
try {
  for (const f of MIGRACIONES) {
    // Varias sentencias en una sola llamada: el protocolo simple de Postgres lo
    // permite y respeta los bloques DO $$ … $$, que partir por «;» rompería.
    await pool.query(readFileSync(f, "utf8"));
    console.log(`✓ ${f}`);
  }
  console.log("✓ Migraciones al día. Si ya estaban, no ha cambiado nada.");
} catch (e) {
  console.error(`✗ Falló: ${e.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
