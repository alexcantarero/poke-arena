import { test } from "node:test";
import assert from "node:assert/strict";
import { motivoDeEstado, normalizarWebhook } from "../src/lib/discordWebhook.ts";

const BUENA = "https://discord.com/api/webhooks/123456789/AbC-def_GHI";

test("las URL de webhook que antes se rechazaban en silencio", () => {
  assert.equal(normalizarWebhook(BUENA), BUENA);
  assert.equal(normalizarWebhook(`"${BUENA}"`), BUENA);
  assert.equal(normalizarWebhook(`  ${BUENA}\n`), BUENA);
  assert.ok(normalizarWebhook("https://ptb.discord.com/api/webhooks/1/x"));
  assert.ok(normalizarWebhook("https://canary.discord.com/api/webhooks/1/x"));
  assert.ok(normalizarWebhook("https://discord.com/api/v10/webhooks/1/x"));
  assert.ok(normalizarWebhook("https://discordapp.com/api/webhooks/1/x"));
});

test("y las que no son un webhook de Discord siguen fuera", () => {
  assert.equal(normalizarWebhook(""), null);
  assert.equal(normalizarWebhook("http://discord.com/api/webhooks/1/x"), null);
  assert.equal(normalizarWebhook("https://evil.com/api/webhooks/1/x"), null);
  assert.equal(normalizarWebhook("https://discord.com.evil.com/api/webhooks/1/x"), null);
  assert.equal(normalizarWebhook("https://discord.com/channels/1/2"), null);
});

test("cada respuesta de Discord dice una cosa", () => {
  assert.equal(motivoDeEstado(204), "ok");
  assert.equal(motivoDeEstado(401), "noAutorizado");
  assert.equal(motivoDeEstado(404), "noExiste");
  assert.equal(motivoDeEstado(429), "limite");
  assert.equal(motivoDeEstado(400), "rechazado");
});
