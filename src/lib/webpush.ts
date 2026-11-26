import { createCipheriv, createECDH, createHmac, createPrivateKey, createPublicKey, randomBytes, sign, type KeyObject } from "node:crypto";

/* =========================================================================
   v0.140 — NOTIFICACIONES PUSH sin librerías: el estándar Web Push con
   `node:crypto` (que es lo que hace por dentro el paquete `web-push`).

     · RFC 8291 — el contenido va cifrado para ESE navegador (ECDH P-256 +
       HKDF + AES-128-GCM, codificación «aes128gcm» de RFC 8188).
     · RFC 8292 (VAPID) — un JWT firmado con ES256 que dice quién manda.

   Las claves VAPID salen de `scripts/generar-vapid.mjs` y van en Vercel como
   VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY (base64url), más VAPID_SUBJECT
   (un «mailto:»). Sin ellas, no se manda nada y no pasa nada.
   ========================================================================= */

export const b64u = {
  enc: (b: Uint8Array) => Buffer.from(b).toString("base64url"),
  dec: (s: string) => Buffer.from(s, "base64url"),
};

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, len: number): Buffer {
  const prk = createHmac("sha256", salt).update(ikm).digest();
  return createHmac("sha256", prk).update(Buffer.concat([info, Buffer.from([1])])).digest().subarray(0, len);
}

/**
 * Cifra `contenido` para una suscripción (RFC 8291 + RFC 8188, un único registro).
 * `opciones` es para las pruebas (sal y clave efímera fijas); en la app, al azar.
 */
export function cifrar(contenido: Buffer, p256dh: string, auth: string, opciones?: { sal?: Buffer; efimera?: Buffer }): Buffer {
  const uaPub = b64u.dec(p256dh), secreto = b64u.dec(auth);
  const ecdh = createECDH("prime256v1");
  if (opciones?.efimera) ecdh.setPrivateKey(opciones.efimera); else ecdh.generateKeys();
  const asPub = ecdh.getPublicKey();
  const compartido = ecdh.computeSecret(uaPub);
  const ikm = hkdf(secreto, compartido, Buffer.concat([Buffer.from("WebPush: info\0"), uaPub, asPub]), 32);
  const sal = opciones?.sal ?? randomBytes(16);
  const cek = hkdf(sal, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(sal, ikm, Buffer.from("Content-Encoding: nonce\0"), 12);
  const c = createCipheriv("aes-128-gcm", cek, nonce);
  const cuerpo = Buffer.concat([c.update(Buffer.concat([contenido, Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([sal, rs, Buffer.from([asPub.length]), asPub, cuerpo]);
}

/** La clave privada VAPID (d, 32 bytes en base64url) como objeto, con su pública (65 bytes). */
export function claveVapid(publica: string, privada: string): KeyObject {
  const pub = b64u.dec(publica);
  return createPrivateKey({ key: { kty: "EC", crv: "P-256", d: privada, x: b64u.enc(pub.subarray(1, 33)), y: b64u.enc(pub.subarray(33, 65)) }, format: "jwk" });
}

/** La cabecera Authorization de VAPID para un `endpoint` (vale 12 horas). */
export function cabeceraVapid(endpoint: string, publica: string, privada: string, sujeto: string, ahora = Date.now()): string {
  const aud = new URL(endpoint).origin;
  const cab = b64u.enc(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const cuerpo = b64u.enc(Buffer.from(JSON.stringify({ aud, exp: Math.floor(ahora / 1000) + 12 * 3600, sub: sujeto })));
  const firma = sign("sha256", Buffer.from(`${cab}.${cuerpo}`), { key: claveVapid(publica, privada), dsaEncoding: "ieee-p1363" });
  return `vapid t=${cab}.${cuerpo}.${b64u.enc(firma)}, k=${publica}`;
}

/** Comprueba que una clave pública VAPID es un punto P-256 válido (para el panel de Ajustes). */
export function vapidValida(publica: string | undefined): boolean {
  try {
    if (!publica) return false;
    const b = b64u.dec(publica);
    if (b.length !== 65 || b[0] !== 4) return false;
    createPublicKey({ key: { kty: "EC", crv: "P-256", x: b64u.enc(b.subarray(1, 33)), y: b64u.enc(b.subarray(33, 65)) }, format: "jwk" });
    return true;
  } catch {
    return false;
  }
}

export type Suscripcion = { endpoint: string; p256dh: string; auth: string };
export type Aviso = { titulo: string; cuerpo: string; url: string; etiqueta?: string };

/**
 * Manda un aviso a una suscripción. Devuelve el código HTTP (201 = enviado;
 * 404 o 410 = la suscripción ya no existe y hay que borrarla); 0 si falló la red.
 */
export async function enviarPush(s: Suscripcion, aviso: Aviso, vapid: { publica: string; privada: string; sujeto: string }): Promise<number> {
  const cuerpo = cifrar(Buffer.from(JSON.stringify(aviso)), s.p256dh, s.auth);
  try {
    const r = await fetch(s.endpoint, {
      method: "POST",
      headers: {
        Authorization: cabeceraVapid(s.endpoint, vapid.publica, vapid.privada, vapid.sujeto),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(24 * 3600),
        Urgency: "normal",
        ...(aviso.etiqueta ? { Topic: aviso.etiqueta.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || "arena" } : {}),
      },
      body: new Uint8Array(cuerpo),
    });
    return r.status;
  } catch {
    return 0;
  }
}
