import { test } from "node:test";
import assert from "node:assert/strict";
import { claveDireccion, detallesEvento, nombreLimpio, parseEventosPegados, tituloDireccion } from "../src/lib/eventosPegados.ts";

const PEGADO = `Desafío de Liga
TCG League Challenge November
CARRER DE LES TORRES, 44, 08970 SANT JOAN DESPÍ, BARCELONA, SPAIN
jueves, 12 de noviembre de 2026 06:00 p.m.

Desafío de Liga
12/11 Porygon's Cup - Pokémon TCG League Challenge
RONDA FREDERIC MISTRAL, 26, 08304 MATARÓ, BARCELONA, SPAIN
jueves, 12 de noviembre de 2026 06:00 p.m.`;

test("EL CASO DEL 9/11: dos Challenges del localizador, con todos sus detalles", () => {
  const { eventos } = parseEventosPegados(PEGADO);
  assert.equal(eventos.length, 2);
  const [a, b] = eventos.map(detallesEvento);
  assert.deepEqual(a, {
    nombre: "TCG League Challenge November", direccion: "Carrer de les Torres, 44", cp: "08970",
    ciudad: "Sant Joan Despí", provincia: "Barcelona", pais: "España",
    sede: "Carrer de les Torres, 44, 08970 Sant Joan Despí (Barcelona)",
  });
  assert.equal(b.nombre, "Porygon's Cup");
  assert.equal(b.ciudad, "Mataró");
  assert.equal(b.direccion, "Ronda Frederic Mistral, 26");
  assert.equal(eventos[0].time, "18:00");
  assert.equal(eventos[0].kind, "league_challenge");
});

test("nombre limpio y dirección legible", () => {
  assert.equal(nombreLimpio("12/11 Porygon's Cup - Pokémon TCG League Challenge"), "Porygon's Cup");
  assert.equal(nombreLimpio("Copa Mythic - Pokémon TCG League Cup"), "Copa Mythic");
  assert.equal(nombreLimpio("League Challenge"), "League Challenge");
  assert.equal(tituloDireccion("AVINGUDA D'EUROPA"), "Avinguda d'Europa");
});

test("dedupe por dirección: mayúsculas y acentos no importan", () => {
  assert.equal(claveDireccion("Carrer de les Torres, 44"), claveDireccion("CARRER DE LES TORRES, 44"));
  assert.equal(claveDireccion("Ronda Frederic Mistral 26"), claveDireccion("RONDA FREDERIC MISTRAL, 26"));
});
