// v0.140 — Genera las claves VAPID para las notificaciones push.
// Uso: node scripts/generar-vapid.mjs   → copia las dos líneas a Vercel (Environment Variables).
import { generateKeyPairSync } from "node:crypto";
const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const pub = publicKey.export({ format: "jwk" });
const priv = privateKey.export({ format: "jwk" });
const b = (s) => Buffer.from(s, "base64url");
const publica = Buffer.concat([Buffer.from([4]), b(pub.x), b(pub.y)]).toString("base64url");
console.log(`VAPID_PUBLIC_KEY=${publica}`);
console.log(`VAPID_PRIVATE_KEY=${priv.d}`);
console.log("VAPID_SUBJECT=mailto:tu-correo@ejemplo.com");
console.log("\nLa privada no se comparte con nadie ni se sube al repositorio.");
