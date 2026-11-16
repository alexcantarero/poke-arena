import { test } from "node:test";
import assert from "node:assert/strict";
import { cuentaAnonima, datosLegales } from "../src/lib/legal.ts";

test("borrar la cuenta deja la fila sin nada que identifique a la persona, y sin poder entrar", () => {
  const a = cuentaAnonima("p_k3x9Zq71", 4);
  assert.equal(a.name, "Jugador eliminado ZQ71");
  assert.deepEqual([a.email, a.passwordHash, a.limitlessHandle, a.playerTag, a.favoriteArchetypeId, a.ladderElo, a.rankSpain, a.rankEurope],
    [null, null, null, null, null, null, null, null]);
  assert.deepEqual([a.bio, a.avatarValue, a.avatarKind, a.ladderNote, a.profileTitle], ["", "", "none", "", ""]);
  assert.deepEqual([a.active, a.role, a.sessionVersion], [false, "player", 5]);
  assert.equal(cuentaAnonima("--", 1).name, "Jugador eliminado 0000");
});

test("quién responde de los datos sale del entorno; sin configurar, se dice sin inventar un nombre", () => {
  const d = datosLegales({ LEGAL_RESPONSABLE: " Ana Pérez ", LEGAL_CONTACTO: "liga@ejemplo.test" });
  assert.deepEqual(d, { responsable: "Ana Pérez", contacto: "liga@ejemplo.test", completo: true });
  const v = datosLegales({});
  assert.equal(v.completo, false);
  assert.match(v.responsable, /organización de la liga/);
});
