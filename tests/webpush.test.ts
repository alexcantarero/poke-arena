import { test } from "node:test";
import assert from "node:assert/strict";
import { createDecipheriv, createECDH, createHmac, createPublicKey, generateKeyPairSync, randomBytes, verify } from "node:crypto";
import { b64u, cabeceraVapid, cifrar, vapidValida } from "../src/lib/webpush.ts";

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, len: number) {
  const prk = createHmac("sha256", salt).update(ikm).digest();
  return createHmac("sha256", prk).update(Buffer.concat([info, Buffer.from([1])])).digest().subarray(0, len);
}

/* Lo que hace el navegador al recibir: descifrar con su clave privada (RFC 8291). */
function descifrar(cuerpo: Buffer, uaPriv: Buffer, uaPub: Buffer, auth: Buffer): Buffer {
  const sal = cuerpo.subarray(0, 16), idlen = cuerpo[20], asPub = cuerpo.subarray(21, 21 + idlen), datos = cuerpo.subarray(21 + idlen);
  const ecdh = createECDH("prime256v1"); ecdh.setPrivateKey(uaPriv);
  const compartido = ecdh.computeSecret(asPub);
  const ikm = hkdf(auth, compartido, Buffer.concat([Buffer.from("WebPush: info\0"), uaPub, asPub]), 32);
  const cek = hkdf(sal, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(sal, ikm, Buffer.from("Content-Encoding: nonce\0"), 12);
  const d = createDecipheriv("aes-128-gcm", cek, nonce);
  d.setAuthTag(datos.subarray(datos.length - 16));
  const claro = Buffer.concat([d.update(datos.subarray(0, datos.length - 16)), d.final()]);
  return claro.subarray(0, claro.lastIndexOf(2)); // quitar el delimitador de relleno
}

test("lo cifrado para un navegador lo descifra ese navegador, y nadie más", () => {
  const ua = createECDH("prime256v1"); ua.generateKeys();
  const auth = randomBytes(16);
  const msg = Buffer.from(JSON.stringify({ titulo: "Ronda 4", cuerpo: "Apunta tu resultado", url: "/torneos/t1/modo" }));
  const c = cifrar(msg, b64u.enc(ua.getPublicKey()), b64u.enc(auth));
  assert.equal(c.readUInt32BE(16), 4096);
  assert.deepEqual(descifrar(c, ua.getPrivateKey(), ua.getPublicKey(), auth), msg);
  const otro = createECDH("prime256v1"); otro.generateKeys();
  assert.throws(() => descifrar(c, otro.getPrivateKey(), ua.getPublicKey(), auth));
});

test("la cabecera VAPID es un JWT ES256 válido para el origen del endpoint", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const jwkPub = publicKey.export({ format: "jwk" }) as { x: string; y: string };
  const jwkPriv = privateKey.export({ format: "jwk" }) as { d: string };
  const pub = b64u.enc(Buffer.concat([Buffer.from([4]), b64u.dec(jwkPub.x), b64u.dec(jwkPub.y)]));
  assert.equal(vapidValida(pub), true);
  assert.equal(vapidValida("nada"), false);
  const h = cabeceraVapid("https://fcm.googleapis.com/fcm/send/abc", pub, jwkPriv.d, "mailto:liga@ejemplo.test", Date.UTC(2026, 10, 26));
  const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(h)!;
  assert.ok(m);
  const claims = JSON.parse(b64u.dec(m[2]).toString());
  assert.equal(claims.aud, "https://fcm.googleapis.com");
  assert.equal(claims.sub, "mailto:liga@ejemplo.test");
  assert.equal(m[4], pub);
  const clave = createPublicKey({ key: { kty: "EC", crv: "P-256", x: jwkPub.x, y: jwkPub.y }, format: "jwk" });
  assert.ok(verify("sha256", Buffer.from(`${m[1]}.${m[2]}`), { key: clave, dsaEncoding: "ieee-p1363" }, b64u.dec(m[3])));
});
