import { test } from "node:test";
import assert from "node:assert/strict";
import { caducidadRecuperacion, estadoRecuperacion, limpiarToken, sesionVigente } from "../src/lib/recuperacion.ts";

const ahora = new Date("2026-10-22T12:00:00Z");

test("un enlace vale una vez y durante 24 horas", () => {
  const caduca = caducidadRecuperacion(ahora);
  assert.equal(caduca.toISOString(), "2026-10-23T12:00:00.000Z");
  assert.deepEqual(estadoRecuperacion({ expiresAt: caduca, usedAt: null }, ahora), { ok: true });
  assert.deepEqual(estadoRecuperacion({ expiresAt: caduca, usedAt: ahora }, ahora), { ok: false, motivo: "usado" });
  assert.deepEqual(estadoRecuperacion({ expiresAt: caduca, usedAt: null }, caduca), { ok: false, motivo: "caducado" });
  assert.deepEqual(estadoRecuperacion(undefined, ahora), { ok: false, motivo: "noExiste" });
});

test("recuperar la contraseña cierra las sesiones de antes", () => {
  assert.equal(sesionVigente(1, 1), true);
  assert.equal(sesionVigente(undefined, 1), true); // cookies de antes de la versión
  assert.equal(sesionVigente(1, 2), false);
  assert.equal(sesionVigente(undefined, 2), false);
});

test("el token sale igual de la URL entera o del código suelto", () => {
  assert.equal(limpiarToken("https://x.app/recuperar/AbC_123/"), "AbC_123");
  assert.equal(limpiarToken(" AbC_123?x=1 "), "AbC_123");
});
