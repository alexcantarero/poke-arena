import { test } from "node:test";
import assert from "node:assert/strict";
import { mediana, regionDeHostNeon, regionesCoinciden, veredictoLatencia, VERCEL_PARA_NEON } from "../src/lib/regiones.ts";

test("la región de Neon sale del nombre del servidor, con o sin pooler", () => {
  assert.equal(regionDeHostNeon("ep-cool-name-123456.eu-central-1.aws.neon.tech"), "eu-central-1");
  assert.equal(regionDeHostNeon("ep-cool-name-123456-pooler.us-east-2.aws.neon.tech"), "us-east-2");
  assert.equal(regionDeHostNeon("localhost"), null);
  assert.equal(regionDeHostNeon(null), null);
});

test("EL CASO DEL 13/11: funciones en iad1 con la base en Fráncfort no coinciden", () => {
  assert.equal(regionesCoinciden("iad1", "eu-central-1"), false);
  assert.equal(regionesCoinciden("fra1", "eu-central-1"), true);
  assert.equal(regionesCoinciden("iad1", "us-east-1"), true);
  assert.equal(regionesCoinciden(null, "eu-central-1"), null); // en local no hay región
  assert.equal(regionesCoinciden("fra1", "region-rara-9"), null);
  assert.equal(VERCEL_PARA_NEON["eu-west-2"].vercel, "lhr1");
});

test("veredicto de la latencia y mediana", () => {
  assert.equal(veredictoLatencia(8), "bien");
  assert.equal(veredictoLatencia(40), "regular");
  assert.equal(veredictoLatencia(110), "lejos");
  assert.equal(mediana([120, 95, 101]), 101);
  assert.equal(mediana([10, 20]), 15);
  assert.equal(mediana([]), 0);
});
