/**
 * Crea un enlace de invitación desde la terminal.
 *
 *   npm run invite                 # una invitación de un uso, 14 días
 *   npm run invite -- "Javi" 5 90  # etiqueta, usos (0 = ilimitado), días (0 = nunca)
 *
 * Es la forma de entrar la primera vez, cuando todavía no hay ninguna cuenta:
 * el primero que use una invitación se queda como organizador de la liga.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { randomBytes } from "node:crypto";
import { db } from "../src/db";
import { invites } from "../src/db/schema";

async function main() {
  const [label = "", usesRaw = "1", daysRaw = "14"] = process.argv.slice(2);
  const maxUses = Number(usesRaw) || 0;
  const days = Number(daysRaw) || 0;
  const token = randomBytes(24).toString("base64url");

  await db.insert(invites).values({
    token,
    label,
    role: "player",
    maxUses,
    expiresAt: days > 0 ? new Date(Date.now() + days * 86400000) : null,
  });

  const base = process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  console.log("\nInvitación creada.\n");
  console.log(`  ${base}/registro/${token}\n`);
  console.log(`  ${maxUses === 0 ? "Usos ilimitados" : `${maxUses} uso(s)`}` +
    `${days > 0 ? `, caduca en ${days} días` : ", sin caducidad"}${label ? `, para ${label}` : ""}.`);
  console.log("\nSi despliegas en otro dominio, pon APP_URL en .env.local para que el enlace salga bien.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
